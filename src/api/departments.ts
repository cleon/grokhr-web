import { ApiError, requestJson } from './http.ts';
import type { Department } from '../types/employee.ts';

export async function listDepartments(): Promise<Department[]> {
  return parseDepartmentList(await requestJson('/departments'));
}

function parseDepartmentList(value: unknown): Department[] {
  if (!Array.isArray(value)) {
    throw new ApiError('Department list response was not a list.', 0);
  }
  return value.map((row) => parseDepartment(row));
}

function parseDepartment(value: unknown): Department {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ApiError('Department response was not an object.', 0);
  }
  const record = value as Record<string, unknown>;
  const { id, name } = record;
  if (typeof id !== 'string' || id.trim() === '') {
    throw new ApiError('Department response is missing id.', 0);
  }
  if (typeof name !== 'string' || name.trim() === '') {
    throw new ApiError('Department response is missing name.', 0);
  }
  return { id, name };
}
