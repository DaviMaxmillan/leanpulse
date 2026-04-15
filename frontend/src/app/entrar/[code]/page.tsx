'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface ClassInfo {
  id: string;
  name: string;
  subject?: string;
  period?: string;
  code: string;
  teacher: { name: string };
  _count: { students: number };
}

type Step = 'loading' | 'info' | 'form' | 'success' | 'error';

export default function EntrarTurmaPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string)?.toUpperCase();

  const [step, setStep] = useState<Step>('loading');
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const API = () => `http://${window.location.hostname}:3001`;

  useEffect(() => {
    if (!code) { setStep('error'); setErrorMsg('Código inválido.'); return; }
    fetchClass();
  }, [code]);

  const fetchClass = async () => {
    try {
      const res = await fetch(`${API()}/classes/join/${code}`);
      if (res.ok) {
        setClassInfo(await res.json());
        setStep('info');
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Código de turma não encontrado.');
        setStep('error');
      }
    } catch {
      setErrorMsg('Não foi possível conectar ao servidor. Verifique sua conexão.');
      setStep('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${API()}/classes/join/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStep('success');
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Erro ao ingressar na turma.');
      }
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #0B1E3F 0%, #0e2a55 50%, #0B1E3F 100%)',
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      {/* Animated background pulse */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 30% 50%, rgba(15,164,175,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(11,30,63,0.5) 0%, transparent 60%)',
      }} />

      <div style={{ position: 'relative', width: '100%', maxWidth: '440px' }}>

        {/* Logo/Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.625rem',
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '50px', padding: '0.5rem 1.25rem',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0FA4AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.02em' }}>LeanPulse</span>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '1.5rem',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
        }}>
          {/* Top gradient bar */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #0FA4AF, #0B1E3F 50%, #0FA4AF)' }} />

          <div style={{ padding: '2rem' }}>

            {/* LOADING */}
            {step === 'loading' && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(15,164,175,0.3)" strokeWidth="4"/>
                  <path d="M4 12a8 8 0 018-8" stroke="#0FA4AF" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '1rem', fontWeight: 600 }}>Verificando código...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* INFO (confirmar turma) */}
            {step === 'info' && classInfo && (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                  <div style={{
                    width: '64px', height: '64px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0FA4AF, #0B1E3F)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1rem', boxShadow: '0 0 30px rgba(15,164,175,0.3)',
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                  </div>
                  <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                    Entrar na Turma
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.375rem', fontSize: '0.875rem' }}>
                    Confirme os dados abaixo antes de prosseguir
                  </p>
                </div>

                {/* Class info card */}
                <div style={{
                  background: 'rgba(15,164,175,0.08)', border: '1px solid rgba(15,164,175,0.2)',
                  borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{
                      width: '48px', height: '48px', borderRadius: '0.75rem',
                      background: 'rgba(15,164,175,0.15)', border: '1px solid rgba(15,164,175,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>🏫</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'white', fontWeight: 800, fontSize: '1.0625rem', margin: 0, lineHeight: 1.3 }}>
                        {classInfo.name}
                      </p>
                      {classInfo.subject && (
                        <p style={{ color: '#0FA4AF', fontWeight: 600, fontSize: '0.875rem', margin: '0.25rem 0 0' }}>
                          {classInfo.subject}
                        </p>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600 }}>
                          👤 Prof. {classInfo.teacher.name}
                        </span>
                        {classInfo.period && (
                          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600 }}>
                            📅 {classInfo.period}
                          </span>
                        )}
                        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', fontWeight: 600 }}>
                          👥 {classInfo._count.students} alunos
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setStep('form')}
                  style={{
                    width: '100%', padding: '0.875rem', borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, #0FA4AF, #0a8a95)',
                    border: 'none', color: 'white', fontWeight: 800, fontSize: '1rem',
                    cursor: 'pointer', letterSpacing: '0.01em',
                    boxShadow: '0 4px 20px rgba(15,164,175,0.3)',
                    fontFamily: 'inherit',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'translateY(-1px)'; (e.target as HTMLElement).style.boxShadow = '0 6px 24px rgba(15,164,175,0.45)'; }}
                  onMouseLeave={e => { (e.target as HTMLElement).style.transform = ''; (e.target as HTMLElement).style.boxShadow = '0 4px 20px rgba(15,164,175,0.3)'; }}
                >
                  Sim, quero entrar nessa turma →
                </button>
              </div>
            )}

            {/* FORM (dados do aluno) */}
            {step === 'form' && classInfo && (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <button
                    onClick={() => setStep('info')}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: 0, marginBottom: '1rem' }}
                  >
                    ← Voltar
                  </button>
                  <h2 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 800, margin: 0 }}>
                    Seus Dados
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.375rem', fontSize: '0.875rem' }}>
                    Informe seu nome e e-mail para se matricular em <strong style={{ color: '#0FA4AF' }}>{classInfo.name}</strong>
                  </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Name */}
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Seu nome completo"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      style={{
                        width: '100%', padding: '0.875rem 1rem', boxSizing: 'border-box',
                        borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.06)', color: 'white',
                        fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9375rem',
                        outline: 'none', transition: 'border-color 0.2s',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#0FA4AF')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="seu@email.com"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      style={{
                        width: '100%', padding: '0.875rem 1rem', boxSizing: 'border-box',
                        borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.12)',
                        background: 'rgba(255,255,255,0.06)', color: 'white',
                        fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9375rem',
                        outline: 'none', transition: 'border-color 0.2s',
                      }}
                      onFocus={e => (e.target.style.borderColor = '#0FA4AF')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                    />
                  </div>

                  {errorMsg && (
                    <div style={{
                      padding: '0.75rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      color: '#fca5a5', fontWeight: 600, fontSize: '0.875rem',
                    }}>
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: '100%', padding: '0.875rem', borderRadius: '0.875rem',
                      background: submitting ? 'rgba(15,164,175,0.5)' : 'linear-gradient(135deg, #0FA4AF, #0a8a95)',
                      border: 'none', color: 'white', fontWeight: 800, fontSize: '1rem',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      boxShadow: submitting ? 'none' : '0 4px 20px rgba(15,164,175,0.3)',
                      fontFamily: 'inherit', marginTop: '0.5rem',
                      transition: 'all 0.2s',
                    }}
                  >
                    {submitting ? '⏳ Matriculando...' : 'Confirmar Matrícula'}
                  </button>
                </form>
              </div>
            )}

            {/* SUCCESS */}
            {step === 'success' && classInfo && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1.25rem', boxShadow: '0 0 40px rgba(16,185,129,0.35)',
                }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                  Matrícula Confirmada!
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem', fontWeight: 500, margin: '0 0 1.5rem' }}>
                  Bem-vindo(a) à turma <strong style={{ color: '#0FA4AF' }}>{classInfo.name}</strong>!<br />
                  Seu professor já pode ver você na lista.
                </p>

                {/* Confetti-like decoration */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1.5rem' }}>
                  🎓 📚 ✨
                </div>

                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8125rem', fontWeight: 500 }}>
                  Você pode fechar esta página agora.
                </p>
              </div>
            )}

            {/* ERROR */}
            {step === 'error' && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.3)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                </div>
                <h2 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 800, margin: '0 0 0.5rem' }}>
                  Código Inválido
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontWeight: 500, margin: '0 0 1.5rem' }}>
                  {errorMsg}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8125rem' }}>
                  Código usado: <strong style={{ color: '#0FA4AF' }}>{code}</strong>
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem', fontWeight: 500 }}>
          LeanPulse — Plataforma de Avaliação Educacional
        </p>
      </div>
    </div>
  );
}
