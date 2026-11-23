import { useCallback, useEffect, useState } from 'react'
import { AuthContext } from './authContext.js'
import {
  getCurrentUser,
  login as loginRequest,
} from '../services/authService.js'
import { tokenStorage } from '../services/tokenStorage.js'
import { getApiErrorMessage } from '../utils/getApiErrorMessage.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => tokenStorage.get())
  const [isLoading, setIsLoading] = useState(() => Boolean(tokenStorage.get()))
  const [authError, setAuthError] = useState('')
  const [authNotice, setAuthNotice] = useState('')

  const refreshSession = useCallback(async () => {
    const storedToken = tokenStorage.get()

    if (!storedToken) {
      setToken(null)
      setUser(null)
      setAuthError('')
      setIsLoading(false)
      return null
    }

    setIsLoading(true)
    try {
      const currentUser = await getCurrentUser()
      setToken(storedToken)
      setUser(currentUser)
      setAuthError('')
      setAuthNotice('')
      return currentUser
    } catch (error) {
      setToken(tokenStorage.get())
      setUser(null)
      if (error.response?.status !== 401) {
        setAuthError(
          getApiErrorMessage(
            error,
            'Could not verify your session. Please try again.',
          ),
        )
      }
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleExpiredSession = () => {
      tokenStorage.clear()
      setToken(null)
      setUser(null)
      setAuthError('')
      setAuthNotice('Your session expired. Please sign in again.')
      setIsLoading(false)
    }

    window.addEventListener('auth:expired', handleExpiredSession)
    if (tokenStorage.get()) {
      const restoreSession = async () => {
        try {
          const currentUser = await getCurrentUser()
          setUser(currentUser)
          setAuthError('')
          setAuthNotice('')
        } catch (error) {
          if (error.response?.status !== 401) {
            setAuthError(
              getApiErrorMessage(
                error,
                'Could not verify your session. Please try again.',
              ),
            )
          }
        } finally {
          setIsLoading(false)
        }
      }

      void restoreSession()
    }

    return () => {
      window.removeEventListener('auth:expired', handleExpiredSession)
    }
  }, [])

  const login = async (credentials) => {
    setAuthError('')
    setAuthNotice('')
    setIsLoading(true)

    try {
      const result = await loginRequest(credentials)
      if (!result.access_token || result.token_type?.toLowerCase() !== 'bearer') {
        throw new Error('The server returned an invalid login response.')
      }

      tokenStorage.set(result.access_token)
      setToken(result.access_token)
      const currentUser = await getCurrentUser()
      setUser(currentUser)
      return currentUser
    } catch (error) {
      tokenStorage.clear()
      setToken(null)
      setUser(null)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    tokenStorage.clear()
    setToken(null)
    setUser(null)
    setAuthError('')
    setAuthNotice('')
  }

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(user && token),
    authError,
    authNotice,
    login,
    logout,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
