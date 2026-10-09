import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const SEARCH_DEBOUNCE_MS = 300;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
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
});

describe('server search', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/');
  });

  it('debounces requests by 300ms and sends the latest term', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json([avery, riley]));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await flush();
    expect(employeeUrls(fetchMock)).toEqual(['http://localhost:8000/employees']);

    const input = screen.getByRole('textbox', { name: 'Search employees' });
    fireEvent.change(input, { target: { value: 'm' } });
    await advance(SEARCH_DEBOUNCE_MS - 1);
    fireEvent.change(input, { target: { value: 'moss' } });
    await advance(SEARCH_DEBOUNCE_MS - 1);

    expect(employeeUrls(fetchMock)).toEqual(['http://localhost:8000/employees']);
    expect(screen.queryByRole('status', { name: 'Searching' })).not.toBeInTheDocument();

    await advance(1);
    expect(employeeUrls(fetchMock).map(queryOf)).toEqual([null, 'moss']);
  });

  it('requests q and renders the returned rows in the headcount', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const term = queryOf(String(input));
      if (term === 'nomatch') return json([riley]);
      return json([avery, riley]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await flush();
    expect(screen.getByText('Avery Chen')).toBeInTheDocument();
    expect(statValue('Active')).toBe('1');
    expect(statValue('Inactive')).toBe('1');
    expect(statValue('Departments')).toBe('2');

    fireEvent.change(screen.getByRole('textbox', { name: 'Search employees' }), {
      target: { value: 'nomatch' },
    });
    await advance(SEARCH_DEBOUNCE_MS);

    expect(queryOf(String(fetchMock.mock.calls.at(-1)?.[0]))).toBe('nomatch');
    expect(screen.getByText('Riley Moss')).toBeInTheDocument();
    expect(screen.queryByText('Avery Chen')).not.toBeInTheDocument();
    expect(statValue('Active')).toBe('0');
    expect(statValue('Inactive')).toBe('1');
    expect(statValue('Departments')).toBe('1');
    expect(screen.getByText('Showing 1 of 1')).toBeInTheDocument();
  });

  it('ignores a stale search response', async () => {
    const chen = deferred();
    const moss = deferred();
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const term = queryOf(String(input));
      if (term === 'chen') return chen.promise;
      if (term === 'moss') return moss.promise;
      return Promise.resolve(json([avery, riley]));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await flush();
    expect(screen.getByText('Avery Chen')).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Searching' })).not.toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Search employees' });
    fireEvent.change(input, { target: { value: 'chen' } });
    await advance(SEARCH_DEBOUNCE_MS);
    expect(screen.getByRole('status', { name: 'Searching' })).toBeInTheDocument();
    expect(screen.getByText('Avery Chen')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'moss' } });
    await advance(SEARCH_DEBOUNCE_MS);
    expect(queryOf(String(fetchMock.mock.calls.at(-1)?.[0]))).toBe('moss');

    await act(async () => {
      moss.resolve(json([riley]));
    });
    await flush();
    expect(screen.getByText('Riley Moss')).toBeInTheDocument();
    expect(screen.queryByText('Avery Chen')).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Searching' })).not.toBeInTheDocument();
    expect(statValue('Active')).toBe('0');
    expect(statValue('Inactive')).toBe('1');

    await act(async () => {
      chen.reject(new Error('late'));
    });
    await flush();
    expect(screen.queryByRole('alert', { name: /Directory unavailable/ })).not.toBeInTheDocument();
    expect(screen.getByText('Riley Moss')).toBeInTheDocument();
    expect(screen.queryByText('Avery Chen')).not.toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 1')).toBeInTheDocument();
  });

  it('syncs q in the URL and restores it on load', async () => {
    window.history.replaceState(null, '', '/?q=chen');
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const term = queryOf(String(input));
      if (term === 'chen') return json([avery]);
      if (term === 'riley moss') return json([riley]);
      return json([avery, riley]);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await flush();

    const input = screen.getByRole('textbox', { name: 'Search employees' });
    expect(input).toHaveValue('chen');
    expect(queryOf(String(fetchMock.mock.calls[0]?.[0]))).toBe('chen');
    expect(screen.getByText('Avery Chen')).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('q')).toBe('chen');

    fireEvent.change(input, { target: { value: 'riley moss' } });
    expect(new URLSearchParams(window.location.search).get('q')).toBe('riley moss');
    expect(fetchMock.mock.calls.map((call) => queryOf(String(call[0])))).toEqual(['chen']);

    await advance(SEARCH_DEBOUNCE_MS);
    expect(fetchMock.mock.calls.map((call) => queryOf(String(call[0])))).toEqual(['chen', 'riley moss']);
    expect(screen.getByText('Riley Moss')).toBeInTheDocument();
    expect(screen.queryByText('Avery Chen')).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: '' } });
    expect(new URLSearchParams(window.location.search).has('q')).toBe(false);
    await advance(SEARCH_DEBOUNCE_MS - 1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await advance(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[2]?.[0])).toBe('http://localhost:8000/employees');
    expect(screen.getByText('Avery Chen')).toBeInTheDocument();
    expect(screen.getByText('Riley Moss')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument();
  });
});

function employeeUrls(fetchMock: ReturnType<typeof vi.fn>): string[] {
  return fetchMock.mock.calls.map((call) => String(call[0])).filter((url) => new URL(url).pathname === '/employees');
}

function queryOf(url: string): string | null {
  return new URL(url).searchParams.get('q');
}

function statValue(label: string): string {
  const labelNode = screen.getAllByText(label).find((node) => {
    const value = node.nextElementSibling?.textContent?.trim() ?? '';
    return /^[0-9]+$|^—$/.test(value);
  });
  const value = labelNode?.nextElementSibling?.textContent?.trim();
  if (!value) throw new Error(`No stat value for ${label}`);
  return value;
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

async function flush() {
  await advance(0);
}

function deferred() {
  let resolve: (value: Response) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<Response>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
