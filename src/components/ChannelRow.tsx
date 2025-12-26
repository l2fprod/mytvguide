import React from 'react'
import { Channel } from '../types'
import ProgramBlock from './ProgramBlock'

type Props = { channel: Channel; totalWidth: number; onSelectProgram?: (prog: any, channel?: Channel) => void }

export default function ChannelRow({ channel, totalWidth, onSelectProgram }: Props) {
  const dim = (channel as any)._hasMatchSearch === false
  return (
    <div className={`channel-row ${dim ? 'channel-row--dim' : ''}`}>
      <div className="channel-track" style={{ width: `${totalWidth}px` }}>
        {channel.programmes.map((p, i) => (
          <ProgramBlock key={i} prog={p} onSelect={(prog) => onSelectProgram && onSelectProgram(prog, channel)} />
        ))}
      </div>
    </div>
  )
}
