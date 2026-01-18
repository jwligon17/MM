import { cellToLatLng } from 'h3-js'

const DEFAULT_CENTER = [37.773972, -122.431297]

export const getH3Centroid = (h3) => {
  if (!h3) return null

  try {
    const [lat, lng] = cellToLatLng(h3)
    const isLatValid = Number.isFinite(lat)
    const isLngValid = Number.isFinite(lng)

    if (!isLatValid || !isLngValid) return null
    return [lat, lng]
  } catch (error) {
    return null
  }
}

export const formatLatLng = (coords) => {
  if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return 'N/A'
  const [lat, lng] = coords
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
}

export const getGoogleMapsLink = (coords) => {
  if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return ''
  const [lat, lng] = coords
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export const getFallbackCenter = () => DEFAULT_CENTER
