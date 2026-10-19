'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { useDismiss } from './use-dismiss'

const ITEM_SELECTOR = '[role^="menuitem"]:not([disabled])'
const NEXT_KEYS = new Set(['ArrowDown', 'ArrowRight'])
const PREVIOUS_KEYS = new Set(['ArrowUp', 'ArrowLeft'])

/**
 * Menu behaviour for a container holding a trigger (with aria-expanded) and a [role="menu"]:
 * outside click and Escape close it, arrow keys/Home/End move between items, and focus
 * returns to the trigger when the menu closes while it had focus.
 */
export function useMenu(ref: RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useDismiss(ref, open, onClose)
  const wasOpen = useRef(false)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    if (!open) {
      if (!wasOpen.current) return
      wasOpen.current = false
      const active = document.activeElement
      if (!active || active === document.body) container.querySelector<HTMLElement>('[aria-expanded]')?.focus()
      return
    }

    wasOpen.current = true
    const menu = container.querySelector<HTMLElement>('[role="menu"]')
    if (!menu) return
    const items = () => [...menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR)]
    const frame = window.requestAnimationFrame(() => items()[0]?.focus())

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        onClose()
        return
      }
      const list = items()
      if (!list.length) return
      const index = list.indexOf(document.activeElement as HTMLElement)
      let next = -1
      if (NEXT_KEYS.has(event.key)) next = (index + 1) % list.length
      else if (PREVIOUS_KEYS.has(event.key)) next = (index - 1 + list.length) % list.length
      else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = list.length - 1
      if (next < 0) return
      event.preventDefault()
      list[next].focus()
    }
    menu.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      menu.removeEventListener('keydown', onKeyDown)
    }
  }, [ref, open, onClose])
}
