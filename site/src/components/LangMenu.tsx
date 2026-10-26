import { useEffect, useRef, useState } from 'react'
import { LANGS, LANG_CODES, type Lang } from '../i18n'
import { Globe } from './ui'

// Switching language should not replay the intro; a plain refresh should.
// An explicit choice is remembered, so it wins over the device language from then on.
export const markLangSwitch = (e: { currentTarget: HTMLAnchorElement }) => {
  try {
    sessionStorage.setItem('remal-skip-intro-once', '1')
    localStorage.setItem('remal-lang', e.currentTarget.lang)
  } catch { /* storage blocked: device language keeps deciding */ }
}

// the part of the address after the language prefix (e.g. "products/<id>/"), so switching language keeps the page
function usePageSuffix(lang: Lang) {
  const [rest, setRest] = useState('')
  useEffect(() => {
    const prefix = LANGS[lang].path
    if (location.pathname.startsWith(prefix)) setRest(location.pathname.slice(prefix.length))
  }, [lang])
  return rest
}

export function LangMenu({ lang, label }: { lang: Lang; label: string }) {
  const [open, setOpen] = useState(false)
  const rest = usePageSuffix(lang)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); root.current?.querySelector('button')?.focus() }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = [...(root.current?.querySelectorAll<HTMLAnchorElement>('li a') ?? [])]
        const i = items.indexOf(document.activeElement as HTMLAnchorElement)
        const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length
        items[next]?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    root.current?.querySelector<HTMLAnchorElement>('li a[aria-current=true]')?.focus()
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div className={`langm${open ? ' open' : ''}`} ref={root}>
      <button type="button" aria-haspopup="true" aria-expanded={open} aria-label={label} onClick={() => setOpen((o) => !o)}>
        <Globe />
      </button>
      <ul aria-label={label}>
        {LANG_CODES.map((c) => (
          <li key={c}>
            <a href={LANGS[c].path + rest} lang={c} hrefLang={c} aria-current={c === lang} onClick={markLangSwitch}>{LANGS[c].native}</a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LangList({ lang }: { lang: Lang }) {
  const rest = usePageSuffix(lang)
  return (
    <div className="langs">
      {LANG_CODES.map((c) => (
        <a key={c} href={LANGS[c].path + rest} lang={c} hrefLang={c} aria-current={c === lang} onClick={markLangSwitch}>{LANGS[c].native}</a>
      ))}
    </div>
  )
}
