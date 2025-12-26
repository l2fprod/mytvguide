export interface Programme {
  title: string
  desc?: string
  start?: string
  end?: string
  [key: string]: any
}

export interface Channel {
  id: string
  name: string
  icon?: string
  categories?: string[]
  programmes: Programme[]
}

export interface Schedule {
  channels: Channel[]
}
