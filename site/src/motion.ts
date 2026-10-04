import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import type { Lang } from './i18n'

gsap.registerPlugin(ScrollTrigger, SplitText)

let lenis: Lenis | null = null
export const lenisStop = () => lenis?.stop()
export const lenisStart = () => lenis?.start()

const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!
const $$ = <T extends Element = HTMLElement>(s: string) => [...document.querySelectorAll<T>(s)]

// Arabic must never be split into characters (it breaks letter joining), so every split is by lines.
function splitLines(el: Element) {
  return SplitText.create(el, {
    type: 'lines', mask: 'lines', autoSplit: true,
    onSplit(self) { self.masks.forEach((m) => m.classList.add('ln')) },
  })
}

export function initMotion(lang: Lang): () => void {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
  const hdr = $('#hdr')
  const onScroll = () => hdr.classList.toggle('scrolled', scrollY > 20)
  addEventListener('scroll', onScroll, { passive: true })

  const replay = $('#replay')
  replay.onclick = () => {
    const u = new URL(location.href); u.searchParams.delete('nointro')
    location.href = u.pathname + u.search
  }

  if (RM) {
    gsap.set('.hero [data-in]', { visibility: 'visible' })
    return () => removeEventListener('scroll', onScroll)
  }

  const ctx = gsap.context(() => {})
  lenis = new Lenis({ duration: 1.15, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  const raf = (time: number) => lenis!.raf(time * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)
  const anchorClick = (e: Event) => {
    const a = (e.target as Element).closest('a[href^="#"]')
    const id = a?.getAttribute('href')
    if (a && id && id.length > 1) { e.preventDefault(); lenis!.scrollTo(id, { offset: -90 }) }
  }
  document.addEventListener('click', anchorClick)

  ctx.add(() => {
    scrollMotion(lang)
    cursor()
    if (document.documentElement.classList.contains('no-intro')) heroIn()
    else runIntro(lang).then(() => ScrollTrigger.refresh())
  })

  return () => {
    removeEventListener('scroll', onScroll)
    document.removeEventListener('click', anchorClick)
    gsap.ticker.remove(raf)
    ctx.revert()
    ScrollTrigger.getAll().forEach((s) => s.kill())
    lenis?.destroy(); lenis = null
  }
}

let heroStarted = false
function heroIn() {
  if (heroStarted) return
  heroStarted = true
  gsap.set('.hero [data-in]', { visibility: 'visible' })
  const s = splitLines($('.hero h1'))
  gsap.timeline({ defaults: { ease: 'power3.out' } })
    .from('.hero .eyebrow', { y: 16, opacity: 0, duration: 0.8 })
    .from(s.lines, { yPercent: 110, duration: 1.2, stagger: 0.1, ease: 'power4.out' }, '<.1')
    .from('.hero .lead', { y: 20, opacity: 0, duration: 1 }, '-=.8')
    .from('.hero .ctas > *', { y: 20, opacity: 0, duration: 0.9, stagger: 0.1 }, '-=.75')
    .fromTo('#arch', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' }, 0)
    .from('#archimg', { scale: 1.35, duration: 2.2, ease: 'expo.out' }, 0.2)
    .from('.ghostmark', { opacity: 0, y: 60, duration: 2.2 }, 0.2)
    .from('.nav .menu a, .nav-r > *', { opacity: 0, y: -10, duration: 0.8, stagger: 0.04 }, 0.3)
}

function scrollMotion(lang: Lang) {
  $$('main section:not(.hero) [data-split]').forEach((el) => {
    const s = splitLines(el)
    gsap.from(s.lines, { yPercent: 110, duration: 1.2, stagger: 0.1, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 85%' } })
  })
  gsap.set('[data-rv]', { opacity: 0, y: 28 })
  ScrollTrigger.batch('[data-rv]', { start: 'top 88%', onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.08, ease: 'power3.out', overwrite: true }) })
  $$('[data-clip]').forEach((el) => {
    gsap.fromTo(el, { clipPath: 'inset(18% 10% 18% 10%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 35%', scrub: true } })
  })
  gsap.to('#archimg', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
  $$('[data-par]').forEach((img) => gsap.fromTo(img, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.parentElement, scrub: true } }))

  // ribbon: drifts in the reading direction, speeds up with scroll velocity, pauses on hover
  const loop = lang === 'ar'
    ? gsap.fromTo('#track', { xPercent: -25 }, { xPercent: 0, duration: 40, ease: 'none', repeat: -1 })
    : gsap.to('#track', { xPercent: -25, duration: 40, ease: 'none', repeat: -1 })
  const rib = $('.ribbon')
  rib.addEventListener('mouseenter', () => gsap.to(loop, { timeScale: 0, duration: 0.6 }))
  rib.addEventListener('mouseleave', () => gsap.to(loop, { timeScale: 1, duration: 0.6 }))
  ScrollTrigger.create({
    onUpdate: (self) => gsap.to(loop, {
      timeScale: 1 + Math.min(Math.abs(self.getVelocity()) / 300, 4), duration: 0.2, overwrite: true,
      onComplete: () => { gsap.to(loop, { timeScale: 1, duration: 1 }) },
    }),
  })

  // value chain: pinned + scrubbed on desktop, simple on mobile
  const steps = $$('.step')
  const mm = gsap.matchMedia()
  mm.add('(min-width:1081px)', () => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '#chain', start: 'top top', end: '+=1300', pin: true, scrub: 0.6 } })
    tl.to('#fill', { scaleX: 1, ease: 'none', duration: steps.length })
    steps.forEach((s, i) => tl.from(s, { opacity: 0.25, y: 30, duration: 0.6, onStart: () => s.classList.add('on'), onReverseComplete: () => s.classList.remove('on') }, i * 0.95))
  })
  mm.add('(max-width:1080px)', () => {
    gsap.to('#fill', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#steps', start: 'top 70%', end: 'bottom 70%', scrub: true } })
    steps.forEach((s) => gsap.from(s, { opacity: 0, x: lang === 'ar' ? -30 : 30, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: s, start: 'top 82%' } }))
  })

  // map: draw the border, fill the land, then light Misrata
  const land = $<SVGPolygonElement>('.libya .land')
  const L = land.getTotalLength ? land.getTotalLength() : 3000
  gsap.set(land, { strokeDasharray: L, strokeDashoffset: L })
  const pin = $('.libya .pin')
  gsap.timeline({ scrollTrigger: { trigger: '#mapbox', start: 'top 75%' } })
    .to(land, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' })
    .to(land, { fillOpacity: 1, duration: 1 }, '-=.8')
    .from(pin, { opacity: 0, scale: 0, transformOrigin: 'center', duration: 0.7, ease: 'back.out(2)', onComplete: () => pin.classList.add('live') }, '-=.3')
}

