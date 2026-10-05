import type { Employee, EmployeeStatus } from '../types/employee.ts';

const DEFAULT_API_URL = 'http://localhost:8000';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export function apiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL;
  const value = typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_API_URL;
  return value.replace(/\/+$/, '');
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong.';
}

export async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const url = `${apiBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : 'Network request failed';
    throw new ApiError(`Cannot reach the GrokHR API at ${apiBaseUrl()}. ${detail}`, 0);
  }

  const text = await response.text();
  const body = text ? parseBody(text) : null;
  if (!response.ok) {
    throw new ApiError(formatErrorDetail(body) ?? `Request failed (${response.status}).`, response.status);
  }
  return body;
}

export function parseEmployee(value: unknown): Employee {
  const record = asRecord(value);
  if (!record) throw new ApiError('Employee response was not an object.', 0);
  if (!('id' in record) && record.employee) return parseEmployee(record.employee);

  const id = readField(record, 'id');
  if (typeof id !== 'string' && typeof id !== 'number') {
    throw new ApiError('Employee response is missing id.', 0);
  }

  const status = parseStatus(readField(record, 'status'), String(id));
  return {
    id: String(id),
    firstName: stringField(record, 'firstName'),
    lastName: stringField(record, 'lastName'),
    email: stringField(record, 'email'),
    department: stringField(record, 'department'),
    title: stringField(record, 'title'),
    hireDate: stringField(record, 'hireDate').slice(0, 10),
    status,
  };
}

export function parseEmployeeList(value: unknown): Employee[] {
  return unwrapList(value).map((row) => parseEmployee(row));
}

export function formatErrorDetail(body: unknown): string | null {
  const record = asRecord(body);
  if (!record) return null;
  const detail = record.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (!Array.isArray(detail)) return null;

  const parts = detail
    .map((item) => {
      const entry = asRecord(item);
      if (!entry || typeof entry.msg !== 'string') return null;
      const loc = Array.isArray(entry.loc)
        ? entry.loc.filter((part) => part !== 'body').map((part) => String(part)).join('.')
        : '';
      return loc ? `${loc}: ${entry.msg}` : entry.msg;
    })
    .filter((part): part is string => Boolean(part));

  return parts.length ? parts.join('; ') : null;
}

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function unwrapList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (record) {
    for (const key of ['employees', 'items', 'data', 'results']) {
      const candidate = record[key];
      if (Array.isArray(candidate)) return candidate;
    }
  }
  throw new ApiError('Employee list response was not a list.', 0);
}

function parseStatus(value: unknown, id: string): EmployeeStatus {
  const status = String(value ?? '').toLowerCase();
  if (status === 'active' || status === 'inactive') return status;
  throw new ApiError(`Employee ${id} has unsupported status "${status}".`, 0);
}

const SNAKE_FIELDS: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  hireDate: 'hire_date',
};

function readField(record: Record<string, unknown>, key: string): unknown {
  if (key in record) return record[key];
  const snake = SNAKE_FIELDS[key];
  if (snake && snake in record) return record[snake];
  return undefined;
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = readField(record, key);
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}
