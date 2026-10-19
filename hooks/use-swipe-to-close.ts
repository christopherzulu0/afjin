'use client'

import { useEffect, type RefObject } from 'react'

const MIN_DISTANCE = 60
const MAX_DRIFT = 50

/** Calls `onClose` when the user swipes the element towards `direction`. */
export function useSwipeToClose(ref: RefObject<HTMLElement | null>, direction: 'left' | 'right', enabled: boolean, onClose: () => void) {
  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return
    let start: { x: number; y: number } | null = null
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0]
      start = touch ? { x: touch.clientX, y: touch.clientY } : null
    }
    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (!start || !touch) return
      const dx = touch.clientX - start.x
      const dy = Math.abs(touch.clientY - start.y)
      start = null
      if (dy > MAX_DRIFT) return
      if ((direction === 'left' && dx < -MIN_DISTANCE) || (direction === 'right' && dx > MIN_DISTANCE)) onClose()
    }
    element.addEventListener('touchstart', onStart, { passive: true })
    element.addEventListener('touchend', onEnd)
    return () => {
      element.removeEventListener('touchstart', onStart)
      element.removeEventListener('touchend', onEnd)
    }
  }, [ref, direction, enabled, onClose])
}
