let msg = {}
const localeFiles = import.meta.glob('/locales/en/*.yml', { eager: true })
for (const path in localeFiles) {
  localeFiles[path]().then((mod) => {
    msg = Object.assign(msg, mod.default)
  })
}

export default msg

// export default ['en', lang]
