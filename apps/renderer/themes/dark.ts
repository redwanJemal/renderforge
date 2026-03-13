import { Theme } from '../types';

export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark',
  colors: {
    primary: '#818CF8',
    secondary: '#6366F1',
    accent: '#34D399',
    background: '#0F0F1A',
    surface: '#1E1E2E',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
  },
  fonts: {
    heading: 'Inter, -apple-system, sans-serif',
    body: 'Inter, -apple-system, sans-serif',
  },
  borderRadius: 16,
  shadow: '0 4px 32px rgba(99, 102, 241, 0.15)',
  animationStyle: 'bouncy',
};
