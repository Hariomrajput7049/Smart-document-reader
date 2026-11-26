import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import { ArrowLeft, FileText, Search, BookOpen, Layers, Info } from 'lucide-react'

const DocumentViewerPage = () => {
  const { id } = useParams()
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch document details including chunks
  const { data: document, isLoading, error } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const res = await api.get(`/document/${id}`)
      return res.data
    }
  })

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) {
      return text
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return (
      <span>
        {parts.map((part, i) => 
          regex.test(part) 
            ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 text-slate-900 rounded-sm px-0.5">{part}</mark>
            : part
        )}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  if (error || !document) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 m-6 max-w-md mx-auto">
        <h3 className="text-lg font-bold text-red-600 dark:text-red-400">Failed to load document</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2">The requested document could not be found or retrieved.</p>
        <Link to="/" className="mt-4 inline-block px-4 py-2 bg-primary-600 text-white rounded-lg text-xs font-semibold shadow hover:bg-primary-700">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  // Filter chunks if a search term is specified
  const filteredChunks = document.chunks?.filter(chunk => 
    chunk.text.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // original file URL pointing to API
  const fileUrl = `/api/document/${id}/file?token=${localStorage.getItem('token')}`

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col transition-colors duration-200">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-5 w-5 text-primary-600 shrink-0" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={document.filename}>
              {document.filename}
            </h2>
          </div>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Pages: {document.total_pages} • Size: {(document.file_size / 1024 / 1024).toFixed(2)} MB
        </div>
      </div>

      {/* Main Dual Pane Viewer */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Document Render (PDF Frame or image) */}
        <div className="w-1/2 h-full bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center p-4">
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
              <BookOpen className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">File Canvas Preview</span>
            </div>
            
            {/* Display in iframe which streams the PDF or Image natively */}
            <iframe 
              src={fileUrl} 
              className="flex-1 w-full border-0"
              title={document.filename}
            />
          </div>
        </div>

        {/* Right Pane: OCR Chunk Text and Highlights Search */}
        <div className="w-1/2 h-full flex flex-col bg-white dark:bg-slate-900">
          
          {/* Keyword Search Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3 shrink-0">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search keywords inside extracted text..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 py-2 pl-10 pr-3 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary-500 transition"
              />
            </div>
            <div className="flex items-center justify-between text-xxs text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Layers className="h-3 w-3" />
                <span>Extracted Chunks ({filteredChunks.length} of {document.chunks?.length || 0})</span>
              </span>
              <span>400-word blocks with 80-word overlap</span>
            </div>
          </div>

          {/* Text Chunks Scroll container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {filteredChunks.length > 0 ? (
              filteredChunks.map((chunk, idx) => (
                <div 
                  key={chunk.id}
                  className="p-5 bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800/60 rounded-xl hover:shadow-sm transition space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 text-xxs font-semibold text-slate-500">
                    <span>CHUNK #{chunk.chunk_index + 1}</span>
                    <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400 rounded-full">
                      PAGE {chunk.page_number}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line select-text">
                    {highlightText(chunk.text, searchTerm)}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <Info className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-xs">No matching text blocks found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentViewerPage
