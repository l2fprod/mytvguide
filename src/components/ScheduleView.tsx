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
    let channels = state.schedule.channels
    channels = channels.filter(c => selectedChannelIds.includes(c.id))
    if (search) {
      const s = search.toLowerCase()
      channels = channels.filter(c => (c.name || '').toLowerCase().includes(s) || (c.id || '').toLowerCase().includes(s))
    }
    return { channels }
  }, [state.schedule, selectedChannelIds, search])
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Timeline ref={timelineRef} schedule={filteredSchedule} ppm={ppm} />
    </div>
  )
}
