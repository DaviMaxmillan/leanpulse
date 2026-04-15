'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function TeacherLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/auth/teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) throw new Error('Credenciais inválidas ou acesso negado');
      
      const data = await res.json();
      localStorage.setItem('teacher_token', data.access_token);
      localStorage.setItem('teacher_data', JSON.stringify(data.user));

      if (data.user.role === 'SUPERADMIN') {
        router.push('/admin');
      } else {
        router.push('/teacher');
      }

    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen w-full bg-[var(--surface-low)] relative overflow-hidden font-montserrat">
      {/* Button to go back to Student login */}
      <button 
        onClick={() => router.push('/')}
        className="absolute top-6 right-6 md:left-6 md:right-auto z-50 flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 border border-white/20 text-white font-bold hover:bg-white/20 hover:border-white/30 transition-all backdrop-blur-md shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Área do Aluno
      </button>

      {/* Left Side: Branding & Value Props for Teachers */}
      <div className="hidden md:flex flex-col justify-center p-6 lg:p-12 relative overflow-hidden z-20 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] shadow-2xl">
        {/* Animated Pulse Line */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
           <svg width="100%" height="100%" viewBox="0 0 1000 200" preserveAspectRatio="none">
             <path d="M0 100 L 300 100 L 350 20 L 400 180 L 450 100 L 1000 100" fill="none" stroke="var(--accent)" strokeWidth="4" className="pulse-animation-teacher" />
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
            Gestão Educacional com <span className="text-blue-300">Inteligência</span> e <span style={{ color: 'var(--accent)' }}>Controle</span>.
          </h1>
          <p className="text-lg text-blue-100/90 mb-8 font-medium leading-relaxed">
            O portal docente centraliza as avaliações da sua instituição. Acompanhe relatórios, monitore o comportamento e proteja suas provas contra fraudes.
          </p>
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-5 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 shadow-inner flex items-center justify-center text-[var(--accent)] border border-white/20">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg tracking-wide">Relatórios Analíticos</h3>
                <p className="text-blue-200/80 text-sm font-medium mt-1">Visualize a curva de aprendizado da sua turma.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-5 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/10 shadow-inner flex items-center justify-center text-[var(--accent)] border border-white/20">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-lg tracking-wide">Interface Intuitiva</h3>
                <p className="text-blue-200/80 text-sm font-medium mt-1">Ferramentas de correção rápida e fluxo facilitado.</p>
              </div>
            </div>

            {/* Contact Button */}
            <button 
              onClick={() => alert('Abrindo portal de suporte...')}
              className="mt-4 flex items-center gap-3 px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all group w-fit shadow-xl"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-300">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span className="text-base">Falar com o Suporte</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5 transform group-hover:translate-x-1.5 transition-transform opacity-50"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="flex flex-col items-center justify-center p-6 lg:p-12 relative z-10 bg-transparent">
        <div className="w-full max-w-[440px]">
          
          <div className="md:hidden flex items-center justify-center mb-6 w-full relative h-[50px]">
             <Image src="/logo.png" alt="LeanPulse Logo" fill className="object-contain" />
          </div>

          <div className="mb-6 text-center md:text-left">
            <h2 className="text-3xl font-extrabold text-[var(--primary)] mb-2 tracking-tight">Portal Docente</h2>
            <p className="text-[var(--on-surface-variant)] text-lg font-medium">Autenticação empresarial e configuração de turmas.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="group">
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">E-mail ou Usuário</label>
              <input
                type="text"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-5 py-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-card)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:bg-white focus:border-[var(--primary)] focus:ring-[4px] focus:ring-[var(--primary-container)] outline-none transition-all font-semibold text-base shadow-sm"
                placeholder="professor@instituicao.edu.br"
              />
            </div>
            
            <div className="group">
              <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Senha Privada</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-5 py-3 rounded-xl border border-[var(--outline)] bg-[var(--surface-card)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:bg-white focus:border-[var(--primary)] focus:ring-[4px] focus:ring-[var(--primary-container)] outline-none transition-all font-semibold text-base shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-3 flex justify-between items-center text-sm font-semibold">
              <label className="flex items-center gap-2 cursor-pointer text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded bg-white border-[var(--outline)] text-[var(--primary)] focus:ring-[var(--primary)]" />
                Lembrar acesso
              </label>
              <button type="button" className="text-[var(--primary)] hover:text-blue-500 transition-colors">
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-4 px-6 rounded-xl font-extrabold text-white shadow-lg bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none text-xl group"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span className="tracking-wide">Autenticando...</span>
                </>
              ) : (
                <>
                  <span className="tracking-wide">Acessar Painel</span>
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
          Sessão Criptografada Docente
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .pulse-animation-teacher {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: drawPulseTeacher 3.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes drawPulseTeacher {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 0; }
        }
      `}} />
    </div>
  );
}
