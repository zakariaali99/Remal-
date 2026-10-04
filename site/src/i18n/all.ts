// Server/build-time only: every dictionary, used by the pre-renderer. Never import this from browser code.
import ar from './ar.json'
import en from './en.json'
import fr from './fr.json'
import zh from './zh.json'
import ja from './ja.json'
import type { Dict, Lang } from './index'

export const DICTS: Record<Lang, Dict> = { ar: ar as Dict, en, fr: fr as Dict, zh: zh as Dict, ja: ja as Dict }
