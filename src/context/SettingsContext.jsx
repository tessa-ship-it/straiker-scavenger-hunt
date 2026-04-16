import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const SettingsContext = createContext({})

export function useSettings() {
  return useContext(SettingsContext)
}

export const DEFAULTS = {
  app_title: 'Straiker: Signal Detection',
  app_subtitle: 'SIGNAL DETECTION',
  app_tagline: 'LIVE OPS // CONFERENCE EDITION',
  accent_color: '#f8c885',
  bg_color: '#19140e',
  surface_color: '#1f1a13',
  logo_url: '',
  admin_password: 'straiker-admin',
}

function applyToDOM(settings) {
  const root = document.documentElement
  if (settings.accent_color) {
    root.style.setProperty('--gold', settings.accent_color)
    root.style.setProperty('--gold-dark', settings.accent_color)
    root.style.setProperty('--border-focus', settings.accent_color)
  }
  if (settings.bg_color)      root.style.setProperty('--bg', settings.bg_color)
  if (settings.surface_color) root.style.setProperty('--surface', settings.surface_color)
  if (settings.app_title)     document.title = settings.app_title
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loaded, setLoaded]     = useState(false)

  useEffect(() => { loadSettings() }, [])

  const loadSettings = async () => {
    const { data } = await supabase.from('app_settings').select('key, value')
    if (data && data.length > 0) {
      const map = { ...DEFAULTS }
      data.forEach(({ key, value }) => { if (value !== null) map[key] = value })
      setSettings(map)
      applyToDOM(map)
    }
    setLoaded(true)
  }

  const updateSetting = async (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    applyToDOM(next)
    await supabase
      .from('app_settings')
      .upsert({ key, value }, { onConflict: 'key' })
  }

  const updateMany = async (updates) => {
    const next = { ...settings, ...updates }
    setSettings(next)
    applyToDOM(next)
    const rows = Object.entries(updates).map(([key, value]) => ({ key, value }))
    await supabase.from('app_settings').upsert(rows, { onConflict: 'key' })
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateMany, reload: loadSettings }}>
      {loaded ? children : null}
    </SettingsContext.Provider>
  )
}
