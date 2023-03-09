<template>
  <q-page>
    <div class="absolute-full">
      <div class="row" style="height: 65%; width: 100%">
        <MapOpenLayers
          :fill-div="true"
          :base-map-url="baseMapUrl"
          :geo-json-array="filteredData"
          :geo-json-props="dataProps"
          :include-cluster-hulls="false"
          :cluster-zoom-on-click="false"
          cluster-marker-color-param="species_kingdom"
          :legend-id-name-map="speciesKingdomNameMap"
          :cluster-marker-color-map="speciesKingdomColorMap"
          :primary-color="quasarColor('primary')"
          :secondary-color="quasarColor('secondary')"
          :accent-color="quasarColor('accent')" />
      </div>

      <div class="row" style="height: 35%; width: 100%">
        <q-card bordered style="height: 35%; width: 100%">
          <DataTable
            :data="tableData"
            @row-selected="
              (row) => {
                dataRowSelected = row
              }
            "
            :export-selection-label="t(`table.export`)" />
        </q-card>
      </div>
    </div>

    <q-drawer
      v-model="sidebarOpen"
      side="left"
      overlay
      persistent
      no-swipe-open
      no-swipe-close
      bordered
      dark
      class="bg-teal-8"
      :width="270"
      :breakpoint="500">
      <q-scroll-area class="fit q-pr-md">
        <q-list padding>
          <q-item>
            <q-item-label
              class="text-weight-bolder text-accent"
              header
              overline
              color="secondary"
              >{{ t(`sidebar.filters`) }}</q-item-label
            >
          </q-item>

          <q-item v-for="(options, key) in filterOptions" :key="key">
            <div class="col-12">
              <SelectFilter v-model="filterSelections[key]" :options="options" :label="key" />
            </div>
          </q-item>
        </q-list>
      </q-scroll-area>

      <div class="q-mini-drawer-hide absolute" style="top: 15px; right: -17px">
        <q-btn
          dense
          round
          unelevated
          color="primary"
          icon="chevron_left"
          @click="sidebarOpen = false"
          aria-label="Close Sidebar" />
      </div>
    </q-drawer>
  </q-page>
</template>

<script setup lang="ts">
  import { onMounted, onBeforeMount, onBeforeUnmount, watch } from 'vue'
  import { colors } from 'quasar'
  import { useI18n } from 'vue-i18n'

  import { storeToRefs } from 'pinia'
  import { useGeneralStore } from '@/stores/general'

  import type { GeoJSONFeature } from 'ol/format/GeoJSON'

  import { KeyValuePair, FieldOptions } from '@/mappings'
  import MapOpenLayers from '@/components/MapOpenLayers.vue'
  import DataTable from '@/components/DataTable.vue'
  import SelectFilter from '@/components/SelectFilter.vue'

  const { getPaletteColor: quasarColor } = colors
  const { t } = useI18n()
  const generalStore = useGeneralStore()
  const { baseMapUrl, useSidebar, sidebarOpen } = storeToRefs(generalStore)

  let data = $ref<Array<GeoJSONFeature>>([])
  const dataProps = $computed(() => {
    if (data.length !== 0) {
      const includeKeys = new Set([
        'gendib_pop_id',
        'species_kingdom',
        'latitude_WGS84_Dec',
        'latitude_original',
        'longitude_WGS84_Dec',
        'longitude_original',
      ])
      return Object.keys(data[0].properties).filter((field) => includeKeys.has(field))
    }
  })
  let filterSelections = $ref<KeyValuePair>({})
  let filterOptions = $ref<FieldOptions>({})

  watch(
    () => data,
    () => {
      if (data.length === 0) {
        return
      }

      const excludeKeys = new Set([
        'gendib_pop_id',
        'latitude_WGS84_Dec',
        'latitude_original',
        'longitude_WGS84_Dec',
        'longitude_original',
        'sample_denominator',
      ])

      filterSelections = Object.keys(data[0].properties).reduce(
        (newObj: KeyValuePair, field: string) => {
          if (!excludeKeys.has(field)) {
            newObj[field] = ''
          }
          return newObj
        },
        {}
      )

      const filterSets = data
        .map(({ properties }) => properties)
        .reduce((uniqueValues, properties) => {
          for (const key in properties) {
            if (excludeKeys.has(key)) {
              continue
            }
            if (!(key in uniqueValues)) {
              uniqueValues[key] = new Set([''])
            }
            uniqueValues[key].add(properties[key])
          }
          return uniqueValues
        }, {})

      filterOptions = Object.keys(filterSets).reduce((newObj: FieldOptions, field: string) => {
        newObj[field] = [...filterSets[field]]
        return newObj
      }, {})
    }
  )

  const filteredData = $computed(() => {
    if (Object.values(filterSelections).every((v) => v === '')) {
      return data
    }

    const activeFilters = Object.keys(filterSelections).filter(
      (key) => filterSelections[key] !== ''
    )

    return activeFilters.reduce((acc, field) => {
      const filterValue = filterSelections[field]
      return acc.filter((geoJson) => geoJson.properties[field] === filterValue)
    }, data)
  })

  const tableData = $computed(() => {
    // Extract properties from GeoJSON
    return filteredData.map((x: GeoJSONFeature) => ({
      ...x.properties,
    }))
  })

  const dataRowSelected = $ref(null)
  watch(
    () => dataRowSelected,
    () => {
      console.log(dataRowSelected)
    }
  )

  const speciesKingdomColorMap = {
    unknown: quasarColor('blue-grey'),
    plant: quasarColor('lime-5'),
    protista: quasarColor('deep-orange-3'),
    vertebrate: quasarColor('yellow-8'),
    fungi: quasarColor('brown-4'),
    invertebrate: quasarColor('orange-10'),
  }
  const speciesKingdomNameMap = {
    unknown: 'Unknown',
    plant: 'Plant',
    protista: 'Protista',
    vertebrate: 'Vertebrate',
    fungi: 'Fungi',
    invertebrate: 'Invertebrate',
  }

  onMounted(() => {
    useSidebar.value = true
  })

  onBeforeMount(async () => {
    // Load test GeoJSON
    const response = await fetch('./test_data/gendib_27_02_2023.geojson')
    const gendibFeatureCol = await response.json()
    data = gendibFeatureCol.features
  })

  onBeforeUnmount(() => {
    useSidebar.value = false
  })
</script>
