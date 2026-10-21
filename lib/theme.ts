export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'afjini:theme'
export const DEFAULT_THEME: ThemePreference = 'dark'
export const THEME_COLORS: Record<ResolvedTheme, string> = { dark: '#0b0809', light: '#f6f4f4' }

/** Runs before first paint so the page never flashes the wrong theme. Dark unless the person chose otherwise. */
export const themeBootScript = `(function(){var t='dark';try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');t=p==='light'?'light':p==='system'&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}catch(e){}document.documentElement.dataset.theme=t;var c=t==='dark'?'${THEME_COLORS.dark}':'${THEME_COLORS.light}';var s=function(){document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){m.content=c;});};s();document.addEventListener('DOMContentLoaded',s);})();`

export function readPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference)
  document.documentElement.dataset.theme = theme
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = THEME_COLORS[theme]
  })
  return theme
}
