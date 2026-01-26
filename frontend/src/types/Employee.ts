export type Department =
  | 'ENGINEERING'
  | 'MARKETING'
  | 'SALES'
  | 'HUMAN_RESOURCES'
  | 'FINANCE'
  | 'OPERATIONS'
  | 'IT'
  | 'LEGAL';

export interface Employee {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  department: Department;
  salary: number;
  hireDate: string;
}

export const DEPARTMENTS: Department[] = [
  'ENGINEERING',
  'MARKETING',
  'SALES',
  'HUMAN_RESOURCES',
  'FINANCE',
  'OPERATIONS',
  'IT',
  'LEGAL'
];

export const formatDepartment = (dept: Department): string => {
  return dept.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};
