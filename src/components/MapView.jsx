import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const center = [20, 0]

function markerIcon(kind) {
  const className = `map-marker map-marker--${kind}`
  return L.divIcon({ className: '', html: `<span class="${className}"></span>`, iconSize: [28, 28], iconAnchor: [14, 14] })
}

export default function MapView({ members = {}, home, currentUserId, currentLocation, onSelectHome }) {
  const mapElement = useRef(null)
  const map = useRef(null)
  const markers = useRef([])

  useEffect(() => {
    if (!mapElement.current || map.current) return
    map.current = L.map(mapElement.current, { zoomControl: false, attributionControl: false, minZoom: 2 }).setView(center, 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map.current)
    L.control.zoom({ position: 'bottomright' }).addTo(map.current)
    if (onSelectHome) map.current.on('click', (event) => onSelectHome({ latitude: event.latlng.lat, longitude: event.latlng.lng }))
    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [onSelectHome])

  useEffect(() => {
    if (!map.current) return
    markers.current.forEach((marker) => marker.remove())
    markers.current = []
    const locations = []
    if (home?.latitude && home?.longitude) {
      const marker = L.marker([home.latitude, home.longitude], { icon: markerIcon('home') }).addTo(map.current).bindTooltip('Home', { direction: 'top', offset: [0, -12] })
      markers.current.push(marker)
      locations.push([home.latitude, home.longitude])
    }
    Object.entries(members).forEach(([id, member]) => {
      if (member.latitude == null || member.longitude == null) return
      const kind = id === currentUserId ? 'you' : 'member'
      const marker = L.marker([member.latitude, member.longitude], { icon: markerIcon(kind) }).addTo(map.current).bindTooltip(id === currentUserId ? 'You' : member.name, { direction: 'top', offset: [0, -12] })
      markers.current.push(marker)
      locations.push([member.latitude, member.longitude])
    })
    if (locations.length === 1) map.current.setView(locations[0], 14)
    if (locations.length > 1) map.current.fitBounds(locations, { padding: [60, 60], maxZoom: 14 })
  }, [members, home, currentUserId])

  useEffect(() => {
    if (map.current && currentLocation) map.current.setView([currentLocation.latitude, currentLocation.longitude], 15, { animate: true })
  }, [currentLocation])

  return <div ref={mapElement} className="map" aria-label="Family map" />
}
