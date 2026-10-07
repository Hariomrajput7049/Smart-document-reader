import React from 'react'
import { Sun, Moon, Sparkles } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'

const Navbar = () => {
  const { darkMode, toggleDarkMode } = useAuth()
  const location = useLocation()

  // Simple mapping of path to display title
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard Analytics'
      case '/upload': return 'Document Upload Pipeline'
      case '/chat': return 'AI Conversational Engine'
      case '/summary': return 'Smart Summarizer & Extraction'
      case '/profile': return 'User Account Profile'
      case '/settings': return 'Platform Configuration'
      default: return 'Smart Document Intelligence'
    }
  }

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 z-10 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{getPageTitle()}</h1>
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xxs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800">
          <Sparkles className="h-3 w-3" />
          <span>Gemini API Online</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
          title="Toggle color theme"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  )
}

export default Navbar
