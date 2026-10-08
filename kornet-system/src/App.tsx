import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import AppShell from './components/AppShell'
import { PortalHomePage, PortalLoginPage, PublicTrackingPage } from './modules/portal/PortalPages'

function ProtectedApp() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? <AppShell /> : <Navigate to="/login" replace />
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
          {/* Public customer portal & public tracking routes - outside AppShell & auth */}
          <Route path="/portal/login" element={<PortalLoginPage />} />
          <Route path="/portal" element={<PortalHomePage />} />
          <Route path="/track" element={<PublicTrackingPage />} />
          <Route path="/track/:ref" element={<PublicTrackingPage />} />

          {/* Authenticated logistics ERP app */}
          <Route path="/*" element={<ProtectedApp />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
