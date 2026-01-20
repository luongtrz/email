import { create } from 'zustand';

interface ThemeState {
    isDark: boolean;
    toggleTheme: () => void;
    setDark: (isDark: boolean) => void;
}

// Apply theme to document and localStorage
const applyTheme = (isDark: boolean) => {
    if (typeof document !== 'undefined') {
        console.log('[Theme] Applying theme:', isDark ? 'dark' : 'light');
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        console.log('[Theme] HTML classes after apply:', document.documentElement.className);
    }
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme-dark', isDark ? 'true' : 'false');
    }
};

// Get initial theme from localStorage or default to TRUE (dark mode default)
const getInitialTheme = (): boolean => {
    if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem('theme-dark');
        if (stored !== null) {
            return stored === 'true';
        }
    }
    // Default to dark mode
    return true;
};

// Initialize dark class on page load IMMEDIATELY
const initialIsDark = getInitialTheme();
console.log('[Theme] Initial theme from localStorage:', initialIsDark ? 'dark' : 'light');

// Apply immediately when this module is loaded
applyTheme(initialIsDark);

export const useThemeStore = create<ThemeState>((set) => ({
    isDark: initialIsDark,
    toggleTheme: () => {
        set((state) => {
            const newIsDark = !state.isDark;
            applyTheme(newIsDark);
            return { isDark: newIsDark };
        });
    },
    setDark: (isDark: boolean) => {
        applyTheme(isDark);
        set({ isDark });
    },
}));
