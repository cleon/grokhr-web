import { Button, Group, Modal, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { deleteEmployee } from '../api/employees.ts';
import { ApiError, errorMessage } from '../api/http.ts';
import { fullName } from '../lib/directory.ts';
import type { Employee } from '../types/employee.ts';

export function DeleteEmployeeModal({
  employee,
  onClose,
  onRemoved,
}: {
  employee: Employee | null;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const name = employee ? fullName(employee) : 'This employee';

  async function confirm() {
    if (!employee) return;
    const label = fullName(employee);
    setPending(true);
    try {
      await deleteEmployee(employee.id);
      notifications.show({
        color: 'teal',
        title: 'Employee removed',
        message: `${label} was deleted from the directory.`,
      });
      onRemoved();
    } catch (error) {
      const failure = removalFailure(error);
      notifications.show({
        color: 'red',
        title: failure.title,
        message: failure.message,
      });
      // 404 means the row is already gone; reload so the directory matches the server.
      if (failure.missing) onRemoved();
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal opened={employee !== null} onClose={onClose} title="Delete employee" centered>
      <Text size="sm">{name} will be permanently removed from the directory. This cannot be undone.</Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button color="red" loading={pending} onClick={() => void confirm()}>
          Delete employee
        </Button>
      </Group>
    </Modal>
  );
}

function removalFailure(error: unknown): { title: string; message: string; missing: boolean } {
  if (error instanceof ApiError && error.status === 404) {
    return {
      title: 'Employee not found',
      message: 'This employee is no longer in the directory.',
      missing: true,
    };
  }
  if (error instanceof ApiError && error.status === 409) {
    return {
      title: 'Could not delete employee',
      message: error.message.startsWith('Request failed')
        ? 'This employee could not be deleted because of a conflict.'
        : error.message,
      missing: false,
    };
  }
  return {
    title: 'Could not delete employee',
    message: errorMessage(error),
    missing: false,
  };
}
