// Centralized configuration for the landing-page Emergency Help section.
//
// All hospital-specific contact numbers, locations and routes are sourced from
// the canonical KIMS config (src/config/emergency.js & src/config/location.js)
// so there is exactly ONE authoritative place where they can be changed.
// We deliberately do NOT invent numbers or URLs here.
import {
  EMERGENCY_PHONES,
  KIMS_LOCATION,
  callLink,
  mapsDirectionsUrl,
  mapsPinUrl,
} from '../../config/emergency.js';
import { getCurrentUserLocation } from '../../services/geolocation.js';

export const EMERGENCY_CONFIG = {
  // Primary hospital emergency contact (KIMS Emergency Desk).
  emergencyNumber: EMERGENCY_PHONES.desk,
  // National emergency services (for the most urgent, life-threatening cases).
  nationalNumber: EMERGENCY_PHONES.national,
  // Ambulance service line.
  ambulanceNumber: EMERGENCY_PHONES.ambulance,
  // Emergency & Trauma centre destination (verified KIMS coordinates).
  emergencyDepartment: KIMS_LOCATION.emergency,
  // Internal route for the Emergency Help Desk card.
  helpDeskRoute: '/help',
};

export { callLink, mapsDirectionsUrl, mapsPinUrl, getCurrentUserLocation };