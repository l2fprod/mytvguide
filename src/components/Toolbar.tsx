import React from 'react'

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
  return (
    <div id="timeline-controls">
      <label>
        Search channels: <input id="search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter channels" />
      </label>
      <label>
        Pixels / minute: <input id="ppm" type="range" min="1" max="6" value={ppm} onChange={e => setPpm(Number(e.target.value))} />
      </label>
      <button type="button" onClick={() => onNow && onNow()} style={{ marginLeft: 12 }}>Now</button>
      {onEdit ? <button type="button" onClick={() => onEdit && onEdit()} style={{ marginLeft: 8 }}>Change selection</button> : null}
    </div>
  )
}
