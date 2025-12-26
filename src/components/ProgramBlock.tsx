import React from 'react'
import { Programme } from '../types'

type Props = { prog: Programme & { _left?: number; _width?: number; _color?: string; _timeRange?: string }, onSelect?: (prog: any) => void }

function ProgramBlock({ prog, onSelect }: Props) {
  const left = (prog as any)._left ?? 0
  const width = (prog as any)._width ?? 1
  const color = (prog as any)._color ?? 'var(--accent)'
  const timeRange = (prog as any)._timeRange ?? ''

  return (
    <div
      className={`prog ${((prog as any)._matchesSearch === false) ? 'prog--dim' : ''}`}
      data-accent
      style={{ left: `${left}px`, width: `${width}px`, ['--accent' as any]: color }}
      title={prog.title + (prog.desc ? '\n' + prog.desc : '')}
      onClick={() => onSelect && onSelect(prog)}
    >
      <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:4}}>
        <div style={{fontSize:13,lineHeight:1.05}}>{prog.title}</div>
        <div className="sub" style={{fontSize:11,opacity:0.9}}>{timeRange}</div>
      </div>
    </div>
  )
}

export default React.memo(ProgramBlock)
