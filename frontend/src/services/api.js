import axios from 'axios'
import { tokenStorage } from './tokenStorage.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  headers: {
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const isPublicRequest = [
    '/auth/login',
    '/auth/register',
    '/businesses',
  ].includes(config.url)
  const token = tokenStorage.get()

  if (token && !isPublicRequest) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config?.url !== '/auth/login'
    ) {
      tokenStorage.clear()
      window.dispatchEvent(new Event('auth:expired'))
    }

    return Promise.reject(error)
  },
)

export default api
