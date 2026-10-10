import { useEffect, useRef, useState } from 'react'
import { LANGS, makeT, type Dict, type Lang } from './i18n'
import { Mark, Wordmark } from './lib/brand'
import { GRID_X, GRID_Y, HUBS, MAP_H, MAP_W, OUTLINE_POINTS, ROUTE } from './lib/libya'
import { LangList, LangMenu } from './components/LangMenu'
import { PartnerForm } from './components/PartnerForm'
import { Arrow, Dune, Html } from './components/ui'
import { initMotion, lenisStop, lenisStart } from './motion'

const NAV = [['#about', 'nav.about'], ['#brands', 'nav.brands'], ['#portfolio', 'nav.portfolio'], ['#network', 'nav.network'], ['#partner', 'nav.partner'], ['#contact', 'nav.contact']] as const
const FACEBOOK = 'https://www.facebook.com/share/1CmyoEmRdq/'
const PHONE_TEL = '+218915096111'
const PHONE_SHOW = '+218 91 509 6111'
const WHATSAPP = `https://wa.me/${PHONE_TEL.slice(1)}`
const EMAIL = 'contact@remalperfumes.ly'

export default function App({ lang, dict }: { lang: Lang; dict: Dict }) {
  const t = makeT(dict)
  const [drawer, setDrawer] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => initMotion(lang), [lang])

  // drawer: lock scroll, focus trap, Escape
  useEffect(() => {
    if (!drawer) return
    lenisStop()
    const el = drawerRef.current!
    el.querySelector<HTMLButtonElement>('.close')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawer(false)
      if (e.key !== 'Tab') return
      const f = [...el.querySelectorAll<HTMLElement>('a,button')]
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    el.addEventListener('keydown', onKey)
    return () => { el.removeEventListener('keydown', onKey); lenisStart(); burgerRef.current?.focus() }
  }, [drawer])

  const ribbon = [...dict.ribbon, ...dict.ribbon, ...dict.ribbon, ...dict.ribbon]

  return (
    <>
      <div id="intro" aria-hidden="true">
        <canvas id="sand" />
        <div className="lock">
          <div className="imark" id="imark"><Mark /></div>
          <div className="iword" id="iword"><Wordmark /></div>
          <div className="ital">{t('intro.tag')}</div>
        </div>
        <div className="count" id="count">00</div>
      </div>

      <div className="cur" id="cur" />
      <a className="skip-link" href="#main">{t('skip')}</a>

      <header id="hdr">
        <div className="wrap nav">
          <a href={LANGS[lang].path} className="brand" aria-label="REMAL Perfumes">
            <span className="m" id="hmark"><Mark /></span><span className="w" id="hword"><Wordmark /></span>
          </a>
          <nav className="menu" aria-label="Main">
            {NAV.map(([href, k]) => <a key={href} href={href}>{t(k)}</a>)}
          </nav>
          <div className="nav-r">
            <LangMenu lang={lang} label={t('lang.label')} />
            <a href="#partner" className="btn solid">{t('cta.partner')}</a>
            <button ref={burgerRef} className="burger" aria-label="Menu" aria-expanded={drawer} aria-controls="drawer" onClick={() => setDrawer(true)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>

      <div className={`drawer${drawer ? ' open' : ''}`} id="drawer" aria-hidden={!drawer} ref={drawerRef}>
        <div className="bd" onClick={() => setDrawer(false)} />
        <div className="panel" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="top">
            <span className="brand"><span className="m" style={{ height: 40 }}><Mark /></span></span>
            <button className="close" aria-label="Close" onClick={() => setDrawer(false)}>×</button>
          </div>
          <nav>{NAV.map(([href, k]) => <a key={href} href={href} onClick={() => setDrawer(false)}>{t(k)}</a>)}</nav>
          <LangList lang={lang} />
          <a href="#partner" className="btn solid" onClick={() => setDrawer(false)}>{t('cta.partner')}</a>
        </div>
      </div>

      <main id="main" tabIndex={-1}>
        <section className="hero">
          <div className="ghostmark" aria-hidden="true"><Mark /></div>
          <div className="wrap hero-grid">
            <div>
              <div className="eyebrow" data-in>{t('hero.eyebrow')}</div>
              <Html as="h1" data-in data-split html={t('hero.h1')} />
              <p className="lead" data-in>{t('hero.lead')}</p>
              <div className="ctas" data-in>
                <a href="#brands" className="btn solid"><span>{t('hero.cta1')}</span> <Arrow /></a>
                <a href="#partner" className="btn ghost">{t('hero.cta2')}</a>
              </div>
            </div>
            <div data-in className="archwrap">
              <div className="arch" id="arch"><img src="/img/bottle-rock.jpg" alt={t('alt.hero')} id="archimg" width={1800} height={1350} fetchPriority="high" /></div>
            </div>
          </div>
        </section>

        <div className="ribbon" aria-hidden="true">
          <div className="track" id="track">{ribbon.map((w, i) => <span key={i} className="rw"><span>{w}</span><i>✦</i></span>)}</div>
        </div>

        <section className="about" id="about">
          <div className="wrap about-grid">
            <div>
              <div className="name" lang="ar" data-rv>رمال<Html as="small" html={t('about.small')} /></div>
            </div>
            <div>
              <div className="eyebrow" data-rv>{t('about.eyebrow')}</div>
              <Html as="h2" data-split html={t('about.h2')} />
              <p data-rv>{t('about.p1')}</p>
              <p data-rv>{t('about.p2')}</p>
              <div className="facts" data-rv>
                <div><b className="num">2026</b><span>{t('fact1')}</span></div>
                <div><b>{t('fact2v')}</b><span>{t('fact2')}</span></div>
                <div><b>{t('fact3v')}</b><span>{t('fact3')}</span></div>
              </div>
            </div>
          </div>
        </section>

        <Dune />
        <section className="chain" id="chain">
          <div className="wrap">
            <div className="chain-head">
              <div><div className="eyebrow" data-rv>{t('chain.eyebrow')}</div><Html as="h2" data-split style={{ marginTop: 22 }} html={t('chain.h2')} /></div>
              <p data-rv>{t('chain.p')}</p>
            </div>
            <div className="steps" id="steps">
              <div className="rail" /><div className="fill" id="fill" />
              {([['01', 's1'], ['', 's2'], ['03', 's3'], ['04', 's4'], ['05', 's5']] as const).map(([n, k]) => (
                <div key={k} className={`step${k === 's2' ? ' me' : ''}`}>
                  <div className="n">{k === 's2' ? <Mark /> : n}</div>
                  <h3>{t(`${k}.h`)}</h3><p>{t(`${k}.p`)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="trade" id="brands">
          <div className="wrap fb-grid">
            <div className="intro">
              <div className="eyebrow" data-rv>{t('fb.eyebrow')}</div>
              <Html as="h2" data-split html={t('fb.h2')} />
              <p data-rv>{t('fb.p')}</p>
              <a href="#partner" className="btn solid" data-rv><span>{t('fb.cta')}</span> <Arrow /></a>
              <div className="fb-img" data-clip><img src="/img/sand.jpg" alt={t('alt.sand')} data-par loading="lazy" width={2000} height={1400} /></div>
            </div>
            <ul className="svc">
              {(['v1', 'v2', 'v3', 'v4', 'v5'] as const).map((k, i) => (
                <li key={k} data-rv><span className="k">0{i + 1}</span><div><h3>{t(`${k}.h`)}</h3><p>{t(`${k}.p`)}</p></div></li>
              ))}
            </ul>
          </div>
        </section>

        <section id="portfolio">
          <div className="wrap">
            <div className="pf-head">
              <div><div className="eyebrow" data-rv>{t('pf.eyebrow')}</div><Html as="h2" data-split html={t('pf.h2')} /></div>
            </div>
            <div className="pf">
              <div className="tile big" data-clip>
                <img src="/img/bottle-rock.jpg" alt="" loading="lazy" width={1800} height={1350} />
                <div className="cap"><div className="tag">{t('pf.soon')}</div><h3>{t('pf.soonh')}</h3></div>
              </div>
              <div className="tile brandtile" data-rv>
                <div className="tag">{t('pf.partner')}</div>
                <div>
                  <h3 lang="ar" dir="rtl">الماجد للعود</h3>
                  <div className="latin" lang="en" dir="ltr">Almajed for Oud</div>
                </div>
                <div className="more">{t('pf.majed.meta')}</div>
              </div>
              <a href="#partner" className="tile soon" data-rv>
                <div className="tag">{t('pf.yours')}</div><h3>{t('pf.yoursh')}</h3><div className="more">{t('pf.touch')}</div>
              </a>
            </div>
          </div>
        </section>

        <section id="network" style={{ paddingTop: 0 }}>
          <div className="wrap map-grid">
            <div>
              <div className="eyebrow" data-rv>{t('map.eyebrow')}</div>
              <Html as="h2" data-split html={t('map.h2')} />
              <p data-rv>{t('map.p')}</p>
              <ul className="cities">
                {HUBS.map((h) => <li key={h.key} data-rv><b>{t(`c.${h.key}`)}</b><span>{t(`c.${h.key}.s`)}</span></li>)}
              </ul>
            </div>
            <div id="mapbox">
              <svg className="libya" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={t('map.aria')}>
                <g className="grid">
                  {GRID_X.map((x) => <line key={`x${x}`} x1={x} y1={0} x2={x} y2={MAP_H} />)}
                  {GRID_Y.map((y) => <line key={`y${y}`} x1={0} y1={y} x2={MAP_W} y2={y} />)}
                </g>
                <polygon className="land" points={OUTLINE_POINTS} />
                <path className="route" d={ROUTE} />
                {HUBS.map((h, i) => (
                  <g className="pin" key={h.key}>
                    <circle className="p" cx={h.xy[0]} cy={h.xy[1]} r={5} style={{ animationDelay: `${i * 0.9}s` }} />
                    <circle className="c" cx={h.xy[0]} cy={h.xy[1]} r={5} />
                    <text x={h.xy[0] + h.dx} y={h.xy[1] + h.dy} textAnchor={h.anchor}>{t(`c.${h.key}`)}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </section>

        <Dune variant={1} />
        <section className="partner" id="partner">
          <div className="wrap pt-grid">
            <div className="side">
              <div className="eyebrow" data-rv>{t('pt.eyebrow')}</div>
              <Html as="h2" data-split html={t('pt.h2')} />
              <p data-rv>{t('pt.p')}</p>
            </div>
            <PartnerForm lang={lang} t={t} dict={dict} />
          </div>
        </section>
      </main>

      <footer id="contact">
        <div className="wrap">
          <div className="ft-top">
            <div className="ft-brand"><p>{t('ft.line')}</p></div>
            <div><h4>{t('ft.co')}</h4>{NAV.slice(0, 4).map(([href, k]) => <a key={href} href={href}>{t(k)}</a>)}</div>
            <div>
              <h4>{t('ft.contact')}</h4>
              <ul><li>{t('ft.addr')}</li></ul>
              <span className="ft-lbl">{t('ft.support')}</span>
              <a href={`tel:${PHONE_TEL}`} dir="ltr" className="ft-ltr">{PHONE_SHOW}</a>
              <a href={`mailto:${EMAIL}`} dir="ltr" className="ft-ltr">{EMAIL}</a>
              <a href="#partner">{t('ft.form')}</a>
            </div>
            <div><h4>{t('ft.follow')}</h4><a href={FACEBOOK} target="_blank" rel="noopener">{t('ft.fb')}</a></div>
          </div>
          <div className="ft-word" aria-hidden="true"><Wordmark /></div>
          <div className="ft-bot"><span>{t('ft.copy')}</span><button className="replay" id="replay">{t('ft.replay')}</button></div>
        </div>
      </footer>

      <a className="wa" href={WHATSAPP} target="_blank" rel="noopener" aria-label={t('wa.label')} title={t('wa.label')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.89 9.88zm8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.95L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.17-3.48-8.41z"/></svg>
      </a>
    </>
  )
}
