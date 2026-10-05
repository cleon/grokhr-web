import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { DirectoryShell } from './components/DirectoryShell.tsx';
import { EmployeesPage } from './pages/EmployeesPage.tsx';
import { theme } from './theme.ts';

dayjs.extend(customParseFormat);

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <DatesProvider settings={{ consistentWeeks: true }}>
        <Notifications position="top-right" />
        <DirectoryShell>
          <EmployeesPage />
        </DirectoryShell>
      </DatesProvider>
    </MantineProvider>
  );
}
