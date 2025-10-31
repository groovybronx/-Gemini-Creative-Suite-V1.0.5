import type { Theme } from './types';

export const themes: Record<string, Theme> = {
  dark: {
    name: 'Dark Mode',
    colors: {
      'base-bg': '#1a1a1a',
      'component-bg': '#2a2a2a',
      'border-color': '#444444',
      'text-primary': '#e0e0e0',
      'text-secondary': '#a0a0a0',
      'accent-khaki': '#8F9779',
      'accent-yellow': '#F2C94C',
      'accent-orange': '#F2994A',
    },
  },
  light: {
    name: 'Light Mode',
    colors: {
      'base-bg': '#f5f5f5',
      'component-bg': '#ffffff',
      'border-color': '#e0e0e0',
      'text-primary': '#212121',
      'text-secondary': '#757575',
      'accent-khaki': '#689f38',
      'accent-yellow': '#fbc02d',
      'accent-orange': '#f57c00',
    },
  },
  'high-contrast': {
    name: 'High Contrast',
    colors: {
      'base-bg': '#000000',
      'component-bg': '#1c1c1c',
      'border-color': '#878787',
      'text-primary': '#ffffff',
      'text-secondary': '#dcdcdc',
      'accent-khaki': '#00ff7f',
      'accent-yellow': '#ffff00',
      'accent-orange': '#ff8c00',
    },
  },
};