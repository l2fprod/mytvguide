import React from 'react'
import { useStore } from '../store'

type Props = {
  tempSelected: Set<string>
  setTempSelected: (set: Set<string>) => void
}

export default function SelectionView({ tempSelected, setTempSelected }: Props) {
  const { state } = useStore()
  const [filterCats, setFilterCats] = React.useState<Set<string>>(new Set())

  const categories = React.useMemo(() => {
    const set = new Set<string>()
    state.schedule.channels.forEach(ch => {
      (ch.categories || []).forEach((c: string) => set.add(c))
    })
    return Array.from(set).sort()
  }, [state.schedule.channels])

  const channels = React.useMemo(() => state.schedule.channels.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')), [state.schedule.channels])

  const isTempSelected = (id: string) => tempSelected.has(id)

  const toggleChannel = (id: string) => {
    const next = new Set(tempSelected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setTempSelected(next)
  }

  const toggleCategoryFilter = (cat: string) => {
    const next = new Set(filterCats)
    if (next.has(cat)) next.delete(cat)
    else next.add(cat)
    setFilterCats(next)
  }

  const filteredChannels = React.useMemo(() => {
    if (!filterCats || filterCats.size === 0) return channels
    return channels.filter(ch => (ch.categories || []).some((c: string) => filterCats.has(c)))
  }, [channels, filterCats])

  return (
    <div className="selection-view">
      <div className="selection-top">
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => toggleCategoryFilter(cat)} className={`btn ${filterCats.has(cat) ? 'selected' : ''}`}>{cat}</button>
          ))}
        </div>
      </div>

      <div className="selection-content">
        <p className="selection-desc">Select channels (use categories above to filter).</p>
        <div className="selection-list selection-grid">
          {filteredChannels.map(ch => (
            <div key={ch.id} className={`selection-item selection-card ${isTempSelected(ch.id) ? 'selected' : ''}`} onClick={() => toggleChannel(ch.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {ch.icon ? <img src={ch.icon} alt={ch.name || ch.id} className="channel-icon selection-channel-icon" /> : <div className="channel-icon selection-channel-icon" />}
                <div style={{ flex: 1 }}>
                  <div className="selection-card-title">{ch.name || ch.id}</div>
                  <div className="selection-card-meta">{(ch.categories || []).join(', ')}</div>
                </div>
              </div>
              <input className="selection-checkbox" type="checkbox" checked={isTempSelected(ch.id)} readOnly />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
