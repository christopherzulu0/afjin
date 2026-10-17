type AvatarProps = { initials: string; color: string; imageUrl?: string | null; online?: boolean; small?: boolean }

export function Avatar({ initials, color, imageUrl, online, small = false }: AvatarProps) {
  return (
    <div className={`avatar avatar-${color} ${small ? 'avatar-small' : ''}`} aria-hidden>
      {imageUrl ? <img src={imageUrl} alt="" className="avatar-image" /> : initials}
      {online && <span className="online-dot" />}
    </div>
  )
}
