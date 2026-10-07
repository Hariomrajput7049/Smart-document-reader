import React from 'react'
import { useAuth } from '../hooks/useAuth'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { User, Mail, Calendar, FileText, LayoutGrid, ShieldCheck } from 'lucide-react'

const Profile = () => {
  const { user } = useAuth()

  // Fetch document list for detailed stats
  const { data: documents } = useQuery({
    queryKey: ['profileDocuments'],
    queryFn: async () => {
      const res = await api.get('/documents?page=1&limit=100')
      return res.data
    }
  })

  const completedCount = documents?.filter(d => d.status === 'COMPLETED').length || 0
  const processingCount = documents?.filter(d => d.status === 'PROCESSING').length || 0
  const failedCount = documents?.filter(d => d.status === 'FAILED').length || 0

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto transition-colors duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Banner with gradient */}
        <div className="h-32 bg-gradient-to-r from-primary-500 to-indigo-650 flex items-end p-6">
          <div className="flex items-center gap-4 translate-y-8">
            <div className="h-20 w-20 rounded-full border-4 border-white dark:border-slate-900 bg-primary-100 dark:bg-primary-950 flex items-center justify-center text-primary-750 dark:text-primary-300 font-extrabold text-2xl shadow-md">
              {user?.username?.substring(0, 2).toUpperCase() || 'US'}
            </div>
          </div>
        </div>

        {/* User basic details */}
        <div className="pt-12 p-6 space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{user?.username}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Standard Platform Member</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            {/* Left side card - Info */}
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-455">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">Account Profile Details</h3>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-slate-400">Username</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{user?.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-slate-400">Email Address</p>
                  <p className="font-semibold text-slate-850 dark:text-slate-200">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-slate-400">Registered Date</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right side card - Usage Stats */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px]">Usage Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xxs font-semibold uppercase">Indexed</span>
                    <FileText className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{completedCount}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Files parsed successfully</p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-xxs font-semibold uppercase">Queue Status</span>
                    <LayoutGrid className="h-4 w-4 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{processingCount}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Files in OCR queue</p>
                </div>
              </div>

              {failedCount > 0 && (
                <div className="flex items-center gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-250 dark:border-rose-900/30 rounded-xl text-xs">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-rose-500" />
                  <span>Notice: {failedCount} document imports encountered processing errors. Check the dashboard logs for diagnostic reports.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
