const raw = import.meta.env.VITE_API_URL as string | undefined
export const API_BASE = raw ? raw.replace(/\/$/, '') : ''

export function apiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(apiUrl('/api/health'), { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}
