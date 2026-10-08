import { Suspense, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Command } from 'cmdk'
import { Bell, ChevronLeft, ChevronRight, CircleUserRound, HelpCircle, LogOut, Menu, Moon, Plus, Search, Settings, Sun } from 'lucide-react'
import { appRoutes } from '../routes'
import { searchGlobal, type GlobalSearchItem } from '../modules/dashboard/globalSearch'
import { useAuthStore } from '../stores/authStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useCompanyStore } from '../stores/companyStore'
import { useLogisticsStore } from '../stores/logisticsStore'
import { useHotkeys, type Hotkey } from '../hooks/useHotkeys'
import { Button, Dialog, DialogContent, EmptyState, IconButton, Kbd, Sheet, SheetContent, Skeleton, Toast } from './ui'
import PrintDocumentModal from './logistics/PrintDocumentModal'
import AuditLogModal from './logistics/AuditLogModal'
import AttachmentModal from './logistics/AttachmentModal'
import ContainerStuffingModal from './logistics/ContainerStuffingModal'
import OceanManifestModal from './logistics/OceanManifestModal'
import NewChargeModal from './logistics/NewChargeModal'
import FileAnalysisModal from './logistics/FileAnalysisModal'
import { SEDFilingModal, BillingCodesModal, CarriersDirectoryModal, PortsDirectoryModal, SystemDiagnosticsModal } from './logistics/LogisticsAuxModals'
import { cn } from '@/lib/cn'

const groupOrder = ['Dashboard', 'Operations', 'Billing', 'Ledger (FS)', 'Directories', 'Admin']
const roleAliases: Record<string, string> = { manager: 'manager', superadmin: 'superadmin', admin: 'admin', operator: 'operations', accountant: 'accounting', viewer: 'viewer' }

function canSee(routeRoles: string[] | undefined, role: string | undefined) {
  if (!routeRoles?.length) return true
  const normalized = roleAliases[role ?? ''] ?? role
  if (normalized === 'superadmin') return true
  return routeRoles.includes(normalized ?? '')
}

