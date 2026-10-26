import { useCallback, useEffect, useState } from 'react'
import { LANGS, type Key, type Lang } from '../i18n'
import { get, NotFound, type Brand, type Category, type Page, type Product, type ProductCard } from '../lib/api'
import { whatsapp } from '../lib/contact'
import { Arrow, Html } from './ui'

type T = (k: Key) => string
type Status = 'loading' | 'ready' | 'error' | 'missing'

// /products/<id>/ is served by the same page (see .htaccess); the id is read from the address
const DETAIL_RE = /\/products\/([0-9a-f-]{36})\/?$/i

export function ProductsPage({ lang, t }: { lang: Lang; t: T }) {
  const [id, setId] = useState<string | null>(null)
  useEffect(() => setId(location.pathname.match(DETAIL_RE)?.[1] ?? null), [])
  return id ? <ProductDetail id={id} lang={lang} t={t} /> : <Gallery lang={lang} t={t} />
}

function Gallery({ lang, t }: { lang: Lang; t: T }) {
  const [brands, setBrands] = useState<Brand[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [filter, setFilter] = useState<{ brand: string; category: string }>({ brand: '', category: '' })
  const [items, setItems] = useState<ProductCard[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [more, setMore] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const q = new URLSearchParams(location.search)
    setFilter({ brand: q.get('brand') ?? '', category: q.get('category') ?? '' })
    get<Brand[]>('/brands/', lang).then(setBrands).catch(() => {})
    get<Category[]>('/categories/', lang).then(setCats).catch(() => {})
  }, [lang])

  useEffect(() => {
    const ctrl = new AbortController()
    const q = new URLSearchParams()
    if (filter.brand) q.set('brand', filter.brand)
    if (filter.category) q.set('category', filter.category)
    setStatus('loading')
    get<Page<ProductCard>>(`/products/?${q}`, lang, ctrl.signal)
      .then((p) => { setItems(p.results); setNext(p.next); setStatus('ready') })
      .catch((e) => { if (!ctrl.signal.aborted) setStatus('error'); void e })
    return () => ctrl.abort()
  }, [filter, lang, attempt])

  const choose = (key: 'brand' | 'category', value: string) => {
    const f = { ...filter, [key]: value }
    setFilter(f)
    const q = new URLSearchParams(location.search)
    for (const k of ['brand', 'category'] as const) f[k] ? q.set(k, f[k]) : q.delete(k)
    const qs = q.toString()
    history.replaceState(null, '', `${location.pathname}${qs ? `?${qs}` : ''}`)
  }

  const loadMore = useCallback(async () => {
    if (!next) return
    setMore(true)
    try {
      const p = await get<Page<ProductCard>>(next, lang)
      setItems((x) => [...x, ...p.results]); setNext(p.next)
    } catch { /* the button stays, so the visitor can try again */ }
    setMore(false)
  }, [next, lang])

  const home = LANGS[lang].path
  return (
    <section className="pr">
      <div className="wrap">
        <div className="pr-head pr-listhead">
          <div className="eyebrow">{t('pr.eyebrow')}</div>
          <Html as="h1" html={t('pr.h1')} />
          <p>{t('pr.lead')}</p>
        </div>

        {(brands.length > 1 || cats.length > 1) && (
          <div className="pr-filters">
            {brands.length > 1 && <Chips label={t('pr.brand')} all={t('pr.all')} items={brands} value={filter.brand} onChange={(v) => choose('brand', v)} />}
            {cats.length > 1 && <Chips label={t('pr.cat')} all={t('pr.all')} items={cats} value={filter.category} onChange={(v) => choose('category', v)} />}
          </div>
        )}

        {status === 'error' && (
          <div className="pr-state"><p>{t('pr.error')}</p><button className="btn" onClick={() => setAttempt((n) => n + 1)}>{t('pr.retry')}</button></div>
        )}
        {status === 'ready' && items.length === 0 && <div className="pr-state"><p>{t('pr.empty')}</p></div>}

        <ul className="pgrid" aria-busy={status === 'loading'}>
          {status === 'loading'
            ? Array.from({ length: 8 }, (_, i) => <li key={i} className="pcard skel" aria-hidden="true"><div className="ph" /><div className="ln" /><div className="ln s" /></li>)
            : items.map((p, i) => (
              <li key={p.id} className="pcard" style={{ animationDelay: `${Math.min(i % 24, 11) * 45}ms` }}>
                <a href={`${home}products/${p.id}/`}>
                  <div className="ph">
                    {p.cover && <img src={p.cover.thumb} alt={p.name} width={p.cover.width} height={p.cover.height} loading={i < 4 ? 'eager' : 'lazy'} />}
                  </div>
                  <div className="tag">{p.brand.name}</div>
                  <h2>{p.name}</h2>
                  <div className="meta">{p.family}{p.family && p.size && ' · '}{p.size && <bdi>{p.size}</bdi>}</div>
                </a>
              </li>
            ))}
        </ul>

        {status === 'ready' && next && (
          <div className="pr-more"><button className="btn" onClick={loadMore} aria-busy={more} disabled={more}>{t('pr.more')}</button></div>
        )}
      </div>
    </section>
  )
}

