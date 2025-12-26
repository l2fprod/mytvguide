import React, { useEffect, useMemo } from 'react'
import { useStore } from '../store'
import Timeline from './Timeline'

type Props = {
  onEdit?: () => void
  search: string
  setSearch: (s: string) => void
  ppm: number
  setPpm: (n: number) => void
  timelineRef: React.RefObject<any>
}

export default function ScheduleView({ onEdit, search, setSearch, ppm, setPpm, timelineRef }: Props) {
  const { state, loadProgrammesForChannels } = useStore()
  const selectedChannelIds = useMemo(() => Array.from(state.selectedChannelIds || []), [state.selectedChannelIds])

  useEffect(() => {
    const toLoad = selectedChannelIds.filter(id => !state.loadedChannelIds.has(id))
    if (toLoad.length > 0) {
      loadProgrammesForChannels(toLoad)
    }
  }, [selectedChannelIds, state.loadedChannelIds, loadProgrammesForChannels])

  const filteredSchedule = useMemo(() => {
    const s = (search || '').toLowerCase()
    const channels = state.schedule.channels
      .filter(c => selectedChannelIds.includes(c.id))
      .map(c => {
        // annotate each programme with a match flag; do not remove programmes or channels
        const programmes = (c.programmes || []).map(p => {
          if (!s) return { ...p, _matchesSearch: true }
          const title = (p.title || p.name || '').toLowerCase()
          const desc = (p.desc || p.description || '').toLowerCase()
          const matches = title.includes(s) || desc.includes(s)
          return { ...p, _matchesSearch: matches }
        })
        const hasMatch = (programmes || []).some((p: any) => p._matchesSearch)
        return { ...c, programmes, _hasMatchSearch: hasMatch }
      })
    return { channels }
  }, [state.schedule, selectedChannelIds, search])
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Timeline ref={timelineRef} schedule={filteredSchedule} ppm={ppm} />
    </div>
  )
}
