'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Material { id: string; type: string; title: string; url?: string; filename?: string; filesize?: number; mimetype?: string }
interface Material { id: string; type: string; title: string; url?: string; filename?: string; filesize?: number }
interface Folder { id: string; name: string; materials: Material[] }
interface Lesson { id: string; title: string; topic?: string; objectives?: string; status: string; order: number; materials: Material[]; folders: Folder[] }
interface ClassItem { id: string; name: string; subject?: string }
interface Plan {
  id: string; title: string; subject?: string; description?: string;
  lessons: Lesson[];
  classes: ClassItem[];
  _count: { lessons: number };
}

// Remove the deprecated function

const statusConfig = {
  PLANNED:   { label: '📋 Planejada', bg: 'bg-gray-100', text: 'text-gray-600' },
  DELIVERED: { label: '✅ Ministrada', bg: 'bg-green-100', text: 'text-green-700' },
  CANCELLED: { label: '❌ Cancelada', bg: 'bg-red-100', text: 'text-red-600' },
};

const materialIcon = (type: string) => ({ LINK: '🔗', VIDEO: '🎬', DRIVE: '📁', FILE: '📎' }[type] || '📎');

export default function PlanoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const planId = params.id as string;

  const [token, setToken] = useState('');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Aulas
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', topic: '', objectives: '' });
  
  // Pastas
  const [showFolderModal, setShowFolderModal] = useState<string | null>(null); // lessonId
  const [folderName, setFolderName] = useState('');
  const [savingFolder, setSavingFolder] = useState(false);

  // Materiais
  const [showMaterialModal, setShowMaterialModal] = useState<{lessonId: string; folderId?: string} | null>(null);
  const [matType, setMatType] = useState<'LINK'|'VIDEO'|'DRIVE'|'FILE'>('LINK');
  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matFile, setMatFile] = useState<File | null>(null);
  const [savingMat, setSavingMat] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Vincular turma
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const API = () => `http://${window.location.hostname}:3001`;

  useEffect(() => {
    const t = localStorage.getItem('teacher_token');
    if (!t) { router.push('/teacher/login'); return; }
    setToken(t);
    Promise.all([
      fetch(`${API()}/lesson-plans/${planId}`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).then(setPlan),
      fetch(`${API()}/classes`, { headers: { Authorization: `Bearer ${t}` } }).then(r => r.json()).then(setAllClasses),
    ]).finally(() => setLoading(false));
  }, [planId]);

  const refresh = async () => {
    const res = await fetch(`${API()}/lesson-plans/${planId}`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPlan(await res.json());
  };

  // ─── Aulas ───────────────────────────────────────────────────────────────

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLesson(true);
    const res = await fetch(`${API()}/lesson-plans/${planId}/lessons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(lessonForm),
    });
    if (res.ok) { await refresh(); setShowLessonModal(false); setLessonForm({ title: '', topic: '', objectives: '' }); }
    setSavingLesson(false);
  };

  const handleUpdateLessonStatus = async (lessonId: string, status: string) => {
    await fetch(`${API()}/lesson-plans/lessons/${lessonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setPlan(prev => prev ? { ...prev, lessons: prev.lessons.map(l => l.id === lessonId ? { ...l, status } : l) } : prev);
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Excluir esta aula e seus materiais?')) return;
    await fetch(`${API()}/lesson-plans/lessons/${lessonId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setPlan(prev => prev ? { ...prev, lessons: prev.lessons.filter(l => l.id !== lessonId), _count: { lessons: prev._count.lessons - 1 } } : prev);
  };

  // ─── Pastas ───────────────────────────────────────────────────────────────

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showFolderModal) return;
    setSavingFolder(true);
    const res = await fetch(`${API()}/lesson-plans/lessons/${showFolderModal}/folders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: folderName }),
    });
    if (res.ok) { await refresh(); setShowFolderModal(null); setFolderName(''); }
    setSavingFolder(false);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Excluir pasta e todo o seu conteúdo?')) return;
    await fetch(`${API()}/lesson-plans/folders/${folderId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await refresh();
  };

  // ─── Materiais ────────────────────────────────────────────────────────────

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showMaterialModal) return;
    setSavingMat(true);
    try {
      if (matType === 'FILE' && matFile) {
        const fd = new FormData();
        fd.append('file', matFile);
        fd.append('title', matTitle || matFile.name);
        if (showMaterialModal.folderId) fd.append('folderId', showMaterialModal.folderId);
        const res = await fetch(`${API()}/lesson-plans/lessons/${showMaterialModal.lessonId}/materials/upload`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        });
        if (res.ok) { await refresh(); closeMaterialModal(); }
        else { const e = await res.json(); alert(e.message || 'Erro ao fazer upload.'); }
      } else {
        const payload: any = { type: matType, title: matTitle, url: matUrl };
        if (showMaterialModal.folderId) payload.folderId = showMaterialModal.folderId;
        const res = await fetch(`${API()}/lesson-plans/lessons/${showMaterialModal.lessonId}/materials/link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (res.ok) { await refresh(); closeMaterialModal(); }
      }
    } finally { setSavingMat(false); }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!confirm('Remover este material?')) return;
    await fetch(`${API()}/lesson-plans/materials/${materialId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await refresh();
  };

  const closeMaterialModal = () => {
    setShowMaterialModal(null); setMatType('LINK'); setMatTitle(''); setMatUrl(''); setMatFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ─── Vincular Turma ───────────────────────────────────────────────────────

  const handleAssign = async () => {
    if (!selectedClassId) return;
    setAssigning(true);
    const res = await fetch(`${API()}/lesson-plans/${planId}/assign/${selectedClassId}`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) { await refresh(); setShowAssignModal(false); setSelectedClassId(''); }
    else { const e = await res.json(); alert(e.message || 'Erro ao vincular.'); }
    setAssigning(false);
  };

  const handleUnassign = async (classId: string) => {
    if (!confirm('Desvincular turma deste plano?')) return;
    await fetch(`${API()}/lesson-plans/class/${classId}/unassign`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    await refresh();
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-[var(--surface-low)] flex items-center justify-center font-montserrat">
      <svg className="animate-spin h-10 w-10 text-[var(--primary)]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  );
  if (!plan) return null;

  const deliveredCount = plan.lessons.filter(l => l.status === 'DELIVERED').length;
  const progress = plan._count.lessons > 0 ? Math.round((deliveredCount / plan._count.lessons) * 100) : 0;
  const availableClasses = allClasses.filter(c => !plan.classes.find(pc => pc.id === c.id));

  return (
    <div className="min-h-screen bg-[var(--surface-low)] font-montserrat">
      {/* Header */}
      <div className="bg-[var(--surface-card)] border-b border-[var(--outline)] sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <button onClick={() => router.push('/teacher/planos')}
                className="flex items-center gap-2 text-[var(--on-surface-variant)] hover:text-[var(--primary)] transition-colors font-semibold text-sm mb-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                Planos de Aula
              </button>
              <h1 className="text-xl font-extrabold text-[var(--on-surface)]">{plan.title}</h1>
              {plan.subject && <p className="text-sm text-[var(--primary)] font-semibold">{plan.subject}</p>}
              {plan.description && <p className="text-sm text-[var(--on-surface-variant)] font-medium">{plan.description}</p>}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--primary)] text-[var(--primary)] font-bold text-sm hover:bg-[var(--primary-container)] transition-colors">
                🎓 Vincular Turma
              </button>
              <button onClick={() => setShowLessonModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm shadow hover:shadow-lg transition-all">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nova Aula
              </button>
            </div>
          </div>

          {/* Progresso */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 h-2.5 bg-[var(--outline)] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-extrabold text-[var(--on-surface)] flex-shrink-0">
              {deliveredCount}/{plan._count.lessons} aulas ({progress}%)
            </span>
          </div>

          {/* Turmas vinculadas */}
          {plan.classes.length > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">Turmas:</span>
              {plan.classes.map(c => (
                <span key={c.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--primary-container)] text-[var(--primary)] text-xs font-bold border border-[var(--primary)]/20">
                  🎓 {c.name}
                  <button onClick={() => handleUnassign(c.id)} className="hover:text-red-500 transition-colors ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {plan.lessons.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-center">
            <div className="text-6xl mb-4">🏫</div>
            <h3 className="text-xl font-extrabold text-[var(--on-surface)] mb-2">Nenhuma aula criada</h3>
            <p className="text-[var(--on-surface-variant)] font-medium max-w-sm mb-6">Adicione aulas ao cronograma com datas, conteúdo e materiais.</p>
            <button onClick={() => setShowLessonModal(true)} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold shadow hover:shadow-lg transition-all">Adicionar Primeira Aula</button>
          </div>
        ) : (
          <div className="space-y-4">
            {plan.lessons.map((lesson, idx) => {
              const sc = statusConfig[lesson.status as keyof typeof statusConfig] || statusConfig.PLANNED;
              return (
                <div key={lesson.id} className="bg-[var(--surface-card)] rounded-2xl border border-[var(--outline)] overflow-hidden shadow-sm hover:shadow-md transition-all">
                  {/* Cabeçalho da Aula */}
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[var(--on-surface)] text-base">Aula {lesson.order}: {lesson.title}</span>
                      </div>
                      {lesson.topic && <p className="text-sm text-[var(--primary)] font-semibold mt-0.5">{lesson.topic}</p>}
                      {lesson.objectives && <p className="text-xs text-[var(--on-surface-variant)] font-medium mt-0.5 line-clamp-1">{lesson.objectives}</p>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Status dropdown */}
                      <select value={lesson.status} onChange={e => handleUpdateLessonStatus(lesson.id, e.target.value)}
                        className={`px-2.5 py-1.5 rounded-lg border-0 text-xs font-bold outline-none cursor-pointer ${sc.bg} ${sc.text}`}>
                        <option value="PLANNED">📋 Planejada</option>
                        <option value="DELIVERED">✅ Ministrada</option>
                        <option value="CANCELLED">❌ Cancelada</option>
                      </select>
                      <button onClick={() => setShowFolderModal(lesson.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-low)] border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-[var(--accent)] hover:border-[var(--accent)] text-xs font-bold transition-colors">
                        📁 Adicionar Pasta
                      </button>
                      <button onClick={() => setShowMaterialModal({ lessonId: lesson.id })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-low)] border border-[var(--outline)] text-[var(--on-surface-variant)] hover:text-[var(--primary)] hover:border-[var(--primary)] text-xs font-bold transition-colors">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Material
                      </button>
                      <button onClick={() => handleDeleteLesson(lesson.id)}
                        className="p-1.5 rounded-lg text-[var(--on-surface-muted)] hover:text-red-500 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>

                  {/* Materiais e Pastas */}
                  {(lesson.folders.length > 0 || lesson.materials.length > 0) && (
                    <div className="border-t border-[var(--outline)] px-5 py-4 flex flex-col gap-3 bg-[var(--surface-low)]">
                      {lesson.folders.map(folder => (
                        <div key={folder.id} className="rounded-xl border border-[var(--outline)] bg-[var(--surface-card)] overflow-hidden">
                          <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--outline)] bg-[var(--surface-low)]">
                            <span className="text-xs font-extrabold text-[var(--on-surface)] flex items-center gap-1.5">📁 {folder.name}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setShowMaterialModal({ lessonId: lesson.id, folderId: folder.id })} className="text-[10px] font-bold text-[var(--primary)] hover:text-[var(--primary-hover)] px-2 py-0.5 rounded-md border border-transparent hover:border-[var(--primary)]/30 transition-all">+ Add Material</button>
                              <button onClick={() => handleDeleteFolder(folder.id)} className="text-[10px] px-1 text-[var(--on-surface-muted)] hover:text-red-500 transition-colors">✕</button>
                            </div>
                          </div>
                          {folder.materials.length > 0 ? (
                            <div className="p-3 flex items-center gap-2 flex-wrap">
                              {folder.materials.map(mat => (
                                <div key={mat.id} className="flex items-center gap-1 group">
                                  <a href={mat.url?.startsWith('/uploads') ? `${API()}${mat.url}` : mat.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--surface-low)] border border-[var(--outline)] text-xs font-semibold text-[var(--on-surface)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                                    <span>{materialIcon(mat.type)}</span><span className="max-w-[120px] truncate">{mat.title}</span>
                                  </a>
                                  <button onClick={() => handleDeleteMaterial(mat.id)} className="opacity-0 group-hover:opacity-100 text-[var(--on-surface-muted)] hover:text-red-500 transition-all text-[10px]">✕</button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="p-2 text-[10px] text-[var(--on-surface-muted)] font-semibold px-4">Esta pasta está vazia.</p>
                          )}
                        </div>
                      ))}

                      {lesson.materials.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {lesson.materials.map(mat => (
                            <div key={mat.id} className="flex items-center gap-1.5 group">
                              <a href={mat.url?.startsWith('/uploads') ? `${API()}${mat.url}` : mat.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-card)] border border-[var(--outline)] text-xs font-bold text-[var(--on-surface)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                                <span>{materialIcon(mat.type)}</span><span className="max-w-[120px] truncate">{mat.title}</span>
                              </a>
                              <button onClick={() => handleDeleteMaterial(mat.id)} className="opacity-0 group-hover:opacity-100 text-[var(--on-surface-muted)] hover:text-red-500 transition-all text-xs">✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Nova Aula */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--outline)] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold text-[var(--on-surface)]">Nova Aula</h2>
                <button onClick={() => setShowLessonModal(false)} className="text-[var(--on-surface-variant)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <form onSubmit={handleAddLesson} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Título da Aula *</label>
                  <input type="text" required placeholder="Ex: Introdução a Derivadas" value={lessonForm.title} onChange={e => setLessonForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] outline-none transition-all text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Conteúdo / Tópico</label>
                  <input type="text" placeholder="Ex: Regra da Cadeia" value={lessonForm.topic} onChange={e => setLessonForm(p => ({ ...p, topic: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] outline-none transition-all text-sm font-semibold" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Objetivos de Aprendizagem</label>
                  <textarea rows={2} placeholder="Ao final desta aula, o aluno será capaz de..." value={lessonForm.objectives} onChange={e => setLessonForm(p => ({ ...p, objectives: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] outline-none transition-all text-sm font-semibold resize-none" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowLessonModal(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm">Cancelar</button>
                  <button type="submit" disabled={savingLesson} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-white font-bold text-sm disabled:opacity-70">{savingLesson ? 'Adicionando...' : 'Adicionar Aula'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nova Pasta */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-sm border border-[var(--outline)] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--primary)]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold text-[var(--on-surface)]">Nova Pasta</h2>
                <button onClick={() => setShowFolderModal(null)} className="text-[var(--on-surface-variant)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <form onSubmit={handleAddFolder} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Nome da Pasta *</label>
                  <input type="text" required placeholder="Ex: Exercícios de Fixação" value={folderName} onChange={e => setFolderName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] outline-none transition-all text-sm font-semibold" />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowFolderModal(null)} className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm">Cancelar</button>
                  <button type="submit" disabled={savingFolder} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-bold text-sm disabled:opacity-70">{savingFolder ? 'Criando...' : 'Criar Pasta'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Material */}
      {showMaterialModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--outline)] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[var(--accent)] to-[var(--primary)]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold text-[var(--on-surface)]">Adicionar Material {showMaterialModal.folderId ? 'à Pasta' : ''}</h2>
                <button onClick={closeMaterialModal} className="text-[var(--on-surface-variant)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Seletor de tipo */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {(['LINK', 'VIDEO', 'DRIVE', 'FILE'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setMatType(t)}
                    className={`flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-bold transition-all ${matType === t ? 'border-[var(--primary)] bg-[var(--primary-container)] text-[var(--primary)]' : 'border-[var(--outline)] text-[var(--on-surface-variant)] hover:border-[var(--primary)]/40'}`}>
                    <span className="text-lg">{materialIcon(t)}</span>
                    {t === 'LINK' ? 'Link' : t === 'VIDEO' ? 'Vídeo' : t === 'DRIVE' ? 'Drive' : 'Arquivo'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAddMaterial} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Título</label>
                  <input type="text" placeholder={matType === 'FILE' ? 'Nome do arquivo (opcional)' : 'Ex: Slides da Aula 3'} value={matTitle} onChange={e => setMatTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] outline-none transition-all text-sm font-semibold" />
                </div>

                {matType === 'FILE' ? (
                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">Arquivo (máx. 10MB)</label>
                    <div className="w-full px-4 py-6 rounded-xl border-2 border-dashed border-[var(--outline)] bg-[var(--surface-low)] text-center cursor-pointer hover:border-[var(--primary)] transition-colors"
                      onClick={() => fileRef.current?.click()}>
                      {matFile ? (
                        <div>
                          <p className="text-sm font-bold text-[var(--primary)]">📎 {matFile.name}</p>
                          <p className="text-xs text-[var(--on-surface-muted)]">{Math.round(matFile.size / 1024)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-semibold text-[var(--on-surface-variant)]">Clique para selecionar</p>
                          <p className="text-xs text-[var(--on-surface-muted)]">PDF, PPTX, DOCX, Imagens, etc.</p>
                        </div>
                      )}
                      <input ref={fileRef} type="file" className="hidden" onChange={e => setMatFile(e.target.files?.[0] || null)}
                        accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.gif,.mp4,.zip" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-[var(--on-surface-variant)] mb-1.5 uppercase tracking-wider">
                      {matType === 'DRIVE' ? 'Link do Google Drive' : matType === 'VIDEO' ? 'Link do YouTube' : 'URL do Link'} *
                    </label>
                    <input type="url" required placeholder={matType === 'DRIVE' ? 'https://drive.google.com/...' : matType === 'VIDEO' ? 'https://youtube.com/...' : 'https://...'} value={matUrl} onChange={e => setMatUrl(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] placeholder-[var(--on-surface-muted)] focus:border-[var(--primary)] outline-none transition-all text-sm font-semibold" />
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeMaterialModal} className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm">Cancelar</button>
                  <button type="submit" disabled={savingMat || (matType === 'FILE' && !matFile)}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--primary)] text-white font-bold text-sm disabled:opacity-70">
                    {savingMat ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vincular Turma */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface-card)] rounded-2xl shadow-2xl w-full max-w-sm border border-[var(--outline)] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[var(--primary)] to-[var(--accent)]" />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold text-[var(--on-surface)]">Vincular Turma</h2>
                <button onClick={() => setShowAssignModal(false)} className="text-[var(--on-surface-variant)]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {availableClasses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[var(--on-surface-variant)] font-semibold text-sm">Todas as suas turmas já usam este plano.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--outline)] bg-[var(--surface-low)] text-[var(--on-surface)] focus:border-[var(--primary)] outline-none text-sm font-semibold">
                    <option value="">Selecione uma turma...</option>
                    {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}{c.subject ? ` — ${c.subject}` : ''}</option>)}
                  </select>
                  <div className="flex gap-3">
                    <button onClick={() => setShowAssignModal(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--outline)] text-[var(--on-surface-variant)] font-bold text-sm">Cancelar</button>
                    <button onClick={handleAssign} disabled={assigning || !selectedClassId}
                      className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white font-bold text-sm disabled:opacity-70">{assigning ? 'Vinculando...' : 'Vincular'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
