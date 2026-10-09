import { describe, expect, it } from 'vitest';
import type { Employee } from '../types/employee.ts';
import { filterEmployees, formatHireDate, sortEmployees } from './directory.ts';
import { employeeToForm, emptyEmployeeForm, formToWrite, validateEmployeeForm } from './employeeForm.ts';

const avery: Employee = {
  id: '1',
  firstName: 'Avery',
  lastName: 'Chen',
  email: 'avery.chen@example.com',
  department: 'Engineering',
  title: 'Staff Engineer',
  phone: '555-0142',
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
  phone: null,
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
        phone: 'not-a-phone',
      }),
    ).toEqual({
      email: 'Enter a valid email',
      hireDate: 'Use a valid date',
    });
    expect(
      validateEmployeeForm({
        ...emptyEmployeeForm(),
        firstName: 'Avery',
        lastName: 'Chen',
        email: 'avery.chen@example.com',
        department: 'Engineering',
        title: 'Staff Engineer',
        hireDate: '2022-04-18',
        phone: '   ',
      }),
    ).toEqual({});
  });

  it('trims phone and sends null only when an edit clears it', () => {
    const values = {
      ...emptyEmployeeForm(),
      firstName: 'Avery',
      lastName: 'Chen',
      email: 'avery.chen@example.com',
      department: 'Engineering',
      title: 'Staff Engineer',
      hireDate: '2022-04-18',
      phone: '  555-0142  ',
    };
    expect(formToWrite(values, 'create')).toMatchObject({ phone: '555-0142' });
    expect(formToWrite({ ...values, phone: '   ' }, 'create')).not.toHaveProperty('phone');
    expect(formToWrite({ ...values, phone: '' }, 'edit')).toMatchObject({ phone: null });
    expect(formToWrite(values, 'edit').phone).toBe('555-0142');
    expect(employeeToForm({ ...avery, phone: null }).phone).toBe('');
    expect(employeeToForm(avery).phone).toBe('555-0142');
  });
});
