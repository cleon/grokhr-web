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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('employee directory', () => {
  it('lists active employees by default', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('?status=active')) return json([avery]);
      return json([avery, riley]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const table = await screen.findByRole('table', { name: 'Employees' });
    expect(within(table).getByText('Avery Chen')).toBeInTheDocument();
    expect(within(table).queryByText('Riley Moss')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 1')).toBeInTheDocument();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('http://localhost:8000/employees?status=active');
  });

  it('reloads the directory when employment status changes', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('?status=inactive')) return json([riley]);
      if (url.endsWith('?status=active')) return json([avery]);
      return json([avery, riley]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Inactive' }));
    await waitFor(() => {
      expect(within(screen.getByRole('table', { name: 'Employees' })).getByText('Riley Moss')).toBeInTheDocument();
    });
    expect(within(screen.getByRole('table', { name: 'Employees' })).queryByText('Avery Chen')).not.toBeInTheDocument();
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe('http://localhost:8000/employees?status=inactive');

    await user.click(screen.getByRole('radio', { name: 'All' }));
    await waitFor(() => {
      const table = screen.getByRole('table', { name: 'Employees' });
      expect(within(table).getByText('Avery Chen')).toBeInTheDocument();
      expect(within(table).getByText('Riley Moss')).toBeInTheDocument();
    });
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toBe('http://localhost:8000/employees');
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
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return json(created, 201);
      return json([avery]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add employee' }));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/First name/), 'Samir');
    await user.type(within(dialog).getByLabelText(/Last name/), 'Okonkwo');
    await user.type(within(dialog).getByLabelText(/Email/), 'samir.okonkwo@example.com');
    const department = within(dialog).getByLabelText(/Department/);
    await user.click(department);
    const finance = screen.getAllByRole('option', { name: 'Finance', hidden: true }).at(-1);
    if (!finance) throw new Error('Finance option was not rendered');
    fireEvent.click(finance);
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
      expect(screen.getByText('Employee deactivated')).toBeInTheDocument();
    });
    expect(screen.queryByRole('table', { name: 'Employees' })).not.toBeInTheDocument();
    expect(screen.getByText('No matching employees')).toBeInTheDocument();
    const patch = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(patch?.[0]).toBe('http://localhost:8000/employees/emp_1');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ status: 'inactive' });
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
