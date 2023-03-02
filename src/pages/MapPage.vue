<template>
  <q-page class="column">
    <MapOpenLayers
      :base-map-url="baseMapUrl"
      :geo-json-array="filteredSites"
      :primary-color="quasarColor('primary')"
      :secondary-color="quasarColor('secondary')"
      :accent-color="quasarColor('accent')" />

    <q-page-sticky position="top-left" :offset="[20, 20]">
      <div class="q-pa-none" style="width: 20rem">
        <div class="row rounded-borders" style="background-color: white">
          <div class="col-4">
            <SelectFilter v-model="yearSelected" :options="yearOptions" :label="t(`map.year`)" />
          </div>
        </div>
      </div>
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
  import { colors } from 'quasar'
  import { useI18n } from 'vue-i18n'

  import { storeToRefs } from 'pinia'
  import { useGeneralStore } from '@/stores/general'

  import MapOpenLayers from '@/components/MapOpenLayers.vue'
  import SelectFilter from '@/components/SelectFilter.vue'

  const { getPaletteColor: quasarColor } = colors
  const { t } = useI18n()
  const generalStore = useGeneralStore()
  const { baseMapUrl } = storeToRefs(generalStore)

  // Load test GeoJSON
  const sites = $ref([])
  // Load the geojson properties, and generate filter parameters based on keys
  // Then generate filter options based on key values
  // Use v-for the V-Selects ? (or configure this with a checkboxes for which one in the sidebar)

  const yearSelected = $ref<string>()
  const yearOptions = ([''] as Array<string>).concat(
    Array.from(Array(new Date().getFullYear() - 1990), (_, i) => (i + 1991).toString()).reverse()
  )

  const filteredSites = $computed(() => {
    if (yearSelected) {
      return sites.value.filter((x) => x.properties.mastYear === parseInt(yearSelected))
    }

    return sites.value
  })
</script>
