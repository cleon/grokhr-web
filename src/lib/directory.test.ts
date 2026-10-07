import { describe, expect, it } from 'vitest';
import type { Employee } from '../types/employee.ts';
import {
  filterEmployees,
  formatHireDate,
  headcountSummary,
  sortEmployees,
  STATUS_PRESENTATION,
} from './directory.ts';
import { validateEmployeeForm, emptyEmployeeForm } from './employeeForm.ts';

const avery: Employee = {
  id: '1',
  firstName: 'Avery',
  lastName: 'Chen',
  email: 'avery.chen@example.com',
  department: 'Engineering',
  title: 'Staff Engineer',
  hireDate: '2022-04-18',
  status: 'active',
};

const jordan: Employee = {
  id: '2',
  firstName: 'Jordan',
  lastName: 'Hale',
  email: 'jordan.hale@example.com',
  department: 'People',
  title: 'HR Partner',
  hireDate: '2021-11-02',
  status: 'inactive',
};

describe('directory helpers', () => {
  it('filters by query, department, and status', () => {
    const rows = [avery, jordan];
    expect(filterEmployees(rows, { query: 'avery.chen', department: null, status: 'all' })).toEqual([avery]);
    expect(filterEmployees(rows, { query: '', department: 'People', status: 'all' })).toEqual([jordan]);
    expect(filterEmployees(rows, { query: '', department: null, status: 'active' })).toEqual([avery]);
  });

  it('counts active and inactive people from the loaded list', () => {
    expect(headcountSummary([avery, jordan, { ...avery, id: '3' }])).toBe('2 active · 1 inactive');
    expect(headcountSummary([])).toBe('0 active · 0 inactive');
    const colors = new Set(Object.values(STATUS_PRESENTATION).map((status) => status.color));
    expect(colors.size).toBe(Object.keys(STATUS_PRESENTATION).length);
    expect(STATUS_PRESENTATION.active).toEqual({ label: 'Active', color: 'teal' });
    expect(STATUS_PRESENTATION.inactive).toEqual({ label: 'Inactive', color: 'gray' });
  });

  it('sorts by last name without shifting the hire date across timezones', () => {
    expect(sortEmployees([avery, jordan]).map((employee) => employee.id)).toEqual(['1', '2']);
    expect(formatHireDate('2022-04-18')).toBe('Apr 18, 2022');
    expect(formatHireDate('2022-04-18T00:00:00Z')).toBe('Apr 18, 2022');
  });

  it('requires a real calendar date and a valid email', () => {
    expect(validateEmployeeForm(emptyEmployeeForm())).toMatchObject({
      firstName: 'First name is required',
      email: 'Email is required',
      hireDate: 'Hire date is required',
    });
    expect(
      validateEmployeeForm({
        ...emptyEmployeeForm(),
        firstName: 'Avery',
        lastName: 'Chen',
        email: 'not-an-email',
        department: 'Engineering',
        title: 'Staff Engineer',
        hireDate: '2022-02-31',
      }),
    ).toMatchObject({
      email: 'Enter a valid email',
      hireDate: 'Use a valid date',
    });
  });
});
