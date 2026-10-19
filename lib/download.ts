// Voice notes are stored as "Voice message", so give them an extension from the file type.
function withExtension(name: string, type: string) {
  if (/\.[a-z0-9]{2,5}$/i.test(name)) return name
  const subtype = type.split('/')[1]?.split(';')[0]
  return subtype ? `${name}.${subtype === 'mpeg' ? 'mp3' : subtype}` : name
}

// Convex storage URLs are cross-origin, so the browser ignores <a download> on them.
// Fetching into a Blob first lets the file save under its original name.
export async function downloadAttachment(url: string, name: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Download failed (${response.status})`)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = withExtension(name || 'attachment', blob.type)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000)
    return 'downloaded' as const
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
    return 'opened' as const
  }
}
