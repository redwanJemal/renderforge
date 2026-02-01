import { Theme } from '../types';

export const minimalTheme: Theme = {
  id: 'minimal',
  name: 'Minimal',
  colors: {
    primary: '#171717',
    secondary: '#404040',
    accent: '#A3A3A3',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#0A0A0A',
    textSecondary: '#737373',
  },
  fonts: {
    heading: 'Georgia, "Times New Roman", serif',
    body: 'Inter, -apple-system, sans-serif',
  },
  borderRadius: 0,
  shadow: 'none',
  animationStyle: 'sharp',
};
