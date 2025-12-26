import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '../store'
import Toolbar from './Toolbar'
import Timeline from './Timeline'

export default function ScheduleView({ onEdit }: { onEdit?: () => void }) {
  const { state, loadProgrammesForChannels } = useStore()
  const [ppm, setPpm] = useState<number>(2)
  const [search, setSearch] = useState<string>('')
  const timelineRef = useRef<any>(null)
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
      <Toolbar
        search={search}
        setSearch={setSearch}
        ppm={ppm}
        setPpm={setPpm}
        onNow={() => timelineRef.current?.scrollToNow?.()}
        onEdit={() => onEdit && onEdit()}
        allCategories={state.allCategories}
        selectedCategories={new Set()}
        addSelectedCategory={() => {}}
        removeSelectedCategory={() => {}}
      />
      <Timeline ref={timelineRef} schedule={filteredSchedule} ppm={ppm} />
    </div>
  )
}
