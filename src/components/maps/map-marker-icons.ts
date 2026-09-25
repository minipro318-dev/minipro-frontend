import L from 'leaflet'

const iconCache = new Map<string, L.DivIcon>()

export const getLocationPinIcon = (color: string, size = 28) => {
  const key = `${color}-${size}`
  const cached = iconCache.get(key)
  if (cached) return cached

  const icon = L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 6],
    html: `
      <span style="display:inline-flex;color:${color};filter:drop-shadow(0 2px 2px rgba(0,0,0,0.25));">
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path fill="currentColor" d="M12 2C8.134 2 5 5.134 5 9c0 4.385 5.024 10.981 6.08 12.327a1.15 1.15 0 0 0 1.84 0C13.976 19.981 19 13.385 19 9c0-3.866-3.134-7-7-7Z"/>
          <circle cx="12" cy="9" r="3" fill="white"/>
        </svg>
      </span>
    `,
  })

  iconCache.set(key, icon)
  return icon
}
