// Shared geolocation service.
// Single source of truth for obtaining the user's real device/browser GPS.
// Used by: Get Directions, Find Nearest Help, and SOS.
//
// The browser/device native permission prompt is the source of truth. We never
// fake a position, and never fall back to IP geolocation, hardcoded coordinates,
// or hospital coordinates as the patient/current location.
//
// Errors carry a stable `.code` the UI maps to a user-facing message:
//   'unsupported', 'denied' (permission), 'services-off', 'timeout', 'unavailable'.

function mkErr(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

export function getCurrentUserLocation({ enableHighAccuracy = true, timeout = 10000, maximumAge = 0 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation?.getCurrentPosition) {
      return reject(mkErr('unsupported', 'Geolocation is not supported on this device.'));
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position?.coords?.latitude;
        const lng = position?.coords?.longitude;
        const accuracy = position?.coords?.accuracy;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return reject(mkErr('unavailable', 'Invalid position returned by the browser.'));
        }
        resolve({
          latitude: lat,
          longitude: lng,
          accuracy: Number.isFinite(accuracy) ? accuracy : null,
          timestamp: new Date().toISOString(),
        });
      },
      (err) => {
        let code = 'unavailable';
        if (err?.code === 1) code = 'denied';            // PERMISSION_DENIED
        else if (err?.code === 2) code = 'services-off'; // POSITION_UNAVAILABLE
        else if (err?.code === 3 || err?.name === 'timeout') code = 'timeout';
        reject(mkErr(code, err?.message || 'Unable to determine your location.'));
      },
      { enableHighAccuracy, timeout, maximumAge },
    );
  });
}

// Optional, best-effort permission state (browser support varies).
// Do NOT rely on this exclusively — getCurrentUserLocation is the authority.
export function getGeolocationPermissionState() {
  try {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      return navigator.permissions.query({ name: 'geolocation' });
    }
  } catch (e) { /* fall through */ }
  return Promise.resolve(null);
}