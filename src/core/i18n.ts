import { en, es, type TextKey } from '../episodes/deaf-point/text'

export type Lang = 'en' | 'es'
const tables = { en, es }
let lang: Lang = 'en'

export const setLang = (l: Lang) => {
  lang = l
  document.documentElement.lang = l
  document.title = tables[l]['meta.title']
}
export const getLang = () => lang
export const detectLang = (): Lang => (navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en')

export function t(key: string, vars?: Record<string, string | number>) {
  let s: string = tables[lang][key as TextKey] ?? key
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}
