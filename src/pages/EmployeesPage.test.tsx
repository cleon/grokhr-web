import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../App.tsx';

const avery = {
  id: 'emp_1',
  firstName: 'Avery',
  lastName: 'Chen',
  email: 'avery.chen@example.com',
  department: 'Engineering',
  title: 'Staff Engineer',
  hireDate: '2022-04-18',
  status: 'active',
};

const riley = {
  id: 'emp_2',
  firstName: 'Riley',
  lastName: 'Moss',
  email: 'riley.moss@example.com',
  department: 'Design',
  title: 'Product Designer',
  hireDate: '2023-01-09',
  status: 'inactive',
};

const departments = [
  { id: 'dept_eng', name: 'Engineering' },
  { id: 'dept_design', name: 'Design' },
  { id: 'dept_fin', name: 'Finance' },
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('employee directory', () => {
  it('lists employees returned by the API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([avery, riley])));

    render(<App />);

    const table = await screen.findByRole('table', { name: 'Employees' });
    expect(within(table).getByText('Avery Chen')).toBeInTheDocument();
    expect(within(table).getByText('riley.moss@example.com')).toBeInTheDocument();
    expect(within(table).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument();
  });

  it('shows an error when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Cannot reach the GrokHR API/);
  });

  it('creates an employee through the drawer', async () => {
    const user = userEvent.setup();
    const created = {
      id: 'emp_3',
      firstName: 'Samir',
      lastName: 'Okonkwo',
      email: 'samir.okonkwo@example.com',
      department: 'Finance',
      title: 'Controller',
      hireDate: '2019-06-24',
      status: 'active',
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return json(created, 201);
      if (isDepartmentsRequest(input)) return json(departments);
      return json([avery]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: /department/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/First name/), 'Samir');
    await user.type(within(dialog).getByLabelText(/Last name/), 'Okonkwo');
    await user.type(within(dialog).getByLabelText(/Email/), 'samir.okonkwo@example.com');
    await chooseOption(user, within(dialog).getByLabelText(/Department/), 'Finance');
    await user.type(within(dialog).getByLabelText(/Title/), 'Controller');
    const hireDate = within(dialog).getByLabelText(/Hire date/);
    await user.type(hireDate, 'Jun 24, 2019');
    await user.tab();
    const submit = within(dialog).getByRole('button', { name: 'Add employee' });
    submit.closest('form')?.requestSubmit();

    await waitFor(() => {
      expect(within(screen.getByRole('table', { name: 'Employees' })).getByText('Samir Okonkwo')).toBeInTheDocument();
    });
    expect(screen.getByText('Employee added')).toBeInTheDocument();
    const post = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(post?.[0]).toBe('http://localhost:8000/employees');
    expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
      firstName: 'Samir',
      lastName: 'Okonkwo',
      email: 'samir.okonkwo@example.com',
      department: 'Finance',
      title: 'Controller',
      hireDate: '2019-06-24',
      status: 'active',
    });
  });

  it('deactivates an employee after confirmation', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') return json({ ...avery, status: 'inactive' });
      return json([avery]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actions for Avery Chen' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Deactivate' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/stays in the directory as inactive/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }));

    await waitFor(() => {
      expect(within(screen.getByRole('table', { name: 'Employees' })).getByText('Inactive')).toBeInTheDocument();
    });
    const patch = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(patch?.[0]).toBe('http://localhost:8000/employees/emp_1');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ status: 'inactive' });
  });

  it('filters employees by the selected department name', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        if (isDepartmentsRequest(input)) return json(departments);
        return json([avery, riley]);
      }),
    );

    render(<App />);
    const filter = await screen.findByRole('combobox', { name: /department/i });
    await user.click(filter);
    expect(screen.getByRole('option', { name: 'All departments', hidden: true })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Go-to-market', hidden: true })).not.toBeInTheDocument();

    const engineering = screen.getAllByRole('option', { name: 'Engineering', hidden: true }).at(-1);
    if (!engineering) throw new Error('Engineering option was not rendered');
    fireEvent.click(engineering);

    const table = screen.getByRole('table', { name: 'Employees' });
    expect(within(table).getByText('Avery Chen')).toBeInTheDocument();
    expect(within(table).queryByText('Riley Moss')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument();

    await chooseOption(user, screen.getByRole('combobox', { name: /department/i }), 'All departments');
    expect(within(table).getByText('Riley Moss')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument();
  });

  it('saves the picked department name when editing an employee', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') return json({ ...avery, department: 'Design' });
      if (isDepartmentsRequest(input)) return json(departments);
      return json([avery]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByRole('combobox', { name: /department/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actions for Avery Chen' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Edit' }));
    const dialog = await screen.findByRole('dialog');
    await chooseOption(user, within(dialog).getByLabelText(/Department/), 'Design');
    within(dialog).getByRole('button', { name: 'Save changes' }).closest('form')?.requestSubmit();

    await waitFor(() => {
      expect(fetchMock.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(true);
    });
    const patch = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(JSON.parse(String(patch?.[1]?.body)).department).toBe('Design');
  });

  it('falls back to a typed department when the department list fails', async () => {
    const user = userEvent.setup();
    const created = {
      id: 'emp_3',
      firstName: 'Samir',
      lastName: 'Okonkwo',
      email: 'samir.okonkwo@example.com',
      department: 'Platform',
      title: 'Controller',
      hireDate: '2019-06-24',
      status: 'active',
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return json(created, 201);
      if (isDepartmentsRequest(input)) return json({ detail: 'departments unavailable' }, 500);
      return json([avery]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    const dialog = await screen.findByRole('dialog');
    const department = await within(dialog).findByRole('textbox', { name: /Department/ });
    expect(department).toHaveAttribute('placeholder', 'Department name');
    expect(screen.queryByRole('combobox', { name: /department/i })).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/First name/), 'Samir');
    await user.type(within(dialog).getByLabelText(/Last name/), 'Okonkwo');
    await user.type(within(dialog).getByLabelText(/Email/), 'samir.okonkwo@example.com');
    await user.type(department, 'Platform');
    await user.type(within(dialog).getByLabelText(/Title/), 'Controller');
    const hireDate = within(dialog).getByLabelText(/Hire date/);
    await user.type(hireDate, 'Jun 24, 2019');
    await user.tab();
    within(dialog).getByRole('button', { name: 'Add employee' }).closest('form')?.requestSubmit();

    await waitFor(() => {
      expect(within(screen.getByRole('table', { name: 'Employees' })).getByText('Samir Okonkwo')).toBeInTheDocument();
    });
    const post = fetchMock.mock.calls.find((call) => call[1]?.method === 'POST');
    expect(JSON.parse(String(post?.[1]?.body)).department).toBe('Platform');
  });
});

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function isDepartmentsRequest(input: RequestInfo | URL): boolean {
  return new URL(requestUrl(input)).pathname === '/departments';
}

async function chooseOption(user: ReturnType<typeof userEvent.setup>, combobox: HTMLElement, name: string) {
  await user.click(combobox);
  const option = screen.getAllByRole('option', { name, hidden: true }).at(-1);
  if (!option) throw new Error(`${name} option was not rendered`);
  fireEvent.click(option);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
