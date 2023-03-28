<template>
  <div ref="mapParentDiv" :class="fillDiv ? 'filldiv' : 'absolute-full'"></div>

  <div ref="popupContainer" class="ol-popup">
    <a ref="popupCloser" href="#" class="ol-popup-closer"></a>
    <div ref="popupContent"></div>
  </div>

  <q-page-sticky
    position="top-right"
    :offset="[15, 15]"
    style="background-color: rgba(255, 255, 255, 0.6)">
    <div ref="gendibLegend"></div>
  </q-page-sticky>
</template>

<script setup lang="ts">
  import { watch, onMounted, toRaw } from 'vue'
  import type { PropType } from 'vue'

  import 'ol/ol.css'
  import 'ol-ext/dist/ol-ext.css'
  import { Map, View } from 'ol'
  import { defaults as defaultControls } from 'ol/control'
  import { Draw } from 'ol/interaction'
  // import LayerSwitcherImage from 'ol-ext/control/LayerSwitcherImage'
  import { transform as transformCoord } from 'ol/proj'
  import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
  import BaseLayer from 'ol/layer/Base'
  import { OSM, Vector as VectorSource } from 'ol/source'
  import Feature from 'ol/Feature'
  import GeoJSON from 'ol/format/GeoJSON'
  import type { GeoJSONFeature } from 'ol/format/GeoJSON'
  import type { Type as GeomType } from 'ol/geom/Geometry'
  import { RegularShape, Circle as CircleStyle, Stroke, Fill, Style } from 'ol/style'
  import { asArray as asColorArray } from 'ol/color'
  import Overlay from 'ol/Overlay'
  import Legend from 'ol-ext/legend/Legend'
  import LegendControl from 'ol-ext/control/Legend'

  interface IdValueMap {
    [id: number]: string
  }

  interface NestedIdValueMap {
    [id: number]: IdValueMap
  }

  const props = defineProps({
    geoJsonArray: {
      type: Array as PropType<Array<GeoJSON>>,
      default: () => [],
    },
    fillDiv: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    baseMapUrl: {
      type: String as PropType<string>,
      default: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
    drawEnabled: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    primaryColor: {
      type: String as PropType<string>,
      default: '#007b83',
    },
    secondaryColor: {
      type: String as PropType<string>,
      default: '#fefefe',
    },
    accentColor: {
      type: String as PropType<string>,
      default: '#e7e5ac',
    },
    legendIdNameMap: {
      type: Object as PropType<IdValueMap>,
      default: undefined,
    },
    legendMarkerSymbolMap: {
      type: Object as PropType<NestedIdValueMap>,
      default: undefined,
    },
  })
  const emit = defineEmits<{
    (_e: 'drawShape', _value: Array<number> | null): void
    (_e: 'legendItemSelected', _value: string): void
  }>()

  const map = $ref(new Map({ controls: defaultControls({ zoom: false }) }))
  defineExpose({ map })
  const mapParentDiv = $ref<HTMLElement>()

  const gendibLegend = $ref<HTMLElement>()

  let popupOverlay = $ref<Overlay>()
  const popupContainer = $ref()
  const popupCloser = $ref()
  const popupContent = $ref()

  const drawEnabled = $toRef(props, 'drawEnabled')
  let draw: Draw = $ref<Draw>()
  let drawLayer: BaseLayer | null = $ref<VectorLayer<VectorSource> | null>(null)
  let drawPolygonCoords: Array<number> | null = $ref<Array<number> | null>(null)

  const geoJsonArray = $toRef(props, 'geoJsonArray')
  let mapDataLayers: Array<BaseLayer> = $ref<Array<VectorLayer<VectorSource>>>()
  const baseMapUrl = $toRef(props, 'baseMapUrl')

  watch(
    () => drawEnabled,
    (drawEnabled: boolean) => {
      if (drawEnabled) {
        addDrawToMap()
      } else {
        removeDrawFromMap()
      }
    }
  )

  function addDrawToMap(geomType: GeomType = 'Polygon') {
    const drawSource = new VectorSource({ wrapX: false })
    drawLayer = new VectorLayer({
      source: drawSource,
    })
    map.addLayer(drawLayer)

    draw = new Draw({
      source: drawSource,
      type: geomType,
    })
    map.addInteraction(draw)

    draw.on('drawstart', function () {
      drawSource.clear()
    })

    drawSource.on('addfeature', function () {
      const geom = drawLayer?.getSource()?.getFeatures()[0]?.getGeometry()

      if (geom) {
        drawPolygonCoords = geom.transform('EPSG:3857', 'EPSG:4326').getCoordinates()
        if (geom.getType() === 'Polygon') {
          emit('drawShape', drawPolygonCoords)
        }
      }
    })
  }

  function removeDrawFromMap() {
    map.removeLayer(drawLayer)
    map.removeInteraction(draw)
    drawLayer = null
    drawPolygonCoords = null
  }

  const shapeStyles = {
    circle1: new CircleStyle({
      radius: 10,
      fill: new Fill({
        color: asColorArray(props.primaryColor),
      }),
      stroke: new Stroke({ color: props.secondaryColor, width: 1 }),
    }),
    circle2: new CircleStyle({
      radius: 10,
      fill: new Fill({
        color: asColorArray(props.primaryColor),
      }),
      stroke: new Stroke({ color: props.secondaryColor, width: 1 }),
    }),
    square: new RegularShape({
      fill: new Fill({
        color: asColorArray(props.primaryColor),
      }),
      stroke: new Stroke({ color: props.secondaryColor, width: 1 }),
      points: 4,
      radius: 10,
      angle: Math.PI / 4,
    }),
    triangle: new RegularShape({
      fill: new Fill({
        color: asColorArray(props.primaryColor),
      }),
      stroke: new Stroke({ color: props.secondaryColor, width: 1 }),
      points: 3,
      radius: 10,
      rotation: Math.PI / 4,
      angle: 0,
    }),
    diamond: new RegularShape({
      fill: new Fill({
        color: asColorArray(props.primaryColor),
      }),
      stroke: new Stroke({ color: props.secondaryColor, width: 1 }),
      points: 4,
      // radius: 10,
      radius1: 10,
      radius2: 6,
      // angle: Math.PI / 4,
      // rotation: 0.785,
    }),
  }

  function speciesKingdomShapes(kingdom: string): Style {
    const shape = shapeStyles[props.legendMarkerSymbolMap[kingdom].symbol]
    shape.setFill(
      new Fill({
        color: asColorArray(props.legendMarkerSymbolMap[kingdom].color),
      })
    )

    return shape
  }

  function speciesKingdomStyleFunc(marker: Feature): Style {
    return new Style({
      geometry: marker.getGeometry(),
      image: speciesKingdomShapes(marker.get('species_kingdom')),
    })
  }

  let vectorLayer = $ref<VectorLayer>()
  function listenMarkerClick(event) {
    vectorLayer.getFeatures(event.pixel).then((features) => {
      if (features.length > 0) {
        popupContent.innerHTML = null
        const geoJsonProps = features[0].getProperties()

        for (const field of ['species_scientific', 'species_kingdom', 'marker_types']) {
          const titleCaseField = field
            .replaceAll('_', ' ')
            .replaceAll(/\b\w/g, (s: string) => s.toUpperCase())
          popupContent.innerHTML += `<p><b>${titleCaseField}</b>: ${geoJsonProps[field]}</p>`
        }
        // DOIs
        for (const field of ['article_doi', 'data_doi']) {
          const titleCaseField = field
            .replaceAll('_', ' ')
            .replaceAll(/\b\w/g, (s: string) => s.toUpperCase())
          const value = geoJsonProps[field]
          if (value !== 'NA') {
            popupContent.innerHTML += `<p><b>${titleCaseField}</b>: <a target="_blank" href="https://doi.org/${value}">Link</a></p>`
          } else {
            popupContent.innerHTML += `<p><b>${titleCaseField}</b>: None</p>`
          }
        }

        // Data Link
        const path = geoJsonProps['path_aux_pop'].split('populations_files/')
        if (path.length > 1) {
          popupContent.innerHTML += `<p><b>Data Link</b>: <a target="_blank" href="https://s3-zh.os.switch.ch/gendib/data/auxiliary_populations/${path[1]}">Link</a></p>`
        } else {
          popupContent.innerHTML += '<p><b>Data Link</b>: None</p>'
        }

        const coordinate = event.coordinate
        popupOverlay?.setPosition(coordinate)
      }
    })
  }

  function getVectorLayerFromGeoJSON(
    geoJsonArray: Array<GeoJSONFeature>
  ): Array<VectorLayer<VectorSource>> {
    let featureArray: Array<Feature> = []
    geoJsonArray.forEach((geoJson: GeoJSONFeature) => {
      const transformedGeoJSON = {
        ...geoJson,
        geometry: {
          type: 'Point',
          coordinates: transformCoord(geoJson.geometry.coordinates, 'EPSG:4326', 'EPSG:3857'),
        },
      }
      featureArray.push(new GeoJSON().readFeature(transformedGeoJSON))
    })

    vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: featureArray,
      }),
      style: speciesKingdomStyleFunc,
    })

    map.un('singleclick', listenMarkerClick)
    map.on('singleclick', listenMarkerClick)

    return [vectorLayer]
  }

  let legendCtl = $ref<LegendControl>()
  function addGeoJsonLayers(geoJsons: Array<GeoJSONFeature>) {
    if (geoJsons.length === 0) {
      // legendCtl = new LegendControl({})
      return
    }
    mapDataLayers = getVectorLayerFromGeoJSON(toRaw(geoJsons))

    mapDataLayers.forEach((layer: VectorLayer<VectorSource>) => {
      map.addLayer(layer)
    })

    // Add legend
    if (props.legendIdNameMap && props.legendMarkerSymbolMap) {
      const legend = new Legend({
        title: 'Legend',
        margin: 5,
        maxWidth: 300,
      })

      // Re-create legend
      map.removeControl(legendCtl)
      legendCtl = new LegendControl({
        legend: legend,
        collapsed: false,
        collapsible: false,
        // className: 'ol-legend ol-legend-sticky',
        target: gendibLegend,
      })

      // Trigger filter on legend click
      legend.on('select', function (event) {
        const legendSelection = event.item.get('title')
        if (!legendSelection) {
          return
        }
        emit('legendItemSelected', legendSelection.toLowerCase())
      })

      map.addControl(legendCtl)
      // Legend associated with geojson layer
      for (const [kingdom_name, title] of Object.entries(props.legendIdNameMap)) {
        console.log(kingdom_name)
        console.log(speciesKingdomShapes(kingdom_name))
        console.log(asColorArray(props.primaryColor))
        const markerShape = speciesKingdomShapes(kingdom_name)
        legend.addItem({
          title: title,
          typeGeom: 'Point',
          style: new Style({
            image: markerShape,
          }),
        })
      }
    }
  }

  onMounted(() => {
    map.setTarget(mapParentDiv)
    map.setView(
      new View({
        center: transformCoord([8.23, 46.82], 'EPSG:4326', 'EPSG:3857'),
        zoom: 8,
        projection: 'EPSG:3857',
        constrainResolution: true,
      })
    )

    // map.addControl(new LayerSwitcherImage())

    let attribution = ''
    if (baseMapUrl === 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png') {
      attribution =
        '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
    } else if (
      baseMapUrl ===
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    ) {
      attribution = '© <a href="https://www.esri.com" target="_blank">ESRI</a>'
    }
    // TODO add support for https://tile.osm.ch/2056/{z}/{x}/{y}.png
    // Requires reprojecting center coordinates
    map.addLayer(
      new TileLayer({
        title: 'OSM',
        baseLayer: true,
        source: new OSM({
          url: baseMapUrl,
          attributions: [attribution],
        }),
      })
    )

    addGeoJsonLayers(geoJsonArray)

    popupOverlay = new Overlay({
      element: popupContainer,
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    })
    map.addOverlay(popupOverlay)
    popupCloser.onclick = function () {
      popupOverlay.setPosition(undefined)
      popupCloser.blur()
      return false
    }

    watch(
      () => geoJsonArray,
      (geoJsonArray: Array<GeoJSON>) => {
        // Remove layers prior to re-adding on change
        if (mapDataLayers) {
          mapDataLayers.forEach((layer: VectorLayer<VectorSource>) => {
            map.removeLayer(layer)
          })
        }
        addGeoJsonLayers(geoJsonArray)
      }
    )
  })
</script>
