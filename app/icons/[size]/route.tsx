import { ImageResponse } from 'next/og'

const SIZES: Record<string, { size: number; maskable: boolean }> = {
  '192': { size: 192, maskable: false },
  '512': { size: 512, maskable: false },
  maskable: { size: 512, maskable: true },
}

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: key } = await params
  const icon = SIZES[key]
  if (!icon) return new Response('Not found', { status: 404 })
  const { size, maskable } = icon
  // Maskable icons keep the mark inside the central 80% safe zone.
  const mark = Math.round(size * (maskable ? 0.5 : 0.68))

  return new ImageResponse(
    (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: '#061F28' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: mark,
            height: mark,
            borderRadius: Math.round(mark * 0.28),
            background: 'linear-gradient(180deg, #F0C467, #C89536)',
            color: '#061F28',
            fontSize: Math.round(mark * 0.56),
            fontWeight: 700,
          }}
        >
          A
        </div>
      </div>
    ),
    { width: size, height: size },
  )
}
