import { hydrateRoot } from 'react-dom/client'
import App from './App'
import { LANG_CODES, type Dict, type Lang } from './i18n'
import './styles.css'

const htmlLang = document.documentElement.lang as Lang
const lang: Lang = LANG_CODES.includes(htmlLang) ? htmlLang : 'ar'
// each page ships only its own dictionary, embedded by the pre-renderer
const dict = JSON.parse(document.getElementById('__dict')!.textContent!) as Dict
hydrateRoot(document.getElementById('root')!, <App lang={lang} dict={dict} />)
