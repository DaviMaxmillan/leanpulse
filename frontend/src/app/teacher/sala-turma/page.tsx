'use client';
import { getApiUrl as API } from '../../../lib/api';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';

interface ClassItem { id: string; name: string; subject?: string; _count: { students: number } }
interface ExamItem { id: string; title: string; weight: number }
interface Room {
  id: string; name: string; status: string; createdAt: string;
  exam: { title: string; weight: number };
  class?: { name: string };
  _count: { sessions: number };
}

export default function SalaTurmaPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ classId: '', examId: '', name: '' });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [qrRoom, setQrRoom] = useState<Room | null>(null);

  

  useEffect(() => {
    const t = localStorage.getItem('teacher_token');
    if (!t) { router.push('/teacher/login'); return; }
    setToken(t);
    Promise.all([fetchClasses(t), fetchExams(t), fetchRooms(t)]).finally(() => setLoading(false));
  }, [router]);

  const fetchClasses = async (t: string) => {
    const res = await fetch(`${API()}/classes`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setClasses(await res.json());
  };

  const fetchExams = async (t: string) => {
    const res = await fetch(`${API()}/exams`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data = await res.json();
      setExams(data.map((e: any) => ({ id: e.id, title: e.title, weight: e.weight })));
    }
  };

  const fetchRooms = async (t: string) => {
    const res = await fetch(`${API()}/rooms`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) {
      const data: Room[] = await res.json();
      setRooms(data.filter(r => r.class)); // apenas salas vinculadas a turmas
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.classId || !form.examId || !form.name.trim()) {
      alert('Preencha todos os campos obrigatórios.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API()}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name.trim().toUpperCase(), examId: form.examId, classId: form.classId }),
      });
      if (res.ok) {
        await fetchRooms(token);
        setShowForm(false);
        setForm({ classId: '', examId: '', name: '' });
      } else {
        const err = await res.json();
        alert(err.message || 'Erro ao criar sala.');
      }
    } finally {
      setCreating(false);
    }
  };

  const handleFinish = async (id: string) => {
    await fetch(`${API()}/rooms/${id}/finish`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchRooms(token);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta sala? Todas as sessões serão removidas.')) return;
    await fetch(`${API()}/rooms/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setRooms(prev => prev.filter(r => r.id !== id));
  };

  const selectedClass = classes.find(c => c.id === form.classId);

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
          <h1 className="text-lg font-extrabold text-[var(--on-surface)] tracking-tight">Aplicar Prova para Turma</h1>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm shadow hover:shadow-lg hover:-translate-y-0.5 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nova Sala para Turma
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6 flex gap-3">
          <svg className="flex-shrink-0 mt-0.5 text-blue-500" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <p className="font-bold text-blue-800 text-sm">Como funciona?</p>
            <p className="text-blue-700 text-sm font-medium mt-0.5">O aluno acessa o link/QR Code da sala, <strong>seleciona o seu nome na lista</strong> da turma e entra na prova automaticamente — sem precisar digitar nome ou e-mail.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-10 w-10 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        ) : rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-xl font-extrabold text-[var(--on-surface)] mb-2">Nenhuma sala de turma criada</h3>
            <p className="text-[var(--on-surface-variant)] font-medium mb-6 max-w-sm">Crie uma sala vinculada a uma turma para que os alunos entrem selecionando o nome.</p>
            <button onClick={() => setShowForm(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold shadow hover:shadow-lg transition-all">
              Criar Primeira Sala
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {rooms.map(room => (
              <div key={room.id} className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0">
                    {room.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-[var(--on-surface)] text-lg">{room.name}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${room.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {room.status === 'active' ? '● Ativa' : '○ Encerrada'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--primary)] font-bold mt-0.5">{room.exam.title}</p>
                    <p className="text-sm text-[var(--on-surface-variant)] font-semibold">Turma: {room.class?.name}</p>
                    <p className="text-xs text-[var(--on-surface-muted)] font-medium mt-0.5">{room._count.sessions} participante(s) · Criada {new Date(room.createdAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* QR Code button */}
                  <button
                    onClick={() => setQrRoom(room)}
                    className="p-2 rounded-lg border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                    title="Ver QR Code da sala"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="3" y="3" width="1" height="1" fill="currentColor"/><rect x="14" y="3" width="1" height="1" fill="currentColor"/><rect x="3" y="14" width="1" height="1" fill="currentColor"/><path d="M14 14h7v7M14 17h4M17 14v4"/></svg>
                  </button>
                  {/* Link to copy */}
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/sala/${room.name}`;
                      navigator.clipboard.writeText(url).then(() => alert('Link copiado!\n' + url));
                    }}
                    className="p-2 rounded-lg border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors"
                    title="Copiar link da sala"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </button>
                  {room.status === 'active' && (
                    <button onClick={() => handleFinish(room.id)}
                      className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs hover:bg-amber-200 transition-colors">
                      Encerrar
                    </button>
                  )}
                  <button onClick={() => handleDelete(room.id)}
                    className="p-2 rounded-lg border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-red-500 hover:border-red-400 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: QR Code da Sala */}
      {qrRoom && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setQrRoom(null)}>
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-sm border border-[var(--outline)] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
            <div className="p-6 text-center">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--on-surface)] text-left">{qrRoom.name}</h2>
                  <p className="text-sm text-[var(--primary)] font-semibold text-left">{qrRoom.exam.title}</p>
                  {qrRoom.class && <p className="text-xs text-[var(--on-surface-variant)] font-medium text-left">Turma: {qrRoom.class.name}</p>}
                </div>
                <button onClick={() => setQrRoom(null)} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] p-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl inline-block mb-4 shadow-inner">
                <QRCode
                  value={`${typeof window !== 'undefined' ? window.location.origin : 'https://www.leanpulse.com.br'}/sala/${qrRoom.name}`}
                  size={200}
                  level="H"
                />
              </div>

              <p className="text-xs text-[var(--on-surface-muted)] font-medium mb-1">Escaneie o código ou copie o link abaixo</p>
              <div className="flex items-center gap-2 bg-[var(--surface-low)] border border-[var(--outline)] rounded-xl px-3 py-2 mb-4">
                <span className="text-xs font-mono text-[var(--on-surface-variant)] flex-1 truncate">
                  {typeof window !== 'undefined' ? window.location.origin : 'https://www.leanpulse.com.br'}/sala/{qrRoom.name}
                </span>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/sala/${qrRoom.name}`;
                    navigator.clipboard.writeText(url).then(() => alert('Link copiado!'));
                  }}
                  className="text-[var(--primary)] hover:text-[var(--primary-hover)] font-bold text-xs whitespace-nowrap"
                >
                  Copiar
                </button>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setQrRoom(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm hover:bg-[var(--surface-low)] transition-colors">
                  Fechar
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm hover:shadow-lg transition-all">
                  🖨️ Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Criar Sala para Turma */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--outline)] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-extrabold text-[var(--on-surface)]">Nova Sala para Turma</h2>
                <button onClick={() => setShowForm(false)} className="text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {classes.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[var(--on-surface-variant)] font-semibold mb-3">Você não tem turmas criadas ainda.</p>
                  <button onClick={() => { setShowForm(false); router.push('/teacher/turmas'); }}
                    className="px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold text-sm">
                    Criar Turma Agora
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Turma *</label>
                    <select required value={form.classId} onChange={e => setForm(p => ({ ...p, classId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold">
                      <option value="">Selecione a turma...</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}{c.subject ? ` — ${c.subject}` : ''} ({c._count.students} alunos)</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Prova *</label>
                    <select required value={form.examId} onChange={e => setForm(p => ({ ...p, examId: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-semibold">
                      <option value="">Selecione a prova...</option>
                      {exams.map(e => <option key={e.id} value={e.id}>{e.title} (Peso {e.weight})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Nome da Sala *</label>
                    <input type="text" required placeholder="Ex: CALC-2025-A1" value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value.toUpperCase() }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary-container)] outline-none transition-all text-sm font-bold font-mono tracking-wider" />
                    <p className="text-xs text-[var(--on-surface-muted)] mt-1.5 font-medium">Código único que os alunos usarão para entrar. Use apenas letras e números.</p>
                  </div>

                  {form.classId && selectedClass && (
                    <div className="bg-[var(--primary-container)] rounded-xl p-3 border border-[var(--primary)]/20">
                      <p className="text-xs font-bold text-[var(--primary)] mb-1">Turma selecionada</p>
                      <p className="text-sm font-bold text-[var(--on-surface)]">{selectedClass.name}</p>
                      <p className="text-xs text-[var(--on-surface-variant)] font-medium">{selectedClass._count.students} aluno(s) poderão fazer a prova selecionando o nome</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)}
                      className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm hover:bg-[var(--surface-low)] transition-colors">
                      Cancelar
                    </button>
                    <button type="submit" disabled={creating}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-70">
                      {creating ? 'Criando...' : 'Criar Sala'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

