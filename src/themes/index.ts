import { Theme } from '../types';
import { defaultTheme } from './default';
import { darkTheme } from './dark';
import { vibrantTheme } from './vibrant';
import { minimalTheme } from './minimal';

/** All available themes keyed by id */
export const themes: Record<string, Theme> = {
  default: defaultTheme,
  dark: darkTheme,
  vibrant: vibrantTheme,
  minimal: minimalTheme,
};

/** Get a theme by id, falling back to default */
export function getTheme(id: string): Theme {
  return themes[id] ?? themes.default;
}

/** List all theme ids */
export function listThemes(): string[] {
  return Object.keys(themes);
}

/** Get all themes as an array */
export function getAllThemes(): Theme[] {
  return Object.values(themes);
}

export { defaultTheme, darkTheme, vibrantTheme, minimalTheme };