function cursor() {
  if (!matchMedia('(hover:hover)').matches) return
  const c = $('#cur')
  const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' })
  const yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' })
  addEventListener('pointermove', (e) => { c.style.opacity = '1'; xTo(e.clientX); yTo(e.clientY) })
  $$('a,button,.tile').forEach((el) => {
    el.addEventListener('mouseenter', () => c.classList.add('big'))
    el.addEventListener('mouseleave', () => c.classList.remove('big'))
  })
}

/* INTRO: sand drifts in from the reading-start side and settles into the mark, bottom first */
function runIntro(lang: Lang) {
  return new Promise<void>((resolve) => {
    const intro = $('#intro')
    const cv = $<HTMLCanvasElement>('#sand')
    const ctx = cv.getContext('2d')!
    const DPR = Math.min(devicePixelRatio || 1, 2)
    const W = innerWidth, H = innerHeight
    cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    lenis?.stop()
    gsap.set(intro, { clipPath: 'inset(0% 0% 0% 0%)' })
    const imark = $('#imark')
    const box = imark.getBoundingClientRect()

    // rasterise the mark from its own vector paths (no <img>, so the canvas is never tainted)
    const msvg = imark.querySelector('svg')!
    const vb = msvg.viewBox.baseVal
    const sw = Math.max(1, Math.round(box.width)), sh = Math.max(1, Math.round(box.height))
    const oc = document.createElement('canvas'); oc.width = sw; oc.height = sh
    const ox = oc.getContext('2d')!
    ox.scale(sw / vb.width, sh / vb.height); ox.translate(-vb.x, -vb.y); ox.fillStyle = '#000'
    msvg.querySelectorAll('path').forEach((pa) => ox.fill(new Path2D(pa.getAttribute('d')!), (pa.getAttribute('fill-rule') as CanvasFillRule) || 'nonzero'))
    const data = ox.getImageData(0, 0, sw, sh).data

    const mobile = W < 700, step = mobile ? 3 : 2
    let pts: [number, number][] = []
    for (let y = 0; y < sh; y += step) for (let x = 0; x < sw; x += step) if (data[(y * sw + x) * 4 + 3] > 140) pts.push([box.left + x, box.top + y])
    const MAX = mobile ? 1800 : 4200
    if (pts.length > MAX) pts = gsap.utils.shuffle(pts).slice(0, MAX)
    const tones = ['#9B6A4F', '#a87a5e', '#8a5d44', '#c49a80', '#b58a6d', '#7d5440']
    const wind = lang === 'ar' ? -1 : 1
    const cy = box.top + box.height / 2
    const P = pts.map(([tx, ty]) => {
      const far = Math.random() < 0.8
      const sx = far ? (wind < 0 ? W * (0.45 + Math.random() * 0.75) : W * (-0.2 + Math.random() * 0.75)) : Math.random() * W
      const sy = cy + (Math.random() - 0.5) * H * 1.15
      const d = 0.05 + Math.random() * 0.25 + (1 - (ty - box.top) / box.height) * 0.15
      return { tx, ty, sx, sy, d, s: Math.random() * 1.4 + 0.8, c: tones[(Math.random() * tones.length) | 0], ph: Math.random() * 6.28, amp: 8 + Math.random() * 26 }
    })
    const st = { p: 0, a: 1 }
    const ease = gsap.parseEase('power3.out')
    const draw = () => {
      ctx.clearRect(0, 0, W, H); ctx.globalAlpha = st.a
      for (const q of P) {
        const lt = Math.min(Math.max((st.p - q.d) / 0.55, 0), 1), e = ease(lt)
        const drift = wind * W * 0.22 * Math.min(st.p / (q.d + 0.001), 1)
        const ox2 = q.sx + drift, oy = q.sy + Math.sin(q.ph + st.p * 7) * q.amp
        const sway = Math.sin(q.ph + st.p * 11) * q.amp * 0.5 * (1 - e)
        ctx.fillStyle = q.c
        ctx.fillRect(ox2 + (q.tx - ox2) * e, oy + (q.ty - oy) * e + sway, q.s, q.s)
      }
    }
    gsap.ticker.add(draw)

    const count = $('#count')
    let finished = false
    const done = () => {
      if (finished) return
      finished = true
      gsap.ticker.remove(draw)
      gsap.set(intro, { display: 'none' })
      gsap.set('#hmark,#hword', { opacity: 1 })
      heroIn(); lenis?.start(); resolve()
    }
    const exit = () => {
      // the mark flies to the header logo while the curtain lifts
      const from = imark.getBoundingClientRect(), to = $('#hmark').getBoundingClientRect()
      const s = to.height / from.height
      const dx = to.left + to.width / 2 - (from.left + from.width / 2)
      const dy = to.top + to.height / 2 - (from.top + from.height / 2)
      gsap.set('#hmark,#hword', { opacity: 0 })
      gsap.timeline()
        .to('#iword,#intro .ital', { opacity: 0, y: -10, duration: 0.5, ease: 'power2.in' })
        .to(imark, { x: dx, y: dy, scale: s, duration: 1.1, ease: 'expo.inOut' }, '-=.15')
        .to(intro, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'expo.inOut' }, '<.15')
        .add(heroIn, '<.35')
        .set('#hmark', { opacity: 1 }, '-=.02')
        .to('#hword', { opacity: 1, duration: 0.6 }, '-=.1')
        .add(done)
    }
    const tl = gsap.timeline()
    tl.to(st, { p: 1, duration: 2.6, ease: 'power1.inOut', onUpdate: () => { count.textContent = String(Math.round(st.p * 100)).padStart(2, '0') } })
      .to(imark, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, '+=.15')
      .to(st, { a: 0, duration: 0.6 }, '<.1')
      .to('#iword path', { opacity: 1, duration: 0.7, stagger: { each: 0.06 }, ease: 'power2.out' }, '-=.2')
      .from('#iword path', { y: 12, duration: 0.9, stagger: 0.06, ease: 'power3.out' }, '<')
      .to('#intro .ital', { opacity: 1, duration: 0.6 }, '-=.5')
      .to('#count', { opacity: 0, duration: 0.4 }, '-=.4')
      .add(exit, '+=.35')
  })
}
