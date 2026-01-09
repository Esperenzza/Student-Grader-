
import React from 'react';
import { Subject, Grade } from '../types';
import { GradeItem } from './GradeItem';
import { TrendIndicator } from './TrendIndicator';

interface SubjectCardProps {
  subject: Subject;
  average: number | null;
  trend: 'up' | 'down' | 'stable' | null;
  onUpdateSubject: (updated: Subject) => void;
  onDeleteSubject: (id: string) => void;
}

export const SubjectCard: React.FC<SubjectCardProps> = ({ subject, average, trend, onUpdateSubject, onDeleteSubject }) => {
  
  const addGrade = () => {
    const newGrade: Grade = {
      id: Math.random().toString(36).substr(2, 9),
      value: 10,
      coefficient: 1,
    };
    onUpdateSubject({
      ...subject,
      grades: [...subject.grades, newGrade],
    });
  };

  const updateGrade = (gradeId: string, value: number, coef: number) => {
    onUpdateSubject({
      ...subject,
      grades: subject.grades.map(g => g.id === gradeId ? { ...g, value, coefficient: coef } : g),
    });
  };

  const deleteGrade = (gradeId: string) => {
    onUpdateSubject({
      ...subject,
      grades: subject.grades.filter(g => g.id !== gradeId),
    });
  };

  const updateSubjectInfo = (field: 'name' | 'coefficient', val: string) => {
    onUpdateSubject({
      ...subject,
      [field]: field === 'coefficient' ? parseFloat(val) || 0 : val,
    });
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col gap-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div className="flex-1 mr-4">
          <input
            type="text"
            value={subject.name}
            onChange={(e) => updateSubjectInfo('name', e.target.value)}
            className="text-lg font-bold bg-transparent border-none focus:ring-0 w-full p-0 text-slate-800 placeholder-slate-300"
            placeholder="Nom de la matière..."
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Coeff. Matière:</span>
            <input
              type="number"
              min="0"
              step="0.25"
              value={subject.coefficient}
              onChange={(e) => updateSubjectInfo('coefficient', e.target.value)}
              className="w-14 text-xs font-bold text-indigo-600 bg-indigo-50 rounded px-1 border-none focus:ring-0"
            />
          </div>
        </div>
        
        <button 
          onClick={() => onDeleteSubject(subject.id)}
          className="text-slate-200 hover:text-rose-400 transition-colors"
        >
          <i className="fa-solid fa-circle-xmark text-lg"></i>
        </button>
      </div>

      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
        {subject.grades.length === 0 ? (
          <p className="text-sm text-slate-300 italic py-4 text-center">Aucune note</p>
        ) : (
          subject.grades.map(grade => (
            <GradeItem 
              key={grade.id} 
              grade={grade} 
              onUpdate={updateGrade} 
              onDelete={deleteGrade} 
            />
          ))
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
        <button
          onClick={addGrade}
          className="flex items-center gap-2 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors uppercase"
        >
          <i className="fa-solid fa-plus-circle"></i> Ajouter Note
        </button>
        
        <div className="flex items-center gap-3">
          <TrendIndicator trend={trend} />
          <div className={`text-right ${average === null ? 'opacity-20' : ''}`}>
            <div className="text-[9px] uppercase font-black text-slate-400">Moyenne</div>
            <div className={`text-xl font-black ${
              average === null ? 'text-slate-300' : 
              average < 10 ? 'text-rose-500' : 
              average < 14 ? 'text-indigo-600' : 'text-emerald-500'
            }`}>
              {average !== null ? average.toFixed(2) : '--'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
