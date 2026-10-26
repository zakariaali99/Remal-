import type { Lang } from '../i18n'

// The Django backend (api.remalperfumes.ly). Override with VITE_API for local work, e.g. VITE_API=http://127.0.0.1:8011
export const API = ((import.meta.env.VITE_API as string | undefined) ?? 'https://api.remalperfumes.ly').replace(/\/$/, '')

export type Ref = { id: string; name: string }
export type Photo = { id: string; src: string; thumb: string; width: number; height: number }
export type Brand = Ref & { name_ar: string; name_en: string; tagline: string; about: string; logo: string | null; website: string; product_count: number }
export type Category = Ref & { product_count: number }
export type ProductCard = { id: string; name: string; family: string; size: string; is_featured: boolean; brand: Ref; category: Ref | null; cover: Photo | null }
export type Product = Omit<ProductCard, 'brand'> & { brand: Brand; description: string; sku: string; images: Photo[] }
export type Page<T> = { count: number; next: string | null; results: T[] }

export class NotFound extends Error {}

export async function get<T>(pathOrUrl: string, lang: Lang, signal?: AbortSignal): Promise<T> {
  const url = new URL(pathOrUrl.startsWith('http') ? pathOrUrl : `${API}${pathOrUrl}`)
  url.searchParams.set('lang', lang)
  const res = await fetch(url, { signal })
  if (res.status === 404) throw new NotFound()
  if (!res.ok) throw new Error(String(res.status))
  return res.json() as Promise<T>
}
