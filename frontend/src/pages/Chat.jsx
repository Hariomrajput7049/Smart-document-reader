import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../services/api'
import { 
  MessageSquare, 
  Send, 
  FileText, 
  Copy, 
  FileDown, 
  ExternalLink, 
  Sparkles, 
  Loader2, 
  HelpCircle,
  FolderOpen
} from 'lucide-react'

const ChatPage = () => {
  const [searchParams] = useSearchParams()
  const urlDocId = searchParams.get('docId')

  const [activeDocId, setActiveDocId] = useState(urlDocId ? parseInt(urlDocId) : '')
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState([])
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewDocName, setPreviewDocName] = useState('')
  const chatEndRef = useRef(null)

  // Fetch user's completed documents for selectors
  const { data: documents } = useQuery({
    queryKey: ['chatDocuments'],
    queryFn: async () => {
      const res = await api.get('/documents?page=1&limit=100')
      return res.data.filter(d => d.status === 'COMPLETED')
    }
  })

  // Set initial preview and active doc if page loaded with docId parameter
  useEffect(() => {
    if (documents && urlDocId) {
      const selected = documents.find(d => d.id === parseInt(urlDocId))
      if (selected) {
        setActiveDocId(selected.id)
        setPreviewUrl(`/api/document/${selected.id}/file?token=${localStorage.getItem('token')}`)
        setPreviewDocName(selected.filename)
      }
    }
  }, [documents, urlDocId])

  // Scroll to bottom of chat when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Chat Mutation
  const chatMutation = useMutation({
    mutationFn: async (chatPayload) => {
      const res = await api.post('/chat', chatPayload)
      return res.data
    },
    onSuccess: (data) => {
      // Append the response from Gemini
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'assistant',
          text: data.answer,
          sources: data.sources,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    },
    onError: (err) => {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'error',
          text: `Failed to fetch response: ${err.response?.data?.detail || err.message}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    }
  })

  const handleSend = (e) => {
    e.preventDefault()
    if (!question.trim() || chatMutation.isPending) return

    const currentQuestion = question
    setQuestion('')

    // Append the user's message
    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'user',
        text: currentQuestion,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])

    // Send payload
    chatMutation.mutate({
      question: currentQuestion,
      document_id: activeDocId === '' ? null : parseInt(activeDocId)
    })
  }

  const handleQuickPrompt = (promptText) => {
    if (chatMutation.isPending) return

    setMessages(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'user',
        text: promptText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ])

    chatMutation.mutate({
      question: promptText,
      document_id: activeDocId === '' ? null : parseInt(activeDocId)
    })
  }

  const handleDocSelectorChange = (e) => {
    const val = e.target.value
    setActiveDocId(val)
    if (val === '') {
      setPreviewUrl('')
      setPreviewDocName('')
    } else if (documents) {
      const selected = documents.find(d => d.id === parseInt(val))
      if (selected) {
        setPreviewUrl(`/api/document/${selected.id}/file?token=${localStorage.getItem('token')}`)
        setPreviewDocName(selected.filename)
      }
    }
  }

  const handleSourceClick = (docId, pageNum, filename) => {
    // Dynamically update the preview panel to reference that document and page number
    setPreviewDocName(filename)
    setPreviewUrl(`/api/document/${docId}/file?token=${localStorage.getItem('token')}#page=${pageNum}`)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Answer copied to clipboard!')
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex overflow-hidden transition-colors duration-200">
      {/* Left Pane: Conversation Space */}
      <div className="w-1/2 flex flex-col bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 h-full">
        {/* Context Selector header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Chat Target Context:</span>
          </div>
          <select
            value={activeDocId}
            onChange={handleDocSelectorChange}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 px-3 py-1.5 text-xs text-slate-850 dark:text-slate-100 font-semibold focus:outline-none focus:border-primary-500"
          >
            <option value="">All Documents (Semantic Query)</option>
            {documents?.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.filename}</option>
            ))}
          </select>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto space-y-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-primary-100 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 rounded-full">
                  <Sparkles className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Semantic AI Chat Assistant</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {activeDocId === '' 
                      ? 'Query across all your indexed documents. Ask something like: "Summarize leave policies" or "Find contract termination dates".'
                      : `Ask questions about "${previewDocName}". The AI will extract relevant snippets and cite its sources.`
                    }
                  </p>
                </div>
              </div>

              {/* Suggestion Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full shrink-0">
                <button
                  onClick={() => handleQuickPrompt("Summarize this document in 3 sentences")}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 rounded-xl text-left text-xs text-slate-650 dark:text-slate-350 transition shadow-sm hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-850/50"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <span>📄</span>
                    <span>Summarize Document</span>
                  </p>
                  <p className="text-xxs text-slate-400 dark:text-slate-500">Generate a quick executive summary of this file.</p>
                </button>
                
                <button
                  onClick={() => handleQuickPrompt("What are the key skills and experiences mentioned?")}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 rounded-xl text-left text-xs text-slate-650 dark:text-slate-350 transition shadow-sm hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-850/50"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <span>💼</span>
                    <span>Key Skills & Experience</span>
                  </p>
                  <p className="text-xxs text-slate-400 dark:text-slate-500">Extract professional capabilities and backgrounds.</p>
                </button>
                
                <button
                  onClick={() => handleQuickPrompt("Who are the signing parties and dates?")}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 rounded-xl text-left text-xs text-slate-650 dark:text-slate-350 transition shadow-sm hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-850/50"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <span>📝</span>
                    <span>Parties & Deadlines</span>
                  </p>
                  <p className="text-xxs text-slate-400 dark:text-slate-500">Identify signatures, dates, and agreement timelines.</p>
                </button>
                
                <button
                  onClick={() => handleQuickPrompt("What are the main termination clauses or liabilities?")}
                  className="p-4 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:border-primary-500 dark:hover:border-primary-500 rounded-xl text-left text-xs text-slate-650 dark:text-slate-350 transition shadow-sm hover:shadow hover:bg-slate-50/50 dark:hover:bg-slate-850/50"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1.5">
                    <span>⚖️</span>
                    <span>Clauses & Liabilities</span>
                  </p>
                  <p className="text-xxs text-slate-400 dark:text-slate-500">Examine legal/agreement liabilities and clauses.</p>
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col space-y-2 ${
                  msg.type === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Bubble Container */}
                <div 
                  className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-xs leading-relaxed select-text
                    ${msg.type === 'user' 
                      ? 'bg-primary-600 text-white rounded-tr-none' 
                      : msg.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                        : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                    }
                  `}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  
                  {/* Assistant Message Actions & Citations */}
                  {msg.type === 'assistant' && (
                    <div className="mt-4 border-t border-slate-100 dark:border-slate-850 pt-3 space-y-3 shrink-0">
                      {/* Citations list */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xxs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">References Cited:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.map((src, i) => (
                              <button
                                key={i}
                                onClick={() => handleSourceClick(src.document_id, src.page_number, src.filename)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-primary-50 hover:text-primary-600 dark:bg-slate-800 dark:hover:bg-primary-950/40 dark:hover:text-primary-400 text-xxs font-medium text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-750 transition"
                              >
                                <FileText className="h-3 w-3 shrink-0" />
                                <span className="max-w-[100px] truncate">{src.filename}</span>
                                <span>(Page {src.page_number})</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Toolbars (Copy & Export) */}
                      <div className="flex items-center justify-between text-xxs text-slate-400 mt-2">
                        <span>AI Response</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(msg.text)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded transition"
                            title="Copy answer"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          
                          {/* Export to PDF Route */}
                          {/* We will check if the user has chat histories saved to download. Since we saved this query to DB inside the route, we can download it. But to fetch it, we would need the DB ID. We can expose export-pdf links directly via API or use local export options.
                              For simple implementation, since we created an export endpoint: `GET /api/export/chat/{chat_id}/pdf`, let's check how we get the chat_id. Since the mutation returns the chat_id (wait, the chat router returns ChatResponse, does it return the saved ID? Ah! It returns answer and sources. Let's make a client-side layout where we can just export or trigger PDF from browser window or download. Wait, we can modify the chat response to include the chat id, or fetch it. Let's look at the chat router response.
                              Wait, does `POST /chat` return the chat id? No, it returns `ChatResponse(answer, sources)`. That's fine! We can fetch the latest chat ID by calling GET `/chat-history` or simply export using a client-side action, or let the user click export on any of the recent chats in the history.
                              Let's make it fetch the latest history on query completion to find the ID, or we can just download the latest chat using `api.get('/chat-history')` first item.
                              Let's do a simple call: when user clicks download, we fetch the latest chat from the backend history (which will be this message), and download the PDF! That's brilliant and works natively!
                          */}
                          <button
                            onClick={async () => {
                              try {
                                const historyRes = await api.get('/chat-history?limit=1')
                                const latestChat = historyRes.data[0]
                                if (latestChat) {
                                  window.open(`/api/export/chat/${latestChat.id}/pdf`, '_blank')
                                }
                              } catch (err) {
                                alert('Failed to export PDF')
                              }
                            }}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 rounded transition"
                            title="Export Answer to PDF"
                          >
                            <FileDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Timestamp */}
                <span className="text-[10px] text-slate-400 px-2">{msg.time}</span>
              </div>
            ))
          )}

          {/* Loader bubble */}
          {chatMutation.isPending && (
            <div className="flex flex-col space-y-2 items-start">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800 text-xs shadow-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
                <span className="text-slate-500">Gemini is writing an answer...</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Form Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about the document(s)..."
              disabled={chatMutation.isPending}
              className="block w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 py-3 pl-4 pr-12 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!question.trim() || chatMutation.isPending}
              className="absolute right-2 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Right Pane: Split-Screen PDF Preview Canvas */}
      <div className="w-1/2 h-full bg-slate-100 dark:bg-slate-950 flex flex-col p-4">
        {previewUrl ? (
          <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-md border border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold text-slate-650 dark:text-slate-300 truncate max-w-[200px]">{previewDocName}</span>
              </div>
              <a 
                href={previewUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="text-xxs font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
              >
                <span>Full screen</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            
            <iframe 
              src={previewUrl} 
              key={previewUrl} // Force reload of iframe when hash/URL changes
              className="flex-1 w-full border-0"
              title="Split View PDF Canvas"
            />
          </div>
        ) : (
          <div className="w-full h-full rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-855 flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
            <HelpCircle className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-4 animate-pulse" />
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">Contextual PDF Preview Canvas</h3>
            <p className="text-xxs text-slate-400 mt-2">
              Select a specific document from the context dropdown or click references in AI responses to load PDF previews and highlight pages.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatPage
