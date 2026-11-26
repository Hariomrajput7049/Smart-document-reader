import React from 'react'
import { FileText, Eye, MessageSquare, FileJson, Trash2, ShieldAlert, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const DocumentTable = ({ documents, onDelete }) => {
  
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const renderStatus = (status, errorMsg) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </span>
        )
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400 dark:border-yellow-800 animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Processing</span>
          </span>
        )
      case 'FAILED':
        return (
          <span 
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-800 cursor-help"
            title={errorMsg || "OCR processing failed"}
          >
            <ShieldAlert className="h-3 w-3" />
            <span>Failed</span>
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-900/50 dark:text-slate-400 dark:border-slate-800">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Pending</span>
          </span>
        )
    }
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700 mb-4" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">No documents found</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Get started by uploading your first document.</p>
        <Link 
          to="/upload" 
          className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
        >
          Upload Document
        </Link>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Document Name</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Upload Date</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">File Size</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Pages</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
            <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-lg">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate" title={doc.filename}>
                    {doc.filename}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                {new Date(doc.upload_date).toLocaleDateString()} {new Date(doc.upload_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                {formatBytes(doc.file_size)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                {doc.total_pages || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {renderStatus(doc.status, doc.error_message)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  {doc.status === 'COMPLETED' && (
                    <>
                      <Link
                        to={`/viewer/${doc.id}`}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition"
                        title="Open Document Viewer"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/chat?docId=${doc.id}`}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition"
                        title="Chat with Document"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/summary?docId=${doc.id}`}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg transition"
                        title="Summarize Document"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Link>
                    </>
                  )}
                  <button
                    onClick={() => onDelete(doc.id)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded-lg transition"
                    title="Delete Document"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DocumentTable
