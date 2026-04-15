'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import io, { Socket } from 'socket.io-client';
import { toJpeg } from 'html-to-image';

interface Option { id: string; text: string; }
interface Question {
  id: string; 
  statement: string;
  pointValue: number; 
  scoringMode: 'ALL_REQUIRED' | 'ANY_CORRECT';
  options: Option[];
}
interface Exam { 
  id: string; 
  title: string; 
  weight: number; 
  questions: Question[]; 
  showOneAtATime?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  allowBackNavigation?: boolean;
}
interface ScoreResult { rawScore: number; finalGrade: number; weight: number; }

// Helper to shuffle array (Fisher-Yates)
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function ExamContent() {
  const { id: roomName } = useParams();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const roomId = searchParams.get('roomId');
  const router = useRouter();

  const [exam, setExam] = useState<Exam | null>(null);
  const [status, setStatus] = useState<'loading' | 'active' | 'blocked' | 'finished'>('loading');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  // Progressive Navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>([]);

  // Flag: when true, ALL anti-fraud hooks are silenced
  const isExamEndingRef = useRef(false);

  // ── 1. Initialization and Data Fetching ──────────────────────────────────
  useEffect(() => {
    if (!sessionId || !roomId) { router.push('/'); return; }

    const storageKey = `exam_progress_${sessionId}`;
    const savedProgress = localStorage.getItem(storageKey);

    const API_URL = `http://${window.location.hostname}:3001`;

    fetch(`${API_URL}/rooms/by-name/${roomName}`)
      .then(res => res.json())
      .then(data => {
        const rawExam: Exam = data.exam;
        
        // Handle Progress Restoration or New Start
        if (savedProgress) {
          try {
            const parsed = JSON.parse(savedProgress);
            setOrderedQuestions(parsed.orderedQuestions);
            setSelectedAnswers(parsed.selectedAnswers);
            setCurrentIndex(parsed.currentIndex || 0);
          } catch (e) {
            console.error('Progress restoration failed', e);
            startNew(rawExam);
          }
        } else {
          startNew(rawExam);
        }

        setExam(rawExam);
        setStatus('active');

        // Auto-fullscreen
        setTimeout(() => {
          document.documentElement.requestFullscreen().catch(() => {});
        }, 500);
      })
      .catch(() => { alert('Falha ao carregar a prova.'); setStatus('finished'); });

    function startNew(e: Exam) {
      let qs = [...(e.questions || [])];
      
      // Feature 4: Randomize Question Order
      if (e.randomizeQuestions) qs = shuffle(qs);

      // Feature 3: Randomize Options
      if (e.randomizeOptions) {
        qs = qs.map(q => ({ ...q, options: shuffle(q.options) }));
      }

      setOrderedQuestions(qs);
      
      const initAnswers: Record<string, string[]> = {};
      qs.forEach(q => { initAnswers[q.id] = []; });
      setSelectedAnswers(initAnswers);
    }

    const newSocket = io(`http://${window.location.hostname}:3001`);
    setSocket(newSocket);
    newSocket.on('status_update', (s) => { setStatus(s); });
    return () => { newSocket.disconnect(); };
  }, [roomName, sessionId, roomId, router]);

  // ── 2. Persistence Hook ──────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'active' && sessionId && orderedQuestions.length > 0) {
      const state = {
        orderedQuestions,
        selectedAnswers,
        currentIndex,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(`exam_progress_${sessionId}`, JSON.stringify(state));
    }
  }, [selectedAnswers, currentIndex, status, sessionId, orderedQuestions]);

  // ── 3. Anti-fraud Hooks ───────────────────────────────────────────────────
  useEffect(() => {
    const originalOpen = window.open.bind(window);
    window.open = () => { alert('Abertura de novas janelas está bloqueada.'); return null; };
    return () => { window.open = originalOpen; };
  }, []);

  // Periodic screenshot: captures every 8s while exam is active and page is visible.
  // This ref always holds the LAST valid screenshot taken while the student was on the page.
  const lastScreenshotRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (status !== 'active') return;

    const captureSnapshot = async () => {
      if (document.hidden || isExamEndingRef.current) return;
      try {
        const dataUrl = await toJpeg(document.body, {
          quality: 0.55,
          pixelRatio: 0.5,   // half resolution keeps file size manageable
          skipFonts: true,
          cacheBust: false,
        });
        lastScreenshotRef.current = dataUrl;
      } catch (err) {
        console.warn('[LeanPulse] Screenshot capture failed:', err);
      }
    };

    // Capture immediately once the exam starts, then every 8 seconds
    captureSnapshot();
    const interval = setInterval(captureSnapshot, 8000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    if (status !== 'active' || !socket || !sessionId || !roomId) return;

    const report = (type: string) => {
      if (isExamEndingRef.current) return;
      // Send the last valid screenshot captured while the page was visible
      socket.emit('report_violation', {
        roomId,
        sessionId,
        type,
        screenshot: lastScreenshotRef.current,
      });
    };

    const onVisibility = () => { if (document.hidden) report('tab_change'); };
    const onBlur = () => report('blur');
    const onFullscreen = () => { if (!document.fullscreenElement) report('exit_fullscreen'); };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFullscreen);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFullscreen);
    };
  }, [status, socket, roomId, sessionId]);

  // ── 4. Handlers ──────────────────────────────────────────────────────────
  const toggleOption = (questionId: string, optionId: string) => {
    setSelectedAnswers(prev => {
      const current = prev[questionId] || [];
      const next = current.includes(optionId) 
        ? current.filter(id => id !== optionId) 
        : [...current, optionId];
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = async () => {
    if (!sessionId) return;
    if (!confirm('Finalizar e entregar a prova?')) return;

    isExamEndingRef.current = true;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});

    setSubmitting(true);
    try {
      const answersBody = Object.entries(selectedAnswers).map(([qId, optIds]) => ({
        questionId: qId,
        selectedOptionIds: optIds,
      }));

      const res = await fetch(`http://${window.location.hostname}:3001/sessions/${sessionId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersBody }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      setScoreResult({ rawScore: data.rawScore, finalGrade: data.finalGrade, weight: data.weight });
      setStatus('finished');
      localStorage.removeItem(`exam_progress_${sessionId}`);
    } catch {
      alert('Falha ao enviar. Tente novamente.');
      isExamEndingRef.current = false;
      document.documentElement.requestFullscreen().catch(() => {});
    } finally {
      setSubmitting(false);
    }
  };

  // ── 5. Status Screens ─────────────────────────────────────────────────────
  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-primary">Carregando ambiente seguro...</div>;

  if (status === 'blocked') return (
    <main className="min-h-screen flex items-center justify-center bg-red-900/10">
      <div className="glass-panel max-w-md p-10 text-center border-danger">
        <h1 className="text-3xl font-bold text-danger mb-4">Sessão Bloqueada</h1>
        <p className="opacity-70 mb-4">Violação de segurança detectada.</p>
        <p className="text-xs opacity-50">O professor deve desbloquear sua tela para você continuar de onde parou.</p>
      </div>
    </main>
  );

  if (status === 'finished') {
    const weight = scoreResult?.weight || exam?.weight || 1;
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel w-full max-w-lg p-10 text-center border-success/30 shadow-2xl space-y-6">
          <div className="text-success text-6xl">✓</div>
          <h1 className="text-2xl font-bold">Prova Entregue!</h1>
          {scoreResult && (
            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-left">
              <div className="flex justify-between items-center mb-2">
                <span className="opacity-60 text-sm">Pontos</span>
                <span className="font-bold">{scoreResult.rawScore.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center text-2xl">
                <span className="font-bold">Nota Final</span>
                <span className="font-black text-accent">{scoreResult.finalGrade.toFixed(2)}</span>
              </div>
              <p className="text-center text-[10px] opacity-30 mt-4 italic">Cálculo: Pontos x (Peso {weight} / 10)</p>
            </div>
          )}
          <button onClick={() => router.push('/')} className="btn-primary w-full py-4">Sair do Painel</button>
        </div>
      </main>
    );
  }

  // ── 6. Active Exam Layout ─────────────────────────────────────────────────
  const currentQuestion = orderedQuestions[currentIndex];
  const isOneAtATime = exam?.showOneAtATime;

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col p-6 md:p-12 relative overflow-y-auto">
      {/* Header Info */}
      <header className="max-w-4xl mx-auto w-full glass-panel p-4 mb-8 flex justify-between items-center border-b-2 border-primary/40">
        <div>
          <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-md">{exam?.title}</h1>
          <p className="text-[10px] opacity-40 uppercase tracking-tighter">Sala: {roomName} · Aluno: {sessionId?.substring(0,8)}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-[10px] font-black px-2 py-1 bg-primary/20 text-primary rounded ring-1 ring-primary/40 animate-pulse">PROTEGIDO</div>
          {isOneAtATime && (
            <div className="text-xs font-mono opacity-60">
              Questão {currentIndex + 1} / {orderedQuestions.length}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full flex-1 space-y-6">
        {/* Progress Bar (at top) */}
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-500" 
            style={{ width: `${((currentIndex + 1) / orderedQuestions.length) * 100}%` }}
          ></div>
        </div>

        {/* Question(s) Render */}
        <div className="space-y-8">
          {orderedQuestions.map((q, idx) => {
            const isVisible = !isOneAtATime || idx === currentIndex;
            if (!isVisible) return null;

            const selected = selectedAnswers[q.id] || [];
            return (
              <div key={idx} className={`glass-panel p-8 space-y-6 transition-all duration-300 ${isOneAtATime ? 'scale-100 opacity-100' : ''}`}>
                <div className="flex justify-between items-start gap-4">
                  <h3 className="text-lg leading-relaxed font-medium">
                    <span className="opacity-30 mr-2 font-mono">{idx + 1}.</span>
                    {q.statement}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-1 rounded bg-accent/20 text-accent whitespace-nowrap">{q.pointValue} PTS</span>
                </div>

                <div className="space-y-3">
                  {q.options.map((opt, oIdx) => {
                    const active = selected.includes(opt.id);
                    return (
                      <label 
                        key={opt.id}
                        className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                        active ? 'bg-primary/20 border-primary text-white shadow-[0_0_15px_rgba(37,99,235,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={active} 
                          onChange={() => toggleOption(q.id, opt.id)} 
                          className="w-5 h-5 accent-primary cursor-pointer"
                        />
                        <span className="text-sm font-mono opacity-30">{String.fromCharCode(65 + oIdx)})</span>
                        <span className="text-sm flex-1">{opt.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation Controls */}
        <div className="pt-8 flex justify-between items-center gap-4">
          {isOneAtATime ? (
            <>
              <button 
                onClick={() => setCurrentIndex(c => Math.max(0, c - 1))}
                disabled={currentIndex === 0 || exam?.allowBackNavigation === false}
                className="px-6 py-3 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-20 transition text-sm font-bold"
              >
                ← Anterior
              </button>
              
              {currentIndex < orderedQuestions.length - 1 ? (
                <button 
                  onClick={() => setCurrentIndex(c => c + 1)}
                  className="px-8 py-3 bg-[var(--surface-high)] text-white border border-white/10 rounded-lg font-bold hover:bg-white/10 transition text-sm shadow-xl"
                >
                  Próxima Questão →
                </button>
              ) : (
                <button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="px-10 py-3 bg-[var(--success)] text-white rounded-lg font-bold hover:brightness-110 shadow-lg shadow-[var(--success)]/20 transition text-sm"
                >
                  {submitting ? 'Enviando...' : 'Finalizar Prova ✓'}
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="w-full py-4 bg-[var(--success)] text-white rounded-xl font-black shadow-xl shadow-[var(--success)]/20 hover:brightness-110 transition uppercase tracking-widest"
            >
              {submitting ? 'Enviando...' : 'Finalizar e Entregar Avaliação ✓'}
            </button>
          )}
        </div>
      </main>

      {/* Background Decor */}
      {!document.fullscreenElement && (
        <div className="fixed bottom-6 right-6 z-50">
          <button 
            onClick={() => document.documentElement.requestFullscreen()}
            className="bg-[var(--danger)] px-4 py-2 rounded-full text-[10px] font-black text-white shadow-[0_10px_20px_var(--danger)] animate-bounce"
          >
            ⚠️ CLIQUE PARA TELA CHEIA
          </button>
        </div>
      )}
    </div>
  );
}

export default function ExamEnvironment() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-primary">
        Carregando ambiente seguro...
      </div>
    }>
      <ExamContent />
    </Suspense>
  );
}
