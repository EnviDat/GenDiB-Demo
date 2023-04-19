<template>
  <q-page>
    <div class="absolute-full">
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

    <q-page-sticky position="top-left" :offset="[20, 20]">
      <div class="q-pa-none" style="width: 80vw">
        <div class="row rounded-borders" style="background-color: white">
          <div class="col-1 flex justify-center">
            <q-btn
              class="fit"
              flat
              dense
              padding=".5rem"
              icon="polyline"
              @click="mapDrawEnabled = !mapDrawEnabled"
              @update:model-value="filterPolygon = null" />
          </div>
          <div class="col" v-for="(options, key) in filterOptions" :key="key">
            <SelectFilter
              v-model="filterSelections[key]"
              :options="options"
              :label="key.replaceAll('_', ' ').replaceAll(/\b\w/g, (s: string) => s.toUpperCase())" />
          </div>
        </div>
      </div>
    </q-page-sticky>

    <q-footer style="height: 40%" v-model="dataTableOpen" elevated>
      <q-card bordered>
        <DataTable
          :data="tableData"
          @row-selected="
            (row) => {
              dataRowSelected = row
            }
          "
          :export-selection-label="t(`table.export`)" />
      </q-card>
    </q-footer>

    <q-page-sticky position="bottom-left">
      <q-btn
        :icon="dataTableToggleIcon"
        color="primary"
        @click="
          ;(dataTableOpen = !dataTableOpen),
            (dataTableToggleIcon =
              dataTableToggleIcon === 'expand_more' ? 'expand_less' : 'expand_more')
        "
        aria-label="Open Data Table" />
    </q-page-sticky>

    <q-page-sticky position="bottom-left">
      <q-btn
        :icon="dataTableToggleIcon"
        color="primary"
        @click="
          ;(dataTableOpen = !dataTableOpen),
            (dataTableToggleIcon =
              dataTableToggleIcon === 'expand_more' ? 'expand_less' : 'expand_more')
        "
        aria-label="Open Data Table" />
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
  const { baseMapUrl, dataTableOpen } = storeToRefs(generalStore)

  const mapDrawEnabled = $ref<boolean>(false)
  const filterPolygon = $ref<Array<number> | null>()
  const dataTableToggleIcon = $ref<string>('expand_less')

  let data = $ref<Array<GeoJSONFeature>>([])
  const filterSelections = $ref<KeyValuePair>({
    species_kingdom: '',
    species_scientific: '',
    marker_types: '',
    data_set_published: '',
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
        species_scientific: [''].concat(
          Array.from(new Set(data.map(({ properties }) => properties.species_scientific)))
        ),
        marker_types: [''].concat(
          Array.from(new Set(data.map(({ properties }) => properties.marker_types)))
        ),
        data_set_published: [''].concat(
          Array.from(new Set(data.map(({ properties }) => properties.data_set_published)))
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

    const scientificFilter = (x: GeoJSONFeature) => {
      const scientificName = filterSelections['species_scientific']
      return !scientificName || x.properties.species_scientific === scientificName
    }

    const markerTypesFilter = (x: GeoJSONFeature) => {
      const markerTypes = filterSelections['marker_types']
      return !markerTypes || x.properties.marker_types === markerTypes
    }

    const publishedFilter = (x: GeoJSONFeature) => {
      const datePublished = filterSelections['data_set_published']
      return !datePublished || x.properties.data_set_published === datePublished
    }

    return data.filter(
      (x) =>
        geospatialFilter(x) &&
        kingdomFilter(x) &&
        scientificFilter(x) &&
        markerTypesFilter(x) &&
        publishedFilter(x)
    )
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
      color: '#537A29',
    },
    protista: {
      symbol: 'cross',
      color: '#219EBC',
    },
    vertebrate: {
      symbol: 'square',
      color: '#FFBF1F',
    },
    fungi: {
      symbol: 'triangle',
      color: '#023047',
    },
    invertebrate: {
      symbol: 'diamond',
      color: '#C1121F',
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
    const response = await fetch('https://s3-zh.os.switch.ch/gendib/data/gendib.geojson')
    const gendibFeatureCol = await response.json()
    data = gendibFeatureCol.features
  })
</script>
