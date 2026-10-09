import {
  Alert,
  Button,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle, IconPlus, IconRefresh, IconSearch } from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listEmployees, reactivateEmployee } from '../api/employees.ts';
import { errorMessage } from '../api/http.ts';
import { DeactivateModal } from '../components/DeactivateModal.tsx';
import { EmployeeDrawer } from '../components/EmployeeDrawer.tsx';
import { EmployeeTable } from '../components/EmployeeTable.tsx';
import { departmentFilterOptions, filterEmployees, fullName, sortEmployees } from '../lib/directory.ts';
import type { Employee } from '../types/employee.ts';

type EditorState =
  | { opened: false }
  | { opened: true; mode: 'create' }
  | { opened: true; mode: 'edit'; employee: Employee };

const SEARCH_DEBOUNCE_MS = 300;

function readSearchQuery(): string {
  return new URLSearchParams(window.location.search).get('q')?.trim() ?? '';
}

function syncSearchParam(term: string): void {
  const params = new URLSearchParams(window.location.search);
  if (term) params.set('q', term);
  else params.delete('q');
  const search = params.toString();
  const next = `${window.location.pathname}${search ? `?${search}` : ''}${window.location.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next === current) return;
  window.history.replaceState(window.history.state, '', next);
}

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(readSearchQuery);
  const [appliedQuery, setAppliedQuery] = useState(readSearchQuery);
  const [searching, setSearching] = useState(true);
  const [department, setDepartment] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | Employee['status']>('all');
  const [editor, setEditor] = useState<EditorState>({ opened: false });
  const [pendingDeactivate, setPendingDeactivate] = useState<Employee | null>(null);
  // A slower response from an older search must not replace a newer result set.
  const requestSeq = useRef(0);
  const startedSearch = useRef(false);

  const applyDirectory = useCallback((rows: Employee[]) => {
    setEmployees(sortEmployees(rows));
    setPhase('ready');
    setLoadError(null);
  }, []);

  const load = useCallback((term: string) => {
    const seq = ++requestSeq.current;
    setSearching(true);
    void listEmployees(term)
      .then((rows) => {
        if (seq !== requestSeq.current) return;
        setAppliedQuery(term);
        applyDirectory(rows);
      })
      .catch((error: unknown) => {
        if (seq !== requestSeq.current) return;
        setLoadError(errorMessage(error));
        setPhase('error');
      })
      .finally(() => {
        if (seq === requestSeq.current) setSearching(false);
      });
  }, [applyDirectory]);

  useEffect(() => {
    const term = query.trim();
    // The first request matches the URL immediately. Later edits wait out the debounce.
    const delay = startedSearch.current ? SEARCH_DEBOUNCE_MS : 0;
    const timer = window.setTimeout(() => {
      startedSearch.current = true;
      syncSearchParam(term);
      load(term);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [query, load]);

  useEffect(() => {
    return () => {
      // Drop a response that arrives after the page is gone.
      requestSeq.current += 1;
    };
  }, []);

  const visible = useMemo(
    () => filterEmployees(employees, { department, status }),
    [employees, department, status],
  );

  const directoryEmpty = employees.length === 0 && appliedQuery.length === 0 && !department && status === 'all';

  const activeCount = employees.filter((employee) => employee.status === 'active').length;
  const departmentCount = new Set(employees.map((employee) => employee.department).filter(Boolean)).size;

  function upsert(saved: Employee) {
    setEmployees((current) => {
      const exists = current.some((employee) => employee.id === saved.id);
      const next = exists
        ? current.map((employee) => (employee.id === saved.id ? saved : employee))
        : [...current, saved];
      return sortEmployees(next);
    });
    setPhase('ready');
    setLoadError(null);
  }

  async function reactivate(employee: Employee) {
    try {
      const updated = await reactivateEmployee(employee.id);
      upsert(updated);
      notifications.show({
        color: 'teal',
        title: 'Employee reactivated',
        message: `${fullName(updated)} is active again.`,
      });
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Could not reactivate employee',
        message: errorMessage(error),
      });
    }
  }

  return (
    <Stack gap="lg" maw={1120} w="100%">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Employees</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Create, update, or deactivate example staff records.
          </Text>
        </div>
        <Group gap="xs">
          <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={() => void load(query.trim())}>
            Refresh
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEditor({ opened: true, mode: 'create' })}>
            Add employee
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, xs: 3 }}>
        <Stat label="Active" value={phase === 'ready' ? String(activeCount) : '—'} />
        <Stat label="Inactive" value={phase === 'ready' ? String(employees.length - activeCount) : '—'} />
        <Stat label="Departments" value={phase === 'ready' ? String(departmentCount) : '—'} />
      </SimpleGrid>

      <Paper className="hr-surface" radius="md" p="md">
        <Stack gap="md">
          <Group align="flex-end" justify="space-between" wrap="wrap" gap="sm">
            <TextInput
              label="Search"
              placeholder="Name, email, or title"
              leftSection={<IconSearch size={16} />}
              rightSection={
                searching ? (
                  <span role="status" aria-live="polite" aria-label="Searching">
                    <Loader size="xs" />
                  </span>
                ) : null
              }
              value={query}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setQuery(next);
                syncSearchParam(next.trim());
              }}
              aria-label="Search employees"
              style={{ flex: '1 1 220px' }}
            />
            <Select
              label="Department"
              placeholder="All departments"
              clearable
              data={departmentFilterOptions(employees)}
              value={department}
              onChange={setDepartment}
              aria-label="Filter by department"
              style={{ flex: '1 1 220px' }}
            />
            <SegmentedControl
              value={status}
              onChange={(value) => setStatus(value as 'all' | Employee['status'])}
              data={[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              aria-label="Filter by status"
            />
          </Group>

          {phase === 'loading' ? <TableSkeleton /> : null}

          {phase === 'error' ? (
            <Alert color="red" icon={<IconAlertCircle size={18} />} title="Directory unavailable">
              {loadError} Start the API, then refresh.
            </Alert>
          ) : null}

          {phase === 'ready' && visible.length === 0 ? (
            <Stack align="center" gap="xs" py="xl">
              <Text fw={500}>{directoryEmpty ? 'No employees yet' : 'No matching employees'}</Text>
              <Text size="sm" c="dimmed" ta="center" maw={420}>
                {directoryEmpty
                  ? 'Add the first example record. Nothing here is a real person.'
                  : 'Adjust search or filters to see more of the directory.'}
              </Text>
              {directoryEmpty ? (
                <Button mt="xs" onClick={() => setEditor({ opened: true, mode: 'create' })}>
                  Add employee
                </Button>
              ) : null}
            </Stack>
          ) : null}

          {phase === 'ready' && visible.length > 0 ? (
            <EmployeeTable
              employees={visible}
              onEdit={(employee) => setEditor({ opened: true, mode: 'edit', employee })}
              onDeactivate={setPendingDeactivate}
              onReactivate={(employee) => void reactivate(employee)}
            />
          ) : null}

          {phase === 'ready' ? (
            <Text size="xs" c="dimmed">
              Showing {visible.length} of {employees.length}
            </Text>
          ) : null}
        </Stack>
      </Paper>

      {editor.opened ? (
        <EmployeeDrawer
          key={editor.mode === 'edit' ? editor.employee.id : 'create'}
          opened
          mode={editor.mode}
          employee={editor.mode === 'edit' ? editor.employee : undefined}
          onClose={() => setEditor({ opened: false })}
          onSaved={(saved) => {
            upsert(saved);
            setEditor({ opened: false });
          }}
        />
      ) : null}

      <DeactivateModal
        employee={pendingDeactivate}
        onClose={() => setPendingDeactivate(null)}
        onDeactivated={(saved) => {
          upsert(saved);
          setPendingDeactivate(null);
        }}
      />
    </Stack>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Paper className="hr-surface" radius="md" p="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text fz={28} fw={600} lh={1.2} mt={4}>
        {value}
      </Text>
    </Paper>
  );
}

function TableSkeleton() {
  return (
    <Stack gap="sm">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} height={44} radius="sm" />
      ))}
    </Stack>
  );
}
