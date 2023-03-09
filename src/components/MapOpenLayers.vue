<template>
  <div ref="mapParentDiv" :class="fillDiv ? 'filldiv' : 'absolute-full'"></div>

  <div ref="popupContainer" class="ol-popup">
    <a ref="popupCloser" href="#" class="ol-popup-closer"></a>
    <div ref="popupContent"></div>
  </div>
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
  import { createEmpty, extend, getWidth } from 'ol/extent'
  import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
  import BaseLayer from 'ol/layer/Base'
  import { OSM, Cluster, Vector as VectorSource } from 'ol/source'
  import Feature from 'ol/Feature'
  import GeoJSON from 'ol/format/GeoJSON'
  import type { GeoJSONFeature } from 'ol/format/GeoJSON'
  import type { Coordinate } from 'ol/coordinate'
  import { LineString, Point, Polygon } from 'ol/geom'
  import type { Type as GeomType } from 'ol/geom/Geometry'
  import convexHull from 'ol-ext/geom/ConvexHull'
  import { Circle as CircleStyle, Stroke, Fill, Text, Style } from 'ol/style'
  import type { StyleLike, StyleFunction } from 'ol/style/Style'
  import { asArray as asColorArray } from 'ol/color'
  import Overlay from 'ol/Overlay'
  import Legend from 'ol-ext/legend/Legend'
  import LegendControl from 'ol-ext/control/Legend'

  interface IdValueMap {
    [id: number]: string
  }

  const props = defineProps({
    geoJsonArray: {
      type: Array as PropType<Array<GeoJSON>>,
      default: () => [],
    },
    geoJsonProps: {
      type: Array as PropType<Array<string>>,
      default: () => [],
    },
    clusterData: {
      type: Boolean as PropType<boolean>,
      default: true,
    },
    includeClusterHulls: {
      type: Boolean as PropType<boolean>,
      default: true,
    },
    clusterZoomOnClick: {
      type: Boolean as PropType<boolean>,
      default: true,
    },
    clusterMarkerColorParam: {
      type: String as PropType<string>,
      default: undefined,
    },
    clusterMarkerColorMap: {
      type: Object as PropType<IdValueMap>,
      default: undefined,
    },
    fillDiv: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    drawEnabled: {
      type: Boolean as PropType<boolean>,
      default: false,
    },
    baseMapUrl: {
      type: String as PropType<string>,
      default: 'https://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    },
    mapCenter: {
      type: Array as PropType<Array<number>>,
      default: () => [],
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
  })
  const emit = defineEmits<{
    (_e: 'drawShape', _value: Array<number> | null): void
  }>()

  const map = $ref(new Map({ controls: defaultControls({ zoom: false }) }))
  defineExpose({ map })
  const mapParentDiv = $ref<HTMLElement>()

  let popupOverlay = $ref<Overlay>()
  const popupContainer = $ref()
  const popupCloser = $ref()
  const popupContent = $ref()

  const drawEnabled = $toRef(props, 'drawEnabled')
  let draw: Draw = $ref<Draw>()
  let drawLayer: BaseLayer | null = $ref<VectorLayer<VectorSource> | null>(null)
  let drawPolygonCoords: Array<number> | null = $ref<Array<number> | null>(null)

  const geoJsonArray = $toRef(props, 'geoJsonArray')
  let mapDataLayers: Array<BaseLayer> = $ref<Array<VectorLayer<Cluster | VectorSource>>>()
  const baseMapUrl = $toRef(props, 'baseMapUrl')
  const mapCenter = $toRef(props, 'mapCenter')
  const geoJsonProps = $toRef(props, 'geoJsonProps')

  watch(
    () => mapCenter,
    (newCenter: Array<number>) => {
      if (newCenter) {
        const coord4326 = transformCoord(newCenter, 'EPSG:4326', 'EPSG:3857')
        map.getView().animate({ center: coord4326, zoom: 16 })
      }
    }
  )

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
          // TODO fix, why does the draw layer disappear on emit??
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

  function setupClusterStyle(clusterSource: Cluster): Array<VectorLayer<Cluster>> {
    const primaryColor = asColorArray(props.primaryColor)
    const convexHullFill = new Fill({
      color: props.accentColor,
    })
    const convexHullStroke = new Stroke({
      color: props.primaryColor,
      width: 1.5,
    })
    const outerCircleFill = new Fill({
      color: primaryColor.slice(0, -1).concat([0.1]),
    })
    const innerCircleFill = new Fill({
      color: primaryColor.slice(0, -1).concat([0.6]),
    })
    const textFill = new Fill({
      color: props.secondaryColor,
    })
    const textStroke = new Stroke({
      color: 'rgba(0, 0, 0, 0.6)',
      width: 3,
    })
    const innerCircle = new CircleStyle({
      radius: 14,
      fill: innerCircleFill,
    })
    const outerCircle = new CircleStyle({
      radius: 20,
      fill: outerCircleFill,
    })

    /**
     * Single feature style, users for clusters with 1 feature and cluster circles.
     * @param {Feature} clusterMember A feature from a cluster.
     * @return {Style} An icon style for the cluster member's location.
     */
    function clusterMemberStyle(clusterMember: Feature): Style {
      let fillColor = props.primaryColor
      if (props.clusterMarkerColorParam && props.clusterMarkerColorMap) {
        fillColor = props.clusterMarkerColorMap[clusterMember.get(props.clusterMarkerColorParam)]
      }
      return new Style({
        geometry: clusterMember.getGeometry(),
        image: new CircleStyle({
          radius: 10,
          fill: new Fill({
            color: asColorArray(fillColor),
          }),
          stroke: new Stroke({ color: props.secondaryColor, width: 1 }),
        }),
      })
    }

    let clickFeature: Feature, clickResolution: number
    /**
     * Style for clusters with features that are too close to each other, activated on click.
     * @param {Feature} cluster A cluster with overlapping members.
     * @param {number} resolution The current view resolution.
     * @return {Style} A style to render an expanded view of the cluster members.
     */
    function clusterCircleStyle(
      cluster: Feature<Point>,
      resolution: number
    ): Array<Style> | StyleLike | StyleFunction {
      if (cluster !== clickFeature || resolution !== clickResolution) {
        return []
      }
      const clusterMembers: Array<Feature> = cluster.get('features')
      const centerCoordinates: Coordinate = cluster?.getGeometry()?.getCoordinates() ?? []
      // TODO make clusterMembers clickable with new coordinate from style
      // Required to allow popup on click
      return generatePointsCircle(clusterMembers.length, centerCoordinates, resolution).reduce(
        (styles: Array<Style>, coordinates: Coordinate, i) => {
          const point = new Point(coordinates)
          const line = new LineString([centerCoordinates, coordinates])
          styles.unshift(
            new Style({
              geometry: line,
              stroke: convexHullStroke,
            })
          )
          styles.push(
            clusterMemberStyle(
              new Feature({
                ...clusterMembers[i].getProperties(),
                geometry: point,
              })
            )
          )
          return styles
        },
        []
      )
    }

    /**
     * From
     * https://github.com/Leaflet/Leaflet.markercluster/blob/31360f2/src/MarkerCluster.Spiderfier.js#L55-L72
     * Arranges points in a circle around the cluster center, with a line pointing from the center to
     * each point.
     * @param {number} count Number of cluster members.
     * @param {Array<number>} clusterCenter Center coordinate of the cluster.
     * @param {number} resolution Current view resolution.
     * @return {Array<Array<number>>} An array of coordinates representing the cluster members.
     */
    function generatePointsCircle(count: number, clusterCenter: Array<number>, resolution: number) {
      const circleDistanceMultiplier = 1
      const circleFootSeparation = 28
      const circleStartAngle = Math.PI / 2

      const circumference = circleDistanceMultiplier * circleFootSeparation * (2 + count)
      let legLength = circumference / (Math.PI * 2) //radius from circumference
      const angleStep = (Math.PI * 2) / count
      const res = []
      let angle

      legLength = Math.max(legLength, 35) * resolution // Minimum distance to get outside the cluster icon.

      for (let i = 0; i < count; ++i) {
        // Clockwise, like spiral.
        angle = circleStartAngle + i * angleStep
        res.push([
          clusterCenter[0] + legLength * Math.cos(angle),
          clusterCenter[1] + legLength * Math.sin(angle),
        ])
      }

      return res
    }

    let hoverFeature: Feature
    /**
     * Style for convex hulls of clusters, activated on hover.
     * @param {Feature} cluster The cluster feature.
     * @return {Style} Polygon style for the convex hull of the cluster.
     */
    function clusterHullStyle(cluster: Feature): StyleLike | StyleFunction | null | undefined {
      if (cluster !== hoverFeature) {
        return
      }
      const originalFeatures = cluster.get('features')
      const points = originalFeatures.map((feature: Feature<Point>) =>
        feature?.getGeometry()?.getCoordinates()
      )
      return new Style({
        geometry: new Polygon([convexHull(points)]).simplify(10000),
        fill: convexHullFill,
        stroke: convexHullStroke,
      })
    }

    function clusterStyle(feature: Feature): Array<Style> | Style | StyleFunction {
      const size = feature.get('features').length
      if (size > 1) {
        return [
          new Style({
            image: outerCircle,
          }),
          new Style({
            image: innerCircle,
            text: new Text({
              text: size.toString(),
              fill: textFill,
              stroke: textStroke,
            }),
          }),
        ]
      } else {
        const originalFeature = feature.get('features')[0]
        return clusterMemberStyle(originalFeature)
      }
    }

    // Layer displaying the expanded view of overlapping cluster members.
    const clusterGroups = new VectorLayer({
      source: clusterSource,
      style: clusterCircleStyle,
    })

    // Layer displaying the clusters and individual features.
    const clusters = new VectorLayer({
      source: clusterSource,
      style: clusterStyle,
    })

    map.on('singleclick', (event) => {
      clusters.getFeatures(event.pixel).then((features) => {
        if (features.length > 0) {
          const clusterMembers = features[0].get('features')
          if (clusterMembers.length > 1) {
            // Calculate the extent of the cluster members.
            const extent = createEmpty()
            clusterMembers.forEach((feature: Feature) =>
              extend(extent, feature?.getGeometry()?.getExtent() ?? [])
            )
            const view = map.getView()
            const resolution: number = map.getView().getResolution() ?? 0
            if (
              view.getZoom() === view.getMaxZoom() ||
              (getWidth(extent) < resolution && getWidth(extent) < resolution)
            ) {
              // Show an expanded view of the cluster members.
              clickFeature = features[0]
              clickResolution = resolution
              clusterGroups.setStyle(clusterCircleStyle)
            } else {
              if (props.clusterZoomOnClick) {
                // Zoom to the extent of the cluster members.
                view.fit(extent, { duration: 500, padding: [50, 50, 50, 50] })
              }
            }
          } else {
            popupContent.innerHTML = null
            const coordinate = event.coordinate
            const geoJsonFeature = features[0].getProperties().features[0]
            for (const field of geoJsonProps) {
              popupContent.innerHTML += `<p><b>${field}</b>: ${geoJsonFeature.get(field)}</p>`
            }
            popupOverlay?.setPosition(coordinate)
          }
        }
      })
    })

    if (props.includeClusterHulls) {
      // Layer displaying the convex hull of the hovered cluster.
      const clusterHulls = new VectorLayer({
        source: clusterSource,
        style: clusterHullStyle,
      })

      // Hover display cluster hulls
      map.on('pointermove', (event) => {
        clusters.getFeatures(event.pixel).then((features) => {
          if (features[0] !== hoverFeature) {
            // Display the convex hull on hover.
            hoverFeature = features[0]
            clusterHulls.setStyle(clusterHullStyle)
            // Change the cursor style to indicate that the cluster is clickable.
            map.getTargetElement().style.cursor =
              hoverFeature && hoverFeature.get('features').length > 1 ? 'pointer' : ''
          }
        })
      })

      return [clusterHulls, clusterGroups, clusters]
    } else {
      return [clusterGroups, clusters]
    }
  }

  function getClusterFromGeoJSONFeatures(
    geoJsonArray: Array<GeoJSONFeature>
  ): Array<VectorLayer<Cluster>> {
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

    const clusterSource = new Cluster({
      distance: 35,
      // minDistance: 10,
      source: new VectorSource({
        features: featureArray,
      }),
    })

    return setupClusterStyle(clusterSource)
  }

  function addGeoJsonLayers(geoJsons: Array<GeoJSONFeature>) {
    let legendLayer: VectorLayer<Cluster | VectorSource>
    if (geoJsons.length !== 0) {
      if (props.clusterData) {
        // Returns multiple layers: hulls, cluster groups, cluster points
        mapDataLayers = getClusterFromGeoJSONFeatures(toRaw(geoJsons))
        legendLayer = mapDataLayers[mapDataLayers.length - 1]
      } else {
        // TODO implement non-clustered layer
        mapDataLayers = []
        legendLayer = []
      }

      mapDataLayers.forEach((layer: VectorLayer<Cluster | VectorSource>) => {
        map.addLayer(layer)
      })

      // Add legend
      if (props.legendIdNameMap && props.clusterMarkerColorMap) {
        const legend = new Legend({
          title: 'Legend',
          margin: 5,
          maxWidth: 300,
          layer: legendLayer,
        })
        const legendCtl = new LegendControl({
          legend: legend,
          collapsed: false,
        })
        map.addControl(legendCtl)
        // Legend associated with cluster layer
        for (const [id, name] of Object.entries(props.legendIdNameMap)) {
          legend.addItem({
            title: name,
            typeGeom: 'Point',
            style: new Style({
              image: new CircleStyle({
                radius: 10,
                fill: new Fill({
                  color: asColorArray(props.clusterMarkerColorMap[id]),
                }),
                stroke: new Stroke({ color: props.secondaryColor, width: 1 }),
              }),
            }),
          })
        }
      }
    }
  }

  onMounted(() => {
    map.setTarget(mapParentDiv)
    map.setView(
      new View({
        center: transformCoord(
          mapCenter.length !== 0 ? mapCenter : [8.23, 46.82],
          'EPSG:4326',
          'EPSG:3857'
        ),
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
          mapDataLayers.forEach((layer: VectorLayer<Cluster | VectorSource>) => {
            map.removeLayer(layer)
          })
        }
        addGeoJsonLayers(geoJsonArray)
      }
    )
  })
</script>
