'use client';
import { getApiUrl as API } from '../../../lib/api';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ClassStudent { id: string; name: string; email: string }
interface RoomData {
  id: string;
  name: string;
  status: string;
  exam: { title: string; weight: number; questions: any[] };
  class?: { name: string; subject?: string; students: ClassStudent[] };
}

export default function SalaEntradaPage() {
  const params = useParams();
  const router = useRouter();
  const roomName = (params.roomName as string)?.toUpperCase();

  const [room, setRoom] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  

  useEffect(() => {
    if (!roomName) { setError('Sala não encontrada.'); setLoading(false); return; }
    fetch(`${API()}/rooms/by-name/${roomName}`)
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message || 'Sala não encontrada.'); }))
      .then(data => { setRoom(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [roomName]);

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !room) return;

    const student = room.class?.students.find(s => s.id === selectedStudentId);
    if (!student) return;

    if (room.status !== 'active') { alert('Esta sala está encerrada.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`${API()}/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, studentId: selectedStudentId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || 'Erro ao entrar na sala.');
        return;
      }
      const session = await res.json();
      localStorage.setItem('exam_session', JSON.stringify(session));
      router.push(`/exam/${session.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0B1E3F 0%, #0e2a55 50%, #0B1E3F 100%)', fontFamily: 'Montserrat, sans-serif' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 30% 50%, rgba(15,164,175,0.08) 0%, transparent 60%)' }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: '440px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50px', padding: '0.5rem 1.25rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0FA4AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>LeanPulse</span>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)' }}>
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #0FA4AF, #0B1E3F 50%, #0FA4AF)' }} />
          <div style={{ padding: '2rem' }}>

            {loading && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(15,164,175,0.3)" strokeWidth="4"/>
                  <path d="M4 12a8 8 0 018-8" stroke="#0FA4AF" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {error && !loading && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                <h2 style={{ color: 'white', fontWeight: 800, marginBottom: '0.5rem' }}>Sala não encontrada</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>{error}</p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginTop: '0.5rem' }}>Código: <strong style={{ color: '#0FA4AF' }}>{roomName}</strong></p>
              </div>
            )}

            {room && !loading && (
              <>
                {/* Room closed */}
                {room.status !== 'active' ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
                    <h2 style={{ color: 'white', fontWeight: 800 }}>Sala Encerrada</h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>Esta sala de prova foi encerrada pelo professor.</p>
                  </div>
                ) : (
                  <form onSubmit={handleEnter}>
                    {/* Header */}
                    <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #0FA4AF, #0B1E3F)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: '0 0 30px rgba(15,164,175,0.3)' }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                        </svg>
                      </div>
                      <h1 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 800, margin: 0 }}>{room.exam.title}</h1>
                      {room.class && (
                        <p style={{ color: '#0FA4AF', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                          {room.class.name}{room.class.subject ? ` · ${room.class.subject}` : ''}
                        </p>
                      )}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '50px', padding: '0.25rem 0.875rem', marginTop: '0.75rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                        <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.75rem' }}>Sala Ativa</span>
                      </div>
                    </div>

                    {/* Dropdown */}
                    {room.class && room.class.students.length > 0 ? (
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>
                          Selecione seu nome na lista *
                        </label>
                        <select
                          required
                          value={selectedStudentId}
                          onChange={e => setSelectedStudentId(e.target.value)}
                          style={{
                            width: '100%', padding: '0.875rem 1rem', boxSizing: 'border-box',
                            borderRadius: '0.75rem', border: selectedStudentId ? '1.5px solid #0FA4AF' : '1.5px solid rgba(255,255,255,0.12)',
                            background: 'rgba(255,255,255,0.06)', color: selectedStudentId ? 'white' : 'rgba(255,255,255,0.4)',
                            fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9375rem',
                            outline: 'none', cursor: 'pointer',
                          }}
                        >
                          <option value="" style={{ background: '#0B1E3F' }}>Escolha seu nome...</option>
                          {room.class.students.map(s => (
                            <option key={s.id} value={s.id} style={{ background: '#0B1E3F' }}>{s.name}</option>
                          ))}
                        </select>
                        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 500 }}>
                          Não encontrou seu nome? Fale com o professor para ser adicionado à turma.
                        </p>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                        <p style={{ color: '#fca5a5', fontWeight: 600, fontSize: '0.875rem' }}>Esta turma ainda não tem alunos matriculados. Fale com o professor.</p>
                      </div>
                    )}

                    {room.class && room.class.students.length > 0 && (
                      <button type="submit" disabled={submitting || !selectedStudentId}
                        style={{
                          width: '100%', padding: '0.875rem', borderRadius: '0.875rem',
                          background: (!selectedStudentId || submitting) ? 'rgba(15,164,175,0.3)' : 'linear-gradient(135deg, #0FA4AF, #0a8a95)',
                          border: 'none', color: 'white', fontWeight: 800, fontSize: '1rem',
                          cursor: (!selectedStudentId || submitting) ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit', boxShadow: (!selectedStudentId || submitting) ? 'none' : '0 4px 20px rgba(15,164,175,0.3)',
                          transition: 'all 0.2s',
                        }}>
                        {submitting ? '⏳ Acessando prova...' : 'Entrar na Prova →'}
                      </button>
                    )}
                  </form>
                )}
              </>
            )}

          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
          LeanPulse — Plataforma de Avaliação Educacional
        </p>
      </div>
    </div>
  );
}
