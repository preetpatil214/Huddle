export function watchLocation(onLocation, onError) {
  if (!navigator.geolocation) {
    onError(new Error('Location is not supported on this device.'))
    return () => {}
  }
  const watchId = navigator.geolocation.watchPosition(
    ({ coords }) => onLocation({ latitude: coords.latitude, longitude: coords.longitude, updatedAt: Date.now() }),
    onError,
    { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 },
  )
  return () => navigator.geolocation.clearWatch(watchId)
}

export function requestCurrentLocation(onLocation, onError) {
  if (!navigator.geolocation) return onError(new Error('Location is not supported on this device.'))
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => onLocation({ latitude: coords.latitude, longitude: coords.longitude }),
    onError,
    { enableHighAccuracy: true, timeout: 15_000 },
  )
}

