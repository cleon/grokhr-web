import { Button, Drawer, Group, Input, SegmentedControl, Select, SimpleGrid, Stack, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { createEmployee, updateEmployee } from '../api/employees.ts';
import { errorMessage } from '../api/http.ts';
import { departmentChoices, fullName } from '../lib/directory.ts';
import {
  employeeToForm,
  emptyEmployeeForm,
  formToWrite,
  validateEmployeeForm,
  type EmployeeFormValues,
} from '../lib/employeeForm.ts';
import type { Employee, EmployeeStatus } from '../types/employee.ts';

export function EmployeeDrawer({
  opened,
  mode,
  employee,
  onClose,
  onSaved,
}: {
  opened: boolean;
  mode: 'create' | 'edit';
  employee?: Employee;
  onClose: () => void;
  onSaved: (employee: Employee) => void;
}) {
  const [saving, setSaving] = useState(false);
  const form = useForm<EmployeeFormValues>({
    initialValues: employee ? employeeToForm(employee) : emptyEmployeeForm(),
    validate: validateEmployeeForm,
  });

  const handleSubmit = form.onSubmit(async (values) => {
    setSaving(true);
    try {
      const payload = formToWrite(values);
      const saved =
        mode === 'create' || !employee
          ? await createEmployee(payload)
          : await updateEmployee(employee.id, payload);
      notifications.show({
        color: 'teal',
        title: mode === 'create' ? 'Employee added' : 'Employee updated',
        message: fullName(saved),
      });
      onSaved(saved);
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Could not save employee',
        message: errorMessage(error),
      });
    } finally {
      setSaving(false);
    }
  });

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={mode === 'create' ? 'Add employee' : `Edit ${employee ? fullName(employee) : 'employee'}`}
      padding="lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, xs: 2 }}>
            <TextInput label="First name" required autoFocus {...form.getInputProps('firstName')} />
            <TextInput label="Last name" required {...form.getInputProps('lastName')} />
          </SimpleGrid>
          <TextInput
            label="Preferred name"
            placeholder="Optional"
            description="What they go by. Leave blank to use their legal name."
            {...form.getInputProps('preferredName')}
          />
          <TextInput label="Email" required type="email" {...form.getInputProps('email')} />
          <Select
            label="Department"
            required
            searchable
            data={departmentChoices(form.values.department)}
            placeholder="Select a department"
            {...form.getInputProps('department')}
          />
          <TextInput label="Title" required placeholder="Staff engineer" {...form.getInputProps('title')} />
          <DateInput
            label="Hire date"
            required
            value={form.values.hireDate || null}
            onChange={(value) => form.setFieldValue('hireDate', value ?? '')}
            error={form.errors.hireDate}
            valueFormat="MMM D, YYYY"
            placeholder="Jan 1, 2024"
          />
          <Input.Wrapper label="Status" error={form.errors.status}>
            <SegmentedControl
              fullWidth
              mt={4}
              value={form.values.status}
              onChange={(value) => form.setFieldValue('status', value as EmployeeStatus)}
              data={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
              aria-label="Status"
            />
          </Input.Wrapper>
          <Group justify="flex-end" mt="md">
            <Button type="button" variant="default" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {mode === 'create' ? 'Add employee' : 'Save changes'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
