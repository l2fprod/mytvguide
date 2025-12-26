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
        <input id="search" type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" />
      </label>
      <button type="button" onClick={() => onNow && onNow()} className="btn">Now</button>
      {onEdit ? <button type="button" onClick={() => onEdit && onEdit()} className="btn">Change selection</button> : null}
    </div>
  )
}
