import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { Button, Card, CardContent, Checkbox, FormField, IconButton, Input } from '../components/ui'

export default function Login() {
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const { darkMode, toggleTheme } = useSettingsStore()
  const [username, setUsername] = useState(() => localStorage.getItem('kornet-remembered-username') ?? '')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(Boolean(localStorage.getItem('kornet-remembered-username')))
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { document.title = 'Sign in · Kornet Express' }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const trimmed = username.trim()
      const result = await login(trimmed, password)
      if (result.success) {
        if (remember) localStorage.setItem('kornet-remembered-username', trimmed)
        else localStorage.removeItem('kornet-remembered-username')
        await useSettingsStore.getState().syncStorageForUser(trimmed)
        navigate('/dashboard', { replace: true })
      } else setError(result.message || 'Unable to verify those credentials.')
    } catch { setError('The secure sign-in service is unavailable. Try again shortly.') }
    finally { setLoading(false) }
  }

  return <main className="relative flex min-h-dvh overflow-hidden bg-background text-foreground"><div className="absolute inset-0 app-grid-bg opacity-70" aria-hidden="true" /><section className="relative hidden w-[48%] flex-col justify-between bg-navy p-10 text-navy-foreground lg:flex"><div><img src="/brand/kornet-express-logo.png" alt="Kornet Express" className="h-14 w-14 rounded-2xl bg-white/95 object-contain p-1 shadow-lg" /><p className="mt-5 font-mono text-xs font-semibold uppercase text-white/70">Global logistics solution</p><h1 className="mt-4 max-w-xl text-5xl font-semibold tracking-[-0.045em] text-balance">Move every shipment with certainty.</h1><p className="mt-5 max-w-lg text-base leading-7 text-white/72 text-pretty">One secure workspace for operations, billing, bridge posting, and FS accounting. Designed for fast keyboard-first teams.</p></div><div className="grid grid-cols-3 gap-3 text-xs text-white/72"><div className="rounded-xl border border-white/12 bg-white/8 p-3"><strong className="block text-white">Company-scoped</strong>No company picker.</div><div className="rounded-xl border border-white/12 bg-white/8 p-3"><strong className="block text-white">Audit-ready</strong>Every mutation trails.</div><div className="rounded-xl border border-white/12 bg-white/8 p-3"><strong className="block text-white">Fast entry</strong>Hotkeys and dense grids.</div></div></section><section className="relative flex flex-1 items-center justify-center p-5"><div className="absolute right-5 top-5"><IconButton label={darkMode ? 'Use light mode' : 'Use dark mode'} icon={darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />} variant="outline" onClick={(e) => toggleTheme(e)} /></div><Card className="w-full max-w-md overflow-hidden shadow-xl"><div className="h-1.5 bg-gradient-to-r from-navy via-secondary to-accent" /><CardContent className="p-6 sm:p-8"><div className="mb-7 flex items-center gap-3"><img src="/brand/kornet-express-logo.png" alt="" className="size-10 rounded-xl object-contain" /><div><p className="text-sm font-bold">Kornet Express</p><p className="font-mono text-[11px] uppercase text-muted-foreground">Secure operations access</p></div></div><h2 className="text-2xl font-semibold tracking-[-0.03em]">Sign in</h2><p className="mt-1 text-sm text-muted-foreground">Use your assigned operations credentials.</p>{error && <div className="mt-5 flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert"><ShieldCheck className="size-4 shrink-0" />{error}</div>}<form onSubmit={handleSubmit} className="mt-6 grid gap-4"><FormField label="Username" htmlFor="username" required><Input id="username" name="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} leftIcon={<UserRound className="size-4" />} autoFocus required /></FormField><FormField label="Password" htmlFor="password" required hint={capsLock ? 'Caps Lock is on.' : undefined}><Input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))} leftIcon={<LockKeyhole className="size-4" />} rightSlot={<button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>} required /></FormField><div className="flex items-center justify-between gap-3"><Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))}>Remember username</Checkbox><a className="text-sm font-medium text-secondary hover:underline" href="mailto:support@kornet.example">Need help?</a></div><Button type="submit" loading={loading} className="mt-2 w-full" size="lg">{loading ? 'Verifying access…' : 'Enter operations center'} {!loading && <ArrowRight className="size-4" />}</Button></form><p className="mt-6 text-center text-xs text-muted-foreground">Authorized personnel only · Kornet Express Inc.</p></CardContent></Card></section></main>
}
