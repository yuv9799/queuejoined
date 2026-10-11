// Centralized emergency configuration.
// Keep credentials out of the frontend; only public, changeable values live here.
import { KIMS_LOCATION } from './location.js';

export { KIMS_LOCATION };

export const EMERGENCY_PHONES = {
  national: '108',                    // National emergency
  ambulance: '102',                   // Ambulance
  desk: '+916740000999',              // KIMS Emergency Desk (demo number)
};

// The Emergency & Trauma destination always resolves to the verified KIMS
// campus via its Place ID + coordinates (see ./location.js).
export const EMERGENCY_DEPARTMENT = KIMS_LOCATION.emergency;

export function callLink(number) {
  return typeof window !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    ? `tel:${number.replace(/[^+\d]/g, '')}`
    : null;
}

// Build a Google Maps Directions URL from real coordinates.
// Route is ALWAYS:  origin = USER's current device GPS
//                   destination = VERIFIED KIMS coordinates (exact pin)
// Coordinates are latitude,longitude (never swapped) and each coordinate
// string is URL-encoded via encodeURIComponent.
export function mapsDirectionsUrl({ originLat, originLng, destination, travelMode = 'driving' }) {
  const userOrigin = encodeURIComponent(`${originLat},${originLng}`);
  const kimsDestination = encodeURIComponent(`${destination.latitude},${destination.longitude}`);
  return `https://www.google.com/maps/dir/?api=1`
    + `&origin=${userOrigin}`
    + `&destination=${kimsDestination}`
    + `&travelmode=${travelMode}`;
}

// Pin (not route) a single coordinate.
export function mapsPinUrl(lat, lng) {
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
}