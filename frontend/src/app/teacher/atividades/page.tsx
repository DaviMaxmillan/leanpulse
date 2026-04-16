'use client';
import { getApiUrl as API } from '../../../lib/api';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ClassItem { id: string; name: string; subject?: string }
interface Activity {
  id: string; title: string; type: string; code: string; isOpen: boolean; createdAt: string; dueDate?: string;
  class: { name: string; subject?: string };
  _count: { submissions: number };
}

type QuestionType = 'TEXT' | 'MULTIPLE_CHOICE' | 'FILE';
interface QuestionDraft {
  statement: string;
  type: QuestionType;
  options: string[];
}

const defaultQuestion = (): QuestionDraft => ({ statement: '', type: 'TEXT', options: ['', ''] });

export default function AtividadesPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal criar
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'EXERCISE', classId: '', dueDate: '' });
  const [questions, setQuestions] = useState<QuestionDraft[]>([defaultQuestion()]);
  const [file, setFile] = useState<File | null>(null);

  // IA State
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState(3);
  const [generatingAi, setGeneratingAi] = useState(false);

  

  useEffect(() => {
    const t = localStorage.getItem('teacher_token');
    if (!t) { router.push('/teacher/login'); return; }
    setToken(t);
    Promise.all([fetchActivities(t), fetchClasses(t)]).finally(() => setLoading(false));
  }, [router]);

  const fetchActivities = async (t: string) => {
    const res = await fetch(`${API()}/activities`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setActivities(await res.json());
  };

  const fetchClasses = async (t: string) => {
    const res = await fetch(`${API()}/classes`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setClasses(await res.json());
  };

  const handleGenerateAi = async () => {
    if (!aiTopic.trim()) { alert('Digite um tópico para a IA!'); return; }
    setGeneratingAi(true);
    try {
      const res = await fetch(`${API()}/ai/generate-activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ topic: aiTopic, count: aiCount })
      });
      if (res.ok) {
        const generated = await res.json();
        // format them
        const newQuestions: QuestionDraft[] = generated.map((q: any) => ({
          statement: q.statement,
          type: q.type as QuestionType,
          options: q.options || ['', '']
        }));
        
        // Append to questions (if only 1 default empty question, replace it)
        if (questions.length === 1 && !questions[0].statement.trim()) {
          setQuestions(newQuestions);
        } else {
          setQuestions(prev => [...prev, ...newQuestions]);
        }
        setShowAiInput(false);
        setAiTopic('');
      } else {
        const err = await res.json();
        alert('Erro ao gerar questões: ' + err.message);
      }
    } catch(e: any) {
      alert('Erro inesperado: ' + e.message);
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classId) { alert('Selecione uma turma.'); return; }
    if (questions.some(q => !q.statement.trim())) { alert('Todas as questões precisam ter um enunciado.'); return; }
    if (questions.some(q => q.type === 'MULTIPLE_CHOICE' && q.options.filter(o => o.trim()).length < 2)) {
      alert('Questões de múltipla escolha precisam de pelo menos 2 opções.'); return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate || undefined,
        questions: questions.map((q, i) => ({
          statement: q.statement,
          type: q.type,
          order: i,
          options: q.type === 'MULTIPLE_CHOICE' ? q.options.filter(o => o.trim()).map(text => ({ text })) : [],
        })),
      };

      const formData = new FormData();
      formData.append('payload', JSON.stringify(payload));
      if (file) {
        formData.append('files', file);
      }

      const res = await fetch(`${API()}/activities`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }, // fetch configurará multipart automagicamente sem o Content-Type
        body: formData,
      });
      if (res.ok) {
        const created = await res.json();
        setActivities(prev => [created, ...prev]);
        setShowModal(false);
        setForm({ title: '', description: '', type: 'EXERCISE', classId: '', dueDate: '' });
        setQuestions([defaultQuestion()]);
        setFile(null);
      } else {
        const err = await res.json();
        alert(err.message || 'Erro ao criar atividade.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string) => {
    const res = await fetch(`${API()}/activities/${id}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setActivities(prev => prev.map(a => a.id === id ? { ...a, isOpen: !a.isOpen } : a));
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir a atividade "${title}" e todas as respostas?`)) return;
    const res = await fetch(`${API()}/activities/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setActivities(prev => prev.filter(a => a.id !== id));
  };

  const updateQuestion = (idx: number, patch: Partial<QuestionDraft>) =>
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));

  const updateOption = (qIdx: number, oIdx: number, value: string) =>
    setQuestions(prev => prev.map((q, i) => i === qIdx ? { ...q, options: q.options.map((o, j) => j === oIdx ? value : o) } : q));

  const filtered = activities.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.class.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const typeLabel = (t: string) => t === 'EXERCISE' ? '✏️ Exercício' : '📊 Enquete';
  const typeColor = (t: string) => t === 'EXERCISE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';

  return (
    <div className="min-h-screen bg-[var(--surface-low)] font-montserrat">
      {/* Header */}
      <div className="bg-[var(--surface-card)] border-b border-[var(--outline)] px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/teacher')}
            className="flex items-center gap-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors font-semibold text-sm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Dashboard
          </button>
          <span className="text-[var(--outline)]">/</span>
          <h1 className="text-lg font-extrabold text-[var(--on-surface)] tracking-tight">Exercícios & Atividades</h1>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm shadow hover:shadow-lg hover:-translate-y-0.5 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Atividade
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total', value: activities.length, icon: '📋', color: 'var(--primary)' },
            { label: 'Abertas', value: activities.filter(a => a.isOpen).length, icon: '🟢', color: '#10b981' },
            { label: 'Respostas', value: activities.reduce((s, a) => s + a._count.submissions, 0), icon: '📝', color: 'var(--accent)' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--surface-card)] rounded-2xl p-4 border border-[var(--outline)] shadow-sm text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-[var(--on-surface-variant)] font-bold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar atividade ou turma..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-card)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all font-medium text-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-10 w-10 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">✏️</div>
            <h3 className="text-xl font-extrabold text-[var(--on-surface)] mb-2">{searchTerm ? 'Nenhuma atividade encontrada' : 'Nenhuma atividade criada'}</h3>
            <p className="text-[var(--on-surface-variant)] font-medium mb-6 max-w-sm">{searchTerm ? 'Tente outro termo.' : 'Crie exercícios e atividades participativas para suas turmas.'}</p>
            {!searchTerm && <button onClick={() => setShowModal(true)} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold shadow hover:shadow-lg transition-all">Criar Primeira Atividade</button>}
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(activity => (
              <div key={activity.id} className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-extrabold text-base flex-shrink-0">
                    {activity.type === 'EXERCISE' ? '✏️' : '📊'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-[var(--on-surface)] text-base">{activity.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${typeColor(activity.type)}`}>{typeLabel(activity.type)}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${activity.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {activity.isOpen ? '● Aberta' : '○ Fechada'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--primary)] font-bold mt-0.5">{activity.class.name}{activity.class.subject ? ` · ${activity.class.subject}` : ''}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-[var(--on-surface-muted)] font-semibold">
                      <span>📝 {activity._count.submissions} resposta(s)</span>
                      {activity.dueDate && <span>📅 Prazo: {new Date(activity.dueDate).toLocaleDateString('pt-BR')}</span>}
                      <span>🔑 <span className="font-mono font-extrabold text-[var(--accent)]">{activity.code}</span></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => router.push(`/teacher/atividades/${activity.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white font-bold text-xs hover:bg-[var(--primary-hover)] transition-colors">
                    Ver Detalhes
                  </button>
                  <button onClick={() => handleToggle(activity.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${activity.isOpen ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                    {activity.isOpen ? 'Fechar' : 'Abrir'}
                  </button>
                  <button onClick={() => handleDelete(activity.id, activity.title)}
                    className="p-2 rounded-lg border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-red-500 hover:border-red-400 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Criar Atividade */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-2xl border border-[var(--outline)] overflow-hidden my-4">
            <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-extrabold text-[var(--on-surface)]">Nova Atividade</h2>
                <button onClick={() => setShowModal(false)} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                {/* Meta da atividade */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Título *</label>
                    <input type="text" required placeholder="Ex: Lista de Exercícios 3" value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Turma *</label>
                    <select required value={form.classId} onChange={e => setForm(p => ({ ...p, classId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold">
                      <option value="">Selecione a turma...</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.subject ? ` — ${c.subject}` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Tipo</label>
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold">
                      <option value="EXERCISE">✏️ Exercício</option>
                      <option value="POLL">📊 Enquete / Participação</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Prazo (opcional)</label>
                    <input type="datetime-local" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Descrição</label>
                    <textarea rows={2} placeholder="Instruções adicionais..." value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Material (Upload)</label>
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] hover:border-[var(--primary)] transition-all cursor-pointer text-sm font-semibold w-full">
                      <div className="bg-[var(--primary-container)] text-[var(--primary)] px-3 py-1 rounded-lg text-xs">
                        Adicionar Arquivo
                      </div>
                      <span className="truncate flex-1 text-[var(--on-surface-muted)]">
                        {file ? file.name : "Nenhum arquivo selecionado"}
                      </span>
                      <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                </div>

                {/* Questões */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-extrabold text-[var(--on-surface-variant)] uppercase tracking-wider">Questões ({questions.length})</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowAiInput(!showAiInput)}
                        className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:text-purple-600 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                        Gerar com IA
                      </button>
                      <button type="button" onClick={() => setQuestions(prev => [...prev, defaultQuestion()])}
                        className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Adicionar Questão
                      </button>
                    </div>
                  </div>

                  {/* Formulário IA */}
                  {showAiInput && (
                    <div className="bg-gradient-to-r from-purple-50 to-[var(--surface-low)] border border-purple-200 rounded-xl p-4 mb-4 shadow-sm relative">
                      <button type="button" onClick={() => setShowAiInput(false)} className="absolute top-2 right-2 text-purple-400 hover:text-purple-600">✕</button>
                      <h4 className="text-sm font-extrabold text-purple-800 mb-2 flex items-center gap-2">✨ Inteligência Artificial</h4>
                      <p className="text-xs text-purple-600 font-medium mb-3">A IA irá formular um misto de questões dissertativas e alternativas sobre o tópico.</p>
                      
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <input type="text" placeholder="Ex: Fotossíntese e ciclo do carbono" value={aiTopic} onChange={e => setAiTopic(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-purple-200 text-[var(--on-surface)] placeholder-purple-300 outline-none focus:border-purple-400 text-sm font-semibold transition-colors shadow-sm" />
                        </div>
                        <div className="w-24">
                          <input type="number" min="1" max="15" value={aiCount} onChange={e => setAiCount(Number(e.target.value))} title="Quantidade"
                            className="w-full px-3 py-2 rounded-lg border border-purple-200 text-[var(--on-surface)] outline-none focus:border-purple-400 text-sm font-semibold transition-colors shadow-sm text-center" />
                        </div>
                        <button type="button" onClick={handleGenerateAi} disabled={generatingAi || !aiTopic.trim()}
                          className="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors disabled:opacity-50 flex-shrink-0 flex items-center shadow">
                          {generatingAi ? '⏳ Gerando...' : 'Formular'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {questions.map((q, qi) => (
                      <div key={qi} className="bg-[var(--surface-low)] rounded-xl p-4 border border-[var(--outline)]">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-extrabold text-[var(--primary)] w-6 h-6 rounded-full bg-[var(--primary-container)] flex items-center justify-center">{qi + 1}</span>
                          <span className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">Tópico de Desenvolvimento</span>
                          {questions.length > 1 && (
                            <button type="button" onClick={() => setQuestions(prev => prev.filter((_, i) => i !== qi))}
                              className="ml-auto text-xs text-red-500 hover:text-red-700 font-bold bg-red-50 px-2 py-1 rounded-md">Remover</button>
                          )}
                        </div>
                        <textarea required placeholder={`Descreva o que o aluno deve desenvolver no tópico ${qi + 1}...`} value={q.statement}
                          rows={2}
                          onChange={e => updateQuestion(qi, { statement: e.target.value, type: 'TEXT', options: [] })}
                          className="w-full px-3 py-2 rounded-lg border border-[var(--outline)] bg-[var(--surface-card)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] outline-none focus:border-[var(--primary)] text-sm font-semibold transition-colors resize-none" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm hover:bg-[var(--surface-low)] transition-colors">
                    Cancelar
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-70">
                    {saving ? 'Criando...' : 'Criar Atividade'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

