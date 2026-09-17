import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { useSettingsStore } from './stores/settingsStore'
import EasterEgg from './components/EasterEgg'
import ErrorBoundary from './components/ErrorBoundary'
import Login from './pages/Login'
import FSSystem from './pages/FSSystem'
import LogisticsSystem from './pages/LogisticsSystem'

function AppContent() {
  const { isAuthenticated } = useAuthStore()

  return (
    <>
      <EasterEgg />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/logistics" replace /> : <Login />} />
        
        {/* Dedicated Kornet Express Suite locks straight to unified system */}
        <Route
          path="/select-company"
          element={isAuthenticated ? <Navigate to="/logistics" replace /> : <Navigate to="/login" />}
        />
        
        {/* Unified Application Root: No separate gateway screen */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Navigate to="/logistics" replace /> : <Navigate to="/login" />} 
        />
        
        {/* Unified Logistics Operations Suite */}
        <Route 
          path="/logistics/*" 
          element={isAuthenticated ? <LogisticsSystem /> : <Navigate to="/login" />} 
        />
        
        {/* Unified Financial Statements (FS) System */}
        <Route 
          path="/fs/*" 
          element={isAuthenticated ? <FSSystem /> : <Navigate to="/login" />} 
        />
        
        {/* Root and Fallbacks */}
        <Route path="/" element={<Navigate to={isAuthenticated ? '/logistics' : '/login'} replace />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? '/logistics' : '/login'} replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  const darkMode = useSettingsStore((s) => s.darkMode)
  
  return (
    <div className={darkMode ? 'dark' : ''}>
      <ErrorBoundary>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ErrorBoundary>
    </div>
  )
}
