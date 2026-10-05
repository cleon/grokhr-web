import { parseEmployee, parseEmployeePage, requestJson } from './http.ts';
import type { Employee, EmployeeCreate, EmployeePage, EmployeeStatus, EmployeeUpdate } from '../types/employee.ts';

export const DEFAULT_EMPLOYEE_PAGE_SIZE = 25;

export async function listEmployees(query?: {
  page?: number;
  pageSize?: number;
}): Promise<EmployeePage> {
  const page = query?.page && query.page > 0 ? Math.floor(query.page) : 1;
  const pageSize =
    query?.pageSize && query.pageSize > 0 ? Math.floor(query.pageSize) : DEFAULT_EMPLOYEE_PAGE_SIZE;
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return parseEmployeePage(await requestJson(`/employees?${params.toString()}`));
}

export async function createEmployee(input: EmployeeCreate): Promise<Employee> {
  return parseEmployee(
    await requestJson('/employees', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
}

export async function updateEmployee(id: string, input: EmployeeUpdate): Promise<Employee> {
  return parseEmployee(
    await requestJson(`/employees/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
}

export async function setEmployeeStatus(id: string, status: EmployeeStatus): Promise<Employee> {
  return parseEmployee(
    await requestJson(`/employees/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  );
}

export function deactivateEmployee(id: string): Promise<Employee> {
  return setEmployeeStatus(id, 'inactive');
}

export function reactivateEmployee(id: string): Promise<Employee> {
  return setEmployeeStatus(id, 'active');
}
