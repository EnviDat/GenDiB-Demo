<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-avatar square size="2.5rem">
          <img :src="appIcon" alt="" />
        </q-avatar>

        <q-space />

        <div class="q-gutter-sm row items-center no-wrap">
          <q-btn
            @click="toggleLocaleTooltip()"
            round
            flat
            icon="language"
            color="secondary"
            aria-label="Language">
            <q-menu anchor="bottom middle" self="top middle" dark square>
              <q-btn-toggle
                style="flex-direction: column"
                v-model="currentLocale"
                :options="localeOptions"
                v-close-popup
                rounded
                flat
                color="secondary"
                toggle-color="accent" />
            </q-menu>
            <q-tooltip ref="localeTooltip">{{ t('header.lang') }}</q-tooltip>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
  import { useQuasar } from 'quasar'
  import type { QTooltip } from 'quasar'

  import { watch, onMounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'

  import { useGeneralStore } from '@/stores/general'
  import appIcon from '@/assets/app-icon.webp'

  const $q = useQuasar()
  const langList = import.meta.glob('~/node_modules/quasar/lang/(en-GB|de|fr|it).mjs')
  const { t, locale, availableLocales } = useI18n()
  const localeOptions = availableLocales.map((x) => ({ label: x, value: x }))

  const generalStore = useGeneralStore()
  const { currentLocale } = storeToRefs(generalStore)

  function setLocale(localeString: string) {
    // Set quasar component language and user store value
    locale.value = localeString
    try {
      langList[
        `../../node_modules/quasar/lang/${localeString === 'en' ? 'en-GB' : localeString}.mjs`
      ]().then((lang) => {
        $q.lang.set(lang.default)
      })
    } catch (err) {
      $q.notify({
        color: 'negative',
        position: 'bottom',
        message: 'Quasar language pack failed to load.',
        icon: 'report_problem',
      })
    }
  }
  // Set locale if in user store
  if (currentLocale.value) {
    setLocale(currentLocale.value)
  }
  watch(currentLocale, (val) => {
    setLocale(val)
  })
  const localeTooltip = $ref<QTooltip>()
  function toggleLocaleTooltip() {
    // Hide locale tooltip when menu open
    localeTooltip?.hide()
  }

  onMounted(() => {
    // console.log('MOUNTED')
  })
</script>
