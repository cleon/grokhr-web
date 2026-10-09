import type { Employee } from '../types/employee.ts';

const AVATAR_COLORS = ['orange', 'teal', 'cyan', 'indigo', 'grape', 'blue'] as const;

export interface DirectoryFilters {
  query: string;
  department: string | null;
  status: 'all' | Employee['status'];
}

export function sortEmployees(employees: Employee[]): Employee[] {
  return [...employees].sort((a, b) => {
    const byLast = a.lastName.localeCompare(b.lastName, undefined, { sensitivity: 'base' });
    if (byLast !== 0) return byLast;
    return a.firstName.localeCompare(b.firstName, undefined, { sensitivity: 'base' });
  });
}

export function filterEmployees(employees: Employee[], filters: DirectoryFilters): Employee[] {
  const query = filters.query.trim().toLowerCase();
  return employees.filter((employee) => {
    if (filters.status !== 'all' && employee.status !== filters.status) return false;
    if (filters.department && employee.department !== filters.department) return false;
    if (!query) return true;
    const haystack = [
      employee.firstName,
      employee.lastName,
      employee.email,
      employee.title,
      employee.department,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function fullName(employee: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

export function initials(employee: Pick<Employee, 'firstName' | 'lastName'>): string {
  const letters = `${employee.firstName.trim().charAt(0)}${employee.lastName.trim().charAt(0)}`.toUpperCase();
  return letters || '?';
}

export function avatarColor(name: string): string {
  const total = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length] ?? 'orange';
}

export function formatHireDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}
