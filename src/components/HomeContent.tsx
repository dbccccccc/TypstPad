import { useI18n } from '../i18n'
import { encodeBase64Utf8 } from '../utils/base64'

export const EXAMPLE_FORMULA = 'sum_(i=1)^n i = (n (n + 1)) / 2'
export const EXAMPLE_URL = `/?formula=${encodeURIComponent(encodeBase64Utf8(EXAMPLE_FORMULA))}`

export function EditorIntro() {
  const { t } = useI18n()
  return (
    <div className="mx-auto mb-4 max-w-6xl">
      <h1 className="text-base font-semibold sm:text-lg">{t('home.title')}</h1>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">{t('home.intro')}</p>
    </div>
  )
}
