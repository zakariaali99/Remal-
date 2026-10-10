import { useState, type FormEvent } from 'react'
import type { Dict, Key, Lang } from '../i18n'
import { Arrow } from './ui'

type Tab = 'brand' | 'retail'
type Field = 'name' | 'company' | 'country' | 'city' | 'otherCity' | 'email' | 'phone' | 'type' | 'message'
type Values = Record<Field, string>
type Status = 'idle' | 'sending' | 'sent' | 'failed'

const EMPTY: Values = { name: '', company: '', country: '', city: 'tripoli', otherCity: '', email: '', phone: '', type: 'perfumery', message: '' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const PHONE_RE = /^\+?[0-9\s\-()]{8,18}$/
const HUB_CITIES = ['tripoli', 'misrata', 'benghazi'] as const
type Hub = (typeof HUB_CITIES)[number]
const TYPES = [['perfumery', 'f.t1'], ['distributor', 'f.t2'], ['department-store', 'f.t3'], ['pharmacy-beauty', 'f.t4']] as const

function validate(v: Values, tab: Tab): Partial<Record<Field, Key>> {
  const e: Partial<Record<Field, Key>> = {}
  if (!v.name.trim()) e.name = 'e.req'
  if (!v.company.trim()) e.company = 'e.req'
  if (!v.phone.trim()) e.phone = 'e.req'
  else if (!PHONE_RE.test(v.phone.trim())) e.phone = 'e.phone'
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) e.email = 'e.email'
  if (tab === 'retail' && v.city === 'other' && !v.otherCity) e.otherCity = 'e.city'
  return e
}

export function PartnerForm({ lang, t, dict }: { lang: Lang; t: (k: Key) => string; dict: Dict }) {
  const [tab, setTab] = useState<Tab>('brand')
  const [v, setV] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<Field, Key>>>({})
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [status, setStatus] = useState<Status>('idle')
  const [website, setWebsite] = useState('') // honeypot: bots fill it, people never see it

  const set = (f: Field) => (e: { target: { value: string } }) => {
    const next = { ...v, [f]: e.target.value }
    setV(next)
    if (touched[f]) setErrors(validate(next, tab))
  }
  const blur = (f: Field) => () => { setTouched((x) => ({ ...x, [f]: true })); setErrors(validate(v, tab)) }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const errs = validate(v, tab)
    setErrors(errs)
    setTouched({ name: true, company: true, phone: true, email: true, otherCity: true })
    const first = Object.keys(errs)[0]
    if (first) { document.getElementById(`f-${first}`)?.focus(); return }
    setStatus('sending')
    try {
      const city = v.city === 'other' ? v.otherCity : dict[`c.${v.city as Hub}`]
      const res = await fetch('/api/contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: tab, lang, website, ...v, city: tab === 'retail' ? city : '', country: tab === 'brand' ? v.country : '' }),
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('sent')
      setV(EMPTY); setTouched({}); setErrors({})
    } catch {
      setStatus('failed')
    }
  }

  const field = (f: Field, label: Key, input: React.ReactNode, cls = '') => (
    <div className={`f ${cls}${errors[f] && touched[f] ? ' err' : ''}`}>
      <label htmlFor={`f-${f}`}>{t(label)}</label>
      {input}
      <span className="msg" id={`e-${f}`} aria-live="polite">{errors[f] && touched[f] ? t(errors[f]!) : ''}</span>
    </div>
  )
  const inv = (f: Field) => ({ 'aria-invalid': !!(errors[f] && touched[f]), 'aria-describedby': `e-${f}` })

  return (
    <div className="formpanel" data-rv>
      <div className="tabs" role="tablist">
        {(['brand', 'retail'] as Tab[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setErrors({}) }}>
            {t(k === 'brand' ? 'tab1' : 'tab2')}
          </button>
        ))}
      </div>
      <form noValidate onSubmit={submit}>
        {field('name', 'f.name', <input id="f-name" name="name" autoComplete="name" required value={v.name} onChange={set('name')} onBlur={blur('name')} {...inv('name')} />)}
        {field('company', 'f.co', <input id="f-company" name="company" autoComplete="organization" required value={v.company} onChange={set('company')} onBlur={blur('company')} {...inv('company')} />)}
        {tab === 'brand' && field('country', 'f.country', <input id="f-country" name="country" autoComplete="country-name" value={v.country} onChange={set('country')} />)}
        {tab === 'retail' && field('city', 'f.city', (
          <select id="f-city" name="city" value={v.city} onChange={set('city')}>
            {HUB_CITIES.map((c) => <option key={c} value={c}>{t(`c.${c}`)}</option>)}
            <option value="other">{t('f.otherCity')}</option>
          </select>
        ))}
        {tab === 'retail' && v.city === 'other' && field('otherCity', 'f.pickCity', (
          <select id="f-otherCity" name="otherCity" value={v.otherCity} onChange={set('otherCity')} onBlur={blur('otherCity')} {...inv('otherCity')}>
            <option value="" disabled>{t('f.pickCity')}</option>
            {dict.cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ))}
        {field('email', 'f.email', <input id="f-email" name="email" type="email" dir="ltr" autoComplete="email" value={v.email} onChange={set('email')} onBlur={blur('email')} {...inv('email')} />)}
        {field('phone', 'f.phone', <input id="f-phone" name="phone" type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="+218 9X XXX XXXX" required value={v.phone} onChange={set('phone')} onBlur={blur('phone')} {...inv('phone')} />)}
        {tab === 'retail' && field('type', 'f.type', (
          <select id="f-type" name="type" value={v.type} onChange={set('type')}>
            {TYPES.map(([val, k]) => <option key={val} value={val}>{t(k)}</option>)}
          </select>
        ))}
        {field('message', 'f.msg', <textarea id="f-message" name="message" value={v.message} onChange={set('message')} />, 'full')}
        <div className="hp" aria-hidden="true"><label>-<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label></div>
        <div className="submit">
          <small aria-live="polite" className={status === 'sent' ? 'ok' : status === 'failed' ? 'bad' : ''}>
            {t(status === 'sending' ? 'f.sending' : status === 'sent' ? 'f.thanks' : status === 'failed' ? 'e.server' : 'f.note')}
          </small>
          <button className="btn solid" aria-busy={status === 'sending'}><span>{t('f.send')}</span> <Arrow /></button>
        </div>
      </form>
    </div>
  )
}
