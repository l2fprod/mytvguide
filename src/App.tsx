import React, { useEffect, useState } from 'react'
import { useStore } from './store'
import './styles.css'
import SelectionView from './components/SelectionView'
import ScheduleView from './components/ScheduleView'

export default function App() {
  const { loadChannels, state, clearSelectedChannels } = useStore()
  const [editing, setEditing] = useState<boolean>(false)

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  const hasSelection = !!(state.selectedChannelIds && state.selectedChannelIds.size > 0)
  const showSchedule = hasSelection && !editing

  return (
    <div>
      <header>
        <div>
          <h1>TV Schedule</h1>
          <p>Visual schedule from public/data/channels.json</p>
        </div>
      </header>
      <main>
        {!showSchedule ? (
          <SelectionView onComplete={() => setEditing(false)} />
        ) : (
          <ScheduleView onEdit={() => setEditing(true)} />
        )}
      </main>
    </div>
  )
}
