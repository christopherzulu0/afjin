'use client'

import { useEffect } from 'react'

/** Tracks the visual viewport so the chat shrinks above the on-screen keyboard on iOS Safari. */
export function useViewportHeight() {
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const root = document.documentElement
    const update = () => {
      root.style.setProperty('--app-height', `${Math.round(viewport.height)}px`)
      if (viewport.offsetTop) window.scrollTo(0, 0)
    }
    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      root.style.removeProperty('--app-height')
    }
  }, [])
}
