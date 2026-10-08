import axios from 'axios'

export interface PortalUser { id: string; username: string; accountId: string; customerName: string }
export interface PortalShipment { id: string; fileNo: string; status: string; mode: string; direction?: string; eta?: string | null; etd?: string | null }
export interface TrackingResult { shipment: { fileNo: string; mode: string; status: string; origin?: string | null; destination?: string | null; eta?: string | null; etd?: string | null }; milestones: Array<{ code: string; subStatus?: string | null; location?: string | null; eventAt: string; notes?: string | null }> }
const portalHttp = axios.create({ baseURL: '/api/portal' })
export async function portalLogin(body: { username: string; password: string }) { const res = await portalHttp.post<{ user: PortalUser; token: string }>('/login', body); return res.data }
export async function portalShipments(token: string) { const res = await portalHttp.get<{ data: PortalShipment[] }>('/shipments', { headers: { Authorization: `Bearer ${token}` } }); return res.data.data }
export async function publicTrack(ref: string, company = 'KORNET') { const res = await portalHttp.get<TrackingResult>(`/track/${encodeURIComponent(ref)}`, { params: { company } }); return res.data }
