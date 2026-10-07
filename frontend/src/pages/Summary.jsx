import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import api from '../services/api'
import { 
  Sparkles, 
  FileText, 
  Loader2, 
  FileDown, 
  ScanLine, 
  Receipt, 
  Briefcase, 
  FileSignature, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react'

const SummaryPage = () => {
  const [searchParams] = useSearchParams()
  const urlDocId = searchParams.get('docId')

  const [activeDocId, setActiveDocId] = useState(urlDocId ? parseInt(urlDocId) : '')
  const [docType, setDocType] = useState('invoice') // invoice, resume, contract
  
  const [summary, setSummary] = useState(null)
  const [extraction, setExtraction] = useState(null)
  const [activeTab, setActiveTab] = useState('summary') // summary or extraction

  // Fetch completed documents
  const { data: documents } = useQuery({
    queryKey: ['summaryDocuments'],
    queryFn: async () => {
      const res = await api.get('/documents?page=1&limit=100')
      return res.data.filter(d => d.status === 'COMPLETED')
    }
  })

  // Set active doc if URL param exists
  useEffect(() => {
    if (documents && urlDocId) {
      setActiveDocId(parseInt(urlDocId))
    }
  }, [documents, urlDocId])

  // Summarize Mutation
  const summaryMutation = useMutation({
    mutationFn: async (docId) => {
      const res = await api.post('/summary', { document_id: docId })
      return res.data
    },
    onSuccess: (data) => {
      setSummary(data)
    }
  })

  // Extract Info Mutation
  const extractMutation = useMutation({
    mutationFn: async ({ docId, type }) => {
      const res = await api.post(`/document/${docId}/extract-info?doc_type=${type}`)
      return res.data
    },
    onSuccess: (data) => {
      setExtraction(data.extracted_data)
    }
  })

  const handleGenerateSummary = () => {
    if (!activeDocId) return
    setSummary(null)
    summaryMutation.mutate(parseInt(activeDocId))
  }

  const handleRunExtraction = () => {
    if (!activeDocId) return
    setExtraction(null)
    extractMutation.mutate({ docId: parseInt(activeDocId), type: docType })
  }

  const handleDocChange = (e) => {
    setActiveDocId(e.target.value)
    setSummary(null)
    setExtraction(null)
  }

  const handleExportDocx = () => {
    if (!summary || !activeDocId) return
    // Trigger download post request
    api.post(`/export/summary/${activeDocId}/docx`, summary, { responseType: 'blob' })
      .then((response) => {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `document_summary_${activeDocId}.docx`)
        document.body.appendChild(link)
        link.click()
        link.remove()
      })
      .catch((err) => {
        console.error("Export DOCX failed", err)
        alert('Failed to export DOCX')
      })
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto transition-colors duration-200">
      
      {/* Top Controller Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Document Intelligence Workspace</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Generate executive summaries or parse structural data templates.</p>
        </div>
        
        {/* Document Dropdown Selector */}
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select
            value={activeDocId}
            onChange={handleDocChange}
            className="flex-1 md:flex-none rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 font-semibold focus:outline-none"
          >
            <option value="">-- Choose a Document --</option>
            {documents?.map(doc => (
              <option key={doc.id} value={doc.id}>{doc.filename}</option>
            ))}
          </select>
        </div>
      </div>

      {activeDocId ? (
        <div className="space-y-6">
          {/* Tabs bar */}
          <div className="border-b border-slate-200 dark:border-slate-800 flex gap-6 text-sm font-semibold shrink-0">
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-3 border-b-2 transition ${
                activeTab === 'summary' 
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Executive Summary
            </button>
            <button
              onClick={() => setActiveTab('extraction')}
              className={`pb-3 border-b-2 transition ${
                activeTab === 'extraction' 
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Structured Info Extraction
            </button>
          </div>

          {/* TAB 1: SUMMARY PANELS */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {/* Actions Header */}
              {!summary && !summaryMutation.isPending && (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center shadow-sm">
                  <Sparkles className="h-10 w-10 text-primary-500 mb-4 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Summarize this Document</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    Generate an executive overview, detailed structured paragraphs, and key takeaways using Google Gemini.
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    className="mt-5 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow transition"
                  >
                    Generate Summary Report
                  </button>
                </div>
              )}

              {summaryMutation.isPending && (
                <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-4" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gemini is analyzing pages and writing summaries...</p>
                </div>
              )}

              {summary && (
                <div className="space-y-6">
                  {/* Export Header */}
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Summary ready</span>
                    </span>
                    <button
                      onClick={handleExportDocx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold shadow-sm transition"
                    >
                      <FileDown className="h-4 w-4" />
                      <span>Export to DOCX</span>
                    </button>
                  </div>

                  {/* Three Summary Panels */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Short Summary */}
                    <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Executive Overview</h4>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-350">{summary.short_summary}</p>
                    </div>

                    {/* Bullet summary */}
                    <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Key Takeaways</h4>
                      <ul className="space-y-2">
                        {summary.bullet_summary.split('\n').map((line, idx) => {
                          const cleaned = line.trim().replace(/^[-*•\s\d\.]+/, '')
                          if (!cleaned) return null
                          return (
                            <li key={idx} className="flex gap-2 items-start text-xs text-slate-650 dark:text-slate-300">
                              <span className="text-primary-500 font-bold shrink-0 mt-0.5">•</span>
                              <span>{cleaned}</span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>

                    {/* Detailed summary */}
                    <div className="md:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                      <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Detailed Analysis</h4>
                      <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-300 whitespace-pre-line">{summary.detailed_summary}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXTRACTION PANELS */}
          {activeTab === 'extraction' && (
            <div className="space-y-6">
              {/* Type selector and Trigger bar */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">Select Template Extraction Profile</h3>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <input 
                      type="radio" 
                      name="docType" 
                      value="invoice" 
                      checked={docType === 'invoice'} 
                      onChange={() => { setDocType('invoice'); setExtraction(null); }}
                      className="text-primary-600 focus:ring-primary-500" 
                    />
                    <Receipt className="h-4 w-4 text-slate-400" />
                    <span>Invoices</span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <input 
                      type="radio" 
                      name="docType" 
                      value="resume" 
                      checked={docType === 'resume'} 
                      onChange={() => { setDocType('resume'); setExtraction(null); }}
                      className="text-primary-600 focus:ring-primary-500" 
                    />
                    <Briefcase className="h-4 w-4 text-slate-400" />
                    <span>Resumes / CVs</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <input 
                      type="radio" 
                      name="docType" 
                      value="contract" 
                      checked={docType === 'contract'} 
                      onChange={() => { setDocType('contract'); setExtraction(null); }}
                      className="text-primary-600 focus:ring-primary-500" 
                    />
                    <FileSignature className="h-4 w-4 text-slate-400" />
                    <span>Contracts / Agreements</span>
                  </label>

                  <button
                    onClick={handleRunExtraction}
                    disabled={extractMutation.isPending}
                    className="ml-auto px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {extractMutation.isPending ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Extracting...</span>
                      </>
                    ) : (
                      <>
                        <ScanLine className="h-4 w-4" />
                        <span>Run Extraction</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Loader */}
              {extractMutation.isPending && (
                <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-primary-500 mb-4" />
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gemini is parsing structural attributes for '{docType}' schema...</p>
                </div>
              )}

              {/* Render custom layout based on extracted attributes */}
              {extraction && !extractMutation.isPending && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 animate-fadeIn">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">Extracted {docType} Schema Results</h3>
                    <p className="text-xxs text-slate-400 mt-0.5">Parsed using JSON Schema Mode</p>
                  </div>

                  {/* Schema 1: Invoice */}
                  {docType === 'invoice' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-xs text-slate-700 dark:text-slate-300">
                      <div>
                        <p className="font-semibold text-slate-450 uppercase tracking-wider text-[10px] mb-1">Invoice Number</p>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{extraction.invoice_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-450 uppercase tracking-wider text-[10px] mb-1">Invoice Date</p>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{extraction.date || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-450 uppercase tracking-wider text-[10px] mb-1">GST/TAX ID</p>
                        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{extraction.gst_number || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-450 uppercase tracking-wider text-[10px] mb-1">Total Billable Amount</p>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{extraction.total_amount || 'N/A'} {extraction.currency}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-450 uppercase tracking-wider text-[10px] mb-1">Vendor/Merchant Name</p>
                        <p className="font-bold text-slate-850 dark:text-slate-100 text-sm">{extraction.vendor_name || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  {/* Schema 2: Resume */}
                  {docType === 'resume' && (
                    <div className="space-y-6 text-xs text-slate-700 dark:text-slate-350">
                      {/* Skills */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[10px] uppercase text-slate-400 tracking-wider">Candidate Skills</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {extraction.skills && extraction.skills.length > 0 ? (
                            extraction.skills.map((skill, idx) => (
                              <span key={idx} className="px-2.5 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 rounded-md border border-primary-100 dark:border-primary-900/40 font-medium">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-450">No skills parsed.</span>
                          )}
                        </div>
                      </div>

                      {/* Education */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[10px] uppercase text-slate-400 tracking-wider">Education Credentials</h4>
                        {extraction.education && extraction.education.length > 0 ? (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {extraction.education.map((edu, idx) => (
                              <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                                <p className="font-bold text-slate-800 dark:text-slate-200">{edu.degree}</p>
                                <p className="text-slate-500 dark:text-slate-450 mt-0.5">{edu.institution} • {edu.year || 'N/A'}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-450">No education fields parsed.</p>
                        )}
                      </div>

                      {/* Experience */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[10px] uppercase text-slate-400 tracking-wider">Professional Experience</h4>
                        {extraction.experience && extraction.experience.length > 0 ? (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {extraction.experience.map((exp, idx) => (
                              <div key={idx} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                                <div className="flex justify-between items-start">
                                  <p className="font-bold text-slate-805 dark:text-slate-100">{exp.role}</p>
                                  <span className="text-xxs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{exp.duration}</span>
                                </div>
                                <p className="text-xxs text-primary-650 dark:text-primary-400 font-semibold">{exp.company}</p>
                                <p className="text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">{exp.responsibilities}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-450">No professional experience parsed.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Schema 3: Contract */}
                  {docType === 'contract' && (
                    <div className="space-y-6 text-xs text-slate-700 dark:text-slate-350">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 border-b border-slate-100 dark:border-slate-800 pb-5">
                        <div>
                          <p className="font-semibold text-slate-450 uppercase tracking-wider text-[10px] mb-1">Effective Date</p>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{extraction.effective_date || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-450 uppercase tracking-wider text-[10px] mb-1">Expiry Date</p>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{extraction.expiry_date || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-450 uppercase tracking-wider text-[10px] mb-1">Governing Law</p>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{extraction.governing_law || 'N/A'}</p>
                        </div>
                      </div>

                      {/* Parties */}
                      <div className="space-y-2">
                        <h4 className="font-semibold text-[10px] uppercase text-slate-400 tracking-wider">Contractual Parties</h4>
                        <ul className="list-disc pl-4 space-y-1">
                          {extraction.parties?.map((p, idx) => (
                            <li key={idx} className="font-bold text-slate-800 dark:text-slate-200">{p}</li>
                          )) || <p className="text-slate-450">No parties found.</p>}
                        </ul>
                      </div>

                      {/* Key clauses */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-[10px] uppercase text-slate-400 tracking-wider">Key Clauses Parsed</h4>
                        {extraction.key_clauses && extraction.key_clauses.length > 0 ? (
                          <div className="overflow-hidden border border-slate-200 dark:border-slate-800 rounded-lg">
                            <table className="w-full border-collapse text-left">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-450 uppercase">
                                  <th className="px-4 py-2.5 w-1/3">Clause Title</th>
                                  <th className="px-4 py-2.5 w-2/3">Summary Description</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {extraction.key_clauses.map((clause, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                                    <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">{clause.clause_title}</td>
                                    <td className="px-4 py-3 text-slate-550 dark:text-slate-400 leading-relaxed">{clause.summary}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-slate-450 font-medium">No major clauses mapped.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Fallback Error display */}
                  {extraction.error && (
                    <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 rounded-xl">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <span>{extraction.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center shadow-sm">
          <FileText className="h-12 w-12 text-slate-350 dark:text-slate-700 mb-4 animate-pulse" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Choose a File to Begin</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select a successfully indexed document from the selector above to run AI analytics.</p>
        </div>
      )}
    </div>
  )
}

export default SummaryPage
