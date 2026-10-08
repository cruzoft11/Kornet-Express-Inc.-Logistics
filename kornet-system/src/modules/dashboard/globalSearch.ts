import { apiGet } from '@/api/client'

export interface GlobalSearchItem { type: string; id: string; label: string; sublabel?: string; route?: string }
export async function searchGlobal(q: string): Promise<GlobalSearchItem[]> {
  const query = q.trim()
  if (!query) return []
  try {
    const res = await apiGet<{ data: GlobalSearchItem[] }>('/lookups/global', { params: { q: query } })
    return res.data
  } catch {
    const res = await apiGet<{ data: Array<{ id: string; code?: string; name?: string; label?: string; type?: string }> }>('/lookups/search', { params: { q: query } })
    return res.data.map((x) => ({ type: x.type ?? 'party', id: x.id, label: x.label ?? x.name ?? x.code ?? x.id, sublabel: x.code, route: `/parties/${x.id}` }))
  }
}
