'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Class {
  id: string;
  name: string;
  subject?: string;
  description?: string;
  period?: string;
  code: string;
  createdAt: string;
  _count: { students: number };
}

export default function TurmasPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', subject: '', period: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('teacher_token');
    if (!t) { router.push('/teacher/login'); return; }
    setToken(t);
    fetchClasses(t);
  }, [router]);

  const fetchClasses = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/classes`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) setClasses(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const created = await res.json();
        setClasses(prev => [created, ...prev]);
        setShowModal(false);
        setForm({ name: '', subject: '', period: '', description: '' });
      } else {
        alert('Erro ao criar turma.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClone = async (id: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/classes/${id}/clone`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const cloned = await res.json();
      setClasses(prev => [cloned, ...prev]);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a turma "${name}"?\n\nTodos os alunos matriculados serão removidos.`)) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/classes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setClasses(prev => prev.filter(c => c.id !== id));
  };

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--surface-low)] font-montserrat">
      {/* Header */}
      <div className="bg-[var(--surface-card)] border-b border-[var(--outline)] px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/teacher')}
            className="flex items-center gap-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors font-semibold text-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Dashboard
          </button>
          <span className="text-[var(--outline)]">/</span>
          <h1 className="text-lg font-extrabold text-[var(--on-surface)] tracking-tight">Minhas Turmas</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm shadow hover:shadow-lg hover:-translate-y-0.5 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nova Turma
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Turmas Ativas', value: classes.length, icon: '🏫', color: 'var(--primary)' },
            { label: 'Total de Alunos', value: classes.reduce((a, c) => a + c._count.students, 0), icon: '👥', color: 'var(--accent)' },
            { label: 'Média por Turma', value: classes.length ? Math.round(classes.reduce((a, c) => a + c._count.students, 0) / classes.length) : 0, icon: '📊', color: '#8B5CF6' },
            { label: 'Turmas Criadas', value: classes.length, icon: '📅', color: '#059669' },
          ].map(stat => (
            <div key={stat.label} className="bg-[var(--surface-card)] rounded-2xl p-4 border border-[var(--outline)] shadow-sm">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-extrabold" style={{ color: stat.color }}>{stat.value}</div>
              <div className="text-xs text-[var(--on-surface-variant)] font-semibold mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-muted)]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou disciplina..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-card)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all font-medium text-sm"
          />
        </div>

        {/* Grid de Turmas */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <svg className="animate-spin h-10 w-10 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <span className="text-[var(--on-surface-variant)] font-semibold">Carregando turmas...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-xl font-extrabold text-[var(--on-surface)] mb-2">
              {searchTerm ? 'Nenhuma turma encontrada' : 'Nenhuma turma criada ainda'}
            </h3>
            <p className="text-[var(--on-surface-variant)] font-medium mb-6 max-w-sm">
              {searchTerm ? 'Tente outro termo de busca.' : 'Crie sua primeira turma e comece a organizar seus alunos.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold shadow hover:shadow-lg transition-all"
              >
                Criar Primeira Turma
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(cls => (
              <div key={cls.id} className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden">
                {/* Card Header */}
                <div className="h-2 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-[var(--on-surface)] text-lg truncate">{cls.name}</h3>
                      {cls.subject && <p className="text-sm text-[var(--primary)] font-semibold mt-0.5">{cls.subject}</p>}
                    </div>
                    <span className="flex-shrink-0 ml-3 px-2.5 py-1 rounded-lg bg-[var(--primary-container)] text-[var(--primary)] text-xs font-extrabold tracking-wider">
                      {cls.code}
                    </span>
                  </div>

                  {cls.description && (
                    <p className="text-sm text-[var(--on-surface-variant)] font-medium line-clamp-2 mb-3">{cls.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-[var(--on-surface-variant)] font-semibold mb-4">
                    <span className="flex items-center gap-1.5">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                      {cls._count.students} aluno{cls._count.students !== 1 ? 's' : ''}
                    </span>
                    {cls.period && (
                      <span className="flex items-center gap-1.5">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {cls.period}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-[var(--outline)]">
                    <button
                      onClick={() => router.push(`/teacher/turmas/${cls.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--primary)] text-white font-bold text-xs hover:bg-[var(--primary-hover)] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      Abrir Turma
                    </button>
                    <button
                      onClick={() => handleClone(cls.id)}
                      title="Clonar turma"
                      className="p-2 rounded-lg border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(cls.id, cls.name)}
                      title="Excluir turma"
                      className="p-2 rounded-lg border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-red-500 hover:border-red-400 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Criar Turma */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--outline)] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-extrabold text-[var(--on-surface)]">Nova Turma</h2>
                <button onClick={() => setShowModal(false)} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Nome da Turma *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Turma A — 3º Período"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Disciplina</label>
                  <input
                    type="text"
                    placeholder="Ex: Cálculo II, Português, etc."
                    value={form.subject}
                    onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Período / Semestre</label>
                  <input
                    type="text"
                    placeholder="Ex: 2025/1, Manhã, Turno Noturno"
                    value={form.period}
                    onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Descrição</label>
                  <textarea
                    placeholder="Informações adicionais sobre a turma..."
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm hover:bg-[var(--surface-low)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-70"
                  >
                    {saving ? 'Criando...' : 'Criar Turma'}
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

