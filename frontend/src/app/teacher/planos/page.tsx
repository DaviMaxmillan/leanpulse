'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ClassItem { id: string; name: string; subject?: string }
interface LessonPlan {
  id: string; title: string; subject?: string; description?: string; createdAt: string;
  _count: { lessons: number; classes: number };
  classes: { id: string; name: string; subject?: string }[];
}

export default function PlanosPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', subject: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const API = () => `${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}`;

  useEffect(() => {
    const t = localStorage.getItem('teacher_token');
    if (!t) { router.push('/teacher/login'); return; }
    setToken(t);
    Promise.all([fetchPlans(t), fetchClasses(t)]).finally(() => setLoading(false));
  }, [router]);

  const fetchPlans = async (t: string) => {
    const res = await fetch(`${API()}/lesson-plans`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setPlans(await res.json());
  };

  const fetchClasses = async (t: string) => {
    const res = await fetch(`${API()}/classes`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setClasses(await res.json());
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`${API()}/lesson-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const plan = await res.json();
      setPlans(prev => [plan, ...prev]);
      setShowModal(false);
      setForm({ title: '', subject: '', description: '' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir o plano "${title}"?`)) return;
    const res = await fetch(`${API()}/lesson-plans/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPlans(prev => prev.filter(p => p.id !== id));
  };

  const filtered = plans.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-lg font-extrabold text-[var(--on-surface)]">Planos de Aula</h1>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm shadow hover:shadow-lg hover:-translate-y-0.5 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Novo Plano
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Planos', value: plans.length, icon: '📅' },
            { label: 'Aulas criadas', value: plans.reduce((s, p) => s + p._count.lessons, 0), icon: '🏫' },
            { label: 'Turmas com plano', value: plans.reduce((s, p) => s + p._count.classes, 0), icon: '🎓' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--surface-card)] rounded-2xl p-4 border border-[var(--outline)] text-center shadow-sm">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold text-[var(--primary)]">{s.value}</div>
              <div className="text-xs text-[var(--on-surface-variant)] font-bold mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-muted)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="Buscar plano..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-card)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all font-medium text-sm" />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-10 w-10 text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-extrabold text-[var(--on-surface)] mb-2">{searchTerm ? 'Nenhum plano encontrado' : 'Nenhum plano criado'}</h3>
            <p className="text-[var(--on-surface-variant)] font-medium max-w-sm mb-6">{searchTerm ? 'Tente outro termo.' : 'Crie planos de disciplina e vincule-os às suas turmas.'}</p>
            {!searchTerm && <button onClick={() => setShowModal(true)} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold shadow hover:shadow-lg transition-all">Criar Primeiro Plano</button>}
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map(plan => (
              <div key={plan.id} className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-2xl flex-shrink-0">📅</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-[var(--on-surface)] text-base">{plan.title}</span>
                      {plan.subject && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[var(--primary-container)] text-[var(--primary)]">{plan.subject}</span>}
                    </div>
                    {plan.description && <p className="text-sm text-[var(--on-surface-variant)] font-medium mt-0.5 truncate">{plan.description}</p>}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-[var(--on-surface-muted)] font-semibold flex-wrap">
                      <span>🏫 {plan._count.lessons} aula(s)</span>
                      <span>🎓 {plan._count.classes} turma(s)</span>
                      {plan.classes.length > 0 && (
                        <span className="text-[var(--primary)] font-bold">
                          {plan.classes.map(c => c.name).join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => router.push(`/teacher/planos/${plan.id}`)}
                    className="px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-bold text-xs hover:bg-[var(--primary-hover)] transition-colors">
                    Abrir
                  </button>
                  <button onClick={() => handleDelete(plan.id, plan.title)}
                    className="p-2 rounded-lg border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-red-500 hover:border-red-400 transition-colors">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Criar Plano */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--outline)] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold text-[var(--on-surface)]">Novo Plano de Aula</h2>
                <button onClick={() => setShowModal(false)} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Título do Plano *</label>
                  <input type="text" required placeholder="Ex: Plano de Cálculo II — 2025/1" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Disciplina</label>
                  <input type="text" placeholder="Ex: Cálculo Diferencial e Integral II" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Descrição</label>
                  <textarea rows={2} placeholder="Objetivos gerais do plano..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] outline-none transition-all text-sm font-semibold resize-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm disabled:opacity-70">{saving ? 'Criando...' : 'Criar Plano'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

