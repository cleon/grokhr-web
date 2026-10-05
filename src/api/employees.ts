import { parseEmployee, parseEmployeeList, requestJson } from './http.ts';
import type { Employee, EmployeeCreate, EmployeeStatus, EmployeeUpdate } from '../types/employee.ts';

export async function listEmployees(status?: EmployeeStatus): Promise<Employee[]> {
  const path = status ? `/employees?status=${encodeURIComponent(status)}` : '/employees';
  return parseEmployeeList(await requestJson(path));
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
