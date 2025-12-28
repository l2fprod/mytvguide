import React from 'react'
import { Clock, Settings, RefreshCw } from 'lucide-react'
import { useStore } from '../store'

type Props = {
  search: string
  setSearch: (s: string) => void
  ppm: number
  setPpm: (n: number) => void
  onNow?: () => void
  onEdit?: () => void
  allCategories: Set<string>
  selectedCategories: Set<string>
  addSelectedCategory: (category: string) => void
  removeSelectedCategory: (category: string) => void
}

export default function Toolbar({ search, setSearch, ppm, setPpm, onNow, onEdit, allCategories, selectedCategories, addSelectedCategory, removeSelectedCategory }: Props) {
  const { ensureSelectedChannelsLoaded } = useStore()
  return (
    <div id="timeline-controls">
      <label>
        <input id="search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
      </label>
      <button type="button" onClick={() => onNow && onNow()} className="btn" title="Go to current time">
        <Clock size={16} />
      </button>
      <button
        type="button"
        onClick={() => ensureSelectedChannelsLoaded && ensureSelectedChannelsLoaded(true)}
        className="btn"
        title="Reload selected channels (no cache)"
      >
        <RefreshCw size={16} />
      </button>
      {onEdit ? <button type="button" onClick={() => onEdit && onEdit()} className="btn" title="Select channels">
        <Settings size={16} />
      </button> : null}
    </div>
  )
}
