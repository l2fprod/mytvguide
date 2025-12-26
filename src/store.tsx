import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect } from 'react'
import { Schedule, Channel, Programme } from './types'

interface StoreState {
  schedule: Schedule
  loading: boolean
  error: string | null
  channelsLoaded: boolean
  loadedChannelIds: Set<string>
  allCategories: Set<string>
  // persisted selection: ONLY selected channel ids
  selectedChannelIds: Set<string>
}

type StoreAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SCHEDULE'; payload: Schedule }
  | { type: 'SET_CHANNELS_LOADED'; payload: boolean }
  | { type: 'ADD_CHANNEL_PROGRAMMES'; payload: { channelId: string; programmes: Programme[] } }
  | { type: 'SET_SELECTED_CHANNELS'; payload: Set<string> }
  | { type: 'ADD_SELECTED_CHANNEL'; payload: string }
  | { type: 'REMOVE_SELECTED_CHANNEL'; payload: string }
  | { type: 'CLEAR_SELECTED_CHANNELS' }

const initialState: StoreState = {
  schedule: { channels: [] },
  loading: false,
  error: null,
  channelsLoaded: false,
  loadedChannelIds: new Set(),
  allCategories: new Set(),
  selectedChannelIds: new Set()
}

function storeReducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'SET_SCHEDULE':
      return { ...state, schedule: action.payload, loading: false, error: null, channelsLoaded: true }
    case 'SET_CHANNELS_LOADED':
      return { ...state, channelsLoaded: action.payload }
    case 'ADD_CHANNEL_PROGRAMMES':
      const newCategories = new Set(action.payload.programmes.flatMap(p => p.categories || []).filter(cat => !cat.includes('://')))
      return {
        ...state,
        schedule: {
          ...state.schedule,
          channels: state.schedule.channels.map(ch =>
            ch.id === action.payload.channelId
              ? { ...ch, programmes: action.payload.programmes }
              : ch
          )
        },
        loadedChannelIds: new Set([...state.loadedChannelIds, action.payload.channelId]),
        allCategories: new Set([...state.allCategories, ...newCategories])
      }
    case 'SET_SELECTED_CHANNELS':
      return { ...state, selectedChannelIds: action.payload }
    case 'ADD_SELECTED_CHANNEL': {
      const next = new Set(state.selectedChannelIds || [])
      next.add(action.payload)
      return { ...state, selectedChannelIds: next }
    }
    case 'REMOVE_SELECTED_CHANNEL': {
      const next = new Set(state.selectedChannelIds || [])
      next.delete(action.payload)
      return { ...state, selectedChannelIds: next }
    }
    case 'CLEAR_SELECTED_CHANNELS':
      return { ...state, selectedChannelIds: new Set() }
    default:
      return state
  }
}

interface StoreContextType {
  state: StoreState
  loadChannels: () => Promise<void>
  loadProgrammesForChannels: (channelIds: string[]) => Promise<void>
  // selection API: only selected channel ids are stored/persisted
  setSelectedChannels: (ids: Set<string>) => void
  addSelectedChannel: (id: string) => void
  removeSelectedChannel: (id: string) => void
  clearSelectedChannels: () => void
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

function safeFilename(id?: string) {
  return ((id || '').toLowerCase()).replace(/[^a-z0-9._-]/g, '_')
}

const BATCH_SIZE = 50

async function loadJSON<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to load ' + url + ' (' + res.status + ')')
  return res.json()
}

