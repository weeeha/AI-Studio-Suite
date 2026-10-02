import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './App'
import registry from '../../../tools.json'

// Follow the system light/dark setting (DS dark mode is a .dark class on <html>).
const media = window.matchMedia('(prefers-color-scheme: dark)')
const sync = () => document.documentElement.classList.toggle('dark', media.matches)
sync()
media.addEventListener('change', sync)

createRoot(document.getElementById('root')!).render(
  <StrictMode><App tools={registry.tools} /></StrictMode>,
)
