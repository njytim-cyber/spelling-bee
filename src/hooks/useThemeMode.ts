/** Dark / Light mode toggle — persisted to localStorage */
import { STORAGE_KEYS } from '../config';

export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = STORAGE_KEYS.theme;

export function loadMode(): ThemeMode {
    return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'dark';
}

export function saveMode(mode: ThemeMode) {
    localStorage.setItem(STORAGE_KEY, mode);
}

export function applyMode(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === 'light') {
        root.setAttribute('data-theme', 'light');
    } else {
        root.removeAttribute('data-theme');
    }
    // Re-derive --color-chalk from the stashed chalk-theme color
    const themeColor = root.style.getPropertyValue('--chalk-theme-color') || 'rgba(232, 229, 221, 0.95)';
    const themeColorLight = root.style.getPropertyValue('--chalk-theme-color-light') || '#1a1a2e';
    root.style.setProperty(
        '--color-chalk',
        mode === 'light' ? themeColorLight : themeColor,
    );
    // Update PWA theme-color to match
    const meta = document.getElementById('meta-theme-color');
    if (meta) meta.setAttribute('content', mode === 'dark' ? '#0f0d0c' : '#faf8f5');
}
