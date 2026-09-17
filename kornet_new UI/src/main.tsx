import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import App from './App'
import './index.css'
import { COMPANY_HEADER_NAME } from './config/companies'
import { useSavingStore } from './stores/savingStore'
import { useAuthStore } from './stores/authStore'
import { useCompanyStore } from './stores/companyStore'
// Initialize the shared axios `api` instance (services/hooks use it).
import './api/client'

const AUTH_ROUTES = ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout']

const isApiRequest = (url: string) => {
  if (url.startsWith('/api/')) return true
  try {
    return new URL(url, window.location.origin).pathname.startsWith('/api/')
  } catch {
    return false
  }
}
const isAuthRoute = (url: string) => AUTH_ROUTES.some((r) => url.includes(r))

/**
 * Global auth shim for any legacy `fetch('/api/...')` or default-`axios` calls
 * that don't go through the typed `api` client. Reads tokens/company straight
 * from the Zustand stores and refreshes once on 401 (single-flight lives in the
 * auth store).
 */
function installApiAuthInterceptor() {
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

    if (!isApiRequest(requestUrl)) return originalFetch(input, init)

    const headers = new Headers(init?.headers ?? {})
    const { accessToken } = useAuthStore.getState()
    if (accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
    if (!isAuthRoute(requestUrl)) {
      const company = useCompanyStore.getState().selectedCompanyCode
      if (company && !headers.has(COMPANY_HEADER_NAME)) headers.set(COMPANY_HEADER_NAME, company)
    }

    const firstResponse = await originalFetch(input, { ...init, headers })
    if (firstResponse.status !== 401 || isAuthRoute(requestUrl)) return firstResponse

    const newAccessToken = await useAuthStore.getState().refresh()
    if (!newAccessToken) return firstResponse

    const retryHeaders = new Headers(init?.headers ?? {})
    retryHeaders.set('Authorization', `Bearer ${newAccessToken}`)
    if (!isAuthRoute(requestUrl)) {
      const company = useCompanyStore.getState().selectedCompanyCode
      if (company) retryHeaders.set(COMPANY_HEADER_NAME, company)
    }
    return originalFetch(input, { ...init, headers: retryHeaders })
  }

  axios.interceptors.request.use((config) => {
    const requestUrl = config.url ?? ''
    if (!isApiRequest(requestUrl)) return config

    const { accessToken } = useAuthStore.getState()
    if (accessToken) {
      config.headers = config.headers ?? {}
      ;(config.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`
    }
    if (!isAuthRoute(requestUrl)) {
      const company = useCompanyStore.getState().selectedCompanyCode
      if (company) {
        config.headers = config.headers ?? {}
        ;(config.headers as Record<string, string>)[COMPANY_HEADER_NAME] = company
      }
    }
    if (config.method === 'post' || config.method === 'put' || config.method === 'patch') {
      useSavingStore.getState().setStatus('saving')
    }
    return config
  })

  axios.interceptors.response.use(
    (response) => {
      const method = response.config?.method
      if (method === 'post' || method === 'put' || method === 'patch') {
        useSavingStore.getState().triggerSave()
      }
      return response
    },
    async (error) => {
      const status = error?.response?.status
      const originalRequest = error?.config
      const requestUrl = originalRequest?.url ?? ''
      if (status !== 401 || isAuthRoute(requestUrl) || !originalRequest || originalRequest._retry) {
        return Promise.reject(error)
      }
      originalRequest._retry = true
      const newAccessToken = await useAuthStore.getState().refresh()
      if (!newAccessToken) return Promise.reject(error)
      originalRequest.headers = originalRequest.headers ?? {}
      ;(originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newAccessToken}`
      return axios(originalRequest)
    },
  )
}

installApiAuthInterceptor()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <div id="zoom-wrapper" style={{ width: '100%', height: '100%', margin: 0, padding: 0 }}>
        <App />
      </div>
    </QueryClientProvider>
  </React.StrictMode>,
)
