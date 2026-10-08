import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Save, Shield, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataGrid, DateInput, EmptyState, FormField, FormSection, Input, NumberInput, PageHeader, Select, Sheet, SheetContent, Switch, Textarea, Toolbar } from '@/components/ui'
import { auditApi, companiesApi, settingsApi, usersApi, type AdminRole, type AuditLog, type CompanySetting, type UserAdmin } from '@/api/admin'
import { useHotkeys } from '@/hooks/useHotkeys'
import { formatDate, formatMoney } from '@/lib/format'
import { useAuthStore } from '@/stores/authStore'
import { useIntegrationsStore, type IntegrationStatus } from '@/stores/integrationsStore'

const roles: AdminRole[] = ['viewer', 'operations', 'accounting', 'manager', 'admin', 'superadmin']
const rank: Record<string, number> = { viewer: 0, operator: 1, operations: 1, accountant: 2, accounting: 2, manager: 3, admin: 4, superadmin: 5 }
function err(e: unknown) { return e instanceof Error ? e.message : 'Request failed' }
function canAssign(own: string, role?: string) { return rank[role ?? 'viewer'] <= rank[own] }
const emptyUser: Partial<UserAdmin> & { password?: string } = { role: 'viewer', active: true, canAccessFs: false, companies: [] }

export function UsersPage() {
  const qc = useQueryClient(); const ownRole = useAuthStore((s) => s.user?.role ?? 'viewer')
  const [draft, setDraft] = useState<Partial<UserAdmin> & { password?: string }>(emptyUser); const [open, setOpen] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: usersApi.list })
  const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: companiesApi.list })
  const save = useMutation({ mutationFn: () => { if (!canAssign(ownRole, draft.role)) throw new Error('Cannot assign a role above your own role'); if (!draft.id && (!draft.password || draft.password.length < 10)) throw new Error('New users require a password of at least 10 characters'); if (draft.password && draft.password.length < 10) throw new Error('Reset password must be at least 10 characters'); return draft.id ? usersApi.update(draft.id, draft) : usersApi.create(draft as Partial<UserAdmin> & { password: string }) }, onSuccess: () => { toast.success('User saved'); setOpen(false); qc.invalidateQueries({ queryKey: ['admin-users'] }) }, onError: (e) => toast.error(err(e)) })
  const remove = useMutation({ mutationFn: (id: string) => usersApi.remove(id), onSuccess: () => { toast.success('User deleted'); qc.invalidateQueries({ queryKey: ['admin-users'] }) }, onError: (e) => toast.error(err(e)) })
  useHotkeys([{ key: 'N', description: 'New user', handler: () => { setDraft(emptyUser); setOpen(true) } }, { key: 'Mod+S', description: 'Save user', when: open, handler: () => save.mutate() }])
  return <div><PageHeader eyebrow="Admin" title="Users" description="Admin-only user maintenance. Password resets enforce 10+ characters in the UI." primaryAction={<Button onClick={() => { setDraft(emptyUser); setOpen(true) }} kbd="N"><Plus className="size-4" />New user</Button>} /><DataGrid loading={isLoading} data={data?.data ?? []} columns={[{ id: 'username', header: 'Username', cell: (u) => <button className="font-semibold text-secondary" onClick={() => { setDraft({ ...u, password: '' }); setOpen(true) }}>{u.username}</button> }, { id: 'fullName', header: 'Name', accessor: 'fullName' }, { id: 'email', header: 'Email', accessor: 'email' }, { id: 'role', header: 'Role', cell: (u) => <Badge status={u.role} tone={u.role.includes('admin') ? 'accent' : 'neutral'} /> }, { id: 'companies', header: 'Companies', cell: (u) => u.companies?.join(', ') || 'All assigned' }, { id: 'active', header: 'Active', cell: (u) => <Badge status={u.active ? 'active' : 'disabled'} tone={u.active ? 'success' : 'danger'} /> }]} /><Sheet open={open} onOpenChange={setOpen}><SheetContent title={draft.id ? 'Edit user' : 'New user'}><div className="grid gap-4"><FormField label="Username" required><Input value={draft.username ?? ''} onChange={(e) => setDraft({ ...draft, username: e.target.value })} disabled={Boolean(draft.id)} /></FormField><FormField label="Full name" required><Input value={draft.fullName ?? ''} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} /></FormField><FormField label="Email"><Input value={draft.email ?? ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} /></FormField><FormField label="Role"><Select value={draft.role ?? 'viewer'} onValueChange={(v) => setDraft({ ...draft, role: v as AdminRole })} options={roles.map((r) => ({ value: r, label: r, disabled: !canAssign(ownRole, r) }))} /></FormField><FormField label="Companies" hint="Comma-separated company codes; blank means all companies allowed by backend rules."><Input value={(draft.companies ?? []).join(',')} onChange={(e) => setDraft({ ...draft, companies: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} list="company-list" /><datalist id="company-list">{companies?.data.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</datalist></FormField><FormField label={draft.id ? 'Reset password' : 'Password'} hint="Minimum 10 characters"><Input type="password" value={draft.password ?? ''} onChange={(e) => setDraft({ ...draft, password: e.target.value })} /></FormField><label className="flex items-center gap-2 text-sm"><Switch checked={draft.active !== false} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />Active</label><label className="flex items-center gap-2 text-sm"><Switch checked={Boolean(draft.canAccessFs)} onCheckedChange={(v) => setDraft({ ...draft, canAccessFs: v })} />Can access FS ledger</label><div className="flex justify-between"><Button variant="destructive" disabled={!draft.id} onClick={() => draft.id && remove.mutate(draft.id)}><Trash2 className="size-4" />Delete</Button><Button onClick={() => save.mutate()} loading={save.isPending} kbd="Ctrl+S"><Save className="size-4" />Save</Button></div></div></SheetContent></Sheet></div>
}

const settingKeys = ['profile', 'bir', 'numbering', 'marginGate', 'ewtDefaults', 'glDefaults', 'bankGlMap'] as const
type SettingsDraft = Record<(typeof settingKeys)[number], string>
function settingsToDraft(rows: CompanySetting[]): SettingsDraft { const out = Object.fromEntries(settingKeys.map((k) => [k, '{}'])) as SettingsDraft; for (const r of rows) if (settingKeys.includes(r.key as (typeof settingKeys)[number])) out[r.key as keyof SettingsDraft] = typeof r.value === 'string' ? r.value : JSON.stringify(r.value, null, 2); return out }
export function CompanySettingsPage() {
  const qc = useQueryClient(); const { data: settings, isLoading } = useQuery({ queryKey: ['company-settings'], queryFn: settingsApi.list }); const { data: companies } = useQuery({ queryKey: ['companies'], queryFn: companiesApi.list })
  const [draft, setDraft] = useState<SettingsDraft | null>(null); const rows = settings?.data ?? []; const current = draft ?? settingsToDraft(rows)
  const save = useMutation({ mutationFn: async () => { for (const key of settingKeys) { const existing = rows.find((r) => r.key === key); const raw = current[key]; let value: unknown = raw; try { value = JSON.parse(raw) } catch { value = raw } if (existing) await settingsApi.update(existing.id, { key, value }); else await settingsApi.create({ key, value }) } }, onSuccess: () => { toast.success('Company settings saved'); setDraft(null); qc.invalidateQueries({ queryKey: ['company-settings'] }) }, onError: (e) => toast.error(err(e)) })
  useHotkeys([{ key: 'Mod+S', description: 'Save settings', handler: () => save.mutate() }])
  if (isLoading) return <Card><CardContent className="p-8">Loading settings…</CardContent></Card>
  return <div><PageHeader eyebrow="Admin" title="Company settings" description="Document identity, compliance, margin gates, GL defaults, bank mapping and numbering previews." primaryAction={<Button onClick={() => save.mutate()} loading={save.isPending} kbd="Ctrl+S"><Save className="size-4" />Save settings</Button>} /><div className="grid gap-4 xl:grid-cols-[1fr_22rem]"><div className="space-y-4"><FormSection title="Company profile" description="Name, TIN, address, VAT registration and BIR/ATP fields as JSON."><JsonArea label="Profile" value={current.profile} onChange={(v) => setDraft({ ...current, profile: v })} /><JsonArea label="BIR / ATP" value={current.bir} onChange={(v) => setDraft({ ...current, bir: v })} /></FormSection><FormSection title="Controls and accounting defaults"><JsonArea label="Margin gate %" value={current.marginGate} onChange={(v) => setDraft({ ...current, marginGate: v })} /><JsonArea label="EWT defaults" value={current.ewtDefaults} onChange={(v) => setDraft({ ...current, ewtDefaults: v })} /><JsonArea label="GL defaults mapping" value={current.glDefaults} onChange={(v) => setDraft({ ...current, glDefaults: v })} /><JsonArea label="Bank → GL mapping" value={current.bankGlMap} onChange={(v) => setDraft({ ...current, bankGlMap: v })} /></FormSection><FormSection title="Numbering formats"><JsonArea label="Formats" value={current.numbering} onChange={(v) => setDraft({ ...current, numbering: v })} /><PreviewNumber formats={current.numbering} /></FormSection></div><Card><CardHeader><CardTitle>Company record</CardTitle><CardDescription>Core company data comes from /companies; settings extend document output.</CardDescription></CardHeader><CardContent>{companies?.data[0] ? <div className="space-y-2 text-sm"><p className="font-semibold">{companies.data[0].name}</p><p>{companies.data[0].tin}</p><p>{companies.data[0].address}</p><p>{companies.data[0].email}</p></div> : <EmptyState title="No active company returned" />}</CardContent></Card></div></div>
}
function JsonArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) { return <FormField label={label}><Textarea className="min-h-32 font-mono text-xs" value={value} onChange={(e) => onChange(e.target.value)} /></FormField> }
function PreviewNumber({ formats }: { formats: string }) { let obj: Record<string, string> = {}; try { obj = JSON.parse(formats) as Record<string, string> } catch { obj = {} } return <div className="rounded-lg border bg-muted/40 p-3 text-sm"><p className="font-semibold">Preview</p>{Object.entries(obj).length ? Object.entries(obj).map(([k, f]) => <p key={k} className="font-mono">{k}: {f.replace('YYYY', String(new Date().getFullYear())).replace('NNNNN', '00001').replace('NNNNNN', '000001')}</p>) : <p className="text-muted-foreground">Enter JSON such as {`{"invoice":"SI-YYYY-NNNNNN"}`}.</p>}</div> }

export function AuditLogPage() { const [entity, setEntity] = useState(''); const [user, setUser] = useState(''); const [from, setFrom] = useState(''); const { data, isLoading } = useQuery({ queryKey: ['audit', entity], queryFn: () => auditApi.list({ entity: entity || undefined, pageSize: 200 }) }); const rows = useMemo(() => (data?.data ?? []).filter((r) => (!user || (r.username ?? '').toLowerCase().includes(user.toLowerCase())) && (!from || new Date(r.createdAt) >= new Date(from))), [data, user, from]); return <div><PageHeader eyebrow="Admin" title="Audit log" description="Company-scoped audit trail with entity, user, date filters and raw diff detail." /><Toolbar><Input placeholder="Entity" value={entity} onChange={(e) => setEntity(e.target.value)} /><Input placeholder="User" value={user} onChange={(e) => setUser(e.target.value)} /><DateInput value={from} onValueChange={setFrom} /></Toolbar><DataGrid loading={isLoading} data={rows} columns={[{ id: 'createdAt', header: 'When', cell: (r) => formatDate(r.createdAt) }, { id: 'username', header: 'User', accessor: 'username' }, { id: 'action', header: 'Action', cell: (r) => <Badge status={r.action} /> }, { id: 'entity', header: 'Entity', accessor: 'entity' }, { id: 'detail', header: 'Diff', cell: (r) => <DiffView row={r} /> }]} /></div> }
function DiffView({ row }: { row: AuditLog }) { return <details className="max-w-xl"><summary className="cursor-pointer text-secondary">View diff</summary><pre className="mt-2 max-h-60 overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(row.detail ?? {}, null, 2)}</pre></details> }
export function IntegrationsPage() {
  const items = useIntegrationsStore((s) => s.items)
  const setStatus = useIntegrationsStore((s) => s.setStatus)
  const fetchIntegrations = useIntegrationsStore((s) => s.fetchIntegrations)

  useEffect(() => {
    void fetchIntegrations()
  }, [fetchIntegrations])

  const toggle = async (key: string, current: IntegrationStatus) => {
    const next: IntegrationStatus = current === 'connected' ? 'disconnected' : 'connected'
    try {
      await setStatus(key, next)
      toast.success(`Updated integration ${key} to ${next}`)
    } catch {
      toast.error('Could not update this integration.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Hardware & Integrations"
        description="Configure connected hardware (barcode scanners, signature pads, label printers) and external logistics gateways."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const isConnected = item.status === 'connected'
          return (
            <Card key={item.key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge
                    status={item.status}
                    tone={isConnected ? 'success' : item.status === 'error' ? 'danger' : 'neutral'}
                  />
                  <span className="text-xs uppercase text-muted-foreground">{item.category}</span>
                </div>
                <CardTitle className="text-base">{item.name}</CardTitle>
                <CardDescription>Key: {item.key}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">Status: {item.status}</span>
                <Button
                  size="sm"
                  variant={isConnected ? 'outline' : 'default'}
                  onClick={() => toggle(item.key, item.status)}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
export function SettingsGapCard() { return <Card><CardHeader><CardTitle>Backend gaps</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">CompanySetting is key/value; strongly typed settings endpoints are not present yet.</p></CardContent></Card> }
export function ResetPasswordHint() { return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Shield className="size-3" />10+ characters</span> }
export function AmountPreview({ amount }: { amount: number }) { return <span>{formatMoney(amount)}</span> }
export function ThresholdInput({ value, onChange }: { value: number; onChange: (v: number) => void }) { return <NumberInput value={value} onValueChange={onChange} /> }
