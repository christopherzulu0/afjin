'use client'

import { useEffect, useRef, useState } from 'react'

const categories: { label: string; emoji: string[] }[] = [
  { label: 'Smileys', emoji: ['😀', '😄', '😂', '🥹', '😊', '😍', '🥰', '😘', '😉', '😎', '🤔', '😮', '😢', '😭', '😅', '🙃', '😴', '🤗'] },
  { label: 'Gestures', emoji: ['👍', '👎', '👏', '🙌', '🙏', '🤝', '👋', '💪', '✌️', '🤞', '👌', '🫶'] },
  { label: 'Hearts', emoji: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💕', '💖', '✨', '🔥', '⭐'] },
  { label: 'Moments', emoji: ['☕', '🍰', '🎉', '🎂', '🎁', '🌍', '✈️', '🏠', '🌸', '☀️', '🌙', '📷'] },
]

export function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const [category, setCategory] = useState(0)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gridRef.current?.querySelector('button')?.focus()
  }, [])

  return (
    <div
      className="emoji-picker"
      role="dialog"
      aria-label="Emoji picker"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <div className="emoji-tabs" role="tablist">
        {categories.map((item, index) => (
          <button
            type="button"
            role="tab"
            key={item.label}
            aria-selected={category === index}
            className={category === index ? 'active' : ''}
            onClick={() => setCategory(index)}
          >
            {item.emoji[0]} <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="emoji-grid" ref={gridRef} role="tabpanel" aria-label={categories[category].label}>
        {categories[category].emoji.map((emoji) => (
          <button type="button" key={emoji} aria-label={`Insert ${emoji}`} onClick={() => onPick(emoji)}>{emoji}</button>
        ))}
      </div>
    </div>
  )
}
