import { Quasar } from 'quasar'
import { boot } from 'quasar/wrappers'
import { createI18n } from 'vue-i18n'

const messages: Record<string, string> = {}
const localeFiles = import.meta.glob('/locales/*.ts', { eager: true })
for (const path in localeFiles) {
  localeFiles[path]().then((mod) => {
    messages[path.slice(9, -3)] = mod.default
  })
}

const userLocale = Quasar.lang.getLocale()?.split('-')[0]
export const i18n = createI18n({
  legacy: false,
  locale: userLocale,
  fallbackLocale: 'en',
  messages,
})

export default boot(({ app }) => {
  // Set i18n instance on app
  app.use(i18n)
})
