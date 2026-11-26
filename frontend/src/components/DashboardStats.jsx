import React from 'react'
import { FileText, Search, MessageSquare, ShieldAlert } from 'lucide-react'

const DashboardStats = ({ stats }) => {
  const cards = [
    {
      name: 'Total Documents',
      value: stats?.total_documents || 0,
      icon: FileText,
      color: 'bg-blue-500 text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-100 dark:border-blue-900/30'
    },
    {
      name: 'Semantic Queries',
      value: stats?.recent_searches?.filter(s => s.search_type === 'semantic').length || 0,
      icon: Search,
      color: 'bg-sky-500 text-sky-500',
      bg: 'bg-sky-50 dark:bg-sky-950/20',
      border: 'border-sky-100 dark:border-sky-900/30'
    },
    {
      name: 'AI Chat Queries',
      value: stats?.recent_chats?.length || 0,
      icon: MessageSquare,
      color: 'bg-indigo-500 text-indigo-500',
      bg: 'bg-indigo-50 dark:bg-indigo-950/20',
      border: 'border-indigo-100 dark:border-indigo-900/30'
    },
    {
      name: 'Failures / Errors',
      value: stats?.recent_documents?.filter(d => d.status === 'FAILED').length || 0,
      icon: ShieldAlert,
      color: 'bg-rose-500 text-rose-500',
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-100 dark:border-rose-900/30'
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.name}
            className={`p-6 bg-white dark:bg-slate-900 rounded-xl border ${card.border} shadow-sm hover:shadow-md transition-all duration-200`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{card.name}</p>
                <h3 className="mt-2 text-3xl font-extrabold text-slate-800 dark:text-slate-100">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${card.bg} ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default DashboardStats
