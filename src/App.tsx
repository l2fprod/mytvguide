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
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="logo.svg" alt="TV Guide Logo" style={{ width: '64px', height: '64px' }} />
          <h1 style={{ marginLeft: '16px', margin: 0 }}>TV Schedule</h1>
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
