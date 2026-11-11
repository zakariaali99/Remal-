import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LANGS, type Key, type Lang } from '../i18n'
import { get, type Brand, type Page, type Partner, type ProductCard } from '../lib/api'
import { Arrow, Html } from './ui'

type T = (k: Key) => string

const EVERY = 5500 // ms each product stays in the arch

// The hero arch: the bottle-on-rock photo, then the products chosen «في الواجهة» in the dashboard, one after another.
// #archimg is the layer the intro and the scroll parallax move (see motion.ts).
export function HeroArch({ lang, t }: { lang: Lang; t: T }) {
  const [slides, setSlides] = useState<ProductCard[]>([])
  const [at, setAt] = useState(-1) // -1: the bottle-on-rock photo
  const [paused, setPaused] = useState(false)
  const [hold, setHold] = useState(false) // pointer or keyboard focus is on the arch
  const still = useRef(false)

  useEffect(() => {
    still.current = matchMedia('(prefers-reduced-motion: reduce)').matches
    setPaused(still.current)
    get<Page<ProductCard>>('/products/?home=1&size=8', lang)
      .then((p) => setSlides(p.results.filter((s) => s.cover)))
      .catch(() => {})
  }, [lang])

  useEffect(() => {
    if (!slides.length || paused || hold) return
    const id = setTimeout(() => { if (!document.hidden) setAt((n) => (n + 1) % slides.length) }, at < 0 ? 2600 : EVERY)
    return () => clearTimeout(id)
  }, [slides, at, paused, hold])

  const current = at >= 0 ? slides[at] : null
  const products = `${LANGS[lang].path}products/`
  return (
    <div data-in className="archwrap" onPointerEnter={() => setHold(true)} onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)} onBlur={() => setHold(false)}>
      <div className="arch" id="arch">
        <div className="slides" id="archimg">
          <img src="/img/bottle-rock.jpg" alt={t('alt.hero')} width={1800} height={1350} fetchPriority="high" className={at < 0 ? 'on' : ''} />
          {slides.map((s, i) => (
            <img key={s.id} src={s.cover!.src} srcSet={`${s.cover!.thumb} 720w, ${s.cover!.src} 2000w`} sizes="(max-width: 1080px) 90vw, 40vw"
              width={s.cover!.width} height={s.cover!.height} alt={i === at ? s.name : ''} className={i === at ? 'on' : ''} />
          ))}
        </div>
        {/* the whole arch opens the product shown (the gallery for the bottle-on-rock photo); the caption below is the keyboard link */}
        <a className="arch-link" href={current ? `${products}${current.id}/` : products} tabIndex={-1} aria-hidden="true" />
      </div>
      {slides.length > 0 && (
        <div className="arch-cap">
          <a href={`${products}${(current ?? slides[0]).id}/`} aria-live={paused ? 'polite' : 'off'}>
            <span className="tag">{(current ?? slides[0]).brand.name}</span>
            <b>{(current ?? slides[0]).name}</b>
          </a>
          <div className="dots">
            {slides.length > 1 && slides.map((s, i) => (
              <button key={s.id} aria-label={`${i + 1} / ${slides.length}`} aria-current={i === at} onClick={() => setAt(i)} />
            ))}
            {slides.length > 1 && (
              <button className="pp" aria-label={t(paused ? 'hero.play' : 'hero.pause')} onClick={() => setPaused(!paused)}>
                {paused
                  ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" fill="currentColor" /></svg>
                  : <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h2v9H3zM7 1.5h2v9H7z" fill="currentColor" /></svg>}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Partners from the dashboard: the logo with the name under it; both are one link when the partner has a website.
export function Partners({ lang, t }: { lang: Lang; t: T }) {
  const [items, setItems] = useState<Partner[]>([])
  useEffect(() => { get<Partner[]>('/partners/', lang).then(setItems).catch(() => {}) }, [lang])
  if (!items.length) return null
  return (
    <section className="partners" id="partners">
      <div className="wrap">
        <div className="eyebrow">{t('ptn.eyebrow')}</div>
        <Html as="h2" html={t('ptn.h2')} />
        <ul className="plogos">
          {items.map((p) => {
            const inner = <>
              <span className="lg">{p.logo ? <img src={p.logo} alt="" loading="lazy" /> : <span aria-hidden="true">{p.name.slice(0, 1)}</span>}</span>
              <span className="nm">{p.name}</span>
            </>
            return <li key={p.id}>{p.website ? <a href={p.website} target="_blank" rel="noopener">{inner}</a> : <div>{inner}</div>}</li>
          })}
        </ul>
      </div>
    </section>
  )
}

// The portfolio: the visible brands from the dashboard in a row that scrolls sideways, each opening its products;
// the last card invites new houses. Until the brands arrive (or when there are none) the static tiles stay.
export function BrandSlider({ lang, t, children }: { lang: Lang; t: T; children: ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([])
  const track = useRef<HTMLUListElement>(null)
  useEffect(() => { get<Brand[]>('/brands/', lang).then(setBrands).catch(() => {}) }, [lang])
  if (!brands.length) return <>{children}</>
  const move = (step: number) => {
    const el = track.current!
    const rtl = getComputedStyle(el).direction === 'rtl'
    const room = el.scrollWidth - el.clientWidth // in RTL scrollLeft runs from 0 down to -room
    const left = Math.min(rtl ? 0 : room, Math.max(rtl ? -room : 0, el.scrollLeft + step * (rtl ? -1 : 1) * el.clientWidth * 0.8))
    el.scrollTo({ left, behavior: 'smooth' })
  }
  const home = LANGS[lang].path
  return (
    <div className="bslider">
      <ul className="btrack" ref={track} data-lenis-prevent-horizontal>
        {brands.map((b) => (
          <li key={b.id}>
            <a href={`${home}products/?brand=${b.id}`} className="bcard">
              <span className="lg">{b.logo ? <img src={b.logo} alt="" loading="lazy" /> : <span aria-hidden="true">{b.name.slice(0, 1)}</span>}</span>
              <span className="tx">
                <b>{b.name}</b>
                {b.tagline && <span className="tl">{b.tagline}</span>}
                <span className="more">{t('pf.view')} <Arrow /></span>
              </span>
            </a>
          </li>
        ))}
        <li>
          <a href="#partner" className="bcard yours">
            <span className="tag">{t('pf.yours')}</span>
            <b>{t('pf.yoursh')}</b>
            <span className="more">{t('pf.touch')}</span>
          </a>
        </li>
      </ul>
      <div className="bnav">
        <button aria-label={t('pf.prev')} onClick={() => move(-1)}><Arrow /></button>
        <button aria-label={t('pf.next')} onClick={() => move(1)}><Arrow /></button>
      </div>
    </div>
  )
}
