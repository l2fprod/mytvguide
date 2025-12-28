import React, { useEffect, useMemo, useRef, useImperativeHandle, forwardRef, useState } from 'react'
import { Schedule } from '../types'
import ChannelRow from './ChannelRow'
import ChannelLabel from './ChannelLabel'
import ProgramModal from './ProgramModal'

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
function minutesBetween(a?: Date | null, b?: Date | null) {
  if (!a || !b) return 0
  return (b.getTime() - a.getTime()) / 60000
}

const Timeline = forwardRef(function Timeline({ schedule, ppm }: Props, ref) {
  const headerRef = useRef<HTMLDivElement | null>(null)
  const rightScrollRef = useRef<HTMLDivElement | null>(null)
  const labelsRef = useRef<HTMLDivElement | null>(null)
  const labelsInnerRef = useRef<HTMLDivElement | null>(null)
  const headerInnerRef = useRef<HTMLDivElement | null>(null)

  const [selectedProg, setSelectedProg] = useState<{ prog: any; channelName?: string } | null>(null)

  // memoized, case-insensitive alphabetical sort of channels
  const sortedChannels = useMemo(() => {
    const arr = Array.isArray(schedule.channels) ? [...schedule.channels] : []
    arr.sort((a: any, b: any) => {
      const aKey = ((a && (a.name || a.id)) || '').toString().toLowerCase()
      const bKey = ((b && (b.name || b.id)) || '').toString().toLowerCase()
      return aKey.localeCompare(bKey)
    })
    return arr
  }, [schedule])

  // current time that updates every minute (aligned to minute boundary)
  const [now, setNow] = useState<Date>(new Date())
  useEffect(() => {
    setNow(new Date())
    let intervalId: ReturnType<typeof setInterval> | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const ms = new Date()
    const delay = 60000 - (ms.getSeconds() * 1000 + ms.getMilliseconds())
    // first tick aligned to next minute
    timeoutId = setTimeout(() => {
      setNow(new Date())
      intervalId = setInterval(() => setNow(new Date()), 60000)
    }, delay)
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (intervalId) clearInterval(intervalId as unknown as number)
    }
  }, [])
  const { timelineStart, timelineEnd, totalWidth } = useMemo(() => {
    const channelsArr = sortedChannels
    const starts = channelsArr.flatMap(c => (c.programmes || []).map((p: any) => parseISO(p.start || p.begin || p.tstart)).filter(Boolean))
    const ends = channelsArr.flatMap(c => (c.programmes || []).map((p: any) => parseISO(p.end || p.stop || p.finish)).filter(Boolean))
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
  }, [sortedChannels, ppm])

  // sync vertical scroll from right -> left using transform for better perf
  useEffect(() => {
    const labels = labelsRef.current
    const labelsInner = labelsInnerRef.current
    const right = rightScrollRef.current
    const headerInner = headerInnerRef.current
    if (!labels || !labelsInner || !right || !headerInner) return

    // hide native left scrollbar and drive positions via transform for better perf
    const prevOverflow = labels.style.overflow
    labels.style.overflow = 'hidden'

    // use rAF to batch and ensure continuous updates (fixes intermittent stops)
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        try {
          labelsInner.style.transform = `translateY(-${right.scrollTop}px)`
          headerInner.style.transform = `translateX(-${right.scrollLeft}px)`
        } finally {
          ticking = false
        }
      })
    }

    right.addEventListener('scroll', onScroll, { passive: true })
    // initialize position
    onScroll()

    return () => {
      right.removeEventListener('scroll', onScroll)
      labels.style.overflow = prevOverflow
      labelsInner.style.transform = ''
      headerInner.style.transform = ''
    }
  }, [labelsRef, labelsInnerRef, rightScrollRef, headerInnerRef, schedule])

  // sync horizontal scroll: move header in sync with right scroll
  useEffect(() => {
    const right = rightScrollRef.current
    const headerInner = headerInnerRef.current
    if (!right || !headerInner) return

    const onRightScrollH = () => {
      headerInner.style.transform = `translateX(-${right.scrollLeft}px)`
    }

    right.addEventListener('scroll', onRightScrollH, { passive: true })
    onRightScrollH()

    return () => {
      right.removeEventListener('scroll', onRightScrollH)
      headerInner.style.transform = ''
    }
  }, [rightScrollRef, headerInnerRef, /* totalWidth intentionally not required here */])

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
    const channelsArr = sortedChannels
    return channelsArr.map(ch => ({
      ...ch,
      programmes: (ch.programmes || []).map((p: any) => {
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
  }, [sortedChannels, timelineStart, ppm])

  const ticks = [] as Date[]
  let t = timelineStart.getTime()
  const endMs = timelineEnd.getTime()
  while (t <= endMs) {
    ticks.push(new Date(t))
    t += 60 * 60 * 1000
  }

  const nowInRange = now.getTime() >= timelineStart.getTime() && now.getTime() <= timelineEnd.getTime()

  if (sortedChannels.length === 0) {
    return <div id="timeline"></div>
  }

  

  return (
    <div id="timeline">
      <div className="timeline-header" ref={headerRef}>
        <div className="timeline-header-inner" ref={headerInnerRef} style={{ position: 'relative', width: `${totalWidth}px`, marginLeft: 'var(--channel-width)' }}>
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
        </div>
      </div>

      <div className="timeline-container">
        <div className="channels-left" ref={labelsRef}>
            <div className="channels-left-inner" ref={labelsInnerRef}>
              {channelsWithLayout.map((ch, idx) => (
                <div key={ch.id || idx} className={`channel-label ${(ch as any)._hasMatchSearch === false ? 'channel-label--dim' : ''}`}>
                  <ChannelLabel name={ch.name || ch.id} icon={ch.icon} />
                </div>
              ))}
            </div>
        </div>

        <div className="timeline-right">
          <div className="right-scroll" ref={rightScrollRef}>
            <div className="channels" style={{ width: `${totalWidth}px` }}>
              {nowInRange ? (
                <div className="now-marker" style={{ left: `${Math.round(minutesBetween(timelineStart, now) * ppm)}px` }}>
                </div>
              ) : null}
              <div className="channels-inner">
                {channelsWithLayout.map((ch, idx) => (
                  <ChannelRow key={ch.id || idx} channel={ch} totalWidth={totalWidth} onSelectProgram={(prog) => setSelectedProg({ prog, channelName: ch.name })} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <ProgramModal open={!!selectedProg} prog={selectedProg?.prog} channelName={selectedProg?.channelName} onClose={() => setSelectedProg(null)} />
    </div>
  )
})

export default Timeline
