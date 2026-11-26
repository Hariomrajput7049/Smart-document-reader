import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark')

  // Theme Management
  useEffect(() => {
    const root = window.document.documentElement
    if (darkMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  // Fetch profile on load if token exists
  useEffect(() => {
    const fetchProfile = async () => {
      if (token) {
        try {
          const res = await api.get('/users/profile')
          setUser(res.data)
        } catch (err) {
          console.error("Failed to load user profile on startup", err)
          logout()
        }
      }
      setLoading(false)
    }
    fetchProfile()
  }, [token])

  const register = async (username, email, password) => {
    const res = await api.post('/auth/register', { username, email, password })
    return res.data
  }

  const login = async (username, password) => {
    // Standard OAuth2 form request (url-encoded format)
    const formData = new URLSearchParams()
    formData.append('username', username)
    formData.append('password', password)

    const res = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    const accessToken = res.data.access_token
    localStorage.setItem('token', accessToken)
    setToken(accessToken)

    // Load profile immediately after login
    const profileRes = await api.get('/users/profile')
    setUser(profileRes.data)
    localStorage.setItem('user', JSON.stringify(profileRes.data))
    return profileRes.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    darkMode,
    toggleDarkMode
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
