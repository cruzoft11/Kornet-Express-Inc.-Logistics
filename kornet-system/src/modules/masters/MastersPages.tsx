import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { AlertTriangle, FileUp, Plus, Save, Trash2 } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, ComboSelect, DataGrid, DateInput, FormField, FormSection, FullscreenDialog, Input, MoneyInput, NumberInput, PageHeader, Sheet, SheetContent, Skeleton, Switch, Textarea, Toolbar } from '@/components/ui'
import { billingCodesApi, listFsAccounts, partiesApi, portsApi, tariffsApi, type BillingCode, type Party, type Port, type Tariff } from '@/api/masters'
import { useHotkeys } from '@/hooks/useHotkeys'
import { formatDate, formatMoney } from '@/lib/format'

const flags = ['isCustomer', 'isShipper', 'isConsignee', 'isVendor', 'isCarrier', 'isAgent', 'isBroker', 'isTrucker'] as const
const roles = ['customer', 'shipper', 'consignee', 'vendor', 'carrier', 'agent', 'broker', 'trucker']
const modes = ['OCEAN', 'AIR', 'DOMESTIC', 'PD', 'VEHICLE']
const units = ['PER_SHPT', 'PER_BL', 'PER_AWB', 'PER_FILE', 'PER_CNTR', 'PER_KG', 'PER_CBM', 'PER_WM', 'PER_PC', 'PER_UNIT', 'PCT', 'MANUAL']
const vatClasses = ['VATABLE', 'ZERO_RATED', 'EXEMPT', 'NON_VAT_REIMBURSABLE']
const emptyParty: Partial<Party> = { active: true, country: 'PH', currency: 'PHP', vatRegistered: true, creditTermsDays: 0, creditLimit: 0 }
const validTin = (tin?: string | null) => !tin || /^\d{3}-\d{3}-\d{3}-\d{5}$/.test(tin)
const maskTin = (raw: string) => raw.replace(/\D/g, '').slice(0, 14).replace(/^(\d{3})(\d)/, '$1-$2').replace(/^(\d{3}-\d{3})(\d)/, '$1-$2').replace(/^(\d{3}-\d{3}-\d{3})(\d)/, '$1-$2')
function err(e: unknown) { return e instanceof Error ? e.message : 'Request failed' }
function yn(v: unknown) { return v === true || v === 'true' || v === 1 || v === '1' }

