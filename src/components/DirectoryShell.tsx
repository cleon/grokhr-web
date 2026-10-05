import {
  ActionIcon,
  AppShell,
  Burger,
  Group,
  NavLink,
  Stack,
  Text,
  useMantineColorScheme,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconMoon, IconSun, IconUsers } from '@tabler/icons-react';
import type { ReactNode } from 'react';

export function DirectoryShell({ children }: { children: ReactNode }) {
  const [opened, { toggle }] = useDisclosure();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 240, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Toggle navigation" />
            <Mark />
            <div>
              <Text fw={600} lh={1.15}>
                GrokHR
              </Text>
              <Text size="xs" c="dimmed" lh={1.2}>
                People directory
              </Text>
            </div>
          </Group>
          <ActionIcon
            variant="default"
            size="lg"
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setColorScheme(dark ? 'light' : 'dark')}
          >
            {dark ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack h="100%" gap="xs">
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} px="sm">
            Workspace
          </Text>
          <NavLink label="Employees" leftSection={<IconUsers size={18} />} active variant="light" />
          <Text size="xs" c="dimmed" mt="auto" px="sm">
            Fictional example records. No sign-in.
          </Text>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}

function Mark() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#f54e00" />
      <path
        fill="#fff7f4"
        d="M18.8 8.2c-3.4 0-5.8 2.2-5.8 5.4v.7h3.2v-.6c0-1.4 1-2.3 2.5-2.3 1.6 0 2.5 1 2.5 2.4 0 1.2-.6 2-2.2 2.6l-2.2.8c-2.6 1-4 2.6-4 5.2 0 3.2 2.6 5.4 6.2 5.4 3.5 0 6-2.1 6.2-5.2h-3.3c-.2 1.4-1.2 2.2-2.9 2.2-1.6 0-2.6-.9-2.6-2.2 0-1.2.7-1.9 2.3-2.5l2.1-.7c2.7-1 4.1-2.7 4.1-5.4 0-3.3-2.6-5.8-6.1-5.8z"
      />
    </svg>
  );
}
