'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';

// ─── Types ───────────────────────────────────────────────────────────────────
interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  id?: string; // Optional for existing questions
  statement: string;
  pointValue: number;
  scoringMode: 'ALL_REQUIRED' | 'ANY_CORRECT';
  options: QuestionOption[];
}

const defaultQuestion = (): QuestionDraft => ({
  statement: '',
  pointValue: 1,
  scoringMode: 'ALL_REQUIRED',
  options: [
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ],
});

// ─── Component ───────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'exams' | 'new_room' | 'monitoring'>('exams');

  const [token, setToken] = useState('');
  const [exams, setExams] = useState<any[]>([]);
  
  // Exam Form State
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [examTitle, setExamTitle] = useState('');
  const [examWeight, setExamWeight] = useState<number>(1);
  const [showOneAtATime, setShowOneAtATime] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [allowBackNavigation, setAllowBackNavigation] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([defaultQuestion()]);

  const [rooms, setRooms] = useState<any[]>([]);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');

  const [monitoringRoom, setMonitoringRoom] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const [isSendingEmail, setIsSendingEmail] = useState<string | null>(null);

  // AI PDF Import
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [customAiPrompt, setCustomAiPrompt] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = localStorage.getItem('teacher_token');
    if (!t) { router.push('/teacher/login'); return; }
    setToken(t);
    fetchExams(t);
    fetchRooms(t);
    const savedGeminiKey = localStorage.getItem('custom_gemini_key');
    if (savedGeminiKey) setCustomGeminiKey(savedGeminiKey);
  }, [router]);

  const fetchExams = async (t = token) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/exams`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) setExams(await res.json());
    } catch (e) {}
  };

  const fetchRooms = async (t = token) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/rooms`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) setRooms(await res.json());
    } catch (e) {}
  };

  // ── Question Helpers ──────────────────────────────────────────────────────
  const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const updateOption = (qIdx: number, oIdx: number, patch: Partial<QuestionOption>) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const newOpts = q.options.map((o, j) => j === oIdx ? { ...o, ...patch } : o);
      return { ...q, options: newOpts };
    }));
  };

  const addOption = (qIdx: number) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIdx ? { ...q, options: [...q.options, { text: '', isCorrect: false }] } : q
    ));
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    setQuestions(prev => prev.map((q, i) =>
      i === qIdx ? { ...q, options: q.options.filter((_, j) => j !== oIdx) } : q
    ));
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  // ── Exam CRUD ─────────────────────────────────────────────────────────────
  const resetExamForm = () => {
    setEditingExamId(null);
    setExamTitle('');
    setExamWeight(1);
    setShowOneAtATime(false);
    setRandomizeQuestions(false);
    setRandomizeOptions(false);
    setAllowBackNavigation(true);
    setQuestions([defaultQuestion()]);
  };

  const handleEditExam = (ex: any) => {
    setEditingExamId(ex.id);
    setExamTitle(ex.title);
    setExamWeight(ex.weight);
    setShowOneAtATime(ex.showOneAtATime || false);
    setRandomizeQuestions(ex.randomizeQuestions || false);
    setRandomizeOptions(ex.randomizeOptions || false);
    setAllowBackNavigation(ex.allowBackNavigation !== false);
    
    // Map questions to draft format
    const mappedQuestions = ex.questions.map((q: any) => ({
      statement: q.statement,
      pointValue: q.pointValue,
      scoringMode: q.scoringMode,
      options: q.options.map((o: any) => ({ text: o.text, isCorrect: o.isCorrect }))
    }));
    setQuestions(mappedQuestions.length ? mappedQuestions : [defaultQuestion()]);
    setActiveTab('exams');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateOrUpdateExam = async (e: any) => {
    e.preventDefault();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.options.filter(o => o.isCorrect).length === 0) {
        alert(`Questão ${i + 1}: marque ao menos uma resposta correta.`);
        return;
      }
      if (q.options.some(o => o.text.trim() === '')) {
        alert(`Questão ${i + 1}: todas as alternativas precisam ter texto.`);
        return;
      }
    }

    const payload = {
      title: examTitle,
      duration: 60,
      weight: examWeight,
      showOneAtATime,
      randomizeQuestions,
      randomizeOptions,
      allowBackNavigation,
      questions
    };

    try {
      const url = editingExamId 
        ? `${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/exams/${editingExamId}` 
        : `${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/exams`;
      const method = editingExamId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Erro ao salvar');
      alert(editingExamId ? 'Prova atualizada com sucesso!' : 'Prova salva com sucesso!');
      resetExamForm();
      fetchExams();
    } catch (e) { alert('Erro ao salvar prova'); }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Deseja deletar permanentemente esta prova?')) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/exams/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchExams();
  };

  // ── Room CRUD ─────────────────────────────────────────────────────────────
  const handleCreateRoom = async (e: any) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newRoomName.toUpperCase(), examId: selectedExamId }),
      });
      if (res.ok) {
        alert('Sala ativada!');
        setNewRoomName('');
        fetchRooms();
        setActiveTab('monitoring');
      } else {
        const err = await res.json();
        alert(err.message || 'Erro ao criar sala.');
      }
    } catch (e) {}
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Deseja deletar permanentemente esta sala e todos os seus registros?')) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/rooms/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    fetchRooms();
  };

  const handleReactivateRoom = async (roomId: string) => {
    const examId = prompt('Digite o ID da Prova que deseja usar nesta sala (deixe em branco se for a mesma):');
    const finalExamId = examId?.trim() || rooms.find(r => r.id === roomId)?.examId;
    
    if (!confirm('Isso apagará todas as tentativas anteriores desta sala para começar do zero. Continuar?')) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/rooms/${roomId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ examId: finalExamId }),
      });
      if (res.ok) {
        alert('Sala reativada com sucesso!');
        fetchRooms();
      } else {
        alert('Falha ao reativar sala.');
      }
    } catch (e) { alert('Erro de conexão.'); }
  };

  const handleMonitorRoom = async (room: any) => {
    if (socket) socket.disconnect();
    setMonitoringRoom(room);
    setActiveTab('monitoring');
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/sessions/room/${room.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => setSessions(data));

    const newSocket = io(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}`);
    setSocket(newSocket);
    newSocket.on('connect', () => { newSocket.emit('join_exam_room', { roomId: room.id }); });
    newSocket.on('violation_alert', (data) => {
      const violationLabel: Record<string, string> = {
        'blur': 'Perda de foco da janela',
        'tab_change': 'Troca de aba detectada',
        'exit_fullscreen': 'Saiu da tela cheia',
      };
      const label = violationLabel[data.type] || data.type;
      setAlerts(prev => [{ ...data, studentName: data.sessionId, label, time: new Date().toLocaleTimeString('pt-BR') }, ...prev]);
      setSessions(prev => prev.map(s => s.id === data.sessionId ? { ...s, status: 'blocked', violationsCount: s.violationsCount + 1 } : s));
    });
  };

  const handleUnblock = async (sessionId: string) => {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/sessions/${sessionId}/unblock`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status: 'active' } : s));
  };

  const handleFinishRoom = async (roomId: string) => {
    if (!confirm('Encerrar esta sala?')) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/rooms/${roomId}/finish`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchRooms();
    if (monitoringRoom?.id === roomId) setMonitoringRoom(null);
  };

  const handleDownloadReport = async (sessionId: string, studentName: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/sessions/${sessionId}/report`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erro');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resultado-${studentName.replace(/\s+/g, '-')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Erro ao gerar planilha.');
    }
  };

  const handleDownloadRoomReport = async (roomId: string, roomName: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/rooms/${roomId}/report`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-completo-${roomName}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert('Erro ao baixar relatório geral.'); }
  };

  const handleSendEmail = async (sessionId: string) => {
    setIsSendingEmail(sessionId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/sessions/${sessionId}/send-report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) alert('Relatório enviado com sucesso para o e-mail do aluno!');
      else alert('Falha ao enviar e-mail.');
    } catch { alert('Erro de conexão.'); }
    finally { setIsSendingEmail(null); }
  };

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be reimported if needed
    e.target.value = '';

    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (customGeminiKey) {
        formData.append('apiKey', customGeminiKey);
        localStorage.setItem('custom_gemini_key', customGeminiKey);
      }
      if (customAiPrompt) {
        formData.append('customPrompt', customAiPrompt);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/ai/parse-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Erro ao processar PDF.');
      }

      const extracted: QuestionDraft[] = await res.json();
      if (!extracted.length) throw new Error('Nenhuma questão encontrada no PDF.');

      // Merge: if current form is just the default empty question, replace; otherwise append
      const isFormEmpty = questions.length === 1 && !questions[0].statement;
      setQuestions(isFormEmpty ? extracted : [...questions, ...extracted]);
      setImportResult({ count: extracted.length });
    } catch (err: any) {
      alert(`Falha na importação: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const logout = () => { localStorage.removeItem('teacher_token'); router.push('/teacher/login'); };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="lp-page">

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside className="lp-sidebar">
        <div className="lp-sidebar-brand">
          <span className="brand-name">LeanPulse</span>
          <span className="brand-sub">Mesa do Professor</span>
        </div>
        <nav className="lp-nav">
          <button onClick={() => router.push('/teacher/turmas')} className="lp-nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Minhas Turmas
          </button>
          <button onClick={() => router.push('/teacher/sala-turma')} className="lp-nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/><path d="M6 8h2M6 12h2"/></svg>
            Aplicar para Turma
          </button>
          <button onClick={() => router.push('/teacher/atividades')} className="lp-nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            Exercícios &amp; Atividades
          </button>
          <button onClick={() => router.push('/teacher/planos')} className="lp-nav-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Planos de Aula
          </button>
          <button onClick={() => { setActiveTab('exams'); resetExamForm(); }} className={`lp-nav-item ${activeTab === 'exams' ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            Banco de Provas
          </button>
          <button onClick={() => setActiveTab('new_room')} className={`lp-nav-item ${activeTab === 'new_room' ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Aplicar Prova
          </button>
          <button onClick={() => setActiveTab('monitoring')} className={`lp-nav-item ${activeTab === 'monitoring' ? 'active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/></svg>
            Monitoramento
          </button>
        </nav>
        <div className="lp-sidebar-footer">
          <div className="lp-avatar">P</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Professor</div>
          </div>
          <button onClick={logout} title="Sair" style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <main className="lp-main">

        {/* TAB 1: BANCO DE PROVAS */}
        {activeTab === 'exams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '960px' }}>
            <div className="lp-page-header">
              <div>
                <h1 className="lp-page-title">Banco de Provas</h1>
                <p className="lp-page-subtitle">Gerencie seu repositório institucional de avaliações digitais.</p>
              </div>
              {editingExamId && <button onClick={resetExamForm} className="btn btn-outline btn-sm">✕ Cancelar Edição</button>}
            </div>

            <div className="lp-card">
              <div className="lp-card-header">
                <h3>{editingExamId ? `Editando: ${examTitle}` : 'Criar Nova Prova'}</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <textarea placeholder="Instruções para a IA (Opcional)..." value={customAiPrompt} onChange={(e) => setCustomAiPrompt(e.target.value)} className="lp-input" style={{ width: '240px', minHeight: '52px', fontSize: '0.8125rem', resize: 'vertical' }} />
                  <input type="password" placeholder="Chave API Gemini (Opcional)" value={customGeminiKey} onChange={(e) => setCustomGeminiKey(e.target.value)} className="lp-input" style={{ width: '180px', fontSize: '0.8125rem' }} />
                  <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleImportPdf} />
                  <button type="button" disabled={isImporting} onClick={() => pdfInputRef.current?.click()} className="btn btn-outline btn-sm">
                    {isImporting ? <><span className="spinner" style={{ borderTopColor: 'var(--primary)', borderColor: 'rgba(30,64,175,0.3)' }} /> Extraindo...</> : '🤖 Importar PDF'}
                  </button>
                  {importResult && <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>✓ {importResult.count} questões extraídas!</span>}
                </div>
              </div>
              <div className="lp-card-body">
                <form onSubmit={handleCreateOrUpdateExam} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem' }}>
                    <div className="lp-field">
                      <label className="lp-label">Título da Avaliação</label>
                      <input required value={examTitle} onChange={e => setExamTitle(e.target.value)} className="lp-input" placeholder="Ex: Prova Final de Lógica" />
                    </div>
                    <div className="lp-field">
                      <label className="lp-label">Peso ({examWeight})</label>
                      <input type="number" min="0.1" max="10" step="0.1" required value={examWeight} onChange={e => setExamWeight(parseFloat(e.target.value))} className="lp-input" />
                      <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>Nota = pts × {(examWeight / 10).toFixed(2)}</span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--surface-low)', borderRadius: '6px', padding: '1rem' }}>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--on-surface-muted)', marginBottom: '0.75rem' }}>Configurações de Aplicação</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.625rem' }}>
                      {[
                        { label: 'Mostrar uma questão por vez', val: showOneAtATime, set: setShowOneAtATime },
                        { label: 'Aleatorizar ordem das questões', val: randomizeQuestions, set: setRandomizeQuestions },
                        { label: 'Aleatorizar alternativas', val: randomizeOptions, set: setRandomizeOptions },
                        { label: 'Permitir voltar questões', val: allowBackNavigation, set: setAllowBackNavigation },
                      ].map(({ label, val, set }) => (
                        <label key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                          <input type="checkbox" checked={val} onChange={e => set(e.target.checked)} style={{ accentColor: 'var(--primary)', width: '15px', height: '15px' }} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--outline-subtle)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                    {questions.map((q, qIdx) => (
                      <div key={qIdx} style={{ border: '1px solid var(--outline-subtle)', borderRadius: '8px', padding: '1rem', background: 'var(--surface-card)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)' }}>Questão {qIdx + 1}</span>
                          {questions.length > 1 && <button type="button" onClick={() => removeQuestion(qIdx)} className="btn btn-sm" style={{ color: 'var(--danger)', border: '1px solid rgba(185,28,28,0.3)', background: 'none' }}>Remover</button>}
                        </div>
                        <div className="lp-field" style={{ marginBottom: '0.75rem' }}>
                          <label className="lp-label">Enunciado</label>
                          <textarea required value={q.statement} onChange={e => updateQuestion(qIdx, { statement: e.target.value })} className="lp-input" style={{ minHeight: '64px', resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                          <div className="lp-field">
                            <label className="lp-label">Valor (pts)</label>
                            <select value={q.pointValue} onChange={e => updateQuestion(qIdx, { pointValue: parseFloat(e.target.value) })} className="lp-input" style={{ cursor: 'pointer' }}>
                              <option value={0.5}>0.5 ponto</option><option value={1}>1 ponto</option><option value={1.5}>1.5 pontos</option><option value={2}>2 pontos</option>
                            </select>
                          </div>
                          <div className="lp-field">
                            <label className="lp-label">Modo de Correção</label>
                            <select value={q.scoringMode} onChange={e => updateQuestion(qIdx, { scoringMode: e.target.value as any })} className="lp-input" style={{ cursor: 'pointer' }}>
                              <option value="ALL_REQUIRED">Todas obrigatórias</option><option value="ANY_CORRECT">Qualquer correta vale</option>
                            </select>
                          </div>
                        </div>
                        <div className="lp-field">
                          <label className="lp-label">Alternativas</label>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                                <input type="checkbox" checked={opt.isCorrect} onChange={e => updateOption(qIdx, oIdx, { isCorrect: e.target.checked })} style={{ accentColor: 'var(--primary)', width: '15px', height: '15px', flexShrink: 0 }} />
                                <input type="text" required value={opt.text} onChange={e => updateOption(qIdx, oIdx, { text: e.target.value })} className="lp-input" style={{ flex: 1, fontSize: '0.875rem', ...(opt.isCorrect ? { borderColor: 'rgba(30,64,175,0.5)', background: 'rgba(30,64,175,0.04)' } : {}) }} placeholder={`Opção ${String.fromCharCode(65 + oIdx)}`} />
                                {q.options.length > 2 && <button type="button" onClick={() => removeOption(qIdx, oIdx)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}>×</button>}
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => addOption(qIdx)} style={{ alignSelf: 'flex-start', marginTop: '0.375rem', color: 'var(--primary)', border: 'none', background: 'none', cursor: 'pointer', padding: '2px 0', fontWeight: 600, fontSize: '0.875rem' }}>+ Alternativa</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={() => setQuestions(prev => [...prev, defaultQuestion()])} style={{ padding: '0.75rem', border: '2px dashed var(--outline)', borderRadius: '6px', background: 'none', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--on-surface-variant)' }}>
                    + Adicionar Questão
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                    <button type="submit" className="btn btn-primary">{editingExamId ? '✓ Atualizar Prova' : '✓ Salvar no Banco'}</button>
                  </div>
                </form>
              </div>
            </div>

            {exams.length > 0 && (
              <div className="lp-card">
                <div className="lp-card-header"><h3>Provas Salvas</h3><span className="badge badge-primary">{exams.length}</span></div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="lp-table">
                    <thead><tr><th>Título</th><th>Questões</th><th>Peso</th><th>Config</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
                    <tbody>
                      {exams.map(ex => (
                        <tr key={ex.id}>
                          <td style={{ fontWeight: 600 }}>{ex.title}</td>
                          <td>{ex.questions?.length || 0}</td>
                          <td><span className="badge badge-primary">{ex.weight}</span></td>
                          <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {ex.showOneAtATime && <span className="badge badge-muted">1/VEZ</span>}
                            {ex.randomizeQuestions && <span className="badge badge-muted">RANDOM</span>}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button onClick={() => handleEditExam(ex)} className="btn btn-sm btn-outline">Editar</button>
                              <button onClick={() => { setSelectedExamId(ex.id); setActiveTab('new_room'); }} className="btn btn-sm btn-primary">Aplicar</button>
                              <button onClick={() => handleDeleteExam(ex.id)} style={{ color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.875rem' }}>Excluir</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ABRIR SALA */}
        {activeTab === 'new_room' && (
          <div style={{ maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="lp-page-header">
              <div><h1 className="lp-page-title">Abrir Nova Sala</h1><p className="lp-page-subtitle">Configure e ative uma sessão de avaliação.</p></div>
            </div>
            <div className="lp-card">
              <div className="lp-card-header"><h3>Configuração da Sala</h3></div>
              <div className="lp-card-body">
                <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div className="lp-field">
                    <label className="lp-label">1. Selecione a Prova</label>
                    <select required value={selectedExamId} onChange={e => setSelectedExamId(e.target.value)} className="lp-input" style={{ cursor: 'pointer' }}>
                      <option value="" disabled>-- Selecione uma prova --</option>
                      {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>
                  </div>
                  <div className="lp-field">
                    <label className="lp-label">2. Código da Sala</label>
                    <input required value={newRoomName} onChange={e => setNewRoomName(e.target.value.replace(/\s+/g, '-').toUpperCase())} className="lp-input lp-input-room" placeholder="Ex: MAT-2026" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>Código que os alunos usarão para acessar a avaliação</span>
                  </div>
                  <button type="submit" className="btn btn-primary btn-lg btn-w-full" style={{ marginTop: '0.5rem' }}>Ativar Sala →</button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MONITORAMENTO */}
        {activeTab === 'monitoring' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {!monitoringRoom ? (
              <>
                <div className="lp-page-header">
                  <div><h1 className="lp-page-title">Monitoramento de Salas</h1><p className="lp-page-subtitle">Acompanhe as sessões de avaliação em tempo real.</p></div>
                </div>
                <div className="lp-card">
                  <div style={{ overflowX: 'auto' }}>
                    <table className="lp-table">
                      <thead><tr><th>Sala / Código</th><th>Prova</th><th>Status</th><th style={{ textAlign: 'right' }}>Ações</th></tr></thead>
                      <tbody>
                        {rooms.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--on-surface-muted)', fontSize: '0.875rem', padding: '2rem' }}>Nenhuma sala criada ainda.</td></tr>}
                        {rooms.map(r => (
                          <tr key={r.id}>
                            <td>
                              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)', display: 'block' }}>{r.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-muted)' }}>{new Date(r.createdAt).toLocaleString('pt-BR')}</span>
                            </td>
                            <td style={{ fontSize: '0.875rem' }}>{r.exam?.title}</td>
                            <td>{r.status === 'active' ? <span className="badge badge-success">● Ativa</span> : <span className="badge badge-muted">Encerrada</span>}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button onClick={() => handleMonitorRoom(r)} className="btn btn-sm btn-primary">Monitorar</button>
                                {r.status === 'finished' && <button onClick={() => handleReactivateRoom(r.id)} className="btn btn-sm btn-outline">🔄 Reativar</button>}
                                <button onClick={() => handleDeleteRoom(r.id)} style={{ color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer' }}>🗑</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="lp-page-header">
                  <div>
                    <button onClick={() => { setMonitoringRoom(null); fetchRooms(); }} style={{ fontSize: '0.8125rem', color: 'var(--on-surface-variant)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '0.5rem' }}>← Voltar</button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <h1 className="lp-page-title" style={{ fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--primary)' }}>{monitoringRoom.name}</h1>
                      {monitoringRoom.status === 'active' && <span className="badge badge-live">● AO VIVO</span>}
                    </div>
                    <p className="lp-page-subtitle">{monitoringRoom.exam?.title}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => handleDownloadRoomReport(monitoringRoom.id, monitoringRoom.name)} className="btn btn-outline">📊 Planilha Geral</button>
                    {monitoringRoom.status === 'active' && <button onClick={() => handleFinishRoom(monitoringRoom.id)} className="btn btn-danger-outline">Encerrar Sala</button>}
                  </div>
                </div>
                <div className="lp-stats-grid">
                  {[
                    { label: 'Total', value: sessions.length, color: 'var(--primary)' },
                    { label: 'Finalizaram', value: sessions.filter(s => s.status === 'finished').length, color: 'var(--success)' },
                    { label: 'Ativos', value: sessions.filter(s => s.status === 'active').length, color: 'var(--warning)' },
                    { label: 'Bloqueados', value: sessions.filter(s => s.status === 'blocked').length, color: 'var(--danger)' },
                  ].map(stat => (
                    <div key={stat.label} className="lp-stat-card">
                      <div className="lp-stat-label">{stat.label}</div>
                      <div className="lp-stat-value" style={{ color: stat.color }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>
                  <div className="lp-card">
                    <div className="lp-card-header"><h3>Alunos</h3></div>
                    <div className="lp-card-body">
                      {sessions.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--on-surface-muted)', textAlign: 'center', padding: '2rem 0' }}>Aguardando alunos...</p>}
                      <div className="lp-student-grid">
                        {sessions.map(s => (
                          <div key={s.id} className={`lp-student-card ${s.status === 'blocked' ? 'blocked' : s.status === 'finished' ? 'finished' : ''}`}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.375rem' }}>
                              <div>
                                <div className="lp-student-name">{s.student?.name}</div>
                                <div className="lp-student-email">{s.student?.email}</div>
                              </div>
                              <span className={`badge ${s.status === 'blocked' ? 'badge-danger' : s.status === 'finished' ? 'badge-success' : 'badge-warning'}`}>
                                {s.status === 'blocked' ? 'Bloqueado' : s.status === 'finished' ? 'Finalizado' : 'Ativo'}
                              </span>
                            </div>
                            {s.status === 'finished' && (
                              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', background: 'var(--surface-low)', borderRadius: '4px', padding: '0.5rem', textAlign: 'center' }}>
                                <div style={{ flex: 1 }}><div style={{ fontSize: '0.7rem', color: 'var(--on-surface-muted)', textTransform: 'uppercase' }}>Pontos</div><div style={{ fontWeight: 700 }}>{s.rawScore?.toFixed(1) || '0'}</div></div>
                                <div style={{ flex: 1 }}><div style={{ fontSize: '0.7rem', color: 'var(--on-surface-muted)', textTransform: 'uppercase' }}>Nota Final</div><div style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.finalGrade?.toFixed(2) || '0'}</div></div>
                              </div>
                            )}
                            {s.violationsCount > 0 && <div style={{ marginTop: '0.375rem' }}><span className="badge badge-warning">⚠ {s.violationsCount} infração{s.violationsCount > 1 ? 'ões' : ''}</span></div>}
                            <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.625rem', justifyContent: 'flex-end' }}>
                              {s.status === 'blocked' && monitoringRoom.status === 'active' && <button onClick={() => handleUnblock(s.id)} className="btn btn-sm btn-danger">Desbloquear</button>}
                              {s.status === 'finished' && (
                                <>
                                  <button onClick={() => handleDownloadReport(s.id, s.student?.name)} className="btn btn-sm btn-outline">📂 XLSX</button>
                                  <button onClick={() => handleSendEmail(s.id)} disabled={isSendingEmail === s.id} className="btn btn-sm btn-outline" style={{ color: 'var(--primary)' }}>{isSendingEmail === s.id ? '...' : '📧 Email'}</button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="lp-card">
                    <div className="lp-card-header"><h3>Violações</h3></div>
                    <div style={{ padding: '0.75rem', maxHeight: '480px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {alerts.length === 0 && <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface-muted)', textAlign: 'center', padding: '2rem 0', fontStyle: 'italic' }}>Nenhuma atividade suspeita.</p>}
                      {alerts.map((a, i) => (
                        <div key={i} style={{ background: 'var(--danger-bg)', borderLeft: '3px solid var(--danger)', borderRadius: '4px', padding: '0.625rem 0.75rem' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>⚠ {a.label || a.type}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.studentName}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-muted)', marginTop: '2px', textAlign: 'right' }}>{a.time}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

      
