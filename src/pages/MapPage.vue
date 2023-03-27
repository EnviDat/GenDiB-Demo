<template>
  <q-page>
    <div class="absolute-full">
      <div class="row" style="height: 65%; width: 100%">
        <MapOpenLayers
          :fill-div="true"
          :base-map-url="baseMapUrl"
          :geo-json-array="filteredData"
          :draw-enabled="mapDrawEnabled"
          @draw-shape="
            (shape: Array<number> | null) => {
              filterPolygon = shape
            }
          "
          @legend-item-selected="
            (selection: string) => {
              filterSelections['species_kingdom'] = selection
            }
          "
          :legend-id-name-map="speciesKingdomNameMap"
          :legend-marker-symbol-map="speciesKingdomSymbolMap"
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

    <q-page-sticky position="top-left" :offset="[20, 20]">
      <div class="q-pa-none" style="width: 30rem">
        <div class="row rounded-borders" style="background-color: white">
          <div class="col-5" v-for="(options, key) in filterOptions" :key="key">
            <SelectFilter
              v-model="filterSelections[key]"
              :options="options"
              :label="key.replace('_', ' ').replace(/\b\w/g, (s: string) => s.toUpperCase())" />
          </div>
          <div class="col-2 flex justify-center">
            <q-btn
              class="fit"
              flat
              dense
              padding=".5rem"
              icon="polyline"
              @click="mapDrawEnabled = !mapDrawEnabled"
              @update:model-value="filterPolygon = null" />
          </div>
        </div>
      </div>
    </q-page-sticky>
  </q-page>
</template>

<script setup lang="ts">
  import { onBeforeMount, watch } from 'vue'
  import { colors } from 'quasar'
  import { useI18n } from 'vue-i18n'

  import { storeToRefs } from 'pinia'
  import { useGeneralStore } from '@/stores/general'

  import type { GeoJSONFeature } from 'ol/format/GeoJSON'
  import { Polygon } from 'ol/geom'

  import { KeyValuePair, FieldOptions } from '@/mappings'
  import MapOpenLayers from '@/components/MapOpenLayers.vue'
  import DataTable from '@/components/DataTable.vue'
  import SelectFilter from '@/components/SelectFilter.vue'

  const { getPaletteColor: quasarColor } = colors
  const { t } = useI18n()
  const generalStore = useGeneralStore()
  const { baseMapUrl } = storeToRefs(generalStore)

  const mapDrawEnabled = $ref<boolean>(false)
  const filterPolygon = $ref<Array<number> | null>()

  let data = $ref<Array<GeoJSONFeature>>([])
  const filterSelections = $ref<KeyValuePair>({
    species_kingdom: '',
    marker_types: '',
  })
  let filterOptions = $ref<FieldOptions>({})

  watch(
    () => data,
    () => {
      if (data.length === 0) {
        return
      }

      filterOptions = {
        species_kingdom: Array.from(
          new Set(['', 'plant', 'protista', 'vertebrate', 'fungi', 'invertebrate'])
        ),
        marker_types: [''].concat(
          Array.from(new Set(data.map(({ properties }) => properties.marker_types)))
        ),
      }
    }
  )

  const filteredData = $computed(() => {
    const olPolygon = filterPolygon ? new Polygon(filterPolygon) : null
    const geospatialFilter = (x: GeoJSONFeature) => {
      return !olPolygon || olPolygon.intersectsCoordinate(x.geometry.coordinates)
    }

    const kingdomFilter = (x: GeoJSONFeature) => {
      const kingdom = filterSelections['species_kingdom']
      return !kingdom || x.properties.species_kingdom === kingdom
    }

    const markerTypesFilter = (x: GeoJSONFeature) => {
      const markerTypes = filterSelections['marker_types']
      return !markerTypes || x.properties.marker_types === markerTypes
    }

    return data.filter((x) => geospatialFilter(x) && kingdomFilter(x) && markerTypesFilter(x))
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

  const speciesKingdomSymbolMap = {
    plant: {
      symbol: 'circle',
      color: '#01a425',
    },
    protista: {
      symbol: 'circle',
      color: '#ffdd00',
    },
    vertebrate: {
      symbol: 'circle',
      color: '#0c0ceb',
    },
    fungi: {
      symbol: 'circle',
      color: '#a700a2',
    },
    invertebrate: {
      symbol: 'circle',
      color: '#47dae7',
    },
  }
  const speciesKingdomNameMap = {
    plant: 'Plant',
    protista: 'Protista',
    vertebrate: 'Vertebrate',
    fungi: 'Fungi',
    invertebrate: 'Invertebrate',
  }

  onBeforeMount(async () => {
    // Load test GeoJSON
    const response = await fetch('https://s3-zh.os.switch.ch/gendib/data/gendib-27-03-2023.geojson')
    const gendibFeatureCol = await response.json()
    data = gendibFeatureCol.features
  })
</script>
