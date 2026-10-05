import {
  Alert,
  Button,
  Group,
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_EMPLOYEE_PAGE_SIZE, listEmployees, reactivateEmployee } from '../api/employees.ts';
import { errorMessage } from '../api/http.ts';
import { DeactivateModal } from '../components/DeactivateModal.tsx';
import { EmployeeDrawer } from '../components/EmployeeDrawer.tsx';
import { EmployeeTable } from '../components/EmployeeTable.tsx';
import { departmentFilterOptions, filterEmployees, fullName } from '../lib/directory.ts';
import type { Employee, EmployeePage } from '../types/employee.ts';

type EditorState =
  | { opened: false }
  | { opened: true; mode: 'create' }
  | { opened: true; mode: 'edit'; employee: Employee };

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_EMPLOYEE_PAGE_SIZE);
  const [reloadKey, setReloadKey] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState<string | null>(null);
  const [status, setStatus] = useState<'all' | Employee['status']>('all');
  const [editor, setEditor] = useState<EditorState>({ opened: false });
  const [pendingDeactivate, setPendingDeactivate] = useState<Employee | null>(null);
  const requestSeq = useRef(0);

  function reload() {
    setPhase('loading');
    setReloadKey((current) => current + 1);
  }

  function goToPage(next: number) {
    setPhase('loading');
    setPage(next);
  }

  useEffect(() => {
    const seq = ++requestSeq.current;
    let cancelled = false;
    listEmployees({ page, pageSize: DEFAULT_EMPLOYEE_PAGE_SIZE })
      .then((result) => {
        if (cancelled || seq !== requestSeq.current) return;
        const resolved = resolveEmployeePage(result, page);
        if (resolved.page !== page) {
          setTotal(resolved.total);
          setPageSize(resolved.pageSize);
          setPage(resolved.page);
          return;
        }
        setEmployees(resolved.items);
        setTotal(resolved.total);
        setPageSize(resolved.pageSize);
        setPhase('ready');
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (cancelled || seq !== requestSeq.current) return;
        setLoadError(errorMessage(error));
        setPhase('error');
      });
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  const visible = useMemo(
    () => filterEmployees(employees, { query, department, status }),
    [employees, query, department, status],
  );

  const activeCount = employees.filter((employee) => employee.status === 'active').length;
  const departmentCount = new Set(employees.map((employee) => employee.department).filter(Boolean)).size;

  async function reactivate(employee: Employee) {
    try {
      const updated = await reactivateEmployee(employee.id);
      notifications.show({
        color: 'teal',
        title: 'Employee reactivated',
        message: `${fullName(updated)} is active again.`,
      });
      reload();
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Could not reactivate employee',
        message: errorMessage(error),
      });
    }
  }

  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * pageSize, total);
  const windowLabel =
    total === 0
      ? 'Showing 0 employees'
      : rangeStart === rangeEnd
        ? `Showing ${rangeStart} of ${total}`
        : `Showing ${rangeStart}–${rangeEnd} of ${total}`;

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
          <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={reload}>
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
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
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
              <Text fw={500}>{employees.length === 0 ? 'No employees yet' : 'No matching employees'}</Text>
              <Text size="sm" c="dimmed" ta="center" maw={420}>
                {employees.length === 0
                  ? 'Add the first example record. Nothing here is a real person.'
                  : 'Adjust search or filters to see more of the directory.'}
              </Text>
              {employees.length === 0 ? (
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
            <Group justify="space-between" align="center" role="navigation" aria-label="Employee pages">
              <Text size="xs" c="dimmed">
                {windowLabel}
              </Text>
              <Group gap="xs">
                <Button
                  variant="default"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <Text size="sm">
                  Page {page} of {pageCount}
                </Text>
                <Button
                  variant="default"
                  size="xs"
                  disabled={page >= pageCount}
                  onClick={() => goToPage(page + 1)}
                  aria-label="Next page"
                >
                  Next
                </Button>
              </Group>
            </Group>
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
          onSaved={() => {
            setEditor({ opened: false });
            reload();
          }}
        />
      ) : null}

      <DeactivateModal
        employee={pendingDeactivate}
        onClose={() => setPendingDeactivate(null)}
        onDeactivated={() => {
          setPendingDeactivate(null);
          reload();
        }}
      />
    </Stack>
  );
}

// The requested page can land past the end after a deactivate. Follow the last
// page that still has rows instead of leaving the table empty.
function resolveEmployeePage(result: EmployeePage, requestedPage: number): EmployeePage {
  const size = result.pageSize > 0 ? result.pageSize : DEFAULT_EMPLOYEE_PAGE_SIZE;
  const lastPage = Math.max(1, Math.ceil(Math.max(0, result.total) / size));
  const reported = result.page >= 1 ? result.page : requestedPage;
  return {
    items: result.items,
    total: result.total,
    page: Math.min(reported, lastPage),
    pageSize: size,
  };
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
