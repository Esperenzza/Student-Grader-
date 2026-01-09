
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, Year, SubPeriod, Subject, Grade, AppData } from './types';
import { SubjectCard } from './components/SubjectCard';
import { TrendIndicator } from './components/TrendIndicator';
import { analyzeGrades } from './services/geminiService';

const STORAGE_KEY = 'grade_tracker_v4';

const EMPTY_DATA: AppData = {
  students: [],
  selectedStudentId: null,
  selectedYearId: null,
  selectedSubPeriodId: null
};

const App: React.FC = () => {
  const [data, setData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.students)) return parsed;
      }
    } catch (e) { console.error("Load error", e); }
    return EMPTY_DATA;
  });

  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [isAddingYear, setIsAddingYear] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [isAddingSubPeriod, setIsAddingSubPeriod] = useState(false);
  const [newSubPeriodName, setNewSubPeriodName] = useState('');

  const [lastAverages, setLastAverages] = useState<Record<string, number | null>>({});
  const [lastSubPeriodAvg, setLastSubPeriodAvg] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  // Selectors
  const currentStudent = useMemo(() => data.students.find(s => s.id === data.selectedStudentId) || null, [data]);
  const currentYear = useMemo(() => currentStudent?.years.find(y => y.id === data.selectedYearId) || null, [currentStudent, data.selectedYearId]);
  const currentSubPeriod = useMemo(() => currentYear?.subPeriods.find(sp => sp.id === data.selectedSubPeriodId) || null, [currentYear, data.selectedSubPeriodId]);
  const subjects = currentSubPeriod?.subjects || [];

  // Logic to calculate sub-period and year averages
  const results = useMemo(() => {
    // 1. Calculate individual subject averages for CURRENT sub-period
    const subjectRes = subjects.map(subject => {
      const totalW = subject.grades.reduce((acc, g) => acc + (g.value * g.coefficient), 0);
      const totalC = subject.grades.reduce((acc, g) => acc + g.coefficient, 0);
      const avg = totalC > 0 ? totalW / totalC : null;
      
      const prev = lastAverages[subject.id];
      let trend: any = null;
      if (prev != null && avg != null) {
        if (avg > prev + 0.01) trend = 'up';
        else if (avg < prev - 0.01) trend = 'down';
        else trend = 'stable';
      }
      return { subjectId: subject.id, average: avg, trend };
    });

    // 2. Calculate CURRENT sub-period global average
    let spWeightedSum = 0;
    let spTotalCoef = 0;
    subjects.forEach(s => {
      const res = subjectRes.find(r => r.subjectId === s.id);
      if (res?.average != null) {
        spWeightedSum += (res.average * s.coefficient);
        spTotalCoef += s.coefficient;
      }
    });
    const subPeriodAvg = spTotalCoef > 0 ? spWeightedSum / spTotalCoef : null;

    // 3. Calculate YEAR global average (mean of all sub-periods in currentYear)
    let yearSum = 0;
    let yearCount = 0;
    currentYear?.subPeriods.forEach(sp => {
      let spSum = 0;
      let spCoef = 0;
      sp.subjects.forEach(subj => {
        const totalW = subj.grades.reduce((acc, g) => acc + (g.value * g.coefficient), 0);
        const totalC = subj.grades.reduce((acc, g) => acc + g.coefficient, 0);
        if (totalC > 0) {
          spSum += (totalW / totalC) * subj.coefficient;
          spCoef += subj.coefficient;
        }
      });
      if (spCoef > 0) {
        yearSum += (spSum / spCoef);
        yearCount++;
      }
    });
    const yearAvg = yearCount > 0 ? yearSum / yearCount : null;

    return { subjects: subjectRes, subPeriod: subPeriodAvg, year: yearAvg };
  }, [subjects, currentYear, lastAverages]);

  // Handlers
  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const sId = 's' + Date.now();
    const newS: Student = { id: sId, name: newStudentName, years: [] };
    setData(prev => ({ ...prev, students: [...prev.students, newS], selectedStudentId: sId, selectedYearId: null, selectedSubPeriodId: null }));
    setNewStudentName(''); setIsAddingStudent(false);
  };

  const addYear = () => {
    if (!newYearName.trim() || !data.selectedStudentId) return;
    const yId = 'y' + Date.now();
    const newY: Year = { id: yId, name: newYearName, subPeriods: [] };
    setData(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === prev.selectedStudentId ? { ...s, years: [...s.years, newY] } : s),
      selectedYearId: yId, selectedSubPeriodId: null
    }));
    setNewYearName(''); setIsAddingYear(false);
  };

  const addSubPeriod = () => {
    if (!newSubPeriodName.trim() || !data.selectedYearId) return;
    const spId = 'sp' + Date.now();
    const newSP: SubPeriod = { id: spId, name: newSubPeriodName, subjects: [] };
    setData(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === prev.selectedStudentId ? {
        ...s, years: s.years.map(y => y.id === prev.selectedYearId ? { ...y, subPeriods: [...y.subPeriods, newSP] } : y)
      } : s),
      selectedSubPeriodId: spId
    }));
    setNewSubPeriodName(''); setIsAddingSubPeriod(false);
  };

  const deleteStudent = (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("Supprimer cet élève et TOUTES ses données ?")) {
      setData(prev => {
        const remaining = prev.students.filter(s => s.id !== id);
        return { ...prev, students: remaining, selectedStudentId: remaining[0]?.id || null, selectedYearId: null, selectedSubPeriodId: null };
      });
    }
  };

  const deleteYear = (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("Supprimer cette année scolaire ?")) {
      setData(prev => ({
        ...prev,
        students: prev.students.map(s => s.id === prev.selectedStudentId ? { ...s, years: s.years.filter(y => y.id !== id) } : s),
        selectedYearId: null, selectedSubPeriodId: null
      }));
    }
  };

  const deleteSubPeriod = (id: string, e: any) => {
    e.stopPropagation();
    if (confirm("Supprimer cette sous-période ?")) {
      setData(prev => ({
        ...prev,
        students: prev.students.map(s => s.id === prev.selectedStudentId ? {
          ...s, years: s.years.map(y => y.id === prev.selectedYearId ? { ...y, subPeriods: y.subPeriods.filter(sp => sp.id !== id) } : y)
        } : s),
        selectedSubPeriodId: null
      }));
    }
  };

  const updateSubject = (updated: Subject) => {
    setData(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === prev.selectedStudentId ? {
        ...s, years: s.years.map(y => y.id === prev.selectedYearId ? {
          ...y, subPeriods: y.subPeriods.map(sp => sp.id === prev.selectedSubPeriodId ? {
            ...sp, subjects: sp.subjects.map(subj => subj.id === updated.id ? updated : subj)
          } : sp)
        } : y)
      } : s)
    }));
  };

  const addSubject = () => {
    const newSub: Subject = { id: 'sb' + Date.now(), name: 'Nouvelle Matière', coefficient: 1, grades: [] };
    setData(prev => ({
      ...prev,
      students: prev.students.map(s => s.id === prev.selectedStudentId ? {
        ...s, years: s.years.map(y => y.id === prev.selectedYearId ? {
          ...y, subPeriods: y.subPeriods.map(sp => sp.id === prev.selectedSubPeriodId ? {
            ...sp, subjects: [...sp.subjects, newSub]
          } : sp)
        } : y)
      } : s)
    }));
  };

  const deleteSubject = (id: string) => {
    if (confirm("Supprimer cette matière ?")) {
      setData(prev => ({
        ...prev,
        students: prev.students.map(s => s.id === prev.selectedStudentId ? {
          ...s, years: s.years.map(y => y.id === prev.selectedYearId ? {
            ...y, subPeriods: y.subPeriods.map(sp => sp.id === prev.selectedSubPeriodId ? {
              ...sp, subjects: sp.subjects.filter(subj => subj.id !== id)
            } : sp)
          } : y)
        } : s)
      }));
    }
  };

  const handleAiAnalysis = async () => {
    if (!currentYear) return;
    setIsAnalyzing(true);
    const analysis = await analyzeGrades(currentYear.subPeriods, currentYear.name);
    setAiAnalysis(analysis);
    setIsAnalyzing(false);
  };

  const resetApp = () => { if (confirm("Réinitialiser TOUT ?")) { localStorage.clear(); window.location.reload(); } };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-full md:w-80 bg-white border-r border-slate-200 p-6 flex flex-col gap-6 h-screen sticky top-0 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fa-solid fa-graduation-cap"></i></div>
          <h1 className="text-xl font-black text-slate-800 tracking-tighter">GRADEBOARD</h1>
        </div>

        {/* Section ÉLÈVES */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élèves</label>
            <button onClick={() => setIsAddingStudent(true)} className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center hover:bg-indigo-100"><i className="fa-solid fa-plus text-xs"></i></button>
          </div>
          {isAddingStudent && (
            <div className="mb-4 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <input autoFocus value={newStudentName} onChange={e => setNewStudentName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStudent()} className="w-full p-2 text-sm rounded-lg border-slate-200 mb-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Nom..." />
              <div className="flex justify-end gap-2"><button onClick={() => setIsAddingStudent(false)} className="text-xs text-slate-500 font-bold">Annuler</button><button onClick={addStudent} className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded">OK</button></div>
            </div>
          )}
          <div className="space-y-1">
            {data.students.map(s => (
              <div key={s.id} onClick={() => setData(prev => ({ ...prev, selectedStudentId: s.id, selectedYearId: null, selectedSubPeriodId: null }))} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${data.selectedStudentId === s.id ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}`}>
                <span className="text-sm font-bold truncate flex items-center gap-2"><i className="fa-solid fa-user text-[10px] opacity-50"></i>{s.name}</span>
                <button onClick={e => deleteStudent(s.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500"><i className="fa-solid fa-trash-can text-xs"></i></button>
              </div>
            ))}
          </div>
        </section>

        {/* Section ANNÉES (Si élève choisi) */}
        {currentStudent && (
          <section className="animate-in fade-in">
            <div className="flex justify-between items-center mb-4 pt-4 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Années</label>
              <button onClick={() => setIsAddingYear(true)} className="w-6 h-6 bg-slate-100 text-slate-600 rounded flex items-center justify-center hover:bg-slate-200"><i className="fa-solid fa-calendar-plus text-xs"></i></button>
            </div>
            {isAddingYear && (
              <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input autoFocus value={newYearName} onChange={e => setNewYearName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addYear()} className="w-full p-2 text-sm rounded-lg border-slate-200 mb-2 outline-none" placeholder="Ex: 2025/2026" />
                <div className="flex justify-end gap-2"><button onClick={() => setIsAddingYear(false)} className="text-xs text-slate-500 font-bold">Annuler</button><button onClick={addYear} className="px-3 py-1 bg-slate-800 text-white text-xs font-bold rounded">OK</button></div>
              </div>
            )}
            <div className="space-y-1">
              {currentStudent.years.map(y => (
                <div key={y.id} onClick={() => setData(prev => ({ ...prev, selectedYearId: y.id, selectedSubPeriodId: y.subPeriods[0]?.id || null }))} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${data.selectedYearId === y.id ? 'bg-slate-800 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}>
                  <span className="text-sm font-bold truncate flex items-center gap-2"><i className="fa-solid fa-folder text-[10px] opacity-50"></i>{y.name}</span>
                  <button onClick={e => deleteYear(y.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500"><i className="fa-solid fa-trash-can text-xs"></i></button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section SOUS-PÉRIODES (Si année choisie) */}
        {currentYear && (
          <section className="animate-in fade-in">
            <div className="flex justify-between items-center mb-4 pt-4 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trimestres / Semestres</label>
              <button onClick={() => setIsAddingSubPeriod(true)} className="w-6 h-6 bg-amber-50 text-amber-600 rounded flex items-center justify-center hover:bg-amber-100"><i className="fa-solid fa-clock text-xs"></i></button>
            </div>
            {isAddingSubPeriod && (
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <input autoFocus value={newSubPeriodName} onChange={e => setNewSubPeriodName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSubPeriod()} className="w-full p-2 text-sm rounded-lg border-slate-200 mb-2 outline-none" placeholder="Ex: 1er Trimestre" />
                <div className="flex justify-end gap-2"><button onClick={() => setIsAddingSubPeriod(false)} className="text-xs text-slate-500 font-bold">Annuler</button><button onClick={addSubPeriod} className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded">OK</button></div>
              </div>
            )}
            <div className="space-y-1">
              {currentYear.subPeriods.map(sp => (
                <div key={sp.id} onClick={() => setData(prev => ({ ...prev, selectedSubPeriodId: sp.id }))} className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${data.selectedSubPeriodId === sp.id ? 'bg-amber-500 text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}>
                  <span className="text-sm font-bold truncate flex items-center gap-2"><i className="fa-solid fa-layer-group text-[10px] opacity-50"></i>{sp.name}</span>
                  <button onClick={e => deleteSubPeriod(sp.id, e)} className="opacity-0 group-hover:opacity-100 text-amber-200 hover:text-rose-500"><i className="fa-solid fa-trash-can text-xs"></i></button>
                </div>
              ))}
            </div>
          </section>
        )}

        <button onClick={resetApp} className="mt-auto pt-6 border-t border-slate-100 text-[9px] font-black text-slate-300 hover:text-rose-500 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-power-off"></i> RESET APP</button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
        {!currentStudent ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
            <div className="w-20 h-20 bg-indigo-600 text-white flex items-center justify-center text-3xl rounded-3xl mb-8 animate-bounce"><i className="fa-solid fa-user-plus"></i></div>
            <h2 className="text-4xl font-black mb-4">Prêt à réussir ?</h2>
            <p className="text-slate-500 mb-8">Ajoutez un premier élève pour démarrer le suivi intelligent.</p>
            <button onClick={() => setIsAddingStudent(true)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-105 transition-transform">Démarrer maintenant</button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-2">{currentStudent.name}</h2>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{currentYear?.name || 'Pas d\'année'}</span>
                  {currentSubPeriod && <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{currentSubPeriod.name}</span>}
                </div>
              </div>
              <button onClick={addSubject} disabled={!currentSubPeriod} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg disabled:opacity-30 flex items-center gap-2 active:scale-95 transition-all"><i className="fa-solid fa-plus-circle"></i> Nouvelle Matière</button>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
              <div className="xl:col-span-2 space-y-8">
                {/* LISTE DES MATIÈRES */}
                {!currentSubPeriod ? (
                  <div className="h-64 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                    <i className="fa-solid fa-layer-group text-3xl mb-4"></i>
                    <p className="font-bold">Choisissez un trimestre pour commencer</p>
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="h-64 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400">
                    <i className="fa-solid fa-book text-3xl mb-4"></i>
                    <p className="font-bold">Aucune matière dans ce trimestre</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {subjects.map(s => (
                      <SubjectCard key={s.id} subject={s} average={results.subjects.find(r => r.subjectId === s.id)?.average || null} trend={results.subjects.find(r => r.subjectId === s.id)?.trend || null} onUpdateSubject={updateSubject} onDeleteSubject={deleteSubject} />
                    ))}
                  </div>
                )}
              </div>

              {/* RÉSULTATS GLOBAUX */}
              <aside className="space-y-8">
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                  
                  {/* MOYENNE ANNUELLE (La nouveauté) */}
                  <div className="mb-8 p-6 bg-white/5 rounded-3xl border border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Moyenne de l'Année</span>
                    <div className="text-4xl font-black tracking-tighter text-indigo-400">
                      {results.year != null ? results.year.toFixed(2) : '--'} <span className="text-lg opacity-30">/ 20</span>
                    </div>
                    <p className="text-[9px] text-slate-500 mt-2 font-bold italic">Moyenne arithmétique de toutes les périodes validées.</p>
                  </div>

                  {/* MOYENNE TRIMESTRIELLE */}
                  <div className="mb-10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Trimestre Actuel</span>
                    <div className="text-7xl font-black tracking-tighter">
                      {results.subPeriod != null ? results.subPeriod.toFixed(2) : '--'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {isAnalyzing ? (
                      <div className="flex flex-col items-center py-6 bg-white/5 rounded-3xl border border-white/5">
                        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                        <span className="text-[10px] font-black text-indigo-400 tracking-widest uppercase">Analyse IA en cours...</span>
                      </div>
                    ) : (
                      <button onClick={handleAiAnalysis} disabled={!currentYear || currentYear.subPeriods.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-2xl font-black shadow-xl shadow-indigo-900/40 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-20">
                        <i className="fa-solid fa-wand-magic-sparkles"></i> GÉNÉRER LE RAPPORT
                      </button>
                    )}

                    {aiAnalysis && !isAnalyzing && (
                      <div className="mt-8 bg-white rounded-3xl p-6 text-slate-900 animate-in fade-in duration-700 shadow-inner">
                        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
                          <span className="font-black text-[10px] text-indigo-600 uppercase tracking-widest flex items-center gap-2"><i className="fa-solid fa-brain"></i> Rapport de Performance</span>
                          <button onClick={() => setAiAnalysis(null)} className="text-slate-300 hover:text-rose-500"><i className="fa-solid fa-times text-xs"></i></button>
                        </div>
                        <div className="ai-report-content text-sm leading-relaxed max-h-[400px] overflow-y-auto custom-scrollbar-thin" dangerouslySetInnerHTML={{ __html: aiAnalysis }}></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* INFOS */}
                <div className="bg-white rounded-[2rem] p-8 border border-slate-200">
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2"><i className="fa-solid fa-circle-info text-indigo-500"></i> Système de calcul</h4>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-1 bg-amber-400 rounded-full"></div>
                      <p className="text-xs text-slate-500 leading-tight">La moyenne de la période est pondérée par les coefficients des matières.</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-1 bg-indigo-500 rounded-full"></div>
                      <p className="text-xs text-slate-500 leading-tight">La moyenne annuelle est calculée avec un coefficient de 1 pour chaque trimestre/semestre.</p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar-thin::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #e2e8f0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-in { animation: fadeIn 0.4s ease-out forwards; }
        .ai-report-content h2, .ai-report-content h3 { font-weight: 900; color: #1e293b; margin: 1.5rem 0 0.75rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.25rem; }
        .ai-report-content p { margin-bottom: 1rem; color: #334155; }
        .ai-report-content ul { margin-bottom: 1rem; list-style-type: none; padding-left: 0; }
        .ai-report-content li { margin-bottom: 0.75rem; padding: 0.75rem; background: #f8fafc; border-radius: 12px; border-left: 4px solid #6366f1; color: #334155; }
        .ai-report-content strong { color: #0f172a; font-weight: 800; }
      `}</style>
    </div>
  );
};

export default App;
