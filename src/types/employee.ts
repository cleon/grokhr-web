/**
 * Vendored employee contract for this demo.
 * These types belong in `@grokhr/shared` (sibling repo `grokhr-shared`).
 * Once that package exports them, depend on `"@grokhr/shared": "file:../grokhr-shared"`
 * and import from `@grokhr/shared` instead of this module.
 */

export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  title: string;
  /** ISO calendar date, `YYYY-MM-DD`. */
  hireDate: string;
  status: EmployeeStatus;
}

export interface EmployeeCreate {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  title: string;
  hireDate: string;
  status?: EmployeeStatus;
}

export interface EmployeeUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  title?: string;
  hireDate?: string;
  status?: EmployeeStatus;
}

export interface Department {
  id: string;
  name: string;
}
