import { parseEmployee, parseEmployeeList, requestJson } from './http.ts';
import type { Employee, EmployeeCreate, EmployeeStatus, EmployeeUpdate } from '../types/employee.ts';

export async function listEmployees(): Promise<Employee[]> {
  return parseEmployeeList(await requestJson('/employees'));
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

export async function deleteEmployee(id: string): Promise<void> {
  await requestJson(`/employees/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export function reactivateEmployee(id: string): Promise<Employee> {
  return setEmployeeStatus(id, 'active');
}
