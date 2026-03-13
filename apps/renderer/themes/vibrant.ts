import { Theme } from '../types';

export const vibrantTheme: Theme = {
  id: 'vibrant',
  name: 'Vibrant',
  colors: {
    primary: '#E11D48',
    secondary: '#DB2777',
    accent: '#FACC15',
    background: '#FFF1F2',
    surface: '#FFFFFF',
    text: '#1C1917',
    textSecondary: '#78716C',
  },
  fonts: {
    heading: 'Inter, -apple-system, sans-serif',
    body: 'Inter, -apple-system, sans-serif',
  },
  borderRadius: 20,
  shadow: '0 8px 32px rgba(225, 29, 72, 0.12)',
  animationStyle: 'bouncy',
};
