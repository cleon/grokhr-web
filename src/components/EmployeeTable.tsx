import { ActionIcon, Avatar, Badge, Group, Menu, Stack, Table, Text } from '@mantine/core';
import { IconDots, IconPencil, IconUserCheck, IconUserOff } from '@tabler/icons-react';
import type { Employee } from '../types/employee.ts';
import { STATUS_PRESENTATION, avatarColor, formatHireDate, fullName, initials } from '../lib/directory.ts';

export function EmployeeTable({
  employees,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  employees: Employee[];
  onEdit: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => void;
  onReactivate: (employee: Employee) => void;
}) {
  return (
    <Table.ScrollContainer minWidth={320} type="native">
      <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover aria-label="Employees">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Employee</Table.Th>
            <Table.Th visibleFrom="sm">Department</Table.Th>
            <Table.Th visibleFrom="md">Title</Table.Th>
            <Table.Th visibleFrom="md">Hired</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {employees.map((employee) => {
            const name = fullName(employee);
            const status = STATUS_PRESENTATION[employee.status];
            return (
              <Table.Tr key={employee.id}>
                <Table.Td>
                  <Group gap="sm" wrap="nowrap" justify="space-between">
                    <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                      <Avatar color={avatarColor(name)} radius="xl" variant="light">
                        {initials(employee)}
                      </Avatar>
                      <Stack gap={0} style={{ minWidth: 0 }}>
                        <Text fw={500} size="sm" truncate="end">
                          {name}
                        </Text>
                        <Text size="xs" c="dimmed" truncate="end" visibleFrom="sm">
                          {employee.email}
                        </Text>
                      </Stack>
                    </Group>
                    <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
                      <Badge variant="light" color={status.color}>
                        {status.label}
                      </Badge>
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray" aria-label={`Actions for ${name}`}>
                            <IconDots size={18} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconPencil size={16} />} onClick={() => onEdit(employee)}>
                            Edit
                          </Menu.Item>
                          {employee.status === 'active' ? (
                            <Menu.Item
                              color="red"
                              leftSection={<IconUserOff size={16} />}
                              onClick={() => onDeactivate(employee)}
                            >
                              Deactivate
                            </Menu.Item>
                          ) : (
                            <Menu.Item
                              leftSection={<IconUserCheck size={16} />}
                              onClick={() => onReactivate(employee)}
                            >
                              Reactivate
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                  </Group>
                </Table.Td>
                <Table.Td visibleFrom="sm">
                  <Text size="sm">{employee.department}</Text>
                </Table.Td>
                <Table.Td visibleFrom="md">
                  <Text size="sm">{employee.title}</Text>
                </Table.Td>
                <Table.Td visibleFrom="md">
                  <Text size="sm">{formatHireDate(employee.hireDate)}</Text>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
