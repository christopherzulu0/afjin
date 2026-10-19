'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import type { ThemePreference } from '@/lib/theme'

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
]

type ThemeToggleProps = {
  /** Use `menuitemradio` when the toggle sits inside a role="menu". */
  itemRole?: 'radio' | 'menuitemradio'
  className?: string
}

export function ThemeToggle({ itemRole = 'radio', className = '' }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme()
  return (
    <div className={`theme-switch ${className}`.trim()} role={itemRole === 'radio' ? 'radiogroup' : 'group'} aria-label="Theme">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          type="button"
          role={itemRole}
          key={value}
          aria-checked={preference === value}
          aria-label={`${label} theme`}
          title={label}
          className={preference === value ? 'is-active' : ''}
          onClick={() => setPreference(value)}
        >
          <Icon aria-hidden />
        </button>
      ))}
    </div>
  )
}
