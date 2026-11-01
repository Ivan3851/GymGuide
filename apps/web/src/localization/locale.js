import { computed, ref } from 'vue'
import { messages } from './messages.js'

const currentLocale = ref('mk-MK')
if (typeof document !== 'undefined') document.documentElement.lang = currentLocale.value

export function setLocale(locale) {
  if (locale === 'mk-MK' || locale === 'en') {
    currentLocale.value = locale
    if (typeof document !== 'undefined') document.documentElement.lang = locale
  }
}

export function useLocale() {
  const t = (key, values = {}) => {
    const message = messages[currentLocale.value][key] ?? messages.en[key] ?? key
    return Object.entries(values).reduce(
      (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
      message,
    )
  }

  return {
    locale: computed(() => currentLocale.value),
    setLocale,
    t,
  }
}
