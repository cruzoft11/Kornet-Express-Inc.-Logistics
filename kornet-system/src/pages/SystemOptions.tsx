import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import GlobalNotificationBell from '../components/GlobalNotificationBell'

export default function SystemOptions() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const darkMode = useSettingsStore((state) => state.darkMode)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className={`font-body min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden ${darkMode ? 'bg-[#0a0f1e] text-gray-100' : 'bg-slate-50/50 text-slate-900'}`}>
      
      {/* Abstract Animated Background */}
      <div className={`absolute top-[10%] left-[10%] w-[50%] h-[70%] rounded-full blur-[120px] -z-10 animate-pulse ${darkMode ? 'bg-indigo-900/20 mix-blend-screen' : 'bg-blue-400/20 mix-blend-multiply'}`} style={{ animationDuration: '8s' }}></div>
      <div className={`absolute bottom-[10%] right-[10%] w-[40%] h-[60%] rounded-full blur-[100px] -z-10 animate-pulse ${darkMode ? 'bg-emerald-900/15 mix-blend-screen' : 'bg-emerald-300/20 mix-blend-multiply'}`} style={{ animationDuration: '10s', animationDelay: '2s' }}></div>

      {/* Top Bar Logging */}
      <div className="absolute top-0 w-full px-8 py-6 flex justify-between items-center z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg">
             AWM
          </div>
          <span className={`font-headline text-lg font-bold tracking-tight ${darkMode ? 'text-gray-200' : 'text-slate-800'}`}>Accounting & Workforce</span>
        </div>
        <div className="flex items-center gap-4">
          <GlobalNotificationBell />
          <button onClick={handleLogout} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${darkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}>
            <span className="material-symbols-outlined text-[18px]">logout</span> Logout
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl z-10 text-center mb-12">
         <h1 className="font-headline text-display-md text-primary tracking-tight mb-3">Welcome, {user?.username}</h1>
         <p className="font-body text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Please select an entry point to proceed into the system infrastructure.
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl z-10 px-4">
        
        {/* Module Entry */}
        <div 
          data-testid="enter-modules-card"
          onClick={() => navigate('/select-company')}
          className={`group relative rounded-[24px] p-8 flex flex-col items-center text-center cursor-pointer transition-all duration-500 hover:-translate-y-2 border shadow-xl overflow-hidden ${
            darkMode 
              ? 'bg-gray-800/40 border-gray-700/50 hover:border-blue-500/50 hover:bg-gray-800/60 hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)] backdrop-blur-xl' 
              : 'bg-white/60 border-white hover:border-blue-400/30 hover:bg-white hover:shadow-[0_20px_40px_rgba(59,130,246,0.1)] backdrop-blur-xl'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          
          <div className="w-20 h-20 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 relative">
             <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
             <span className="material-symbols-outlined text-4xl relative z-10">dashboard</span>
          </div>
          
          <h2 className={`font-headline text-2xl font-bold mb-3 ${darkMode ? 'text-gray-100' : 'text-slate-900'}`}>Financial & Payroll System</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
            Access the core accounting ledgers, voucher processing, human resources, and payroll computation modules.
          </p>
          
          <div className="mt-auto px-6 py-2.5 rounded-full bg-blue-500 text-white font-bold text-sm tracking-wide opacity-90 group-hover:opacity-100 transition-all flex items-center gap-2">
            Enter Modules <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </div>
        </div>

        {/* Settings / Admin Hub */}
        <div 
          data-testid="open-settings-card"
          onClick={() => navigate('/admin-settings')}
          className={`group relative rounded-[24px] p-8 flex flex-col items-center text-center cursor-pointer transition-all duration-500 hover:-translate-y-2 border shadow-xl overflow-hidden ${
            darkMode 
              ? 'bg-gray-800/40 border-gray-700/50 hover:border-purple-500/50 hover:bg-gray-800/60 hover:shadow-[0_20px_40px_rgba(168,85,247,0.15)] backdrop-blur-xl' 
              : 'bg-white/60 border-white hover:border-purple-400/30 hover:bg-white hover:shadow-[0_20px_40px_rgba(168,85,247,0.1)] backdrop-blur-xl'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

          <div className="w-20 h-20 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 relative">
            <div className="absolute inset-0 bg-purple-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <span className="material-symbols-outlined text-4xl relative z-10">admin_panel_settings</span>
          </div>
          
          <h2 className={`font-headline text-2xl font-bold mb-3 ${darkMode ? 'text-gray-100' : 'text-slate-900'}`}>
             {user?.role === 'superadmin' ? 'Administrative Settings' : 'Account Settings'}
          </h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-8">
            {user?.role === 'superadmin' 
              ? 'Manage users, organization structures, and system-wide application preferences.'
              : 'Configure your profile, theme preferences, and personal formatting settings.'}
          </p>
          
          <div className="mt-auto px-6 py-2.5 rounded-full bg-purple-500 text-white font-bold text-sm tracking-wide opacity-90 group-hover:opacity-100 transition-all flex items-center gap-2">
            Open Settings <span className="material-symbols-outlined text-[16px]">tune</span>
          </div>
        </div>

      </div>

      <footer className="absolute bottom-6 text-xs text-on-surface-variant/60 font-mono tracking-widest uppercase z-10">
        iSupplyTech Co. Ltd. • AWM System v3.9.0-Refactored
      </footer>
    </div>
  )
}
