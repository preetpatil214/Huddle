import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const center = [20, 0]

function markerIcon(kind) {
  const className = `map-marker map-marker--${kind}`
  const html = kind === 'home'
    ? '<svg class="home-pin" viewBox="0 0 40 48" role="img" aria-label="Home"><path d="M20 2C10.1 2 2 10.1 2 20c0 12.7 18 26 18 26s18-13.3 18-26C38 10.1 29.9 2 20 2Z" fill="#121212" stroke="#D4AF37" stroke-width="2.5"/><path d="m11 22 9-8 9 8v10H11V22Z" fill="#D4AF37"/><path d="M17 32v-7h6v7" fill="#121212"/></svg>'
    : `<span class="${className}"></span>`
  return L.divIcon({ className: '', html, iconSize: kind === 'home' ? [40, 48] : [28, 28], iconAnchor: kind === 'home' ? [20, 46] : [14, 14] })
}

export default function MapView({ members = {}, home, currentUserId, currentLocation, focusLocation, onSelectHome }) {
  const mapElement = useRef(null)
  const map = useRef(null)
  const markers = useRef([])
  const selectHome = useRef(onSelectHome)

  useEffect(() => {
    selectHome.current = onSelectHome
  }, [onSelectHome])

  useEffect(() => {
    if (!mapElement.current || map.current) return
    map.current = L.map(mapElement.current, { zoomControl: false, attributionControl: false, minZoom: 2 }).setView(center, 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map.current)
    L.control.zoom({ position: 'bottomright' }).addTo(map.current)
    if (onSelectHome) map.current.on('click', (event) => selectHome.current?.({ latitude: event.latlng.lat, longitude: event.latlng.lng }))
    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

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

  useEffect(() => {
    if (map.current && focusLocation) map.current.setView([focusLocation.latitude, focusLocation.longitude], 15, { animate: true })
  }, [focusLocation])

  return <div ref={mapElement} className="map" aria-label="Family map" />
}
