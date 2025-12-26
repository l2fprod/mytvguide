import React, { useEffect, useRef, useState } from 'react'

type Props = { name?: string; icon?: string }

export default function ChannelLabel({ name, icon }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLDivElement | null>(null)
  const [fontSize, setFontSize] = useState<number | undefined>(undefined)

  useEffect(() => {
    const container = containerRef.current
    const text = textRef.current
    if (!container || !text) return

    let raf = 0
    const maxSize = 16
    const minSize = 10
    const lineHeight = 1.2

    function fits(size: number) {
      text.style.fontSize = `${size}px`
      // allow wrapping; check height and width
      const cw = container.clientWidth
      const ch = container.clientHeight
      const tw = text.scrollWidth
      const th = text.scrollHeight
      // if text width is larger than container and height exceeds, doesn't fit
      return (th <= ch && tw <= cw)
    }

    function adjust() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        // binary search between min and max
        let lo = minSize
        let hi = maxSize
        let best = minSize
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2)
          if (fits(mid)) {
            best = mid
            lo = mid + 1
          } else {
            hi = mid - 1
          }
        }
        setFontSize(best)
        text.style.fontSize = `${best}px`
      })
    }

    adjust()

    const ro = new ResizeObserver(adjust)
    ro.observe(container)
    window.addEventListener('resize', adjust)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', adjust)
    }
  }, [name])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', paddingRight: '56px', boxSizing: 'border-box' }}>
      {icon ? <img src={icon} alt={name} className="channel-icon" style={{ position: 'absolute', right: 8, top: 0, height: '64px', width: '48px', objectFit: 'contain', opacity: 0.3, padding: 4, borderRadius: 4 }} /> : null}
      <div ref={textRef} className="channel-name" style={{ fontSize: fontSize ? `${fontSize}px` : undefined, lineHeight: 1.1 }}>{name}</div>
    </div>
  )
}
