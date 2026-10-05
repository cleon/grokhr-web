import { ActionIcon, Avatar, Badge, Group, Menu, Stack, Table, Text } from '@mantine/core';
import { IconDots, IconPencil, IconUserCheck, IconUserOff } from '@tabler/icons-react';
import type { Employee } from '../types/employee.ts';
import { avatarColor, formatHireDate, fullName, initials } from '../lib/directory.ts';

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
    <Table.ScrollContainer minWidth={760}>
      <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover aria-label="Employees">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Employee</Table.Th>
            <Table.Th>Department</Table.Th>
            <Table.Th>Title</Table.Th>
            <Table.Th>Hired</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th aria-label="Actions" />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {employees.map((employee) => {
            const name = fullName(employee);
            return (
              <Table.Tr key={employee.id}>
                <Table.Td>
                  <Group gap="sm" wrap="nowrap">
                    <Avatar color={avatarColor(name)} radius="xl" variant="light">
                      {initials(employee)}
                    </Avatar>
                    <Stack gap={0}>
                      <Text fw={500} size="sm">
                        {name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {employee.email}
                      </Text>
                    </Stack>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{employee.department}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{employee.title}</Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">{formatHireDate(employee.hireDate)}</Text>
                </Table.Td>
                <Table.Td>
                  <Badge variant="light" color={employee.status === 'active' ? 'teal' : 'gray'}>
                    {employee.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </Table.Td>
                <Table.Td>
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
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
