'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function StudentAccess() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formattedRoomName = roomName.replace(/\s+/g, '-').toUpperCase();
      const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? `http://${window.location.hostname}:3001`}`;

      const roomRes = await fetch(`${API_URL}/rooms/by-name/${formattedRoomName}`);
      if (!roomRes.ok) {
        alert('Sala não encontrada ou código incorreto. Verifique com seu professor.');
        setLoading(false);
        return;
      }
      const room = await roomRes.json();
      if (room.status !== 'active') {
        alert('Esta sala foi encerrada pelo professor e não aceita mais conexões.');
        setLoading(false);
        return;
      }

      const loginRes = await fetch(`${API_URL}/auth/student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const loginData = await loginRes.json();
      const studentId = loginData.student.id;
      localStorage.setItem('student_data', JSON.stringify({ name, email, studentId }));

      const sessionRes = await fetch(`${API_URL}/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, studentId }),
      });
      const sessionData = await sessionRes.json();

      router.push(`/exam/${formattedRoomName}?sessionId=${sessionData.id}&roomId=${room.id}`);
    } catch (e: any) {
      console.error('Erro ao entrar na sala:', e);
      alert(`Erro de comunicação com o servidor.\n\nDetalhe: ${e?.message || e}\n\nVerifique se o endereço está correto e o servidor está ligado.`);
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen w-full bg-[var(--surface-low)] relative overflow-hidden font-montserrat">
      {/* Button to go to Teacher login */}
      <button
        onClick={() => router.push('/teacher/login')}
        className="absolute top-6 right-6 md:top-auto md:bottom-8 md:left-8 md:right-auto z-50 flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] md:bg-white/10 md:border md:border-white/20 md:hover:bg-white/20 md:hover:border-white/30 transition-all backdrop-blur-md shadow-lg text-sm md:text-base font-bold"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        Painel do Professor
      </button>

      {/* Left Side: Branding & Value Props */}
      <div className="hidden md:flex flex-col justify-center p-6 lg:p-12 relative overflow-hidden z-20 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] shadow-2xl">
        {/* Animated Pulse Line */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
           <svg width="100%" height="100%" viewBox="0 0 1000 200" preserveAspectRatio="none">
             <path d="M0 100 L 300 100 L 350 20 L 400 180 L 450 100 L 1000 100" fill="none" stroke="var(--accent)" strokeWidth="4" className="pulse-animation" />
           </svg>
        </div>

        {/* Decorative Background Blur */}
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-10 blur-[120px] bg-[var(--accent)] pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto w-full">
          <div className="mb-6 flex items-center">
             <div className="relative w-[240px] h-[70px]">
               <Image src="/logo.png" alt="LeanPulse Logo" fill className="object-contain object-left drop-shadow-md" />
             </div>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-[1.15]">
            Medimos seu <span style={{ color: 'var(--accent)' }}>potencial</span>. <br/>Protegemos seu <span className="text-blue-300">mérito</span>.
          </h1>
          <p className="text-lg text-blue-100/90 mb-8 font-medium leading-relaxed">
            Plataforma institucional focada em integridade educacional, segurança digital e rigor acadêmico.
          </p>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-5 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 shadow-inner flex items-center justify-center text-[var(--accent)] border border-white/20">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg tracking-wide">Ambiente Seguro</h3>
                <p className="text-blue-200/80 text-sm font-medium mt-1">Monitoramento ativo e provas anti-fraude.</p>
              </div>
            </div>
            <div className="flex items-center gap-5 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 shadow-inner flex items-center justify-center text-[var(--accent)] border border-white/20">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg tracking-wide">Experiência Lean</h3>
                <p className="text-blue-200/80 text-sm font-medium mt-1">Foco total nas suas respostas e desempenho.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex flex-col items-center justify-center p-6 lg:p-12 relative z-10 bg-transparent pt-24 md:pt-6">
        <div className="w-full max-w-[440px]">
          
          <div className="md:hidden flex items-center justify-center mb-6 w-full relative h-[60px]">
             <Image src="/logo.png" alt="LeanPulse Logo" fill className="object-contain" />
          </div>

          <div className="mb-6 text-center md:text-left">
            <h2 className="text-3xl font-extrabold text-[var(--primary)] mb-2 tracking-tight">Área do Aluno</h2>
            <p className="text-[var(--on-surface-variant)] text-lg font-medium">Insira seus dados para iniciar a avaliação.</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div className="group">
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-5 py-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-card)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:bg-white focus:border-[var(--primary)] focus:ring-[4px] focus:ring-[var(--primary-container)] outline-none transition-all font-semibold text-base shadow-sm"
                placeholder="Seu nome completo"
                autoComplete="name"
              />
            </div>
            
            <div className="group">
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">E-mail Estudantil</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-card)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:bg-white focus:border-[var(--primary)] focus:ring-[4px] focus:ring-[var(--primary-container)] outline-none transition-all font-semibold text-base shadow-sm"
                placeholder="aluno@instituicao.edu.br"
                autoComplete="email"
              />
            </div>

            <div className="group pt-2">
              <label className="block text-xs tracking-widest font-bold text-[var(--accent-hover)] mb-1.5 uppercase">Código da Sala</label>
              <input
                type="text"
                required
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
                className="w-full px-5 py-3.5 rounded-xl border-2 border-[var(--accent)]/50 bg-[var(--accent-container)] text-[var(--primary)] placeholder-[var(--accent)]/60 focus:bg-[var(--accent-container)] focus:border-[var(--accent)] focus:ring-[4px] focus:ring-[var(--accent)]/20 outline-none transition-all font-extrabold text-2xl tracking-[0.2em] uppercase shadow-sm"
                placeholder="Ex: MAT-2024"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-4 px-6 rounded-xl font-extrabold text-white shadow-lg bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-xl group"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span className="tracking-wide">Conectando...</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide">Entrar na Sala</span>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transform transition-transform group-hover:translate-x-2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-[var(--on-surface-muted)] uppercase tracking-widest pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Conexão Protegida
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .pulse-animation {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawPulse 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes drawPulse {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}} />
    </div>
  );
}