function parsePossibleDate(s?: string | null) {
  if (!s) return null
  // try native parse first
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d
  // try xmltv format: YYYYMMDDhhmmss [+-]ZZZZ
  const m = (s || '').trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([+-]\d{4}))?$/)
  if (!m) return null
  const [_, Y, M, D, h, min, sec, tz] = m
  // create UTC millis then apply timezone offset if present
  const year = parseInt(Y, 10)
  const month = parseInt(M, 10) - 1
  const day = parseInt(D, 10)
  const hour = parseInt(h, 10)
  const minute = parseInt(min, 10)
  const second = parseInt(sec, 10)
  let ms = Date.UTC(year, month, day, hour, minute, second)
  if (tz) {
    // tz like +0100 => offset minutes = 60
    const sign = tz[0] === '+' ? 1 : -1
    const tzHours = parseInt(tz.substr(1,2), 10)
    const tzMins = parseInt(tz.substr(3,2), 10)
    const offsetMin = sign * (tzHours * 60 + tzMins)
    ms -= offsetMin * 60000
  }
  return new Date(ms)
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(storeReducer, initialState)

  const STORAGE_KEY = 'tvguide.selection'
  // persist only selected channel ids
  const persistSelection = useCallback((values: Set<string>) => {
    try {
      const payload = { values: Array.from(values) }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (e) {
      console.warn('Failed to persist selection', e)
    }
  }, [])

  // initialize persisted selection on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed) {
          const values = new Set<string>(Array.isArray(parsed.values) ? parsed.values : [])
          dispatch({ type: 'SET_SELECTED_CHANNELS', payload: values })
        }
      }
    } catch (e) {
      console.warn('Failed to read persisted selection', e)
    }
  }, [])

  const loadProgrammesForChannels = useCallback(async (channelIds: string[]) => {
    for (let i = 0; i < channelIds.length; i += BATCH_SIZE) {
      const batch = channelIds.slice(i, i + BATCH_SIZE)
      const promises = batch.map(async (channelId) => {
        try {
          const safe = safeFilename(channelId)
          const data = await loadJSON<any>(`./data/channels/channel-${safe}.json`)
          const rawProgrammes = data.programmes || data.programs || []
          const now = new Date()
          const maxFuture = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
          // const MAX_MS = 5 * 60 * 60 * 1000 // 3 hours
          let skippedLongCount = 0
          const programmes = (rawProgrammes as any[]).filter(p => {
            const end = parsePossibleDate(p.end || p.stop || p.finish)
            const start = parsePossibleDate(p.start || p.begin || p.tstart)
            // discard if end exists and is before now
            if (end && end.getTime() < now.getTime()) return false
            // discard if start exists and is after maxFuture (more than 3 days ahead)
            if (start && start.getTime() > maxFuture.getTime()) return false
            // discard if we can compute duration and it's longer than 3 hours
            // if (start && end) {
            //   const dur = end.getTime() - start.getTime()
            //   if (dur > MAX_MS) {
            //     skippedLongCount += 1
            //     return false
            //   }
            // }
            return true
          })
          if (skippedLongCount > 0) console.debug(`Skipped ${skippedLongCount} programmes >3h for channel ${channelId}`)
          dispatch({ type: 'ADD_CHANNEL_PROGRAMMES', payload: { channelId, programmes } })
        } catch (err) {
          console.warn('Failed to load programmes for channel', channelId, err)
        }
      })
      await Promise.all(promises)
    }
  }, [])

  const loadChannels = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true })
    try {
      const channelsList = await loadJSON<any[]>('./data/channels.json')
      console.log('# of channels loaded:', channelsList.length);
      const channels: Channel[] = (channelsList || [])
        .map(c => ({
          id: c.id || c.channel || '',
          name: c.displayName || c.name || c.display_name || c.id || '',
          categories: c.categories,
          icon: c.icon || '',
          programmes: []
        }))//.slice(0, 100)
      // only load channel metadata here; detailed programmes are loaded on demand
      dispatch({ type: 'SET_SCHEDULE', payload: { channels } })
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to load channels' })
    }
  }, [loadProgrammesForChannels])

  // category-filter helpers were removed: categories are used only in UI filters now

  

  const setSelectedChannels = useCallback((ids: Set<string>) => {
    dispatch({ type: 'SET_SELECTED_CHANNELS', payload: ids })
    persistSelection(ids)
  }, [persistSelection])

  const addSelectedChannel = useCallback((id: string) => {
    dispatch({ type: 'ADD_SELECTED_CHANNEL', payload: id })
    const next = new Set(state.selectedChannelIds || [])
    next.add(id)
    persistSelection(next)
  }, [state.selectedChannelIds, persistSelection])

  const removeSelectedChannel = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_SELECTED_CHANNEL', payload: id })
    const next = new Set(state.selectedChannelIds || [])
    next.delete(id)
    persistSelection(next)
  }, [state.selectedChannelIds, persistSelection])

  const clearSelectedChannels = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTED_CHANNELS' })
    persistSelection(new Set())
  }, [persistSelection])

  const value: StoreContextType = {
    state,
    loadChannels,
    loadProgrammesForChannels,
    setSelectedChannels,
    addSelectedChannel,
    removeSelectedChannel,
    clearSelectedChannels
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }
  return context
}