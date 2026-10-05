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

  it('removes an employee after confirmation and reloads the directory', async () => {
    const user = userEvent.setup();
    let loaded = false;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') return new Response(null, { status: 204 });
      if (loaded) return json([riley]);
      loaded = true;
      return json([avery, riley]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actions for Avery Chen' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/permanently removed from the directory/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Delete employee' }));

    await waitFor(() => {
      expect(screen.queryByText('Avery Chen')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Riley Moss')).toBeInTheDocument();
    expect(screen.getByText('Employee removed')).toBeInTheDocument();
    const remove = fetchMock.mock.calls.find((call) => call[1]?.method === 'DELETE');
    expect(remove?.[0]).toBe('http://localhost:8000/employees/emp_1');
    expect(remove?.[1]?.body).toBeUndefined();
    expect(fetchMock.mock.calls.filter((call) => !call[1]?.method).length).toBeGreaterThan(1);
  });

  it('offers remove on an inactive employee alongside reactivate', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json([riley])));

    render(<App />);
    expect(await screen.findByText('Riley Moss')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actions for Riley Moss' }));
    const items = await screen.findAllByRole('menuitem');
    expect(items.map((item) => item.textContent)).toEqual(['Edit', 'Reactivate', 'Remove']);
  });

  it('notifies when delete returns 404 and refreshes the directory', async () => {
    const user = userEvent.setup();
    let loaded = false;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'DELETE') return json({ detail: 'Employee not found' }, 404);
        if (loaded) return json([]);
        loaded = true;
        return json([avery]);
      }),
    );

    render(<App />);
    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actions for Avery Chen' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete employee' }));

    expect(await screen.findByText('Employee not found')).toBeInTheDocument();
    expect(screen.getByText('This employee is no longer in the directory.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Avery Chen')).not.toBeInTheDocument();
    });
  });

  it('notifies when delete returns 409 and keeps the employee', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === 'DELETE') return json({ detail: 'Employee is referenced by an open review' }, 409);
        return json([avery]);
      }),
    );

    render(<App />);
    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Actions for Avery Chen' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Remove' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete employee' }));

    expect(await screen.findByText('Could not delete employee')).toBeInTheDocument();
    expect(screen.getByText('Employee is referenced by an open review')).toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: 'Employees' })).getByText('Avery Chen')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
