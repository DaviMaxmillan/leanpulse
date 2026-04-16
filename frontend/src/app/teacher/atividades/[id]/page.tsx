'use client';
import { getApiUrl as API } from '../../../../lib/api';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface ActivityDetail {
  id: string; title: string; type: string; code: string; isOpen: boolean;
  description?: string; dueDate?: string; createdAt: string;
  class: { name: string; subject?: string; students: { id: string; name: string; email: string }[] };
  questions: { id: string; statement: string; type: string; options: { id: string; text: string }[] }[];
  submissions: {
    id: string; studentName: string; studentEmail: string; submittedAt: string; grade: number | null;
    fileUrl?: string; filename?: string;
    answers: { questionId: string; textAnswer?: string; selectedOptionId?: string; fileUrl?: string; filename?: string; question: { statement: string } }[];
  }[];
  _count: { submissions: number };
}

export default function AtividadeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [token, setToken] = useState('');
  const [activity, setActivity] = useState<ActivityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'respostas' | 'questoes' | 'compartilhar'>('respostas');
  const [selectedSubmission, setSelectedSubmission] = useState<string | null>(null);

  

  useEffect(() => {
    const t = localStorage.getItem('teacher_token');
    if (!t) { router.push('/teacher/login'); return; }
    setToken(t);
    fetch(`${API()}/activities/${id}`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(data => { setActivity(data); setLoading(false); })
      .catch(() => { router.push('/teacher/atividades'); });
  }, [id]);

  const handleToggle = async () => {
    const res = await fetch(`${API()}/activities/${id}/toggle`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setActivity(prev => prev ? { ...prev, isOpen: !prev.isOpen } : prev);
  };

  const downloadFile = async (url: string, filename: string) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) { alert('Erro ao exportar.'); return; }
    const blob = await res.blob();
    const objUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleExportExcel = () => downloadFile(`${API()}/activities/${id}/export/excel`, `atividade_${activity?.code}.xlsx`);
  const handleExportPdf = (subId: string) => downloadFile(`${API()}/activities/${id}/submissions/${subId}/export/pdf`, `aluno_${subId}.pdf`);

  const handleGrade = async (subId: string) => {
    const gradeStr = prompt('Digite a nota para este aluno:');
    if (gradeStr === null) return;
    const grade = parseFloat(gradeStr);
    if (isNaN(grade)) { alert('Nota inválida.'); return; }
    
    const res = await fetch(`${API()}/activities/${id}/submissions/${subId}/grade`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ grade })
    });
    if (res.ok) {
      setActivity(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          submissions: prev.submissions.map(s => s.id === subId ? { ...s, grade } : s)
        };
      });
    } else {
      alert('Erro ao salvar a nota.');
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--surface-low)] flex items-center justify-center font-montserrat">
      <svg className="animate-spin h-10 w-10 text-[var(--primary)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );

  if (!activity) return null;

  const accessUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/atividade/${activity.code}`;
  const pendingStudents = activity.class.students.filter(s => !activity.submissions.some(sub => sub.studentEmail === s.email));
  const expandedSub = activity.submissions.find(s => s.id === selectedSubmission);

  return (
    <div className="min-h-screen bg-[var(--surface-low)] font-montserrat">
      {/* Header */}
      <div className="bg-[var(--surface-card)] border-b border-[var(--outline)] sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <button onClick={() => router.push('/teacher/atividades')}
                className="flex items-center gap-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors font-semibold text-sm flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Atividades
              </button>
              <span className="text-[var(--outline)]">/</span>
              <div className="min-w-0">
                <h1 className="font-extrabold text-[var(--on-surface)] text-lg truncate">{activity.title}</h1>
                <p className="text-sm text-[var(--primary)] font-semibold">{activity.class.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${activity.isOpen ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {activity.isOpen ? '● Aberta' : '○ Fechada'}
              </span>
              <button onClick={handleExportExcel}
                className="px-4 py-2 rounded-xl bg-[var(--surface-low)] border border-[var(--outline)] text-[var(--on-surface)] font-bold text-sm hover:border-[var(--primary)] transition-colors">
                📊 Exportar (.xlsx)
              </button>
              <button onClick={handleToggle}
                className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${activity.isOpen ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                {activity.isOpen ? 'Fechar Atividade' : 'Reabrir Atividade'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4">
            {([
              { key: 'respostas', label: `Respostas (${activity._count.submissions})`, icon: '📝' },
              { key: 'questoes', label: `Questões (${activity.questions.length})`, icon: '📋' },
              { key: 'compartilhar', label: 'Compartilhar', icon: '🔗' },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-all ${activeTab === tab.key ? 'bg-[var(--primary)] text-white' : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-low)]'}`}>
                <span>{tab.icon}</span>{tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">

        {/* TAB: Respostas */}
        {activeTab === 'respostas' && (
          <div className="grid md:grid-cols-[1fr_320px] gap-5">
            <div>
              <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] overflow-hidden">
                {activity.submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="font-bold text-[var(--on-surface)] mb-1">Nenhuma resposta ainda</p>
                    <p className="text-sm text-[var(--on-surface-variant)] font-medium">Compartilhe o código com os alunos para eles responderem.</p>
                  </div>
                ) : (
                  <>
                    <div className="px-5 py-3 border-b border-[var(--outline)] bg-[var(--surface-low)] flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[var(--on-surface-variant)] uppercase tracking-wider">Alunos que responderam</span>
                      <span className="text-xs font-extrabold text-[var(--primary)]">{activity._count.submissions}/{activity.class.students.length}</span>
                    </div>
                    <div className="divide-y divide-[var(--outline)]">
                      {activity.submissions.map(sub => (
                        <div key={sub.id}
                          onClick={() => setSelectedSubmission(prev => prev === sub.id ? null : sub.id)}
                          className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer transition-colors ${selectedSubmission === sub.id ? 'bg-[var(--primary-container)]' : 'hover:bg-[var(--surface-low)]'}`}>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-sm font-extrabold flex-shrink-0">
                            {sub.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[var(--on-surface)] text-sm">{sub.studentName}</p>
                            <p className="text-xs text-[var(--on-surface-muted)] font-medium">{new Date(sub.submittedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[var(--on-surface-variant)] transition-transform ${selectedSubmission === sub.id ? 'rotate-90' : ''}`}>
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Painel de respostas individuais */}
            {expandedSub ? (
              <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-extrabold text-[var(--on-surface)] text-lg">Respostas de {expandedSub.studentName}</h3>
                    <p className="text-sm font-bold mt-1 text-[var(--on-surface-variant)]">Nota atual: <span className={expandedSub.grade !== null ? "text-[var(--primary)] text-base" : ""}>{expandedSub.grade !== null ? expandedSub.grade : 'Não avaliada'}</span></p>
                    {expandedSub.fileUrl && (
                      <a href={`${API()}${expandedSub.fileUrl}`} target="_blank" rel="noopener noreferrer" 
                        className="inline-flex mt-2 text-xs font-bold text-white bg-[var(--primary)] px-2.5 py-1.5 rounded-lg hover:bg-[var(--primary-hover)] transition-colors">
                        📎 Baixar Anexo da Entrega
                      </a>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleGrade(expandedSub.id)}
                      className="px-3 py-1.5 rounded-lg border border-[var(--outline)] text-[var(--on-surface)] font-bold text-xs hover:border-[var(--primary)] transition-colors">
                      Atribuir Nota
                    </button>
                    <button onClick={() => handleExportPdf(expandedSub.id)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--primary-container)] text-[var(--primary)] font-bold text-xs border border-[var(--primary)]/20 hover:bg-[var(--primary)] hover:text-white transition-all">
                      📄 Baixar PDF
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {expandedSub.answers.map((ans, i) => {
                    const question = activity.questions.find(q => q.id === ans.questionId);
                    const selectedOpt = question?.options.find(o => o.id === ans.selectedOptionId);
                    return (
                      <div key={i} className="bg-[var(--surface-low)] rounded-xl p-3 border border-[var(--outline)]">
                        <p className="text-xs font-extrabold text-[var(--primary)] mb-1">Q{i + 1}</p>
                        <p className="text-sm font-bold text-[var(--on-surface)] mb-2">{question?.statement}</p>
                        <div className="bg-white/50 rounded-lg px-3 py-2 border border-[var(--outline)]">
                          {question?.type === 'FILE' ? (
                            ans.fileUrl ? (
                              <a href={`${API()}${ans.fileUrl}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-[var(--primary)] hover:underline flex items-center gap-2">
                                📎 Ver Arquivo: {ans.filename}
                              </a>
                            ) : <span className="text-[var(--on-surface-muted)] italic text-sm font-semibold">Sem resposta</span>
                          ) : (
                            <p className="text-sm text-[var(--on-surface)] font-semibold">
                              {ans.textAnswer || selectedOpt?.text || <span className="text-[var(--on-surface-muted)] italic">Sem resposta</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                {/* Alunos pendentes */}
                <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[var(--outline)] bg-[var(--surface-low)]">
                    <span className="text-xs font-extrabold text-amber-600 uppercase tracking-wider">Pendentes ({pendingStudents.length})</span>
                  </div>
                  {pendingStudents.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[var(--on-surface-variant)] font-semibold">✅ Todos responderam!</div>
                  ) : (
                    <div className="divide-y divide-[var(--outline)] max-h-64 overflow-y-auto">
                      {pendingStudents.map(s => (
                        <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-extrabold flex-shrink-0">{s.name.charAt(0)}</div>
                          <p className="text-sm font-semibold text-[var(--on-surface-variant)]">{s.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Questões */}
        {activeTab === 'questoes' && (
          <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] overflow-hidden">
            <div className="divide-y divide-[var(--outline)]">
              {activity.questions.map((q, i) => (
                <div key={q.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-[var(--primary-container)] text-[var(--primary)] flex items-center justify-center text-xs font-extrabold flex-shrink-0">{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-bold text-[var(--on-surface)] mb-1">{q.statement}</p>
                      <span className="text-xs font-semibold text-[var(--on-surface-muted)]">{q.type === 'TEXT' ? '📝 Resposta discursiva' : q.type === 'FILE' ? '📎 Upload de arquivo' : '🔘 Múltipla escolha'}</span>
                      {q.type === 'MULTIPLE_CHOICE' && q.options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, oi) => (
                            <div key={opt.id} className="flex items-center gap-2 text-sm text-[var(--on-surface-variant)] font-medium">
                              <span className="w-5 h-5 rounded-full border border-[var(--outline)] flex items-center justify-center text-[10px] font-extrabold">{String.fromCharCode(65 + oi)}</span>
                              {opt.text}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: Compartilhar */}
        {activeTab === 'compartilhar' && (
          <div className="flex flex-col items-center">
            <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] p-8 text-center max-w-md w-full">
              <h3 className="font-extrabold text-[var(--on-surface)] text-xl mb-2">Compartilhar Atividade</h3>
              <p className="text-sm text-[var(--on-surface-variant)] font-medium mb-6">Os alunos podem acessar e responder usando o código ou link abaixo.</p>

              <div className="bg-white p-4 rounded-2xl border border-[var(--outline)] inline-block mb-5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(accessUrl)}&bgcolor=ffffff&color=0B1E3F`}
                  alt="QR Code" width={180} height={180} className="rounded-xl" />
              </div>

              <div className="bg-[var(--primary-container)] rounded-xl p-4 mb-4 border border-[var(--primary)]/20">
                <p className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-1">Código da Atividade</p>
                <p className="text-3xl font-extrabold tracking-widest text-[var(--primary)]">{activity.code}</p>
              </div>

              <div className="bg-[var(--surface-low)] rounded-xl p-3 mb-4 border border-[var(--outline)] flex items-center gap-2">
                <p className="flex-1 text-xs font-mono text-[var(--on-surface-variant)] truncate">{accessUrl}</p>
                <button onClick={() => navigator.clipboard.writeText(accessUrl).then(() => alert('Link copiado!'))}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors">
                  Copiar
                </button>
              </div>

              {activity.description && (
                <div className="bg-[var(--surface-low)] rounded-xl p-3 border border-[var(--outline)] text-left">
                  <p className="text-xs font-bold text-[var(--on-surface-variant)] mb-1">Instruções para os alunos:</p>
                  <p className="text-sm text-[var(--on-surface)] font-medium">{activity.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
