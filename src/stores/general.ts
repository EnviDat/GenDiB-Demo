import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { RemovableRef } from '@vueuse/core'

type GeneralState = {
  currentLocale: RemovableRef<string>
  baseMapUrl: RemovableRef<string>
  dataTableOpen: RemovableRef<boolean>
}

export const useGeneralStore = defineStore<string, GeneralState>('general', {
  state: () => ({
    currentLocale: useLocalStorage('currentLocale', ''),
    baseMapUrl: useLocalStorage(
      'baseMapUrl',
      'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    ),
    dataTableOpen: useLocalStorage('dataTableOpen', false),
  }),
  actions: {
    resetState() {
      this.$patch({
        currentLocale: '',
        baseMapUrl: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        dataTableOpen: false,
      })
    },
  },
})
