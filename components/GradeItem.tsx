
import React from 'react';
import { Grade } from '../types';

interface GradeItemProps {
  grade: Grade;
  onUpdate: (id: string, value: number, coef: number) => void;
  onDelete: (id: string) => void;
}

export const GradeItem: React.FC<GradeItemProps> = ({ grade, onUpdate, onDelete }) => {
  return (
    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm transition-all hover:border-indigo-300">
      <div className="flex-1">
        <label className="text-[10px] uppercase font-bold text-slate-400 block ml-1">Note</label>
        <input
          type="number"
          min="0"
          max="20"
          step="0.25"
          value={grade.value}
          onChange={(e) => onUpdate(grade.id, parseFloat(e.target.value) || 0, grade.coefficient)}
          className="w-full bg-transparent border-none focus:ring-0 font-semibold text-slate-700"
          placeholder="0-20"
        />
      </div>
      <div className="w-16">
        <label className="text-[10px] uppercase font-bold text-slate-400 block ml-1">Coef</label>
        <input
          type="number"
          min="0.1"
          step="0.1"
          value={grade.coefficient}
          onChange={(e) => onUpdate(grade.id, grade.value, parseFloat(e.target.value) || 0.1)}
          className="w-full bg-transparent border-none focus:ring-0 font-medium text-slate-500"
          placeholder="1"
        />
      </div>
      <button
        onClick={() => onDelete(grade.id)}
        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
        title="Supprimer cette note"
      >
        <i className="fa-solid fa-trash-can text-sm"></i>
      </button>
    </div>
  );
};
