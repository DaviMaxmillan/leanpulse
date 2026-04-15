'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface Option { id: string; text: string }
interface Question { id: string; statement: string; type: string; options: Option[] }
interface ActivityData {
  id: string; title: string; type: string; description?: string; isOpen: boolean;
  fileUrl?: string; filename?: string;
  teacher: { name: string };
  class: { name: string; subject?: string; students: { id: string; name: string; email: string }[] };
  questions: Question[];
}

type Answers = Record<string, { text?: string; optionId?: string; file?: File }>;

export default function AtividadeAlunoPage() {
  const params = useParams();
  const code = (params.code as string)?.toUpperCase();

  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'identify' | 'answer' | 'success'>('identify');

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [useManual, setUseManual] = useState(false);

  const [answers, setAnswers] = useState<Answers>({});
  const [activityFile, setActivityFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const API = () => `http://${window.location.hostname}:3001`;

  useEffect(() => {
    fetch(`${API()}/activities/access/${code}`)
      .then(r => r.ok ? r.json() : r.json().then(e => { throw new Error(e.message); }))
      .then(data => { setActivity(data); setLoading(false); })
      .catch(e => { setError(e.message || 'Atividade não encontrada.'); setLoading(false); });
  }, [code]);

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!useManual && !selectedStudentId) { alert('Selecione seu nome na lista.'); return; }
    if (useManual && (!manualName.trim() || !manualEmail.trim())) { alert('Preencha nome e e-mail.'); return; }
    setStep('answer');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const unanswered = activity!.questions.filter(q => {
      const ans = answers[q.id];
      if (!ans) return true;
      if (q.type === 'TEXT') return !ans.text?.trim();
      if (q.type === 'FILE') return !ans.file;
      return !ans.optionId;
    });
    if (unanswered.length > 0) { alert(`Responda todas as questões antes de enviar.`); return; }

    let studentName = manualName;
    let studentEmail = manualEmail;
    if (!useManual && selectedStudentId) {
      const student = activity!.class.students.find(s => s.id === selectedStudentId);
      if (student) { studentName = student.name; studentEmail = student.email; }
    }

    setSubmitting(true);
    try {
      const payload = {
        studentName,
        studentEmail,
        answers: activity!.questions.map(q => ({
          questionId: q.id,
          textAnswer: answers[q.id]?.text,
          selectedOptionId: answers[q.id]?.optionId,
        })),
      };

      const fd = new FormData();
      fd.append('payload', JSON.stringify(payload));
      
      activity!.questions.forEach(q => {
        if (q.type === 'FILE' && answers[q.id]?.file) {
          fd.append(`file_${q.id}`, answers[q.id].file as File);
        }
      });
      if (activityFile) {
        fd.append('activity_file', activityFile);
      }

      const res = await fetch(`${API()}/activities/access/${code}/submit`, {
        method: 'POST',
        body: fd,
      });
      if (res.ok) { setStep('success'); }
      else { const err = await res.json(); alert(err.message || 'Erro ao enviar.'); }
    } finally { setSubmitting(false); }
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '2rem 1rem',
    background: 'linear-gradient(135deg, #0B1E3F 0%, #0e2a55 50%, #0B1E3F 100%)',
    fontFamily: 'Montserrat, sans-serif',
  };

  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.5rem',
    overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
    width: '100%', maxWidth: '600px',
  };

  return (
    <div style={containerStyle}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50px', padding: '0.4rem 1rem' }}>
            <span style={{ color: '#0FA4AF', fontWeight: 900, fontSize: '1.125rem' }}>LP</span>
            <span style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem' }}>LeanPulse</span>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #0FA4AF, #8B5CF6, #0FA4AF)' }} />
          <div style={{ padding: '2rem' }}>

            {/* LOADING */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <svg style={{ animation: 'spin 1s linear infinite', display: 'inline' }} width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="rgba(15,164,175,0.3)" strokeWidth="4"/>
                  <path d="M4 12a8 8 0 018-8" stroke="#0FA4AF" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* ERROR */}
            {!loading && error && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
                <h2 style={{ color: 'white', fontWeight: 800 }}>Atividade não encontrada</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>{error}</p>
              </div>
            )}

            {/* SUCCESS */}
            {step === 'success' && (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 0 40px rgba(16,185,129,0.35)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem' }}>Respostas Enviadas!</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9375rem' }}>Sua atividade foi registrada com sucesso. 🎓</p>
              </div>
            )}

            {/* IDENTIFY */}
            {!loading && !error && step === 'identify' && activity && (
              <form onSubmit={handleIdentify}>
                <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{activity.type === 'EXERCISE' ? '✏️' : '📊'}</div>
                  <h1 style={{ color: 'white', fontSize: '1.375rem', fontWeight: 800, margin: 0 }}>{activity.title}</h1>
                  <p style={{ color: '#0FA4AF', fontWeight: 600, fontSize: '0.875rem', marginTop: '0.25rem' }}>{activity.class.name}{activity.class.subject ? ` · ${activity.class.subject}` : ''}</p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Prof. {activity.teacher.name} · {activity.questions.length} questão(ões)</p>
                  {activity.description && <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', marginTop: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.08)' }}>{activity.description}</p>}
                </div>

                {!useManual && activity.class.students.length > 0 ? (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>Selecione seu nome *</label>
                    <select required value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)}
                      style={{ width: '100%', padding: '0.875rem 1rem', boxSizing: 'border-box', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: selectedStudentId ? 'white' : 'rgba(255,255,255,0.4)', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9375rem', outline: 'none', cursor: 'pointer' }}>
                      <option value="" style={{ background: '#0B1E3F' }}>Escolha seu nome...</option>
                      {activity.class.students.map(s => <option key={s.id} value={s.id} style={{ background: '#0B1E3F' }}>{s.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setUseManual(true)}
                      style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem', fontFamily: 'inherit' }}>
                      Meu nome não está na lista →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginBottom: '1rem' }}>
                    {useManual && (
                      <button type="button" onClick={() => { setUseManual(false); setSelectedStudentId(''); }}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        ← Voltar para a lista
                      </button>
                    )}
                    {[{ label: 'Nome completo', key: 'name', type: 'text', placeholder: 'Seu nome completo', value: manualName, onChange: (v: string) => setManualName(v) },
                      { label: 'E-mail', key: 'email', type: 'email', placeholder: 'seu@email.com', value: manualEmail, onChange: (v: string) => setManualEmail(v) }].map(f => (
                      <div key={f.key}>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{f.label} *</label>
                        <input type={f.type} required placeholder={f.placeholder} value={f.value} onChange={e => f.onChange(e.target.value)}
                          style={{ width: '100%', padding: '0.875rem 1rem', boxSizing: 'border-box', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'white', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.9375rem', outline: 'none' }} />
                      </div>
                    ))}
                  </div>
                )}

                <button type="submit" style={{ width: '100%', padding: '0.875rem', borderRadius: '0.875rem', background: 'linear-gradient(135deg, #0FA4AF, #0a8a95)', border: 'none', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                  Começar Atividade →
                </button>
              </form>
            )}

            {/* ANSWER */}
            {step === 'answer' && activity && (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                  <button type="button" onClick={() => setStep('identify')}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem' }}>
                    ← Voltar
                  </button>
                  <span style={{ color: '#0FA4AF', fontWeight: 700, fontSize: '0.875rem' }}>{activity.questions.length} questão(ões)</span>
                </div>

                {activity.fileUrl && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(15,164,175,0.1)', borderRadius: '1rem', border: '1px solid rgba(15,164,175,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.25rem' }}>Material de Apoio</h3>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: 0 }}>Baixe o arquivo antes de responder.</p>
                    </div>
                    <a href={`${API()}${activity.fileUrl}`} target="_blank" rel="noreferrer"
                      style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#0FA4AF', color: 'white', fontWeight: 800, fontSize: '0.8rem', textDecoration: 'none' }}>
                      Baixar {activity.filename && `(${activity.filename})`}
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '65vh', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {activity.questions.map((q, i) => (
                    <div key={q.id} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.875rem' }}>
                        <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(15,164,175,0.2)', border: '1px solid rgba(15,164,175,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0FA4AF', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>{i + 1}</span>
                        <p style={{ color: 'white', fontWeight: 700, fontSize: '0.9375rem', margin: 0 }}>{q.statement}</p>
                      </div>
                      {q.type === 'TEXT' ? (
                        <textarea rows={3} required placeholder="Sua resposta..."
                          value={answers[q.id]?.text || ''}
                          onChange={e => setAnswers(prev => ({ ...prev, [q.id]: { text: e.target.value } }))}
                          style={{ width: '100%', padding: '0.75rem 1rem', boxSizing: 'border-box', borderRadius: '0.75rem', border: '1.5px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: 'white', fontFamily: 'inherit', fontWeight: 500, fontSize: '0.9rem', outline: 'none', resize: 'vertical' }} />
                      ) : q.type === 'FILE' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                           <input type="file" required onChange={e => {
                             const file = e.target.files?.[0];
                             if (file) setAnswers(prev => ({ ...prev, [q.id]: { file } }));
                           }} style={{ background: 'rgba(255,255,255,0.06)', padding: '0.75rem', borderRadius: '0.75rem', color: 'white', border: '1.5px dashed rgba(255,255,255,0.2)' }} />
                           {answers[q.id]?.file && <p style={{ fontSize: '0.8rem', color: '#0FA4AF', margin: 0 }}>Anexado: {answers[q.id].file!.name}</p>}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {q.options.map((opt, oi) => {
                            const isSelected = answers[q.id]?.optionId === opt.id;
                            return (
                              <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.625rem 0.875rem', borderRadius: '0.625rem', border: `1.5px solid ${isSelected ? '#0FA4AF' : 'rgba(255,255,255,0.1)'}`, background: isSelected ? 'rgba(15,164,175,0.12)' : 'rgba(255,255,255,0.04)', transition: 'all 0.15s' }}>
                                <input type="radio" name={q.id} value={opt.id} checked={isSelected}
                                  onChange={() => setAnswers(prev => ({ ...prev, [q.id]: { optionId: opt.id } }))}
                                  style={{ accentColor: '#0FA4AF', width: '16px', height: '16px' }} />
                                <span style={{ color: isSelected ? 'white' : 'rgba(255,255,255,0.7)', fontWeight: isSelected ? 700 : 500, fontSize: '0.9rem' }}>
                                  <strong style={{ color: '#0FA4AF', marginRight: '0.375rem' }}>{String.fromCharCode(65 + oi)}.</strong>{opt.text}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Upload de anexo adicional para o aluno entregar */}
                <div style={{ marginTop: '1.5rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem' }}>
                  <h3 style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Anexar Arquivo (Opcional)</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0 0 1rem' }}>Caso precise enviar algum material complementar para o professor.</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.75rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1.5px dashed rgba(255,255,255,0.2)', cursor: 'pointer' }}>
                    <div style={{ background: 'rgba(15,164,175,0.2)', color: '#0FA4AF', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontWeight: 800, fontSize: '0.75rem' }}>
                      Adicionar Arquivo
                    </div>
                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {activityFile ? activityFile.name : "Nenhum arquivo selecionado"}
                    </span>
                    <input type="file" style={{ display: 'none' }} onChange={e => setActivityFile(e.target.files?.[0] || null)} />
                  </label>
                </div>

                <button type="submit" disabled={submitting}
                  style={{ width: '100%', padding: '0.875rem', borderRadius: '0.875rem', marginTop: '1.5rem', background: submitting ? 'rgba(15,164,175,0.4)' : 'linear-gradient(135deg, #0FA4AF, #0a8a95)', border: 'none', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: submitting ? 'none' : '0 4px 20px rgba(15,164,175,0.3)' }}>
                  {submitting ? '⏳ Enviando...' : '✅ Enviar Respostas'}
                </button>
              </form>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
