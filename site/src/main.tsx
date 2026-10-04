import { hydrateRoot } from 'react-dom/client'
import App from './App'
import { LANG_CODES, type Lang } from './i18n'
import './styles.css'

const htmlLang = document.documentElement.lang as Lang
const lang: Lang = LANG_CODES.includes(htmlLang) ? htmlLang : 'ar'
hydrateRoot(document.getElementById('root')!, <App lang={lang} />)
