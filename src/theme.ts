import { createTheme, type MantineColorsTuple } from '@mantine/core';

const accent: MantineColorsTuple = [
  '#fff4ef',
  '#ffe4d6',
  '#ffc7ad',
  '#ffa27a',
  '#ff7d45',
  '#ff631f',
  '#f54e00',
  '#d64400',
  '#b33800',
  '#7c2600',
];

const dark: MantineColorsTuple = [
  '#edecec',
  '#d6d5d3',
  '#b3b1ad',
  '#8d8b86',
  '#5e5c56',
  '#3a3832',
  '#1b1913',
  '#14120b',
  '#100e09',
  '#0c0b07',
];

export const theme = createTheme({
  primaryColor: 'accent',
  primaryShade: 6,
  black: '#26251e',
  fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
  headings: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    fontWeight: '600',
  },
  defaultRadius: 'md',
  colors: {
    accent,
    dark,
  },
  cursorType: 'pointer',
});
