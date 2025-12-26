import React, { useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from 'react'
import { Schedule } from '../types'
import ChannelRow from './ChannelRow'

type Props = { schedule: Schedule; ppm: number }

function parseISO(s?: any) {
  if (!s) return null
  if (s instanceof Date) return s
  const str = String(s).trim()
  // format: YYYYMMDDhhmmss [+-]ZZZZ  e.g. 20251212000500 +0100
  const m = str.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{4}))?$/)
  if (m) {
    const [, Y, M, D, hh, mm, ss, tz] = m
    const tzPart = tz ? (tz.slice(0, 3) + ':' + tz.slice(3)) : 'Z'
    const iso = `${Y}-${M}-${D}T${hh}:${mm}:${ss}${tzPart}`
    const d = new Date(iso)
    if (!isNaN(d.getTime())) return d
  }
  const d2 = new Date(str)
  if (!isNaN(d2.getTime())) return d2
  return null
}
function minutesBetween(a: Date, b: Date) { return (b.getTime() - a.getTime()) / 60000 }

const Timeline = forwardRef(function Timeline({ schedule, ppm }: Props, ref) {
  const headerRef = useRef<HTMLDivElement | null>(null)
  const rightScrollRef = useRef<HTMLDivElement | null>(null)
  const labelsRef = useRef<HTMLDivElement | null>(null)
  const labelsInnerRef = useRef<HTMLDivElement | null>(null)

  const { timelineStart, timelineEnd, totalWidth } = useMemo(() => {
    const starts = schedule.channels.flatMap(c => c.programmes.map((p: any) => parseISO(p.start || p.begin || p.tstart)).filter(Boolean))
    const ends = schedule.channels.flatMap(c => c.programmes.map((p: any) => parseISO(p.end || p.stop || p.finish)).filter(Boolean))
    if (starts.length === 0) {
      const now = new Date()
      return { timelineStart: now, timelineEnd: new Date(now.getTime() + 60 * 60000), totalWidth: 800 }
    }
    const minStartMs = starts.reduce((m: number, d: Date) => Math.min(m, d.getTime()), Infinity)
    const maxEndMs = ends.reduce((M: number, d: Date) => Math.max(M, d.getTime()), -Infinity)
    const minStart = new Date(minStartMs)
    const maxEnd = new Date(maxEndMs)
    const ts = new Date(minStart.getTime() - 60 * 60000)
    const te = new Date(maxEnd.getTime() + 60 * 60000)
    const totalMinutes = Math.max(60, minutesBetween(ts, te))
    const w = Math.ceil(totalMinutes * ppm)
    return { timelineStart: ts, timelineEnd: te, totalWidth: w }
  }, [schedule, ppm])

  // sync vertical scroll from right -> left using transform for better perf
  useEffect(() => {
    const labels = labelsRef.current
    const labelsInner = labelsInnerRef.current
    const right = rightScrollRef.current
    if (!labels || !labelsInner || !right) return

    // hide native left scrollbar and drive vertical position via transform
    const prevOverflow = labels.style.overflow
    labels.style.overflow = 'hidden'

    // apply transform immediately on scroll to avoid visual lag
    const onRightScroll = () => {
      labelsInner.style.transform = `translateY(-${right.scrollTop}px)`
    }

    right.addEventListener('scroll', onRightScroll, { passive: true })
    // initialize position
    onRightScroll()

    return () => {
      right.removeEventListener('scroll', onRightScroll)
      labels.style.overflow = prevOverflow
      labelsInner.style.transform = ''
    }
  }, [labelsRef, labelsInnerRef, rightScrollRef, schedule])

  // expose scrollToNow via ref
  useImperativeHandle(ref, () => ({
    scrollToNow: () => {
      const right = rightScrollRef.current
      if (!right) return
      const now = new Date()
      const left = Math.round(minutesBetween(timelineStart, now) * ppm)
      const target = Math.max(0, left - Math.round((right.clientWidth || 0) / 2))
      try {
        right.scrollTo({ left: target, behavior: 'smooth' } as any)
      } catch (e) {
        // fallback
        right.scrollLeft = target
      }
    }
  }), [timelineStart, ppm])
  // precompute programme layout (start/end Date, left, width, color, timeRange)
  const channelsWithLayout = useMemo(() => {
    const palette = ['#8b5cf6', '#60a5fa', '#f97316', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#06b6d4']
    return schedule.channels.map(ch => ({
      ...ch,
      programmes: ch.programmes.map((p: any) => {
        const start = parseISO(p.start || p.begin || p.tstart) || new Date()
        const end = parseISO(p.end || p.stop || p.finish) || new Date(start.getTime() + 30 * 60000)
        const minsFromStart = minutesBetween(timelineStart, start)
        const durationMins = Math.max(1, minutesBetween(start, end))
        const left = Math.round(minsFromStart * ppm)
        const width = Math.max(1, Math.round(durationMins * ppm))
        const keyStr = (p.title || p.desc || '').toString()
        let hash = 0
        for (let i = 0; i < keyStr.length; i++) hash = (hash * 31 + keyStr.charCodeAt(i)) | 0
        const color = palette[Math.abs(hash) % palette.length]
        const timeRange = `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        return { ...p, _start: start, _end: end, _left: left, _width: width, _color: color, _timeRange: timeRange }
      })
    }))
  }, [schedule, timelineStart, ppm])

  const ticks = [] as Date[]
  let t = timelineStart.getTime()
  const endMs = timelineEnd.getTime()
  while (t <= endMs) {
    ticks.push(new Date(t))
    t += 60 * 60 * 1000
  }

  const now = new Date()
  const nowInRange = now.getTime() >= timelineStart.getTime() && now.getTime() <= timelineEnd.getTime()

  if (!schedule.channels || schedule.channels.length === 0) {
    return <div id="timeline">Loading...</div>
  }

  return (
    <div id="timeline">
      <div className="timeline-container">
        <div className="channels-left" ref={labelsRef}>
            <div className="timeline-header-spacer" />
            <div className="channels-left-inner" ref={labelsInnerRef}>
              {channelsWithLayout.map((ch, idx) => (
                <div key={ch.id || idx} className="channel-label">
                  {ch.icon ? <img src={ch.icon} alt={`${ch.name || ch.id} logo`} className="channel-icon" /> : null}
                  <div className="channel-name">{ch.name || ch.id}</div>
                </div>
              ))}
            </div>
        </div>

        <div className="timeline-right">
          <div className="right-scroll" ref={rightScrollRef}>
            <div className="timeline-header" ref={headerRef} style={{ width: `${totalWidth}px` }}>
              <div className="timeline-header-inner" style={{ position: 'relative', width: `${totalWidth}px` }}>
                  {ticks.map((d, i) => {
                    const left = Math.round(minutesBetween(timelineStart, d) * ppm)
                    const showDay = i === 0 || d.getDate() !== ticks[i - 1].getDate()
                    return (
                      <div key={i} className="tick" style={{ left: `${left}px` }}>
                        {showDay ? <div className="tick-day">{d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div> : <div className="tick-day" />}
                        <div className="tick-time">{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    )
                  })}

                  {/* now-marker moved out of header so it can span the full scrollable area */}
                </div>
            </div>

            <div className="channels" style={{ width: `${totalWidth}px` }}>
              {nowInRange ? (
                <div className="now-marker" style={{ left: `${Math.round(minutesBetween(timelineStart, now) * ppm)}px` }}>
                </div>
              ) : null}
              {channelsWithLayout.map((ch, idx) => (
                <ChannelRow key={ch.id || idx} channel={ch} totalWidth={totalWidth} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default Timeline