export function PartiesPage() {
  const qc = useQueryClient(); const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState<Partial<Party>>(emptyParty); const [preview, setPreview] = useState<Partial<Party>[]>([])
  const { data, isLoading } = useQuery({ queryKey: ['parties'], queryFn: () => partiesApi.list({ pageSize: 500 }) })
  const rows = data?.data ?? []
  const dup = rows.some((p) => p.id !== draft.id && p.name.toLowerCase() === String(draft.name ?? '').toLowerCase())
  const save = useMutation({ mutationFn: () => { if (!draft.name) throw new Error('Name is required'); if (!validTin(draft.tin)) throw new Error('TIN must match 000-000-000-00000'); return draft.id ? partiesApi.update(draft.id, draft) : partiesApi.create(draft) }, onSuccess: () => { toast.success('Party saved'); setOpen(false); qc.invalidateQueries({ queryKey: ['parties'] }) }, onError: (e) => toast.error(err(e)) })
  const remove = useMutation({ mutationFn: (id: string) => partiesApi.remove(id), onSuccess: () => { toast.success('Party deleted'); qc.invalidateQueries({ queryKey: ['parties'] }) }, onError: (e) => toast.error(err(e)) })
  useHotkeys([{ key: 'N', description: 'New party', handler: () => { setDraft(emptyParty); setOpen(true) } }, { key: 'Mod+S', description: 'Save party', when: open, handler: () => save.mutate() }])
  const onImport = async (f: File) => { const wb = XLSX.read(await f.arrayBuffer()); const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]]); setPreview(json.map((r) => ({ ...emptyParty, code: String(r.code ?? r.Code ?? ''), name: String(r.name ?? r.Name ?? ''), tin: maskTin(String(r.tin ?? r.TIN ?? '')), email: String(r.email ?? r.Email ?? ''), phone: String(r.phone ?? r.Phone ?? ''), isCustomer: yn(r.isCustomer ?? r.Customer), isVendor: yn(r.isVendor ?? r.Vendor), isCarrier: yn(r.isCarrier ?? r.Carrier) })).filter((p) => p.name)); toast.info(`${json.length} rows parsed. Review preview before import.`) }
  const commitImport = async () => { for (const p of preview) await partiesApi.create(p); toast.success(`${preview.length} parties imported`); setPreview([]); qc.invalidateQueries({ queryKey: ['parties'] }) }
  return (
    <div>
      <PageHeader
        eyebrow="Master data"
        title="Customers & Vendors"
        description="Unified party directory for customers, vendors, carriers, agents, brokers and truckers."
        primaryAction={
          <Button onClick={() => { setDraft(emptyParty); setOpen(true) }} kbd="N">
            <Plus className="size-4" />New party
          </Button>
        }
      />
      <Toolbar>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          <FileUp className="size-4" />Import Excel
        </Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
      </Toolbar>
      {preview.length > 0 && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Import preview</CardTitle>
            <CardDescription>No records are created until you confirm.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataGrid data={preview.map((p, id) => ({ id, ...p }))} columns={[{ id: 'code', header: 'Code', accessor: 'code' }, { id: 'name', header: 'Name', accessor: 'name' }, { id: 'tin', header: 'TIN', accessor: 'tin' }]} />
            <Button className="mt-3" onClick={commitImport}>Create {preview.length} parties</Button>
          </CardContent>
        </Card>
      )}
      <DataGrid
        loading={isLoading}
        data={rows}
        emptyTitle="No parties yet"
        columns={[
          { id: 'code', header: 'Code', accessor: 'code', sortable: true },
          { id: 'name', header: 'Name', cell: (p) => <button className="font-semibold text-secondary hover:underline" onClick={() => { setDraft(p); setOpen(true) }}>{p.name}</button>, sortable: true },
          { id: 'roles', header: 'Roles', cell: (p) => <div className="flex flex-wrap gap-1">{flags.map((f, i) => p[f] ? <Badge key={f} status={roles[i]} /> : null)}</div> },
          { id: 'tin', header: 'TIN', accessor: 'tin' },
          { id: 'terms', header: 'Terms', cell: (p) => `${p.creditTermsDays ?? 0} days` },
          { id: 'limit', header: 'Limit', cell: (p) => formatMoney(p.creditLimit ?? 0, p.currency) },
          { id: 'active', header: 'Active', cell: (p) => <Badge status={p.active === false ? 'inactive' : 'active'} tone={p.active === false ? 'neutral' : 'success'} /> },
        ]}
      />
      <FullscreenDialog
        open={open}
        onOpenChange={setOpen}
        title={draft.id ? `Edit Party — ${draft.name}` : 'New Customer / Vendor Party'}
        description="Unified directory master record for clients, vendors, forwarders, and shipping lines. Ctrl+S saves."
        badge={
          <Badge
            status={draft.active === false ? 'inactive' : 'active'}
            tone={draft.active === false ? 'neutral' : 'success'}
          />
        }
        actions={
          <div className="flex w-full items-center justify-between">
            <Button variant="destructive" disabled={!draft.id} onClick={() => draft.id && remove.mutate(draft.id)}>
              <Trash2 className="size-4" />Delete Party
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button loading={save.isPending} onClick={() => save.mutate()} kbd="Ctrl+S">
                <Save className="size-4" />Save Party
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <FormSection title="Entity Identity & Roles" description="Entity classification, unique business code, and tax registration." contentClassName="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Party Code">
                <Input value={draft.code ?? ''} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} placeholder="e.g. ACM-001" />
              </FormField>
              <FormField label="Registered Entity Name" required>
                <Input value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full registered company name" />
              </FormField>
              <FormField label="TIN (Tax Identification Number)" error={!validTin(draft.tin) ? 'Use 000-000-000-00000' : dup ? 'A party with this name already exists.' : undefined}>
                <Input value={draft.tin ?? ''} onChange={(e) => setDraft({ ...draft, tin: maskTin(e.target.value) })} placeholder="000-000-000-00000" />
              </FormField>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entity Roles (Check all that apply)</div>
              <div className="flex flex-wrap items-center gap-4">
                {flags.map((f, i) => (
                  <label key={f} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <Checkbox checked={Boolean(draft[f])} onCheckedChange={(v) => setDraft({ ...draft, [f]: v === true })} />
                    {roles[i]}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Switch checked={draft.vatRegistered !== false} onCheckedChange={(v) => setDraft({ ...draft, vatRegistered: v })} />
                VAT registered entity
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Switch checked={Boolean(draft.withholdingAgent)} onCheckedChange={(v) => setDraft({ ...draft, withholdingAgent: v })} />
                BIR Withholding tax agent
              </label>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Switch checked={draft.active !== false} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />
                Active status
              </label>
            </div>
          </FormSection>

          <FormSection title="Credit Terms, Contacts & Carrier Identifiers" description="Settlement credit limits, contacts, and EDI carrier prefixes." contentClassName="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="Credit Terms (Days)">
                <NumberInput value={draft.creditTermsDays ?? 0} onValueChange={(v) => setDraft({ ...draft, creditTermsDays: v })} />
              </FormField>
              <FormField label="Credit Limit">
                <MoneyInput currency={draft.currency ?? 'PHP'} value={draft.creditLimit ?? 0} onValueChange={(v) => setDraft({ ...draft, creditLimit: v })} />
              </FormField>
              <FormField label="Primary Email">
                <Input value={draft.email ?? ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="accounting@company.com" />
              </FormField>
              <FormField label="Primary Phone">
                <Input value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} placeholder="+63 2 8123 4567" />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <FormField label="Contact Person">
                <Input value={draft.contactName ?? ''} onChange={(e) => setDraft({ ...draft, contactName: e.target.value })} placeholder="Full name of liaison" />
              </FormField>
              <FormField label="Carrier SCAC" hint="4-letter ocean/trucking SCAC code">
                <Input value={draft.scac ?? ''} onChange={(e) => setDraft({ ...draft, scac: e.target.value.toUpperCase().slice(0, 4) })} placeholder="e.g. MAEU" />
              </FormField>
              <FormField label="Airline IATA Prefix" hint="3-digit airline accounting code">
                <Input value={draft.iataCode ?? ''} onChange={(e) => setDraft({ ...draft, iataCode: e.target.value.slice(0, 3) })} placeholder="e.g. 079 (PAL)" />
              </FormField>
              <FormField label="FS Supplier Account Link" hint="GL Accounts Payable integration">
                <Input value={draft.apAccount ?? ''} onChange={(e) => setDraft({ ...draft, apAccount: e.target.value })} placeholder="e.g. AP-2000" />
              </FormField>
            </div>
          </FormSection>

          <FormSection title="Registered Addresses & Premises" description="Physical headquarters and facility delivery locations." contentClassName="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Billing / Main Office Address</span>
                <FormField label="Street Address">
                  <Textarea value={draft.address ?? ''} onChange={(e) => setDraft({ ...draft, address: e.target.value })} rows={2} placeholder="Building, Street, Barangay" />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="City / Municipality">
                    <Input value={draft.city ?? ''} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="e.g. Pasay City" />
                  </FormField>
                  <FormField label="Province / State">
                    <Input value={draft.province ?? ''} onChange={(e) => setDraft({ ...draft, province: e.target.value })} placeholder="e.g. Metro Manila" />
                  </FormField>
                </div>
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Warehouse / Delivery Sites & Notes</span>
                <FormField label="Facility Location & Delivery Instructions">
                  <Textarea value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={5} placeholder="Drop-off docks, gate clearance, special delivery requirements..." />
                </FormField>
              </div>
            </div>
          </FormSection>
        </div>
      </FullscreenDialog>
    </div>
  )
}

export function PortsPage() { const qc = useQueryClient(); const [draft, setDraft] = useState<Partial<Port>>({ kind: 'SEA', country: 'PH' }); const [open, setOpen] = useState(false); const { data, isLoading } = useQuery({ queryKey: ['ports'], queryFn: () => portsApi.list({ pageSize: 500 }) }); const save = useMutation({ mutationFn: () => draft.id ? portsApi.update(draft.id, draft) : portsApi.create(draft), onSuccess: () => { toast.success('Port saved'); setOpen(false); qc.invalidateQueries({ queryKey: ['ports'] }) }, onError: (e) => toast.error(err(e)) }); useHotkeys([{ key: 'N', description: 'New port', handler: () => { setDraft({ kind: 'SEA', country: 'PH' }); setOpen(true) } }, { key: 'Mod+S', description: 'Save port', when: open, handler: () => save.mutate() }]); return <CrudShell title="Ports" description="UN/LOCODE, airport and inland location directory." onNew={() => { setDraft({ kind: 'SEA', country: 'PH' }); setOpen(true) }}><DataGrid loading={isLoading} data={data?.data ?? []} columns={[{ id: 'code', header: 'Code', accessor: 'code' }, { id: 'unlocode', header: 'UN/LOCODE', accessor: 'unlocode' }, { id: 'name', header: 'Name', cell: (p) => <button className="font-semibold text-secondary" onClick={() => { setDraft(p); setOpen(true) }}>{p.name}</button> }, { id: 'country', header: 'Country', accessor: 'country' }, { id: 'kind', header: 'Kind', cell: (p) => <Badge status={p.kind ?? 'SEA'} /> }, { id: 'iata', header: 'IATA', accessor: 'iata' }]} /><Sheet open={open} onOpenChange={setOpen}><SheetContent title="Port"><div className="grid gap-4"><FormField label="Code" required><Input value={draft.code ?? ''} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} /></FormField><FormField label="UN/LOCODE"><Input value={draft.unlocode ?? ''} onChange={(e) => setDraft({ ...draft, unlocode: e.target.value.toUpperCase() })} /></FormField><FormField label="Name" required><Input value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></FormField><FormField label="Country"><Input value={draft.country ?? ''} onChange={(e) => setDraft({ ...draft, country: e.target.value.toUpperCase() })} /></FormField><FormField label="Kind"><ComboSelect value={draft.kind ?? 'SEA'} onValueChange={(v) => setDraft({ ...draft, kind: v })} options={['SEA', 'AIR', 'INLAND'].map((v) => ({ value: v, label: v }))} /></FormField><FormField label="IATA"><Input value={draft.iata ?? ''} onChange={(e) => setDraft({ ...draft, iata: e.target.value.toUpperCase().slice(0, 3) })} /></FormField><Button onClick={() => save.mutate()} loading={save.isPending} kbd="Ctrl+S">Save</Button></div></SheetContent></Sheet></CrudShell> }

export function BillingCodesPage() { const qc = useQueryClient(); const [draft, setDraft] = useState<Partial<BillingCode>>({ active: true, currency: 'PHP', vatClass: 'VATABLE', modes: 'OCEAN,AIR,DOMESTIC', defaultUnit: 'PER_SHPT' }); const [open, setOpen] = useState(false); const { data, isLoading } = useQuery({ queryKey: ['billing-codes'], queryFn: () => billingCodesApi.list({ pageSize: 500 }) }); const { data: accts } = useQuery({ queryKey: ['fs-accounts'], queryFn: listFsAccounts }); const accountOptions = (accts?.data ?? []).filter((a) => a.isActive !== false).map((a) => ({ value: a.acctCode, label: `${a.acctCode} — ${a.acctDesc}` })); const save = useMutation({ mutationFn: () => draft.id ? billingCodesApi.update(draft.id, draft) : billingCodesApi.create(draft), onSuccess: () => { toast.success('Billing code saved'); setOpen(false); qc.invalidateQueries({ queryKey: ['billing-codes'] }) }, onError: (e) => toast.error(err(e)) }); return <CrudShell title="Billing Codes" description="Revenue and cost charge catalog with VAT class and GL mapping." onNew={() => { setDraft({ active: true, currency: 'PHP', vatClass: 'VATABLE', modes: 'OCEAN,AIR,DOMESTIC', defaultUnit: 'PER_SHPT' }); setOpen(true) }}><DataGrid loading={isLoading} data={data?.data ?? []} columns={[{ id: 'code', header: 'Code', cell: (b) => <button className="font-semibold text-secondary" onClick={() => { setDraft(b); setOpen(true) }}>{b.code}</button> }, { id: 'description', header: 'Description', accessor: 'description' }, { id: 'modes', header: 'Modes', accessor: 'modes' }, { id: 'vatClass', header: 'VAT', cell: (b) => <Badge status={b.vatClass ?? 'VATABLE'} /> }, { id: 'rate', header: 'Default', cell: (b) => formatMoney(b.defaultRate ?? 0, b.currency) }]} /><Sheet open={open} onOpenChange={setOpen}><SheetContent title="Billing code" className="overflow-y-auto"><div className="grid gap-4"><FormField label="Code" required><Input value={draft.code ?? ''} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} /></FormField><FormField label="Description" required><Input value={draft.description ?? ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></FormField><FormField label="Mode applicability"><Input value={draft.modes ?? ''} onChange={(e) => setDraft({ ...draft, modes: e.target.value.toUpperCase() })} /></FormField><FormField label="VAT class"><ComboSelect value={draft.vatClass ?? 'VATABLE'} onValueChange={(v) => setDraft({ ...draft, vatClass: v })} options={vatClasses.map((v) => ({ value: v, label: v }))} /></FormField><FormField label="Revenue GL account"><ComboSelect value={draft.revenueAccount ?? ''} onValueChange={(v) => setDraft({ ...draft, revenueAccount: v })} options={accountOptions} placeholder="Select or type account…" /></FormField><FormField label="Cost GL account"><ComboSelect value={draft.costAccount ?? ''} onValueChange={(v) => setDraft({ ...draft, costAccount: v })} options={accountOptions} placeholder="Select or type account…" /></FormField><FormField label="Default basis"><ComboSelect value={draft.defaultUnit ?? 'PER_SHPT'} onValueChange={(v) => setDraft({ ...draft, defaultUnit: v })} options={units.map((v) => ({ value: v, label: v }))} /></FormField><FormField label="Default rate"><MoneyInput currency={draft.currency ?? 'PHP'} value={draft.defaultRate ?? 0} onValueChange={(v) => setDraft({ ...draft, defaultRate: v })} /></FormField><FormField label="Currency"><Input value={draft.currency ?? 'PHP'} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} /></FormField><label className="flex items-center gap-2 text-sm"><Switch checked={draft.active !== false} onCheckedChange={(v) => setDraft({ ...draft, active: v })} />Active</label><p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning"><AlertTriangle className="mr-2 inline size-4" />showOnDoc is supported on charges; BillingCode has no persisted showOnDoc field yet.</p><Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button></div></SheetContent></Sheet></CrudShell> }

export function TariffsPage() { const qc = useQueryClient(); const [draft, setDraft] = useState<Partial<Tariff>>({ active: true, mode: 'OCEAN', direction: 'BOTH', unit: 'PER_SHPT', currency: 'PHP' }); const [open, setOpen] = useState(false); const { data, isLoading } = useQuery({ queryKey: ['tariffs'], queryFn: () => tariffsApi.list({ pageSize: 500 }) }); const save = useMutation({ mutationFn: () => draft.id ? tariffsApi.update(draft.id, draft) : tariffsApi.create(draft), onSuccess: () => { toast.success('Tariff saved'); setOpen(false); qc.invalidateQueries({ queryKey: ['tariffs'] }) }, onError: (e) => toast.error(err(e)) }); return <CrudShell title="Tariffs / Rates" description="Specific customer + lane + carrier + equipment rates win over generic rates." onNew={() => { setDraft({ active: true, mode: 'OCEAN', direction: 'BOTH', unit: 'PER_SHPT', currency: 'PHP' }); setOpen(true) }}><Card className="mb-4"><CardHeader><CardTitle>Which tariff wins?</CardTitle><CardDescription>Precedence: customer+lane+carrier+equipment → lane+carrier → lane → generic; valid dates and active flag must match the file date.</CardDescription></CardHeader></Card><DataGrid loading={isLoading} data={data?.data ?? []} columns={[{ id: 'billingCode', header: 'Code', cell: (t) => <button className="font-semibold text-secondary" onClick={() => { setDraft(t); setOpen(true) }}>{t.billingCode}</button> }, { id: 'mode', header: 'Mode', accessor: 'mode' }, { id: 'lane', header: 'Lane', cell: (t) => `${t.originPortCode ?? '*'} → ${t.destPortCode ?? '*'}` }, { id: 'unit', header: 'Basis', accessor: 'unit' }, { id: 'sell', header: 'Sell', cell: (t) => formatMoney(t.sellRate ?? 0, t.currency) }, { id: 'valid', header: 'Valid', cell: (t) => `${formatDate(t.validFrom)} – ${formatDate(t.validTo)}` }]} /><Sheet open={open} onOpenChange={setOpen}><SheetContent title="Tariff" className="overflow-y-auto"><div className="grid gap-4"><FormField label="Billing code"><Input value={draft.billingCode ?? ''} onChange={(e) => setDraft({ ...draft, billingCode: e.target.value.toUpperCase() })} /></FormField><FormField label="Mode"><ComboSelect value={draft.mode ?? 'OCEAN'} onValueChange={(v) => setDraft({ ...draft, mode: v })} options={modes.map((v) => ({ value: v, label: v }))} /></FormField><FormField label="Direction"><ComboSelect value={draft.direction ?? 'BOTH'} onValueChange={(v) => setDraft({ ...draft, direction: v })} options={['EXPORT', 'IMPORT', 'BOTH'].map((v) => ({ value: v, label: v }))} /></FormField><FormField label="Origin"><Input value={draft.originPortCode ?? ''} onChange={(e) => setDraft({ ...draft, originPortCode: e.target.value.toUpperCase() })} /></FormField><FormField label="Destination"><Input value={draft.destPortCode ?? ''} onChange={(e) => setDraft({ ...draft, destPortCode: e.target.value.toUpperCase() })} /></FormField><FormField label="Equipment"><Input value={draft.equipmentType ?? ''} onChange={(e) => setDraft({ ...draft, equipmentType: e.target.value.toUpperCase() })} /></FormField><FormField label="Basis"><ComboSelect value={draft.unit ?? 'PER_SHPT'} onValueChange={(v) => setDraft({ ...draft, unit: v })} options={units.map((v) => ({ value: v, label: v }))} /></FormField><FormField label="Sell"><MoneyInput value={draft.sellRate ?? 0} currency={draft.currency ?? 'PHP'} onValueChange={(v) => setDraft({ ...draft, sellRate: v })} /></FormField><FormField label="Buy"><MoneyInput value={draft.buyRate ?? 0} currency={draft.currency ?? 'PHP'} onValueChange={(v) => setDraft({ ...draft, buyRate: v })} /></FormField><FormField label="Minimum sell"><MoneyInput value={draft.minSell ?? 0} currency={draft.currency ?? 'PHP'} onValueChange={(v) => setDraft({ ...draft, minSell: v })} /></FormField><FormField label="Currency"><Input value={draft.currency ?? 'PHP'} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} /></FormField><FormField label="Valid from"><DateInput value={draft.validFrom?.slice(0, 10)} onValueChange={(v) => setDraft({ ...draft, validFrom: v })} /></FormField><FormField label="Valid to"><DateInput value={draft.validTo?.slice(0, 10)} onValueChange={(v) => setDraft({ ...draft, validTo: v })} /></FormField><Button onClick={() => save.mutate()} loading={save.isPending}>Save</Button></div></SheetContent></Sheet></CrudShell> }
function CrudShell({ title, description, onNew, children }: { title: string; description: string; onNew: () => void; children: React.ReactNode }) { return <div><PageHeader eyebrow="Master data" title={title} description={description} primaryAction={<Button onClick={onNew} kbd="N"><Plus className="size-4" />New</Button>} />{children}</div> }
export function CurrenciesPage() {
  return (
    <div className="p-4 md:p-6">
      <PageHeader eyebrow="Directories" title="Currencies & FX Rates" />
      <Card className="mt-4 max-w-lg">
        <CardContent className="pt-5">
          <p className="font-semibold">Not available in this release</p>
          <p className="mt-2 text-sm text-muted-foreground">
            The system currently operates in Philippine Peso (PHP). Multi-currency
            FX rate management is planned for a future release. All monetary values
            display in PHP.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
export function MastersLoading() { return <Skeleton className="h-64" /> }
