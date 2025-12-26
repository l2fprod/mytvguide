import React, { useEffect, useState, useRef } from 'react'
import { useStore } from './store'
import './styles.css'
import SelectionView from './components/SelectionView'
import ScheduleView from './components/ScheduleView'
import Toolbar from './components/Toolbar'

export default function App() {
  const { loadChannels, state, clearSelectedChannels } = useStore()
  const [editing, setEditing] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')
  const [ppm, setPpm] = useState<number>(2)
  const timelineRef = useRef<any>(null)

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  const hasSelection = !!(state.selectedChannelIds && state.selectedChannelIds.size > 0)
  const showSchedule = hasSelection && !editing

  return (
    <div>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
          <img src="logo.svg" alt="TV Guide Logo" style={{ width: '32px', height: '32px' }} />
          {showSchedule && (
            <Toolbar
              search={search}
              setSearch={setSearch}
              ppm={ppm}
              setPpm={setPpm}
              onNow={() => timelineRef.current?.scrollToNow?.()}
              onEdit={() => setEditing(true)}
              allCategories={state.allCategories}
              selectedCategories={new Set()}
              addSelectedCategory={() => {}}
              removeSelectedCategory={() => {}}
            />
          )}
        </div>
      </header>
      <main>
        {!showSchedule ? (
          <SelectionView onComplete={() => setEditing(false)} />
        ) : (
          <ScheduleView 
            onEdit={() => setEditing(true)} 
            search={search}
            setSearch={setSearch}
            ppm={ppm}
            setPpm={setPpm}
            timelineRef={timelineRef}
          />
        )}
      </main>
    </div>
  )
}
