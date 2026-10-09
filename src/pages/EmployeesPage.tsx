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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listDepartments } from '../api/departments.ts';
import { listEmployees, reactivateEmployee } from '../api/employees.ts';
import { errorMessage } from '../api/http.ts';
import { DeactivateModal } from '../components/DeactivateModal.tsx';
import { EmployeeDrawer } from '../components/EmployeeDrawer.tsx';
import { EmployeeTable } from '../components/EmployeeTable.tsx';
import { filterEmployees, fullName, sortEmployees } from '../lib/directory.ts';
import type { Department, Employee } from '../types/employee.ts';

const ALL_DEPARTMENTS = '__all_departments__';

type EditorState =
  | { opened: false }
  | { opened: true; mode: 'create' }
  | { opened: true; mode: 'edit'; employee: Employee };

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsPhase, setDepartmentsPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [departmentId, setDepartmentId] = useState(ALL_DEPARTMENTS);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Employee['status']>('all');
  const [editor, setEditor] = useState<EditorState>({ opened: false });
  const [pendingDeactivate, setPendingDeactivate] = useState<Employee | null>(null);

  const applyDirectory = useCallback((rows: Employee[]) => {
    setEmployees(sortEmployees(rows));
    setPhase('ready');
    setLoadError(null);
  }, []);

  const load = useCallback(
    async (isCancelled?: () => boolean) => {
      const employeesTask = listEmployees()
        .then((rows) => {
          if (isCancelled?.()) return;
          applyDirectory(rows);
        })
        .catch((error: unknown) => {
          if (isCancelled?.()) return;
          setLoadError(errorMessage(error));
          setPhase('error');
        });

      const departmentsTask = listDepartments()
        .then((rows) => {
          if (isCancelled?.()) return;
          setDepartments(rows);
          setDepartmentsPhase('ready');
          setDepartmentId((current) => {
            const stillListed = rows.some((department) => department.id === current);
            return current === ALL_DEPARTMENTS || stillListed ? current : ALL_DEPARTMENTS;
          });
        })
        .catch(() => {
          if (isCancelled?.()) return;
          setDepartments([]);
          setDepartmentsPhase('error');
          setDepartmentId(ALL_DEPARTMENTS);
        });

      await Promise.all([employeesTask, departmentsTask]);
    },
    [applyDirectory],
  );

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const selectedDepartment =
    departmentsPhase === 'ready' ? departments.find((department) => department.id === departmentId) : undefined;

  const visible = useMemo(
    () =>
      filterEmployees(employees, {
        query,
        // Employees store the department name, so the filter compares names rather than ids.
        department: selectedDepartment?.name ?? null,
        status,
      }),
    [employees, query, selectedDepartment, status],
  );

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
          <Button variant="default" leftSection={<IconRefresh size={16} />} onClick={() => void load()}>
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
            {departmentsPhase === 'ready' ? (
              <Select
                label="Department"
                allowDeselect={false}
                data={[
                  { value: ALL_DEPARTMENTS, label: 'All departments' },
                  ...departments.map((department) => ({ value: department.id, label: department.name })),
                ]}
                value={departmentId}
                onChange={(value) => setDepartmentId(value ?? ALL_DEPARTMENTS)}
                aria-label="Filter by department"
                style={{ flex: '1 1 220px' }}
              />
            ) : null}
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
          departments={departments}
          departmentsStatus={departmentsPhase}
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