function AppRoutesView() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        {appRoutes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={
              <motion.div
                className="min-h-full"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                <Suspense fallback={<div className="p-6"><Skeleton className="h-80" /></div>}>
                  {route.element}
                </Suspense>
              </motion.div>
            }
          />
        ))}
        <Route path="/logistics" element={<Navigate to="/dashboard" replace />} />
        <Route path="/billing" element={<Navigate to="/billing/invoices" replace />} />
        <Route path="*" element={<EmptyState title="Module not found" description="Choose a workflow from the sidebar or command palette." />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const selectedCompanyCode = useCompanyStore((s) => s.selectedCompanyCode)
  const { darkMode, compactSidebar, setCompactSidebar, density, setDensity, toggleTheme } = useSettingsStore()
  const setActiveModule = useLogisticsStore((s) => s.setActiveModule)
  const [commandOpen, setCommandOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [gPending, setGPending] = useState(false)

  useEffect(() => {
    const handleOpen = () => setCommandOpen(true)
    window.addEventListener('kornet:open-command', handleOpen)
    return () => window.removeEventListener('kornet:open-command', handleOpen)
  }, [])

  useEffect(() => {
    const map: Record<string, string> = { 'ocean-export': 'ocean-export', 'ocean-import': 'ocean-import', 'air-export': 'air-export', 'air-import': 'air-import', vehicles: 'vehicles', 'pd-orders': 'pd', fleet: 'fleet', tracking: 'tracking', 'accounting-bridge': 'bridge' }
    const key = Object.keys(map).find((k) => location.pathname.includes(k))
    if (key) setActiveModule(map[key] as Parameters<typeof setActiveModule>[0])
  }, [location.pathname, setActiveModule])

  const visibleRoutes = useMemo(() => appRoutes.filter((r) => canSee(r.roles, user?.role)), [user?.role])
  const grouped = useMemo(() => groupOrder.map((group) => ({ group, routes: visibleRoutes.filter((r) => r.group === group && !r.hidden) })).filter((g) => g.routes.length), [visibleRoutes])
  const active = visibleRoutes.find((r) => location.pathname === r.path || location.pathname.startsWith(`${r.path}/`))
  const company = user?.companies?.[0] ?? selectedCompanyCode ?? 'KORNET'

  const hotkeys: Hotkey[] = useMemo(() => [
    { key: 'Mod+K', description: 'Open command palette', handler: () => setCommandOpen(true) },
    { key: '?', description: 'Open shortcuts', handler: () => setShortcutsOpen(true) },
    { key: '/', description: 'Focus global search', handler: () => setCommandOpen(true) },
    { key: 'N', description: 'New record in current module', handler: () => setCommandOpen(true) },
    { key: 'Escape', description: 'Close panel/dialog', handler: () => { setCommandOpen(false); setShortcutsOpen(false); setMobileOpen(false); setGPending(false) } },
    { key: 'G', description: 'Start go-to sequence', handler: () => setGPending(true) },
    ...['O','A','P','V','B','F','D'].map((key) => ({ key, description: `Go ${key}`, when: gPending, handler: () => { const target: Record<string, string> = { O: '/logistics/ocean-export', A: '/logistics/air-export', P: '/logistics/pd-orders', V: '/logistics/vehicles', B: '/billing/accounting-bridge', F: '/logistics/fleet', D: '/dashboard' }; navigate(target[key]); setGPending(false) } })),
  ], [gPending, navigate])
  useHotkeys(hotkeys)

  const sidebar = (
    <aside className={cn('flex h-full flex-col border-r bg-card shadow-sm transition-[width] duration-150 ease-out', compactSidebar ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]')}>
      <div className="flex h-16 items-center gap-3 border-b px-3">
        <img src="/brand/kornet-express-logo.png" alt="Kornet Express" className="size-9 rounded-lg object-contain" />
        {!compactSidebar && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">Kornet Express</p>
            <p className="truncate font-mono text-[10px] uppercase text-muted-foreground">Logistics + Accounting</p>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-2 custom-scrollbar" aria-label="Primary navigation">
        {grouped.map(({ group, routes }) => (
          <div key={group} className="mb-4">
            <p className={cn('px-2 py-2 text-[10px] font-bold uppercase text-muted-foreground', compactSidebar && 'sr-only')}>{group}</p>
            <ul className="space-y-1">
              {routes.map((route) => {
                const Icon = route.icon
                const isActive = location.pathname === route.path || location.pathname.startsWith(`${route.path}/`)
                return (
                  <li key={route.path}>
                    <Link
                      to={route.path}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                      )}
                      title={route.label}
                    >
                      <Icon className="size-4 shrink-0" />
                      {!compactSidebar && <span className="truncate">{route.label}</span>}
                      {!compactSidebar && route.shortcut && <span className="ml-auto font-mono text-[10px] opacity-70">{route.shortcut}</span>}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t p-2">
        <button
          type="button"
          onClick={() => setCompactSidebar(!compactSidebar)}
          className="flex h-10 w-full items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={compactSidebar ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {compactSidebar ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-background text-foreground">
      <div className="hidden lg:block">{sidebar}</div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent title="Navigation" side="left" className="p-0">
          <div className="h-full">{sidebar}</div>
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top flex h-16 shrink-0 items-center gap-3 border-b bg-background/88 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/72 sm:px-5">
          <IconButton label="Open navigation" icon={<Menu className="size-4" />} variant="ghost" className="lg:hidden" onClick={() => setMobileOpen(true)} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/dashboard" className="hover:text-foreground">Kornet</Link>
              <span>/</span>
              <span className="truncate">{active?.group ?? 'Workspace'}</span>
            </div>
            <h1 className="truncate text-sm font-semibold sm:text-base">{active?.label ?? 'Operations workspace'}</h1>
          </div>
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="hidden h-10 min-w-[18rem] items-center gap-2 rounded-lg border bg-card px-3 text-left text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1">Search docs, containers, invoices…</span>
            <Kbd>⌘K</Kbd>
          </button>
          <div className="hidden items-center rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground xl:flex">
            <span className="mr-2 size-2 rounded-full bg-success" />{company}
          </div>
          <Button variant="outline" size="sm" onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}>
            {density === 'compact' ? 'Compact' : 'Comfort'}
          </Button>
          <IconButton label={darkMode ? 'Use light mode' : 'Use dark mode'} icon={darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />} variant="ghost" onClick={(e) => toggleTheme(e)} />
          <IconButton label="Notifications" icon={<Bell className="size-4" />} variant="ghost" />
          <IconButton label="Shortcuts" icon={<HelpCircle className="size-4" />} variant="ghost" onClick={() => setShortcutsOpen(true)} />
          <div className="group relative">
            <IconButton label="User menu" icon={<CircleUserRound className="size-4" />} variant="ghost" />
            <div className="invisible absolute right-0 z-dropdown mt-2 w-64 rounded-xl border bg-popover p-2 opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="px-2 py-2">
                <p className="font-semibold">{user?.fullName || user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.role} · {company}</p>
              </div>
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted" onClick={() => navigate('/admin/settings')}>
                <Settings className="size-4" />Settings
              </button>
              <button className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-destructive hover:bg-muted" onClick={() => void logout()}>
                <LogOut className="size-4" />Sign out
              </button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto p-3 sm:p-5 custom-scrollbar">
          <AppRoutesView />
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} routes={visibleRoutes} />
      <Shortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} hotkeys={hotkeys} />
      <LegacyModals />
      <Toast />
    </div>
  )
}

function CommandPalette({ open, onOpenChange, routes }: { open: boolean; onOpenChange: (v: boolean) => void; routes: typeof appRoutes }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchItem[]>([])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }
    const timer = setTimeout(() => {
      searchGlobal(q).then(setResults).catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const resolveTarget = (item: GlobalSearchItem) => {
    if (item.type === 'shipment') return `/logistics/files/${item.id}`
    if (item.type === 'invoice') return '/billing/invoices'
    if (item.type === 'pdOrder') return '/logistics/pd-orders'
    if (item.type === 'vehicle') return '/logistics/vehicles'
    if (item.type === 'party') return '/directories/parties'
    return item.route ?? '/dashboard'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Command center" description="Navigate, create records, or search document numbers." className="p-0">
        <Command className="overflow-hidden rounded-xl">
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 text-muted-foreground" />
            <Command.Input
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Type a module, action, BL, AWB, VIN, invoice…"
              value={query}
              onValueChange={setQuery}
            />
          </div>
          <Command.List className="max-h-96 overflow-auto p-2 custom-scrollbar">
            <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
              {query ? 'No matching records found.' : 'Type to search across documents, containers, invoices, and parties.'}
            </Command.Empty>
            {results.length > 0 && (
              <Command.Group heading="Search results">
                {results.map((item) => (
                  <Command.Item
                    key={`${item.type}-${item.id}`}
                    value={`${item.label} ${item.sublabel ?? ''} ${item.type}`}
                    onSelect={() => {
                      navigate(resolveTarget(item))
                      onOpenChange(false)
                    }}
                    className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted"
                  >
                    <Search className="size-4 text-muted-foreground shrink-0" />
                    <span className="font-semibold">{item.label}</span>
                    {item.sublabel && <span className="text-xs text-muted-foreground">({item.sublabel})</span>}
                    <span className="ml-auto text-xs font-mono uppercase text-muted-foreground">{item.type}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            <Command.Group heading="Navigate">
              {routes.map((route) => (
                <Command.Item
                  key={route.path}
                  value={`${route.label} ${route.group}`}
                  onSelect={() => {
                    navigate(route.path)
                    onOpenChange(false)
                  }}
                  className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted"
                >
                  <route.icon className="size-4" />
                  {route.label}
                  <span className="ml-auto text-xs text-muted-foreground">{route.group}</span>
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Quick actions">
              <Command.Item
                className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted"
                onSelect={() => {
                  navigate('/logistics/ocean-export?new=1')
                  onOpenChange(false)
                }}
              >
                <Plus className="size-4" />Create shipment / file
              </Command.Item>
              <Command.Item
                className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted"
                onSelect={() => {
                  navigate('/billing/invoices')
                  onOpenChange(false)
                }}
              >
                <Plus className="size-4" />Create invoice
              </Command.Item>
              <Command.Item
                className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted"
                onSelect={() => {
                  navigate('/directories/parties')
                  onOpenChange(false)
                }}
              >
                <Plus className="size-4" />Create party
              </Command.Item>
              <Command.Item
                className="flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-sm aria-selected:bg-muted"
                onSelect={() => {
                  navigate('/logistics/pd-orders?new=1')
                  onOpenChange(false)
                }}
              >
                <Plus className="size-4" />Create P/D order
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

function Shortcuts({ open, onOpenChange, hotkeys }: { open: boolean; onOpenChange: (v: boolean) => void; hotkeys: Hotkey[] }) {
  const unique = hotkeys.filter((h, i, arr) => arr.findIndex((x) => x.key === h.key && x.description === h.description) === i && !h.when)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Keyboard shortcuts" description="Designed for fast freight and accounting data entry.">
        <div className="grid gap-2 sm:grid-cols-2">
          {unique.map((h) => (
            <div key={`${h.key}-${h.description}`} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm">{h.description}</span>
              <Kbd>{h.key.replace('Mod', 'Ctrl/⌘')}</Kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LegacyModals() {
  return (
    <>
      <PrintDocumentModal />
      <AuditLogModal />
      <AttachmentModal />
      <ContainerStuffingModal />
      <OceanManifestModal />
      <NewChargeModal />
      <FileAnalysisModal />
      <SEDFilingModal />
      <BillingCodesModal />
      <CarriersDirectoryModal />
      <PortsDirectoryModal />
      <SystemDiagnosticsModal />
    </>
  )
}
