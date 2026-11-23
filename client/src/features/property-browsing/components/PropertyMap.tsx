import L from 'leaflet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatPrice } from '../price'
import type { PropertySummary } from '../types'
import PropertyMapPopup from './PropertyMapPopup'

type Props = {
  properties: PropertySummary[]
  /** Layout classes for the map's size, such as `h-96`. */
  className?: string
}

type OpenPopup = { property: PropertySummary; container: HTMLElement; popup: L.Popup }

const BARCELONA: L.LatLngTuple = [41.3874, 2.1686]
const CITY_ZOOM = 13
const PIN_WIDTH = 28
const PIN_HEIGHT = 36
const POPUP_MIN_WIDTH = 200
const POPUP_MAX_WIDTH = 260
// Leaflet's own margins around the popup content, so a popup never gets wider than the map
const POPUP_MARGINS = 60

// OpenStreetMap tiles need no API key, and their license asks for this attribution to stay visible
const TILES_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILES_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// A map pin whose tip marks the place, in the brand color with a white border so it stands out on any tile
const pinIcon = L.divIcon({
  className:
    'rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
  html: `<svg viewBox="0 0 24 32" width="${PIN_WIDTH}" height="${PIN_HEIGHT}" aria-hidden="true"><path d="M12 1C5.9 1 1 5.8 1 11.8 1 20 12 31 12 31s11-11 11-19.2C23 5.8 18.1 1 12 1z" class="fill-brand-primary stroke-surface-page" stroke-width="2"/><circle cx="12" cy="11.5" r="4" class="fill-surface-page"/></svg>`,
  iconSize: [PIN_WIDTH, PIN_HEIGHT],
  iconAnchor: [PIN_WIDTH / 2, PIN_HEIGHT],
  popupAnchor: [0, -PIN_HEIGHT],
})

function hasCoordinates(
  property: PropertySummary,
): property is PropertySummary & { latitude: number; longitude: number } {
  return typeof property.latitude === 'number' && typeof property.longitude === 'number'
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/** A map of Barcelona with one pin per property that has coordinates. */
function PropertyMap({ properties, className = 'h-80' }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [openPopup, setOpenPopup] = useState<OpenPopup>()
  const fitPopup = useCallback(() => openPopup?.popup.update(), [openPopup])

  useEffect(() => {
    const element = mapRef.current
    if (!element) return
    const animate = !prefersReducedMotion()
    // The page scrolls past the map instead of zooming it; the zoom buttons and the keyboard still zoom
    const map = L.map(element, {
      center: BARCELONA,
      zoom: CITY_ZOOM,
      scrollWheelZoom: false,
      zoomAnimation: animate,
      fadeAnimation: animate,
      markerZoomAnimation: animate,
      inertia: animate,
    })
    L.tileLayer(TILES_URL, { maxZoom: 19, attribution: TILES_ATTRIBUTION }).addTo(map)
    const popupMaxWidth = Math.max(
      POPUP_MIN_WIDTH,
      Math.min(POPUP_MAX_WIDTH, map.getSize().x - POPUP_MARGINS),
    )

    for (const property of properties.filter(hasCoordinates)) {
      const container = document.createElement('div')
      const marker = L.marker([property.latitude, property.longitude], {
        icon: pinIcon,
        title: `${property.title}, ${formatPrice(property.priceEuros, property.operation)}`,
      })
        .bindPopup(container, {
          minWidth: Math.min(POPUP_MIN_WIDTH, popupMaxWidth),
          maxWidth: popupMaxWidth,
        })
        .addTo(map)

      marker.on('popupopen', (event) => setOpenPopup({ property, container, popup: event.popup }))
      marker.on('popupclose', (event) => {
        setOpenPopup(undefined)
        // The focus was in the popup that just closed, its × button included, so it goes back to its pin
        const focus = document.activeElement
        if (event.popup.getElement()?.contains(focus) || focus === document.body) {
          marker.getElement()?.focus()
        }
      })
      // A pin is a button, so Space opens it too; Leaflet only listens to Enter
      marker.getElement()?.addEventListener('keydown', (event) => {
        if (event.key === ' ') {
          event.preventDefault()
          marker.openPopup()
        }
      })
      // Leaflet only closes a popup with Escape while the map itself has the focus
      container.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') map.closePopup()
      })
    }

    return () => {
      map.remove()
    }
  }, [properties])

  return (
    <>
      <div
        ref={mapRef}
        role="region"
        aria-label="Map of the properties in Barcelona"
        className={[
          'w-full overflow-hidden rounded-md border border-border bg-surface-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary',
          className,
        ].join(' ')}
      />
      {openPopup
        ? createPortal(
            // Leaflet sized the popup while it was still empty, so it measures it again and pans
            // the map until the whole popup is in view
            <PropertyMapPopup property={openPopup.property} onShown={fitPopup} />,
            openPopup.container,
          )
        : null}
    </>
  )
}

export default PropertyMap
