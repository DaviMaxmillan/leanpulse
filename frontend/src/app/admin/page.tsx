'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

type ModalMode = 'create' | 'edit';

export default function AdminDashboard() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');

  // Delete confirmation
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('teacher_token') || '';

  const fetchTeachers = async () => {
    const token = getToken();
    if (!token) { router.push('/teacher/login'); return; }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/users/teachers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTeachers(await res.json());
      } else {
        alert('Acesso Negado. Apenas o Super Administrador pode acessar este painel.');
        router.push('/teacher/login');
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchTeachers(); }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setModalOpen(true);
  };

  const openEditModal = (teacher: Teacher) => {
    setModalMode('edit');
    setEditingId(teacher.id);
    setFormName(teacher.name);
    setFormEmail(teacher.email);
    setFormPassword(''); // password is blank — only filled if changing
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = getToken();

    try {
      if (modalMode === 'create') {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/users/teachers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: formEmail, password: formPassword, name: formName }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
        alert('Professor cadastrado com sucesso!');
      } else {
        const body: any = { name: formName, email: formEmail };
        if (formPassword) body.password = formPassword;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/users/teachers/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
        alert('Professor atualizado com sucesso!');
      }
      setModalOpen(false);
      fetchTeachers();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const token = getToken();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}/users/teachers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message); }
      setDeleteTargetId(null);
      fetchTeachers();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir.');
    }
  };

  const logout = () => {
    localStorage.removeItem('teacher_token');
    localStorage.removeItem('teacher_data');
    router.push('/teacher/login');
  };

  return (
    <main className="min-h-screen bg-[var(--background)] p-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <header className="glass-panel p-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
              Super Admin
            </h1>
            <p className="opacity-60 text-sm mt-1">Gerenciamento de professores e acesso à plataforma</p>
          </div>
          <div className="flex gap-3">
            <button onClick={openCreateModal} className="btn-primary px-6 py-2 text-sm font-bold">
              + Novo Professor
            </button>
            <button onClick={logout} className="px-4 py-2 text-sm text-danger border border-danger/30 rounded-lg hover:bg-danger/10 transition">
              Sair
            </button>
          </div>
        </header>

        {/* Teachers Table */}
        <div className="glass-panel p-6">
          <h2 className="text-xl font-bold mb-6">Membros da Plataforma</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-widest opacity-50">
                  <th className="pb-3 pr-6">Nome</th>
                  <th className="pb-3 pr-6">E-mail</th>
                  <th className="pb-3 pr-6">Perfil</th>
                  <th className="pb-3 pr-6">Cadastro</th>
                  <th className="pb-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teachers.map(t => (
                  <tr key={t.id} className="group hover:bg-white/3 transition">
                    <td className="py-4 pr-6 font-semibold">{t.name}</td>
                    <td className="py-4 pr-6 opacity-70 text-sm font-mono">{t.email}</td>
                    <td className="py-4 pr-6">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${
                        t.role === 'SUPERADMIN' 
                          ? 'bg-accent/20 text-accent' 
                          : 'bg-primary/20 text-primary'
                      }`}>
                        {t.role === 'SUPERADMIN' ? '👑 SuperAdmin' : '🎓 Professor'}
                      </span>
                    </td>
                    <td className="py-4 pr-6 opacity-50 text-xs">
                      {new Date(t.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 text-right">
                      {t.role !== 'SUPERADMIN' && (
                        <div className="flex gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(t)}
                            className="text-xs text-primary font-bold hover:underline"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(t.id)}
                            className="text-xs text-danger font-bold hover:underline"
                          >
                            🗑 Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {teachers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-16 text-center opacity-40 italic">
                      Nenhum professor cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Create / Edit Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel w-full max-w-md p-8 space-y-6 border border-white/15 shadow-2xl">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {modalMode === 'create' ? '+ Novo Professor' : `Editar: ${formName}`}
              </h2>
              <button onClick={() => setModalOpen(false)} className="opacity-40 hover:opacity-100 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm opacity-70 mb-2">Nome Completo</label>
                <input
                  required
                  className="input-base"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Prof. Maria Silva"
                />
              </div>
              <div>
                <label className="block text-sm opacity-70 mb-2">E-mail (Login)</label>
                <input
                  type="email"
                  required
                  className="input-base"
                  value={formEmail}
                  onChange={e => setFormEmail(e.target.value)}
                  placeholder="professor@escola.com"
                />
              </div>
              <div>
                <label className="block text-sm opacity-70 mb-2">
                  Senha {modalMode === 'edit' && <span className="italic opacity-50">(deixe em branco para manter a atual)</span>}
                </label>
                <input
                  type="password"
                  className="input-base"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="••••••••"
                  {...(modalMode === 'create' ? { required: true, minLength: 6 } : {})}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 border border-white/20 rounded-lg hover:bg-white/5 text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 btn-primary py-3 disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : modalMode === 'create' ? 'Cadastrar' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-sm w-full p-8 text-center border border-danger/30 space-y-6">
            <div className="text-5xl">🗑</div>
            <h2 className="text-xl font-bold text-danger">Confirmar Exclusão</h2>
            <p className="opacity-70 text-sm">
              Esta ação é <strong>permanente</strong>. O professor será removido da plataforma junto de todos os dados vinculados a ele (provas, salas e relatórios).
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-3 border border-white/20 rounded-lg hover:bg-white/5 text-sm transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteTargetId)}
                className="flex-1 py-3 bg-danger text-white rounded-lg font-bold hover:brightness-110 transition"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

