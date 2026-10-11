// Canonical, VERIFIED KIMS (Kalinga Institute of Medical Sciences) location data.
//
// Hospital address (official):
//   KIMS General Hospital, Kushabhadra Campus (KIIT Campus-5), 5 KIIT Rd,
//   Patia, Bhubaneswar, Odisha 751024, India
//
// Verified Google / Waze Place ID:
//   ChIJn9PcD0SnGToRRzlmmgMNhvg
//     -> "Kalinga Institute of Medical Sciences (KIMS)",
//        Kushabhadra Campus, 5, KIIT Rd, Patia, Bhubaneswar, Odisha 751024
//   (cross-checked against the official KIMS / Google / Waze listing).
//
// Campus coordinates (latitude.to verified KIMS campus listing):
//   Latitude  20.3534 N
//   Longitude 85.8154 E
//
// LAT/LONG ORDER — latitude is ALWAYS first, longitude second. Never swap.
//
// This file is the single, authoritative source for KIMS coordinates.
// Do not scatter KIMS lat/lng across the codebase; import from here.

const KIMS_CAMPUS = {
  latitude: 20.3534,
  longitude: 85.8154,
};

// Verified KIMS General Hospital (Kushabhadra Campus / KIIT Campus-5).
const hospital = {
  name: 'KIMS General Hospital',
  shortName: 'KIMS General Hospital',
  address:
    'Kushabhadra Campus (KIIT Campus-5), 5 KIIT Rd, Patia, Bhubaneswar, Odisha 751024, India',
  latitude: KIMS_CAMPUS.latitude,
  longitude: KIMS_CAMPUS.longitude,
  placeId: 'ChIJn9PcD0SnGToRRzlmmgMNhvg',
};

// KIMS Emergency & Trauma Centre — same verified campus. KIMS operates its
// Emergency Medicine / Emergency & Trauma Centre 24x7 at Kushabhadra Campus.
// No separate verified Emergency-building coordinate exists, so we use the
// verified campus destination (we do NOT invent an internal entrance point).
const emergency = {
  name: 'KIMS Emergency & Trauma Centre',
  shortName: 'KIMS Emergency & Trauma Centre',
  address:
    'KIMS General Hospital, Kushabhadra Campus (KIIT Campus-5), 5 KIIT Rd, Patia, Bhubaneswar, Odisha 751024, India',
  latitude: KIMS_CAMPUS.latitude,
  longitude: KIMS_CAMPUS.longitude,
  placeId: 'ChIJn9PcD0SnGToRRzlmmgMNhvg',
};

export const KIMS_LOCATION = { hospital, emergency };