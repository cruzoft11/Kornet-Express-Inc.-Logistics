import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Moon, ShieldCheck, Sun, UserRound, X } from 'lucide-react'
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
        setError(result.message || 'Unable to verify those credentials.')
      }
    } catch {
      setError('The secure sign-in service is unavailable. Try again shortly.')
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
        subject: 'Kornet Express account access assistance',
        message: supportMessage.trim() || 'The user needs help accessing the Kornet Express operations system.',
      })
      setSupportSent(true)
    } catch {
      setSupportError('Request could not be sent. Please contact your system administrator directly.')
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

  const [showLegalModal, setShowLegalModal] = useState<'terms' | 'privacy' | null>(null)

  return (
    <div className={`kornet-auth ${darkMode ? 'kornet-auth-dark' : ''}`}>
      <div className="kornet-auth-grid" aria-hidden="true" />
      <header className="kornet-auth-header">
        <div className="kornet-auth-brand">
          <div className="kornet-auth-mark">
            <img src="/brand/kornet-express-logo.png" alt="Kornet Express, Inc." />
          </div>
          <div>
            <p className="kornet-auth-brand-name">KORNET EXPRESS, INC.</p>
            <p className="kornet-auth-brand-subtitle">Freight &amp; Logistics Operations &bull; Est. 2000</p>
          </div>
        </div>
        <button
          type="button"
          className="kornet-theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
          aria-label={darkMode ? 'Use light mode' : 'Use dark mode'}
          title={darkMode ? 'Use light mode' : 'Use dark mode'}
        >
          {darkMode ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
          <span>{darkMode ? 'Light' : 'Dark'}</span>
        </button>
      </header>

      <main className="kornet-auth-content">
        <section className="kornet-auth-intro">
          <div className="kornet-auth-eyebrow"><span /> OPERATIONS PORTAL</div>
          <h1>Welcome back to<br /><em>Kornet Express, Inc.</em></h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            International Freight Forwarding, Customs Brokerage, Domestic Cartage &amp; Warehouse Operations
          </p>
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-500 font-mono tracking-wide">
              powered by <strong>iSupplyTech Co. Ltd.</strong>
            </p>
          </div>
        </section>

        <section className="kornet-auth-card" aria-labelledby="sign-in-title">
          <div className="kornet-auth-card-topline" />
          <div className="kornet-auth-card-content">
            <div className="kornet-auth-card-heading">
              <p className="kornet-auth-card-kicker">LOGISTICS OPERATIONS</p>
              <h2 id="sign-in-title">Sign in</h2>
              <p>Enter your operations credentials to continue.</p>
            </div>

            {error && (
              <div className="kornet-auth-error" role="alert">
                <ShieldCheck size={17} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="kornet-auth-form">
              <label htmlFor="username">Username</label>
              <div className="kornet-auth-input-wrap">
                <UserRound size={18} aria-hidden="true" />
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Your username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="kornet-auth-label-row">
                <label htmlFor="password">Password</label>
                <span>Authorized users only</span>
              </div>
              <div className="kornet-auth-input-wrap">
                <LockKeyhole size={18} aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="kornet-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <button type="submit" className="kornet-auth-submit" disabled={loading}>
                <span>{loading ? 'Verifying access...' : 'Enter operations center'}</span>
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="kornet-auth-card-footer">
              <span>Authorized personnel access</span>
              <button type="button" onClick={() => setShowSupport(true)}>Need access help?</button>
            </div>
          </div>
        </section>
      </main>

      <footer className="kornet-auth-footer flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-slate-200/60 dark:border-slate-800 text-xs text-slate-500">
        <div>
          <span>&copy; {new Date().getFullYear()} <strong>KORNET EXPRESS, INC.</strong> &bull; JJM Building, No. 5 Ninoy Aquino Ave, Brgy. San Dionisio, Parañaque City</span>
        </div>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setShowLegalModal('terms')} className="hover:underline hover:text-slate-800 dark:hover:text-white">
            Terms &amp; Conditions
          </button>
          <span>&bull;</span>
          <button type="button" onClick={() => setShowLegalModal('privacy')} className="hover:underline hover:text-slate-800 dark:hover:text-white">
            Data Privacy (RA 10173)
          </button>
          <span>&bull;</span>
          <span className="font-mono text-[11px]">powered by iSupplyTech Co. Ltd.</span>
        </div>
      </footer>

      {showSupport && (
        <div className="kornet-auth-modal-backdrop" role="presentation" onMouseDown={closeSupport}>
          <section className="kornet-auth-modal" role="dialog" aria-modal="true" aria-labelledby="support-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="kornet-auth-modal-heading">
              <div>
                <p className="kornet-auth-card-kicker">ACCOUNT SUPPORT</p>
                <h2 id="support-title">Request access help</h2>
              </div>
              <button type="button" onClick={closeSupport} aria-label="Close support dialog"><X size={19} /></button>
            </div>
            {supportSent ? (
              <div className="kornet-auth-support-success">
                <Check size={28} />
                <h3>Request received</h3>
                <p>Your system administrator has been notified. You can close this window.</p>
                <button type="button" className="kornet-auth-submit" onClick={closeSupport}>Close</button>
              </div>
            ) : (
              <form onSubmit={handleSupportSubmit} className="kornet-auth-form">
                <label htmlFor="support-username">Username</label>
                <div className="kornet-auth-input-wrap"><UserRound size={18} /><input id="support-username" value={supportUsername} onChange={(event) => setSupportUsername(event.target.value)} required placeholder="Your username" /></div>
                <label htmlFor="support-message">What do you need?</label>
                <textarea id="support-message" value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} placeholder="Describe the access issue" rows={4} />
                {supportError && <p className="kornet-auth-modal-error" role="alert">{supportError}</p>}
                <button type="submit" className="kornet-auth-submit" disabled={supportSending}>{supportSending ? 'Sending request...' : 'Send secure request'}</button>
              </form>
            )}
          </section>
        </div>
      )}

      {showLegalModal && (
        <div className="kornet-auth-modal-backdrop" role="presentation" onMouseDown={() => setShowLegalModal(null)}>
          <section className="kornet-auth-modal max-w-2xl max-h-[85vh] flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Philippine Legal &amp; Regulatory Compliance</p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {showLegalModal === 'privacy' ? 'Data Privacy Statement (RA 10173)' : 'Standard Trading Terms & Conditions'}
                </h2>
              </div>
              <button type="button" onClick={() => setShowLegalModal(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {showLegalModal === 'privacy' ? (
                <>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 font-medium">
                    <strong>Notice:</strong> Kornet Express, Inc. is committed to upholding your privacy rights in compliance with <strong>Republic Act No. 10173</strong>, also known as the <em>Data Privacy Act of 2012 (DPA)</em>, its Implementing Rules and Regulations (IRR), and all relevant circulars issued by the <strong>National Privacy Commission (NPC)</strong> of the Philippines.
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Scope and Collection of Operational Data</h4>
                  <p>
                    Kornet Express, Inc. collects and processes personal, consignor, consignee, and proprietary commercial cargo data strictly for the purposes of international air and sea freight forwarding, customs brokerage declaration under Bureau of Customs (BOC) e2m protocols, port handling with the Philippine Ports Authority (PPA), and domestic inland transport dispatch.
                  </p>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. Lawful Basis and Processing</h4>
                  <p>
                    Data processing is executed under Sections 12 and 13 of RA 10173, required for fulfillment of international carriage contracts, customs clearance mandates under the Customs Modernization and Tariff Act (CMTA / RA 10863), and civil aviation oversight governed by the Civil Aeronautics Board (CAB).
                  </p>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">3. Data Subject Rights &amp; Officer Contact</h4>
                  <p>
                    Data subjects retain full statutory rights to access, object, rectify, or erase personal records where permissible by law. Inquiries should be directed to the Corporate Compliance Office:
                  </p>
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-mono text-[11px] space-y-1">
                    <p><strong>Corporate Entity:</strong> Kornet Express, Inc.</p>
                    <p><strong>Head Office:</strong> JJM Building, No. 5 Ninoy Aquino Avenue, Brgy. San Dionisio, Parañaque City, Metro Manila 1700, Philippines</p>
                    <p><strong>Hotlines:</strong> (+63) 2-8826-0012 to 14 &bull; (+63) 917-530-4819</p>
                    <p><strong>Official Email:</strong> cs.impex@kornet.com.ph &bull; <strong>Website:</strong> https://kornet.com.ph</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <strong>Applicability:</strong> All freight bookings, customs declarations, cartage dispatch, and warehousing services rendered by <strong>Kornet Express, Inc.</strong> are subject to these Standard Trading Conditions, governed by the laws of the Republic of the Philippines.
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">1. Role as Forwarder &amp; Agent</h4>
                  <p>
                    Kornet Express, Inc. acts as an authorized freight forwarder, non-vessel operating common carrier (NVOCC), and licensed customs broker. All carriage by sea is subject to the provisions of the Carriage of Goods by Sea Act (COGSA) and the bill of lading terms of the operating shipping line. Carriage by air is subject to the Montreal Convention and IATA standard conditions.
                  </p>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">2. Shipper Warranty &amp; Customs Compliance</h4>
                  <p>
                    The shipper and consignee warrant that all cargo descriptions, values, weights, and tariff classifications submitted for Bureau of Customs (BOC) e2m filing are accurate, true, and free from prohibited or undeclared goods under the CMTA (RA 10863). The customer assumes sole liability for duties, taxes, demurrage, and customs penalties resulting from misdeclaration.
                  </p>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">3. Lien &amp; Payment Terms</h4>
                  <p>
                    Kornet Express, Inc. retains a general and particular possessory lien on all shipments, bills of lading, and delivery orders for unpaid freight charges, demurrage, warehousing, and customs disbursements.
                  </p>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">4. Technology Platform Notice</h4>
                  <p>
                    This operations center software is proprietary to Kornet Express, Inc. and powered by <strong>iSupplyTech Co. Ltd.</strong> Unauthorized access, data extraction, or tampering is strictly prohibited and subject to legal prosecution under Philippine cybercrime legislation (RA 10175).
                  </p>
                </>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLegalModal(null)}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
              >
                Close &amp; Acknowledge
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
