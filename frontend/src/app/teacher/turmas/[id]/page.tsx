'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Student { id: string; name: string; email: string; joinedAt: string }
interface ClassData {
  id: string; name: string; subject?: string; description?: string; period?: string;
  code: string; createdAt: string;
  students: Student[];
  _count: { students: number };
  lessonPlan?: { id: string; title: string; subject?: string } | null;
}

interface PerformanceData {
  classAverage: number | null; studentsAtRisk: number;
  examResults: { roomId: string; roomName: string; examTitle: string; grades: Record<string, { finalGrade: number | null; status: string }> }[];
  activityResults: { activityId: string; activityTitle: string; submitted: Record<string, { submitted: boolean; grade: number | null }> }[];
  students: { studentId: string; studentName: string; studentEmail: string; average: number | null; examCount: number; activitiesDone: number; totalActivities: number; atRisk: boolean }[];
}

interface AttendanceRecord {
  id: string; date: string; topic?: string; notes?: string;
  entries: { id: string; studentId: string; studentName: string; present: boolean }[];
  _count: { entries: number };
}

type Tab = 'alunos' | 'adicionar' | 'qrcode' | 'desempenho' | 'presencas' | 'plano';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function gradeColor(g: number | null) {
  if (g === null) return 'text-[var(--on-surface-muted)]';
  if (g >= 7) return 'text-green-600';
  if (g >= 5) return 'text-amber-600';
  return 'text-red-500';
}

// ─── Componente Principal ────────────────────────────────────────────────────

