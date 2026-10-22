import 'leaflet'

declare module 'leaflet' {
  namespace heatLayer {
    type HeatLatLngTuple = [number, number, number?]
  }

  function heatLayer(
    latlngs: Array<heatLayer.HeatLatLngTuple>,
    options?: {
      minOpacity?: number
      maxZoom?: number
      max?: number
      radius?: number
      blur?: number
      gradient?: Record<number, string>
    },
  ): Layer
}

declare module 'leaflet.heat'
declare module 'leaflet.heat/dist/leaflet-heat.js'
declare module '/node_modules/leaflet.heat/dist/leaflet-heat.js'
