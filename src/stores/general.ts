import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { RemovableRef } from '@vueuse/core'

type GeneralState = {
  currentLocale: RemovableRef<string>
  baseMapUrl: RemovableRef<string>
}

export const useGeneralStore = defineStore<string, GeneralState>('general', {
  state: () => ({
    currentLocale: useLocalStorage('currentLocale', ''),
    baseMapUrl: useLocalStorage(
      'baseMapUrl',
      'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png'
    ),
  }),
  actions: {
    resetState() {
      this.$patch({
        currentLocale: '',
        baseMapUrl: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      })
    },
  },
})
