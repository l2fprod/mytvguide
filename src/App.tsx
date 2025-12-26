import React, { useEffect, useState, useRef } from 'react'
import { useStore } from './store'
import './styles.css'
import SelectionView from './components/SelectionView'
import ScheduleView from './components/ScheduleView'
import Toolbar from './components/Toolbar'

export default function App() {
  const { loadChannels, state, clearSelectedChannels, setSelectedChannels } = useStore()
  const [editing, setEditing] = useState<boolean>(false)
  const [search, setSearch] = useState<string>('')
  const [ppm, setPpm] = useState<number>(2)
  const [tempSelected, setTempSelected] = useState<Set<string>>(new Set(Array.from(state.selectedChannelIds || [])))
  const timelineRef = useRef<any>(null)

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  useEffect(() => {
    setTempSelected(new Set(Array.from(state.selectedChannelIds || [])))
  }, [state.selectedChannelIds])

  const hasSelection = !!(state.selectedChannelIds && state.selectedChannelIds.size > 0)
  const showSchedule = hasSelection && !editing

  const applySelection = () => {
    setSelectedChannels(new Set(tempSelected))
    setEditing(false)
  }

  const clearSelection = () => {
    setTempSelected(new Set())
  }

  return (
    <div>
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%' }}>
          <img src="logo.svg" alt="TV Guide Logo" style={{ width: '32px', height: '32px' }} />
          {showSchedule ? (
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
          ) : (
            <div style={{ display: 'flex', gap: '8px', marginRight: 'auto' }}>
              <button onClick={applySelection} disabled={tempSelected.size === 0} className="btn primary">View schedule</button>
              <button onClick={clearSelection} className="btn destructive">Clear</button>
            </div>
          )}
        </div>
      </header>
      <main>
        {!showSchedule ? (
          <SelectionView 
            tempSelected={tempSelected}
            setTempSelected={setTempSelected}
          />
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