export default function TurmaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [token, setToken] = useState('');
  const [cls, setCls] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('alunos');
  const [searchTerm, setSearchTerm] = useState('');

  // Alunos
  const [newStudent, setNewStudent] = useState({ name: '', email: '' });
  const [addingStudent, setAddingStudent] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkResult, setBulkResult] = useState<{ added: number; skipped: number } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', subject: '', period: '', description: '' });

  // Desempenho
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [perfLoading, setPerfLoading] = useState(false);

  // Presenças
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [attLoading, setAttLoading] = useState(false);
  const [showAttModal, setShowAttModal] = useState(false);
  const [newAttDate, setNewAttDate] = useState(todayLocal());
  const [newAttTopic, setNewAttTopic] = useState('');
  const [newAttNotes, setNewAttNotes] = useState('');
  const [openRecord, setOpenRecord] = useState<string | null>(null);
  const [savingAtt, setSavingAtt] = useState(false);

  const API = () => `http://${window.location.hostname}:3001`;

  useEffect(() => {
    const t = localStorage.getItem('teacher_token');
    if (!t) { router.push('/teacher/login'); return; }
    setToken(t);
    fetchClass(t);
  }, [id]);

  const fetchClass = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API()}/classes/${id}`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) {
        const data = await res.json();
        setCls(data);
        setEditForm({ name: data.name, subject: data.subject || '', period: data.period || '', description: data.description || '' });
      } else { router.push('/teacher/turmas'); }
    } finally { setLoading(false); }
  };

  const fetchPerformance = useCallback(async () => {
    if (!token) return;
    setPerfLoading(true);
    const res = await fetch(`${API()}/classes/${id}/performance`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPerformance(await res.json());
    setPerfLoading(false);
  }, [id, token]);

  const fetchAttendance = useCallback(async () => {
    if (!token) return;
    setAttLoading(true);
    const res = await fetch(`${API()}/attendance/class/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setAttendanceRecords(await res.json());
    setAttLoading(false);
  }, [id, token]);

  useEffect(() => {
    if (activeTab === 'desempenho') fetchPerformance();
    if (activeTab === 'presencas') fetchAttendance();
  }, [activeTab]);

  // ─── Handlers Turma ───────────────────────────────────────────────────────

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API()}/classes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setCls(prev => prev ? { ...prev, ...updated } : prev);
      setEditMode(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingStudent(true);
    try {
      const res = await fetch(`${API()}/classes/${id}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newStudent),
      });
      if (res.ok) {
        const student = await res.json();
        setCls(prev => prev ? { ...prev, students: [...prev.students, student], _count: { students: prev._count.students + 1 } } : prev);
        setNewStudent({ name: '', email: '' });
        setActiveTab('alunos');
      } else { const err = await res.json(); alert(err.message || 'Erro ao adicionar aluno.'); }
    } finally { setAddingStudent(false); }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    setBulkLoading(true); setBulkResult(null);
    const students = bulkText.trim().split('\n')
      .map(line => { const p = line.split(',').map(s => s.trim()); return p.length >= 2 ? { name: p[0], email: p[1] } : null; })
      .filter(Boolean) as { name: string; email: string }[];
    if (!students.length) { alert('Formato inválido.'); setBulkLoading(false); return; }
    const res = await fetch(`${API()}/classes/${id}/students/bulk`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ students }),
    });
    if (res.ok) { setBulkResult(await res.json()); setBulkText(''); fetchClass(token); }
    setBulkLoading(false);
  };

  const handleRemoveStudent = async (studentId: string, name: string) => {
    if (!confirm(`Remover "${name}" da turma?`)) return;
    const res = await fetch(`${API()}/classes/${id}/students/${studentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setCls(prev => prev ? { ...prev, students: prev.students.filter(s => s.id !== studentId), _count: { students: prev._count.students - 1 } } : prev);
  };

  // ─── Handlers Presença ────────────────────────────────────────────────────

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls?.students.length) { alert('A turma não tem alunos cadastrados.'); return; }
    setSavingAtt(true);
    const res = await fetch(`${API()}/attendance/class/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: newAttDate, topic: newAttTopic, notes: newAttNotes }),
    });
    if (res.ok) {
      const record = await res.json();
      setAttendanceRecords(prev => [record, ...prev]);
      setShowAttModal(false);
      setNewAttTopic(''); setNewAttNotes('');
      setOpenRecord(record.id);
    } else { const err = await res.json(); alert(err.message || 'Erro ao criar chamada.'); }
    setSavingAtt(false);
  };

  const handleTogglePresence = async (recordId: string, studentId: string, present: boolean) => {
    const res = await fetch(`${API()}/attendance/${recordId}/entry/${studentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ present }),
    });
    if (res.ok) {
      setAttendanceRecords(prev => prev.map(r =>
        r.id === recordId
          ? { ...r, entries: r.entries.map(e => e.studentId === studentId ? { ...e, present } : e) }
          : r
      ));
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!confirm('Excluir esta chamada?')) return;
    const res = await fetch(`${API()}/attendance/${recordId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setAttendanceRecords(prev => prev.filter(r => r.id !== recordId));
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const filteredStudents = cls?.students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const today = todayLocal();
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/entrar/${cls?.code}` : '';

  if (loading) return (
    <div className="min-h-screen bg-[var(--surface-low)] flex items-center justify-center font-montserrat">
      <svg className="animate-spin h-10 w-10 text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );
  if (!cls) return null;

  const TABS = [
    { key: 'alunos', label: `Alunos (${cls._count.students})`, icon: '👥' },
    { key: 'desempenho', label: 'Desempenho', icon: '📊' },
    { key: 'presencas', label: 'Presenças', icon: '✅' },
    { key: 'plano', label: 'Plano de Aula', icon: '📅' },
    { key: 'adicionar', label: 'Adicionar', icon: '➕' },
    { key: 'qrcode', label: 'QR Code', icon: '🔗' },
  ] as const;

  return (
    <div className="min-h-screen bg-[var(--surface-low)] font-montserrat">
      {/* Header */}
      <div className="bg-[var(--surface-card)] border-b border-[var(--outline)] sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <button onClick={() => router.push('/teacher/turmas')}
                className="flex items-center gap-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors font-semibold text-sm flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Turmas
              </button>
              <span className="text-[var(--outline)]">/</span>
              <div className="min-w-0 flex-1">
                {editMode ? (
                  <form onSubmit={handleSaveEdit} className="flex items-center gap-2">
                    <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                      className="px-3 py-1 rounded-lg border border-[var(--primary)] bg-white text-[var(--on-surface)] font-extrabold text-lg outline-none" required autoFocus />
                    <button type="submit" className="px-3 py-1 rounded-lg bg-[var(--primary)] text-white text-sm font-bold">Salvar</button>
                    <button type="button" onClick={() => setEditMode(false)} className="px-3 py-1 rounded-lg border border-[var(--outline)] text-sm font-bold text-[var(--on-surface-variant)]">Cancelar</button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold text-[var(--on-surface)] truncate">{cls.name}</h1>
                    <button onClick={() => setEditMode(true)} className="text-[var(--on-surface-muted)] hover:text-[var(--primary)] transition-colors flex-shrink-0">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {cls.subject && <span className="text-sm text-[var(--primary)] font-semibold">{cls.subject}</span>}
                  {cls.period && <span className="text-sm text-[var(--on-surface-variant)] font-medium">• {cls.period}</span>}
                  {cls.lessonPlan && (
                    <span className="text-xs font-bold bg-[var(--primary-container)] text-[var(--primary)] px-2 py-0.5 rounded-full">
                      📅 {cls.lessonPlan.title}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[var(--primary-container)] px-4 py-2 rounded-xl border border-[var(--primary)]/20 flex-shrink-0">
              <span className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">Código:</span>
              <span className="text-lg font-extrabold text-[var(--primary)] tracking-widest">{cls.code}</span>
              <button onClick={() => navigator.clipboard.writeText(cls.code).then(() => alert('Copiado!'))} className="text-[var(--primary)] hover:text-[var(--primary-hover)]" title="Copiar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key as Tab)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.key ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}`}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">

        {/* ─── TAB: ALUNOS ─────────────────────────────────────────────────── */}
        {activeTab === 'alunos' && (
          <div>
            <div className="relative mb-5">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" placeholder="Buscar aluno..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-card)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all font-medium text-sm" />
            </div>
            {filteredStudents.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)]">
                <div className="text-5xl mb-3">👥</div>
                <h3 className="text-lg font-extrabold text-[var(--on-surface)] mb-1">{searchTerm ? 'Nenhum aluno encontrado' : 'Turma sem alunos'}</h3>
                {!searchTerm && <button onClick={() => setActiveTab('adicionar')} className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold text-sm">Adicionar Alunos</button>}
              </div>
            ) : (
              <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-[var(--outline)] bg-[var(--surface-low)]">
                    <th className="text-left px-5 py-3 text-xs font-extrabold text-[var(--on-surface-variant)] uppercase tracking-wider">#</th>
                    <th className="text-left px-5 py-3 text-xs font-extrabold text-[var(--on-surface-variant)] uppercase tracking-wider">Nome</th>
                    <th className="text-left px-5 py-3 text-xs font-extrabold text-[var(--on-surface-variant)] uppercase tracking-wider">E-mail</th>
                    <th className="text-left px-5 py-3 text-xs font-extrabold text-[var(--on-surface-variant)] uppercase tracking-wider">Matriculado em</th>
                    <th className="px-5 py-3"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-[var(--outline)]">
                    {filteredStudents.map((s, i) => (
                      <tr key={s.id} className="hover:bg-[var(--surface-low)] transition-colors group">
                        <td className="px-5 py-3.5 text-sm font-bold text-[var(--on-surface-muted)]">{i + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-xs font-extrabold">{s.name.charAt(0).toUpperCase()}</div>
                            <span className="font-bold text-[var(--on-surface)] text-sm">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-sm text-[var(--on-surface-variant)] font-medium">{s.email}</td>
                        <td className="px-5 py-3.5 text-sm text-[var(--on-surface-muted)] font-medium">{new Date(s.joinedAt).toLocaleDateString('pt-BR')}</td>
                        <td className="px-5 py-3.5">
                          <button onClick={() => handleRemoveStudent(s.id, s.name)} className="opacity-0 group-hover:opacity-100 text-[var(--on-surface-muted)] hover:text-red-500 transition-all" title="Remover">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: DESEMPENHO ─────────────────────────────────────────────── */}
        {activeTab === 'desempenho' && (
          <div>
            {perfLoading ? (
              <div className="flex justify-center py-20">
                <svg className="animate-spin h-10 w-10 text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : !performance ? (
              <div className="text-center py-20 text-[var(--on-surface-variant)] font-semibold">Erro ao carregar desempenho.</div>
            ) : (
              <>
                {/* Cards de Resumo */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Média da Turma', value: performance.classAverage !== null ? `${performance.classAverage}` : '—', unit: performance.classAverage !== null ? '/10' : '', icon: '📊', color: performance.classAverage !== null && performance.classAverage >= 6 ? '#10b981' : '#ef4444' },
                    { label: 'Alunos em Risco', value: String(performance.studentsAtRisk), unit: ` de ${performance.students.length}`, icon: '⚠️', color: performance.studentsAtRisk > 0 ? '#f59e0b' : '#10b981' },
                    { label: 'Avaliações Aplicadas', value: String(performance.examResults.length), unit: ` + ${performance.activityResults.length} atividades`, icon: '📝', color: 'var(--primary)' },
                  ].map(card => (
                    <div key={card.label} className="bg-[var(--surface-card)] rounded-2xl p-5 border border-[var(--outline)] text-center shadow-sm">
                      <div className="text-3xl mb-2">{card.icon}</div>
                      <div className="text-2xl font-extrabold" style={{ color: card.color }}>
                        {card.value}<span className="text-sm font-semibold text-[var(--on-surface-muted)]">{card.unit}</span>
                      </div>
                      <div className="text-xs text-[var(--on-surface-variant)] font-bold mt-1">{card.label}</div>
                    </div>
                  ))}
                </div>

                {/* Tabela de desempenho */}
                {performance.students.length === 0 ? (
                  <div className="text-center py-16 bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)]">
                    <p className="text-[var(--on-surface-variant)] font-semibold">Nenhum aluno na turma.</p>
                  </div>
                ) : (
                  <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-max">
                        <thead>
                          <tr className="border-b border-[var(--outline)] bg-[var(--surface-low)]">
                            <th className="text-left px-5 py-3 text-xs font-extrabold text-[var(--on-surface-variant)] uppercase tracking-wider sticky left-0 bg-[var(--surface-low)]">Aluno</th>
                            <th className="text-center px-4 py-3 text-xs font-extrabold text-[var(--on-surface-variant)] uppercase tracking-wider">Média</th>
                            {performance.examResults.map(e => (
                              <th key={e.roomId} className="text-center px-4 py-3 text-xs font-extrabold text-[var(--primary)] uppercase tracking-wider max-w-[100px]">
                                <div className="truncate max-w-[90px]" title={e.examTitle}>{e.examTitle}</div>
                              </th>
                            ))}
                            {performance.activityResults.map(a => (
                              <th key={a.activityId} className="text-center px-4 py-3 text-xs font-extrabold text-[var(--accent)] uppercase tracking-wider">
                                <div className="truncate max-w-[90px]" title={a.activityTitle}>{a.activityTitle}</div>
                              </th>
                            ))}
                            <th className="text-center px-4 py-3 text-xs font-extrabold text-[var(--on-surface-variant)] uppercase tracking-wider">Atividades</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--outline)]">
                          {performance.students.map(student => (
                            <tr key={student.studentId} className={`hover:bg-[var(--surface-low)] transition-colors ${student.atRisk ? 'bg-red-50/30' : ''}`}>
                              <td className="px-5 py-3.5 sticky left-0 bg-[var(--surface-card)]">
                                <div className="flex items-center gap-2">
                                  {student.atRisk && <span title="Em risco" className="text-red-500 flex-shrink-0">⚠️</span>}
                                  <div>
                                    <p className="font-bold text-[var(--on-surface)] text-sm">{student.studentName}</p>
                                    <p className="text-xs text-[var(--on-surface-muted)]">{student.studentEmail}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <span className={`text-base font-extrabold ${gradeColor(student.average)}`}>
                                  {student.average !== null ? student.average : '—'}
                                </span>
                              </td>
                              {performance.examResults.map(exam => {
                                const g = exam.grades[student.studentEmail];
                                return (
                                  <td key={exam.roomId} className="px-4 py-3.5 text-center">
                                    {g ? (
                                      <span className={`text-sm font-bold ${gradeColor(g.finalGrade)}`}>
                                        {g.finalGrade !== null ? g.finalGrade : '—'}
                                      </span>
                                    ) : <span className="text-xs text-[var(--on-surface-muted)]">N/A</span>}
                                  </td>
                                );
                              })}
                              {performance.activityResults.map(act => (
                                <td key={act.activityId} className="px-4 py-3.5 text-center">
                                  <span className={`text-sm font-bold ${act.submitted[student.studentEmail]?.submitted ? (act.submitted[student.studentEmail]?.grade !== null ? gradeColor(act.submitted[student.studentEmail]?.grade!) : 'text-green-600') : 'text-[var(--on-surface-muted)]'}`}>
                                    {act.submitted[student.studentEmail]?.submitted ? (act.submitted[student.studentEmail]?.grade !== null ? act.submitted[student.studentEmail]?.grade : '✅') : '—'}
                                  </span>
                                </td>
                              ))}
                              <td className="px-4 py-3.5 text-center text-sm font-bold text-[var(--on-surface-variant)]">
                                {student.activitiesDone}/{student.totalActivities}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ─── TAB: PRESENÇAS ──────────────────────────────────────────────── */}
        {activeTab === 'presencas' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-extrabold text-[var(--on-surface)]">Controle de Presença</h2>
                <p className="text-sm text-[var(--on-surface-variant)] font-medium">{attendanceRecords.length} chamada(s) registrada(s)</p>
              </div>
              <button onClick={() => setShowAttModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm shadow hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nova Chamada
              </button>
            </div>

            {attLoading ? (
              <div className="flex justify-center py-20">
                <svg className="animate-spin h-8 w-8 text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
              </div>
            ) : attendanceRecords.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)]">
                <div className="text-5xl mb-3">📋</div>
                <h3 className="text-lg font-extrabold text-[var(--on-surface)] mb-1">Nenhuma chamada registrada</h3>
                <p className="text-sm text-[var(--on-surface-variant)] font-medium mb-4">Registre a presença dos alunos em cada aula.</p>
                <button onClick={() => setShowAttModal(true)} className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold text-sm">Fazer Chamada</button>
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceRecords.map(record => {
                  const presentCount = record.entries.filter(e => e.present).length;
                  const total = record.entries.length;
                  const pct = total > 0 ? Math.round((presentCount / total) * 100) : 0;
                  const isOpen = openRecord === record.id;

                  return (
                    <div key={record.id} className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] overflow-hidden shadow-sm">
                      <div
                        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--surface-low)] transition-colors"
                        onClick={() => setOpenRecord(prev => prev === record.id ? null : record.id)}>
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                            {formatDate(record.date).substring(0, 5)}
                          </div>
                          <div>
                            <p className="font-extrabold text-[var(--on-surface)] text-sm">{formatDate(record.date)}</p>
                            {record.topic && <p className="text-xs text-[var(--primary)] font-semibold">{record.topic}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-[var(--outline)] rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-sm font-extrabold text-[var(--on-surface)]">{presentCount}/{total}</span>
                            </div>
                            <p className="text-xs text-[var(--on-surface-muted)] font-semibold mt-0.5">{pct}% presentes</p>
                          </div>
                          <button onClick={e => { e.stopPropagation(); handleDeleteRecord(record.id); }}
                            className="p-2 rounded-lg border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-red-500 hover:border-red-300 transition-colors">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          </button>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[var(--on-surface-variant)] transition-transform ${isOpen ? 'rotate-90' : ''}`}>
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="border-t border-[var(--outline)]">
                          {record.notes && (
                            <div className="px-5 py-3 bg-amber-50/50 border-b border-amber-100">
                              <p className="text-xs font-bold text-amber-700 mb-0.5">📓 Observações:</p>
                              <p className="text-sm text-amber-800 font-medium">{record.notes}</p>
                            </div>
                          )}
                          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 p-4">
                            {record.entries.map(entry => (
                              <button
                                key={entry.studentId}
                                onClick={() => handleTogglePresence(record.id, entry.studentId, !entry.present)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                                  entry.present
                                    ? 'border-green-400 bg-green-50 text-green-800'
                                    : 'border-red-300 bg-red-50 text-red-700'
                                }`}>
                                <span className="text-base">{entry.present ? '✅' : '❌'}</span>
                                <span className="font-bold text-sm truncate">{entry.studentName}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Modal Nova Chamada */}
            {showAttModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--outline)] overflow-hidden">
                  <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-lg font-extrabold text-[var(--on-surface)]">Nova Chamada</h2>
                      <button onClick={() => setShowAttModal(false)} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                    <form onSubmit={handleCreateRecord} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Data da Aula *</label>
                        <input type="date" required max={today} value={newAttDate} onChange={e => setNewAttDate(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold" />
                        <p className="text-xs text-[var(--on-surface-muted)] mt-1 font-medium">⚠️ Não é possível registrar chamada para datas futuras.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Conteúdo da Aula</label>
                        <input type="text" placeholder="Ex: Introdução a Derivadas" value={newAttTopic} onChange={e => setNewAttTopic(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] outline-none transition-all text-sm font-semibold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Observações (Diário)</label>
                        <textarea rows={2} placeholder="Anotações gerais sobre a aula..." value={newAttNotes} onChange={e => setNewAttNotes(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] outline-none transition-all text-sm font-semibold resize-none" />
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => setShowAttModal(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm">Cancelar</button>
                        <button type="submit" disabled={savingAtt} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm disabled:opacity-70">
                          {savingAtt ? 'Criando...' : 'Iniciar Chamada'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: PLANO DE AULA ──────────────────────────────────────────── */}
        {activeTab === 'plano' && (
          <div>
            {!cls.lessonPlan ? (
              <div className="flex flex-col items-center py-20 text-center bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)]">
                <div className="text-5xl mb-3">📅</div>
                <h3 className="text-lg font-extrabold text-[var(--on-surface)] mb-2">Nenhum plano vinculado</h3>
                <p className="text-sm text-[var(--on-surface-variant)] font-medium mb-6 max-w-sm">
                  Crie um plano de disciplina na seção <strong>Planos de Aula</strong> e vincule-o a esta turma.
                </p>
                <button onClick={() => router.push('/teacher/planos')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold shadow hover:shadow-lg transition-all">
                  Ir para Planos de Aula
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)]">
                <div className="text-4xl mb-3">📅</div>
                <h3 className="text-lg font-extrabold text-[var(--on-surface)] mb-1">{cls.lessonPlan.title}</h3>
                {cls.lessonPlan.subject && <p className="text-sm text-[var(--primary)] font-semibold mb-4">{cls.lessonPlan.subject}</p>}
                <button onClick={() => router.push(`/teacher/planos/${cls.lessonPlan!.id}`)}
                  className="px-6 py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold text-sm hover:bg-[var(--primary-hover)] transition-colors">
                  Abrir Plano Completo
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: ADICIONAR ──────────────────────────────────────────────── */}
        {activeTab === 'adicionar' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] p-6">
              <h3 className="font-extrabold text-[var(--on-surface)] text-lg mb-1">Adicionar Individualmente</h3>
              <p className="text-sm text-[var(--on-surface-variant)] font-medium mb-5">Cadastre um aluno por vez.</p>
              <form onSubmit={handleAddStudent} className="space-y-4">
                {[{ label: 'Nome Completo *', key: 'name', type: 'text', placeholder: 'João Silva', value: newStudent.name, onChange: (v: string) => setNewStudent(p => ({ ...p, name: v })) },
                  { label: 'E-mail *', key: 'email', type: 'email', placeholder: 'aluno@email.com', value: newStudent.email, onChange: (v: string) => setNewStudent(p => ({ ...p, email: v })) }].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">{f.label}</label>
                    <input type={f.type} required placeholder={f.placeholder} value={f.value} onChange={e => f.onChange(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold" />
                  </div>
                ))}
                <button type="submit" disabled={addingStudent} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-70">
                  {addingStudent ? 'Adicionando...' : 'Adicionar Aluno'}
                </button>
              </form>
            </div>
            <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] p-6">
              <h3 className="font-extrabold text-[var(--on-surface)] text-lg mb-1">Importar em Massa</h3>
              <p className="text-sm text-[var(--on-surface-variant)] font-medium mb-5">
                Formato: <code className="bg-[var(--surface-low)] px-1.5 py-0.5 rounded text-xs font-mono">Nome, email</code> (um por linha)
              </p>
              <textarea rows={8} placeholder={`João Silva, joao@email.com\nMaria Souza, maria@email.com`} value={bulkText} onChange={e => setBulkText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-mono resize-none mb-3" />
              {bulkResult && (
                <div className="flex gap-3 mb-3">
                  <span className="flex-1 text-center py-2 rounded-lg bg-green-50 text-green-700 font-bold text-sm border border-green-200">✅ {bulkResult.added} adicionados</span>
                  {bulkResult.skipped > 0 && <span className="flex-1 text-center py-2 rounded-lg bg-amber-50 text-amber-700 font-bold text-sm border border-amber-200">⚠️ {bulkResult.skipped} ignorados</span>}
                </div>
              )}
              <button onClick={handleBulkAdd} disabled={bulkLoading || !bulkText.trim()} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover,var(--accent))] text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50">
                {bulkLoading ? 'Importando...' : 'Importar Lista'}
              </button>
            </div>
          </div>
        )}

        {/* ─── TAB: QR CODE ────────────────────────────────────────────────── */}
        {activeTab === 'qrcode' && (
          <div className="flex flex-col items-center">
            <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] p-8 text-center max-w-md w-full">
              <h3 className="font-extrabold text-[var(--on-surface)] text-xl mb-2">Compartilhar Turma</h3>
              <p className="text-sm text-[var(--on-surface-variant)] font-medium mb-6">Alunos escaneiam o QR Code ou usam o código para entrar.</p>
              <div className="bg-white p-4 rounded-2xl border border-[var(--outline)] inline-block mb-6 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}&bgcolor=ffffff&color=0B1E3F`} alt="QR Code" width={200} height={200} className="rounded-xl" />
              </div>
              <div className="bg-[var(--primary-container)] rounded-xl p-4 mb-5 border border-[var(--primary)]/20">
                <p className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-1.5">Código da Turma</p>
                <p className="text-3xl font-extrabold tracking-widest text-[var(--primary)]">{cls.code}</p>
              </div>
              <div className="bg-[var(--surface-low)] rounded-xl p-3 border border-[var(--outline)] flex items-center gap-2">
                <p className="flex-1 text-xs font-mono text-[var(--on-surface-variant)] truncate">{joinUrl}</p>
                <button onClick={() => navigator.clipboard.writeText(joinUrl).then(() => alert('Copiado!'))} className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors">Copiar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
