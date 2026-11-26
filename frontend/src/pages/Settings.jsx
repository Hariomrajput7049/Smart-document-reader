import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { Sun, Moon, Info, Settings as SettingsIcon, ShieldCheck, Database, HardDrive } from 'lucide-react'

const Settings = () => {
  const { darkMode, toggleDarkMode } = useAuth()

  return (
    <div className="p-8 space-y-8 max-w-3xl mx-auto transition-colors duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <SettingsIcon className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Platform Settings</h2>
        </div>

        {/* Setting 1: Theme Toggles */}
        <div className="flex items-center justify-between py-2.5">
          <div className="space-y-0.5">
            <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">Color Interface Style</h3>
            <p className="text-[10px] text-slate-400">Toggle between Light Mode and Dark Mode styling.</p>
          </div>
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-700 transition"
          >
            {darkMode ? (
              <>
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Setting 2: Limits */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">Upload & Pipeline Constraints</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-start gap-3">
              <HardDrive className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Maximum File Size</p>
                <p className="text-slate-550 dark:text-slate-400 mt-1">Files are restricted to <b>20 MB</b> per upload to manage vector payload limits.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800/60 flex items-start gap-3">
              <Database className="h-5 w-5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Vector Embeddings Model</p>
                <p className="text-slate-550 dark:text-slate-400 mt-1">Using Sentence Transformer <b>all-MiniLM-L6-v2</b> to generate 384-dimensional dense semantic vectors.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings 3: System metadata info */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-6 flex items-start gap-2.5 p-4 bg-slate-50 dark:bg-slate-800/20 text-slate-500 dark:text-slate-400 rounded-xl text-xxs leading-relaxed">
          <Info className="h-4 w-4 text-primary-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-350">System Configuration Summary</p>
            <p className="mt-1">
              Backend Database: SQLite (SQLAlchemy ORM)<br />
              Vector Database: ChromaDB (HNSW Cosine)<br />
              AI Inference: Google Gemini API (gemini-1.5-flash)<br />
              Local OCR Engine: EasyOCR (Deep Learning Text Recognition)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
