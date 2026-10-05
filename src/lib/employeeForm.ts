import type { Employee, EmployeeCreate, EmployeeStatus, EmployeeUpdate } from '../types/employee.ts';

export interface EmployeeFormValues {
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  title: string;
  hireDate: string;
  status: EmployeeStatus;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emptyEmployeeForm(): EmployeeFormValues {
  return {
    firstName: '',
    lastName: '',
    email: '',
    department: null,
    title: '',
    hireDate: '',
    status: 'active',
  };
}

export function employeeToForm(employee: Employee): EmployeeFormValues {
  return {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    department: employee.department,
    title: employee.title,
    hireDate: employee.hireDate,
    status: employee.status,
  };
}

export function validateEmployeeForm(values: EmployeeFormValues): Partial<Record<keyof EmployeeFormValues, string>> {
  const errors: Partial<Record<keyof EmployeeFormValues, string>> = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required';
  if (!values.lastName.trim()) errors.lastName = 'Last name is required';
  if (!values.email.trim()) errors.email = 'Email is required';
  else if (!EMAIL.test(values.email.trim())) errors.email = 'Enter a valid email';
  if (!values.department?.trim()) errors.department = 'Department is required';
  if (!values.title.trim()) errors.title = 'Title is required';
  if (!values.hireDate) errors.hireDate = 'Hire date is required';
  else if (!isIsoDate(values.hireDate)) errors.hireDate = 'Use a valid date';
  return errors;
}

export function formToWrite(values: EmployeeFormValues): EmployeeCreate & EmployeeUpdate {
  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: values.email.trim(),
    department: values.department?.trim() ?? '',
    title: values.title.trim(),
    hireDate: values.hireDate,
    status: values.status,
  };
}

function isIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