function Chips({ label, all, items, value, onChange }: { label: string; all: string; items: { id: string; name: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="chips" role="group" aria-label={label}>
      <span className="lbl">{label}</span>
      {[{ id: '', name: all }, ...items].map((it) => (
        <button key={it.id || 'all'} type="button" aria-pressed={value === it.id} onClick={() => onChange(it.id)}>{it.name}</button>
      ))}
    </div>
  )
}

function ProductDetail({ id, lang, t }: { id: string; lang: Lang; t: T }) {
  const [p, setP] = useState<Product | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [shown, setShown] = useState(0)
  const [attempt, setAttempt] = useState(0)
  const home = LANGS[lang].path

  useEffect(() => {
    const ctrl = new AbortController()
    setStatus('loading')
    get<Product>(`/products/${id}/`, lang, ctrl.signal)
      .then((x) => { setP(x); setStatus('ready'); document.title = `${x.name} — ${x.brand.name} · REMAL` })
      .catch((e) => { if (!ctrl.signal.aborted) setStatus(e instanceof NotFound ? 'missing' : 'error') })
    return () => ctrl.abort()
  }, [id, lang, attempt])

  const back = <a className="pr-back" href={`${home}products/`}><Arrow /> {t('pr.back')}</a>

  if (status === 'missing') return <section className="pr"><div className="wrap pr-state">{back}<p>{t('pr.notfound')}</p></div></section>
  if (status === 'error') return (
    <section className="pr"><div className="wrap pr-state">{back}<p>{t('pr.error')}</p><button className="btn" onClick={() => setAttempt((n) => n + 1)}>{t('pr.retry')}</button></div></section>
  )
  if (!p) return <section className="pr"><div className="wrap pd skel" aria-busy="true"><div className="ph" /><div><div className="ln" /><div className="ln" /><div className="ln s" /></div></div></section>

  const photo = p.images[shown]
  return (
    <section className="pr">
      <div className="wrap">
        {back}
        <div className="pd">
          <div className="pd-media">
            <div className="pd-main">{photo && <img key={photo.id} src={photo.src} alt={p.name} width={photo.width} height={photo.height} />}</div>
            {p.images.length > 1 && (
              <div className="pd-thumbs">
                {p.images.map((im, i) => (
                  <button key={im.id} type="button" aria-pressed={i === shown} aria-label={`${t('pr.photo')} ${i + 1}`} onClick={() => setShown(i)}>
                    <img src={im.thumb} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="pd-info">
            <div className="eyebrow">{p.brand.name}{p.brand.tagline ? ` · ${p.brand.tagline}` : ''}</div>
            <h1>{p.name}</h1>
            <dl>
              {p.family && <div><dt>{t('pr.family')}</dt><dd>{p.family}</dd></div>}
              {p.size && <div><dt>{t('pr.size')}</dt><dd dir="auto">{p.size}</dd></div>}
              {p.category && <div><dt>{t('pr.cat')}</dt><dd>{p.category.name}</dd></div>}
            </dl>
            {p.description && <p className="pd-desc">{p.description}</p>}
            <div className="ctas">
              <a href={`${home}#partner`} className="btn solid"><span>{t('pr.ask')}</span> <Arrow /></a>
              <a href={whatsapp(`${t('pr.wamsg')} ${p.name} — ${p.brand.name}\n${location.href}`)} className="btn ghost" target="_blank" rel="noopener">{t('pr.wa')}</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
