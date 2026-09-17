import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserRound,
  X,
  Radio,
  Sparkles,
  ExternalLink,
  Info
} from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { supportService } from '../api/services'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const darkMode = useSettingsStore((state) => state.darkMode)
  const setDarkMode = useSettingsStore((state) => state.setDarkMode)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSupport, setShowSupport] = useState(false)
  const [supportUsername, setSupportUsername] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const [supportSent, setSupportSent] = useState(false)
  const [supportError, setSupportError] = useState('')
  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await login(username.trim(), password)
      if (result.success) {
        await useSettingsStore.getState().syncStorageForUser(username.trim())
        navigate('/logistics')
      } else {
        setError(result.message || 'Authentication failed. Please verify your credentials.')
      }
    } catch {
      setError('The secure sign-in service is currently unreachable. Try again shortly.')
    } finally {
      setLoading(false)
    }
  }

  const handleSupportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSupportError('')
    setSupportSending(true)

    try {
      await supportService.submit({
        name: supportUsername.trim(),
        subject: 'Kornet Express access assistance request',
        message: supportMessage.trim() || 'User requested access help for Kornet Express Logistics.',
      })
      setSupportSent(true)
    } catch {
      setSupportError('Request could not be sent. Please contact system dispatch directly.')
    } finally {
      setSupportSending(false)
    }
  }

  const closeSupport = () => {
    if (supportSending) return
    setShowSupport(false)
    setSupportSent(false)
    setSupportError('')
    setSupportUsername('')
    setSupportMessage('')
  }

  const fillDemoCreds = () => {
    setUsername('admin')
    setPassword('kornet2000')
  }

  return (
    <div className="relative min-h-screen w-full bg-[#061426] text-[#d6e3fe] font-sans antialiased overflow-hidden flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* ══ Animated VisionOS Liquid Light Orbs (Refraction Layer) ══ */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-36 left-1/2 -translate-x-1/2 w-[72rem] h-[40rem] rounded-full bg-blue-600/15 blur-[130px]"
          style={{ animation: 'orb-float-1 18s ease-in-out infinite' }}
        />
        <div
          className="absolute top-1/4 -left-32 w-[38rem] h-[38rem] rounded-full bg-red-600/10 blur-[120px]"
          style={{ animation: 'orb-float-2 22s ease-in-out infinite' }}
        />
        <div
          className="absolute -bottom-10 right-1/4 w-[46rem] h-[46rem] rounded-full bg-emerald-500/12 blur-[140px]"
          style={{ animation: 'orb-float-3 20s ease-in-out infinite' }}
        />
        {/* Subtle cartographic grid SVG */}
        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient cx="50%" cy="40%" id="login-glow" r="60%">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
              <stop offset="60%" stopColor="#061426" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#061426" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect fill="url(#login-glow)" height="100%" width="100%" />
          <g fill="none" opacity="0.3" stroke="#93c5fd" strokeDasharray="3 6" strokeWidth="0.75">
            <path d="M -100 240 Q 420 80, 880 260 T 1920 180" />
            <path d="M 120 720 Q 640 480, 1200 620 T 2120 490" />
          </g>
        </svg>
      </div>

      {/* ══ Top Corporate Glass Bar ══ */}
      <header className="relative z-20 h-16 w-full px-6 md:px-10 flex items-center justify-between liquid-glass border-x-0 border-t-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/10 p-1.5 flex items-center justify-center border border-white/20 shadow-md">
            <img
              src="/brand/kornet-express-logo.png"
              alt="Kornet Express Logo"
              className="h-full w-auto object-contain"
              onError={(e) => {
                // Fallback SVG mark if image path differs
                e.currentTarget.style.display = 'none'
              }}
            />
            <Radio className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-tight text-white text-sm md:text-base">KORNET EXPRESS, INC.</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/20">
                v4.8 LTS
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-[#c3c6d7]/75">
              Multimodal Operating System &bull; powered by iSupplyTech
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Service Beacon */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0e1c2f]/70 border border-white/10 text-[11px] font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
            </span>
            <span className="text-[#c3c6d7]">FS CLOUD: <strong className="text-emerald-400">ONLINE</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg liquid-glass-subtle text-xs text-[#c3c6d7] hover:text-white transition-all"
            title="Toggle theme appearance"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5 text-blue-300" />}
            <span>{darkMode ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </header>

      {/* ══ Center Authentication Stage ══ */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-[480px]">
          {/* Specular Liquid Card */}
          <div className="relative rounded-2xl liquid-glass border border-white/15 p-6 md:p-8 shadow-[0_30px_80px_rgba(2,14,33,0.85)]">
            {/* Specular Top Line */}
            <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />

            {/* Header / Intro */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-[11px] font-mono text-blue-300 uppercase tracking-wider mb-2.5">
                <Sparkles className="w-3 h-3 text-blue-400" />
                <span>Secure Operations Gateway</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Logistics Operations Hub</h1>
              <p className="text-xs text-[#c3c6d7] mt-1">
                International Air &amp; Ocean Freight &bull; Customs Clearance &bull; Inland Fleet Dispatch
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5 shadow-sm">
                <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#c3c6d7] uppercase tracking-wider mb-1.5">
                  Dispatcher / Operator ID
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserRound className="w-4 h-4 text-blue-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g. admin or dispatcher ID"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl input-glass font-mono text-xs text-white placeholder-slate-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#c3c6d7] uppercase tracking-wider">
                    Access Key / Password
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">Authorized personnel</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <LockKeyhole className="w-4 h-4 text-blue-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter security key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl input-glass font-mono text-xs text-white placeholder-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 border border-white/20 shadow-[0_4px_20px_rgba(37,99,235,0.45),inset_0_1px_1px_rgba(255,255,255,0.35)] transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? 'Authenticating Security Session...' : 'Enter Operations Center'}</span>
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />}
              </button>
            </form>

            {/* Quick Helper Badge */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={fillDemoCreds}
                className="text-[11px] font-mono text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                title="Populate admin credentials"
              >
                <span>Demo Creds (admin / kornet2000)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSupport(true)}
                className="text-[11px] text-[#c3c6d7] hover:text-white transition-colors"
              >
                Need access help?
              </button>
            </div>

            {/* Telemetry Status Footer */}
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                TLS 1.3 ENCRYPTED
              </span>
              <span>BOC CMTA 10863 READY</span>
              <span>SEC-ALPHA-99</span>
            </div>
          </div>
        </div>
      </main>

      {/* ══ Footer Bar ══ */}
      <footer className="relative z-10 px-6 py-4 border-t border-white/10 text-xs text-[#c3c6d7]/70 flex flex-wrap items-center justify-between gap-3 bg-[#061426]/60 backdrop-blur-md">
        <div>
          <span>&copy; {new Date().getFullYear()} <strong>KORNET EXPRESS, INC.</strong> &bull; Parañaque City, Metro Manila, Philippines</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setShowLegalModal('terms')}
            className="hover:underline hover:text-white transition-colors"
          >
            Trading Terms &amp; Conditions
          </button>
          <span>&bull;</span>
          <button
            type="button"
            onClick={() => setShowLegalModal('privacy')}
            className="hover:underline hover:text-white transition-colors"
          >
            Data Privacy (RA 10173)
          </button>
        </div>
      </footer>

      {/* ══ Support Request Modal ══ */}
      {showSupport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" onMouseDown={closeSupport}>
          <div
            className="relative w-full max-w-md rounded-2xl liquid-glass border border-white/20 p-6 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <p className="text-[10px] uppercase font-mono text-blue-400 tracking-wider">Help Desk</p>
                <h2 className="text-lg font-bold text-white">Access Assistance</h2>
              </div>
              <button
                type="button"
                onClick={closeSupport}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {supportSent ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-3 border border-emerald-500/30">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-white mb-1">Dispatch Request Logged</h3>
                <p className="text-xs text-[#c3c6d7] mb-4">
                  The system administrator and operations controller have been alerted to reset your credentials.
                </p>
                <button
                  type="button"
                  onClick={closeSupport}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[#c3c6d7] mb-1">Your Operator ID or Email</label>
                  <input
                    value={supportUsername}
                    onChange={(e) => setSupportUsername(e.target.value)}
                    required
                    placeholder="operator@kornet.com.ph"
                    className="w-full px-3.5 py-2 rounded-xl input-glass text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#c3c6d7] mb-1">Issue Description</label>
                  <textarea
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Detail access error or locked session..."
                    rows={3}
                    className="w-full px-3.5 py-2 rounded-xl input-glass text-xs"
                  />
                </div>
                {supportError && <p className="text-xs text-red-400">{supportError}</p>}
                <button
                  type="submit"
                  disabled={supportSending}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs text-white shadow-md transition-colors disabled:opacity-50"
                >
                  {supportSending ? 'Submitting...' : 'Send Secure Notification'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ══ Legal & Compliance Modal ══ */}
      {showLegalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onMouseDown={() => setShowLegalModal(null)}>
          <div
            className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl liquid-glass border border-white/20 p-6 shadow-2xl text-slate-200"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <p className="text-xs font-mono text-blue-400 uppercase tracking-wider">Philippine Statutory Compliance</p>
                <h2 className="text-xl font-bold text-white mt-0.5">
                  {showLegalModal === 'privacy' ? 'Data Privacy Statement (RA 10173)' : 'Standard Trading Terms & Conditions'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLegalModal(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-4 text-xs leading-relaxed text-[#c3c6d7]">
              {showLegalModal === 'privacy' ? (
                <>
                  <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-500/30 text-blue-200">
                    <strong>Notice:</strong> Kornet Express, Inc. is committed to upholding your privacy rights in compliance with <strong>Republic Act No. 10173</strong> (<em>Data Privacy Act of 2012</em>), its Implementing Rules and Regulations (IRR), and circulars of the <strong>National Privacy Commission (NPC)</strong>.
                  </div>
                  <h4 className="font-bold text-white text-sm">1. Scope and Collection of Operational Data</h4>
                  <p>
                    Kornet Express, Inc. processes consignor, consignee, bill of lading, container manifest, and customs declaration data strictly for the fulfillment of international freight carriage, Bureau of Customs (BOC) e2m declarations, Philippine Ports Authority (PPA) permits, and domestic cartage.
                  </p>
                  <h4 className="font-bold text-white text-sm">2. Lawful Basis and Processing</h4>
                  <p>
                    Data processing is executed under Sections 12 and 13 of RA 10173 and the Customs Modernization and Tariff Act (CMTA / RA 10863).
                  </p>
                  <div className="p-3 bg-slate-900/60 rounded-xl font-mono text-[11px] space-y-1 border border-white/10">
                    <p><strong>Corporate Entity:</strong> Kornet Express, Inc.</p>
                    <p><strong>Head Office:</strong> JJM Building, No. 5 Ninoy Aquino Avenue, Brgy. San Dionisio, Parañaque City, Metro Manila 1700</p>
                    <p><strong>Contact:</strong> (+63) 2-8826-0012 to 14 &bull; cs.impex@kornet.com.ph</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-slate-900/50 rounded-xl border border-white/10 text-slate-300">
                    All freight forward bookings, bills of lading, customs declarations, cartage dispatch, and warehousing services rendered by <strong>Kornet Express, Inc.</strong> are governed by Philippine commercial laws and international maritime conventions.
                  </div>
                  <h4 className="font-bold text-white text-sm">1. Forwarder &amp; Broker Mandate</h4>
                  <p>
                    Kornet Express, Inc. acts as an authorized international freight forwarder, non-vessel operating common carrier (NVOCC), and licensed customs broker under the CMTA (RA 10863) and COGSA.
                  </p>
                  <h4 className="font-bold text-white text-sm">2. Shipper Warranty</h4>
                  <p>
                    The shipper certifies that cargo manifests, descriptions, Harmonized Tariff Codes, and invoice valuations are accurate and fully compliant with Bureau of Customs requirements.
                  </p>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLegalModal(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md transition-colors"
              >
                Close &amp; Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
