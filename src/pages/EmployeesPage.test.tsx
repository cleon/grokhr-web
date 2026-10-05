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
  it('lists the current page returned by the API', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(pageOf([avery, riley], 2)));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    const table = await screen.findByRole('table', { name: 'Employees' });
    expect(within(table).getByText('Avery Chen')).toBeInTheDocument();
    expect(within(table).getByText('riley.moss@example.com')).toBeInTheDocument();
    expect(within(table).getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/employees?page=1&pageSize=25',
      expect.anything(),
    );
  });

  it('loads the next and previous pages', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('page=2')) return json(pageOf([riley], 26, 2));
      return json(pageOf([avery], 26, 1));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–25 of 26')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(await screen.findByText('Riley Moss')).toBeInTheDocument();
    expect(screen.queryByText('Avery Chen')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 26 of 26')).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8000/employees?page=2&pageSize=25',
      expect.anything(),
    );

    await user.click(screen.getByRole('button', { name: 'Previous page' }));

    expect(await screen.findByText('Avery Chen')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
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
    let posted = false;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        posted = true;
        return json(created, 201);
      }
      return json(pageOf(posted ? [avery, created] : [avery], posted ? 2 : 1));
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
    const methods = fetchMock.mock.calls.map((call) => call[1]?.method ?? 'GET');
    const postIndex = methods.indexOf('POST');
    expect(postIndex).toBeGreaterThan(0);
    expect(methods.slice(postIndex + 1)).toContain('GET');
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
    let patched = false;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        patched = true;
        return json({ ...avery, status: 'inactive' });
      }
      return json(pageOf([patched ? { ...avery, status: 'inactive' } : avery]));
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
    const methods = fetchMock.mock.calls.map((call) => call[1]?.method ?? 'GET');
    const patchIndex = methods.lastIndexOf('PATCH');
    expect(methods.slice(patchIndex + 1)).toContain('GET');
    const patch = fetchMock.mock.calls.find((call) => call[1]?.method === 'PATCH');
    expect(patch?.[0]).toBe('http://localhost:8000/employees/emp_1');
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({ status: 'inactive' });
  });
});

function pageOf(items: unknown[], total = items.length, page = 1, pageSize = 25) {
  return { items, total, page, pageSize };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
