
export interface Grade {
  id: string;
  value: number;
  coefficient: number;
}

export interface Subject {
  id: string;
  name: string;
  coefficient: number;
  grades: Grade[];
}

export interface SubPeriod {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface Year {
  id: string;
  name: string;
  subPeriods: SubPeriod[];
}

export interface Student {
  id: string;
  name: string;
  years: Year[];
}

export interface AppData {
  students: Student[];
  selectedStudentId: string | null;
  selectedYearId: string | null;
  selectedSubPeriodId: string | null;
}

export interface AverageResult {
  subjectId: string;
  average: number | null;
  trend: 'up' | 'down' | 'stable' | null;
}
