export const BRAND_MARK_SRC = '/brand/mark.png'

export function BrandMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return <img src={BRAND_MARK_SRC} alt="" aria-hidden="true" className={`brand-mark ${className}`.trim()} width={size} height={size} decoding="async" />
}
