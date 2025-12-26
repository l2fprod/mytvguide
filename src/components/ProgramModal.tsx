import React from 'react'

type Props = {
  open: boolean
  onClose: () => void
  prog?: any
  channelName?: string
}

export default function ProgramModal({ open, onClose, prog, channelName }: Props) {
  if (!open || !prog) return null
  const timeRange = prog._timeRange || ''
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <div className="modal-header">
          <div className="modal-channel">{channelName}</div>
          <h2 className="modal-title">{prog.title}</h2>
          <div className="modal-time">{timeRange}</div>
        </div>
        <div className="modal-body">
          {prog.desc ? <p>{prog.desc}</p> : <p>No description available.</p>}
        </div>
      </div>
    </div>
  )
}
