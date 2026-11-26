import React, { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import { Upload, File, AlertCircle, CheckCircle2, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import DocumentTable from '../components/DocumentTable'

const UploadPage = () => {
  const queryClient = useQueryClient()
  const fileInputRef = useRef(null)
  
  const [file, setFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  // Query to fetch documents (so users can track status changes directly on this page)
  const { data: documents } = useQuery({
    queryKey: ['documents', 1],
    queryFn: async () => {
      const res = await api.get('/documents?page=1&limit=5')
      return res.data
    },
    refetchInterval: 3000, // Poll every 3 seconds while on this screen
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/document/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documents'])
    }
  })

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (fileToUpload) => {
      const formData = new FormData()
      formData.append('file', fileToUpload)
      
      const res = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        }
      })
      return res.data
    },
    onSuccess: () => {
      setSuccessMessage('File uploaded successfully! Background OCR and Vector Indexing has started.')
      setFile(null)
      setUploadProgress(0)
      queryClient.invalidateQueries(['documents'])
      setTimeout(() => setSuccessMessage(''), 6000)
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.detail || 'Upload failed. Ensure the server is online and the file is valid.')
      setUploadProgress(0)
    }
  })

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    setErrorMessage('')
    setSuccessMessage('')

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e) => {
    setErrorMessage('')
    setSuccessMessage('')
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (selectedFile) => {
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg']
    
    if (!allowedExtensions.includes(ext)) {
      setErrorMessage('Unsupported file type. Please upload a PDF, PNG, JPG, or JPEG.')
      return
    }

    if (selectedFile.size > 20 * 1024 * 1024) {
      setErrorMessage('File exceeds the maximum upload limit of 20MB.')
      return
    }

    setFile(selectedFile)
  }

  const triggerFileSelect = () => {
    fileInputRef.current.click()
  }

  const handleUpload = () => {
    if (!file) return
    setErrorMessage('')
    setSuccessMessage('')
    uploadMutation.mutate(file)
  }

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header breadcrumb */}
      <div className="flex items-center gap-3">
        <Link to="/" className="p-2 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 transition shadow-sm">
          <ArrowLeft className="h-4 w-4 text-slate-500" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Document Upload Hub</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Index new content to your semantic memory.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Drag/Drop Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            
            {/* Drag & Drop Card Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileSelect}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer text-center transition-all min-h-[250px]
                ${dragActive 
                  ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-950/10' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-primary-400 dark:hover:border-slate-500 bg-slate-50/50 dark:bg-slate-900/30'
                }
              `}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg"
              />
              
              <Upload className="h-10 w-10 text-slate-400 dark:text-slate-500 mb-4 animate-bounce" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Drag and drop your file here, or <span className="text-primary-600 dark:text-primary-400 underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 mt-2">Supports PDF, scanned images (PNG, JPG) up to 20 MB</p>
            </div>

            {/* Selected File Details */}
            {file && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-lg flex items-center justify-between border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg">
                    <File className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[250px]">{file.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Uploading ({uploadProgress}%)</span>
                    </>
                  ) : (
                    <span>Start Import</span>
                  )}
                </button>
              </div>
            )}

            {/* Upload Progress Bar */}
            {uploadProgress > 0 && (
              <div className="mt-4 space-y-1.5">
                <div className="flex justify-between text-xxs font-medium text-slate-500">
                  <span>Uploading file to server...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            {/* Notifications */}
            {errorMessage && (
              <div className="mt-4 flex items-start gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 rounded-xl text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Upload failed</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 flex items-start gap-2 p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30 rounded-xl text-xs">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-semibold">Upload successful</p>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{successMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Info Column */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors text-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">OCR & Indexing Pipeline</h3>
            <div className="space-y-3 text-slate-500 dark:text-slate-400">
              <div className="flex gap-2">
                <span className="font-bold text-primary-500">1.</span>
                <p><b>PyMuPDF Parsing:</b> Digital text is parsed directly from PDF files for instantaneous results.</p>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary-500">2.</span>
                <p><b>EasyOCR Fallback:</b> Scanned images or non-selectable pages run through a local neural OCR transcription.</p>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary-500">3.</span>
                <p><b>Text Chunking:</b> Content splits into overlapping 400-word blocks to maintain contextual coherence.</p>
              </div>
              <div className="flex gap-2">
                <span className="font-bold text-primary-500">4.</span>
                <p><b>Vector Storage:</b> High-dimensional sentence embeddings save in ChromaDB, enabling semantic search.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Documents List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Recently Uploaded Files</h3>
        <DocumentTable documents={documents} onDelete={(id) => deleteMutation.mutate(id)} />
      </div>
    </div>
  )
}

export default UploadPage
