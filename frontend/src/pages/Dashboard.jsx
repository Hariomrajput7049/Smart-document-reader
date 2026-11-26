import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../services/api'
import DashboardStats from '../components/DashboardStats'
import DocumentTable from '../components/DocumentTable'
import { Upload, Search, MessageSquare, History, FileText, ArrowRight } from 'lucide-react'

const Dashboard = () => {
  const queryClient = useQueryClient()

  // Fetch Dashboard Stats (includes recent documents, searches, chats)
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/dashboard')
      return res.data
    },
    refetchInterval: 5000, // Poll statistics every 5 seconds to track document processing updates
  })

  // Fetch all documents (paginated - page 1)
  const { data: documents, isLoading: docsLoading, error: docsError } = useQuery({
    queryKey: ['documents', 1],
    queryFn: async () => {
      const res = await api.get('/documents?page=1&limit=15')
      return res.data
    },
    refetchInterval: 5000, // Poll documents list
  })

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/document/${id}`)
    },
    onSuccess: () => {
      // Invalidate queries to trigger re-fetch
      queryClient.invalidateQueries(['dashboardStats'])
      queryClient.invalidateQueries(['documents'])
    },
    onError: (err) => {
      alert(`Failed to delete document: ${err.response?.data?.detail || err.message}`)
    }
  })

  const handleDeleteDocument = (id) => {
    if (window.confirm('Are you sure you want to delete this document? This will remove its text chunks and vector embeddings.')) {
      deleteMutation.mutate(id)
    }
  }

  const isLoading = statsLoading || docsLoading
  const hasError = statsError || docsError

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (hasError) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-950/20 m-6">
        <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Error loading dashboard data</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Please ensure the backend API is online and try again.</p>
        <button 
          onClick={() => {
            queryClient.invalidateQueries(['dashboardStats'])
            queryClient.invalidateQueries(['documents'])
          }}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-primary-700"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">Welcome to DocIntel Platform</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Upload scanned and digital documents, query them semantically, and generate summaries.</p>
        </div>
        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition-all"
        >
          <Upload className="h-4 w-4" />
          <span>Quick Upload File</span>
        </Link>
      </div>

      {/* Analytics Card Stats Grid */}
      <DashboardStats stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Documents Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Uploaded Documents Log</h3>
            <Link to="/upload" className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1">
              <span>View all upload tools</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <DocumentTable documents={documents} onDelete={handleDeleteDocument} />
        </div>

        {/* Right Column: Search and Chat History */}
        <div className="space-y-8">
          {/* Recent Searches */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <Search className="h-5 w-5 text-slate-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Recent Queries</h3>
            </div>
            {stats?.recent_searches && stats.recent_searches.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_searches.map((search) => (
                  <div key={search.id} className="flex items-start justify-between text-xs py-2 border-b border-slate-50 dark:border-slate-800/40 last:border-0">
                    <div className="pr-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={search.query}>
                        "{search.query}"
                      </p>
                      <p className="text-xxs text-slate-400 mt-0.5">
                        {new Date(search.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xxs font-medium capitalize ${
                      search.search_type === 'semantic' 
                        ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400' 
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400'
                    }`}>
                      {search.search_type}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No search query history available.</p>
            )}
          </div>

          {/* AI Chat History */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <MessageSquare className="h-5 w-5 text-slate-400" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Recent Chats</h3>
            </div>
            {stats?.recent_chats && stats.recent_chats.length > 0 ? (
              <div className="space-y-3">
                {stats.recent_chats.map((chat) => (
                  <Link 
                    key={chat.id} 
                    to={`/chat?docId=${chat.document_id || ''}`} 
                    className="block group p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 truncate">
                      Q: {chat.question}
                    </p>
                    <p className="text-xxs text-slate-400 mt-1 truncate">
                      {new Date(chat.created_at).toLocaleDateString()} • Click to reopen chat
                    </p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">No chat conversations yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
