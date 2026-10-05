import { Button, Group, Modal, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { deactivateEmployee } from '../api/employees.ts';
import { errorMessage } from '../api/http.ts';
import { fullName } from '../lib/directory.ts';
import type { Employee } from '../types/employee.ts';

export function DeactivateModal({
  employee,
  onClose,
  onDeactivated,
}: {
  employee: Employee | null;
  onClose: () => void;
  onDeactivated: (employee: Employee) => void;
}) {
  const [pending, setPending] = useState(false);
  const name = employee ? fullName(employee) : 'This employee';

  async function confirm() {
    if (!employee) return;
    setPending(true);
    try {
      const updated = await deactivateEmployee(employee.id);
      notifications.show({
        color: 'teal',
        title: 'Employee deactivated',
        message: `${fullName(updated)} is now inactive.`,
      });
      onDeactivated(updated);
    } catch (error) {
      notifications.show({
        color: 'red',
        title: 'Could not deactivate employee',
        message: errorMessage(error),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal opened={employee !== null} onClose={onClose} title="Deactivate employee" centered>
      <Text size="sm">
        {name} stays in the directory as inactive. This does not delete the record.
      </Text>
      <Group justify="flex-end" mt="lg">
        <Button variant="default" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button color="red" loading={pending} onClick={() => void confirm()}>
          Deactivate
        </Button>
      </Group>
    </Modal>
  );
}
