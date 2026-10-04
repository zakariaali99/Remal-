import type { ElementType, HTMLAttributes } from 'react'

// Renders a dictionary string that may carry inline <em>/<br> markup.
// Strings come only from our own i18n JSON files, never from user input.
export function Html({ as: Tag = 'span', html, ...rest }: { as?: ElementType; html: string } & HTMLAttributes<HTMLElement>) {
  return <Tag {...rest} dangerouslySetInnerHTML={{ __html: html }} />
}

export const Arrow = () => <span className="ar" aria-hidden="true">→</span>

export const Globe = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <circle cx="12" cy="12" r="9.25" />
    <path d="M2.75 12h18.5M12 2.75c2.6 2.6 3.9 5.7 3.9 9.25S14.6 18.65 12 21.25M12 2.75C9.4 5.35 8.1 8.45 8.1 12s1.3 6.65 3.9 9.25" />
  </svg>
)

export const Dune = ({ variant = 0 }: { variant?: 0 | 1 }) => (
  <svg className="dune" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden="true">
    {variant === 0 ? (
      <>
        <path d="M0 52 C 180 20, 360 20, 540 44 S 900 70, 1080 38 S 1350 18, 1440 34" />
        <path d="M0 62 C 220 36, 420 40, 620 56 S 980 66, 1180 48 S 1380 40, 1440 46" opacity=".5" />
      </>
    ) : (
      <path d="M0 30 C 200 60, 400 58, 620 36 S 1000 8, 1220 34 S 1400 52, 1440 44" />
    )}
  </svg>
)
