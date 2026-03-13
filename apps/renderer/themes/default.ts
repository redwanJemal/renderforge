import { Theme } from '../types';

export const defaultTheme: Theme = {
  id: 'default',
  name: 'Default',
  colors: {
    primary: '#2563EB',
    secondary: '#3B82F6',
    accent: '#F59E0B',
    background: '#FFFFFF',
    surface: '#F8FAFC',
    text: '#0F172A',
    textSecondary: '#64748B',
  },
  fonts: {
    heading: 'Inter, -apple-system, sans-serif',
    body: 'Inter, -apple-system, sans-serif',
  },
  borderRadius: 12,
  shadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
  animationStyle: 'smooth',
};
