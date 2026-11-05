import { CLUB_ENVIRONMENT_IDS, parseDirectoryProfile } from "@/app/lib/primaryClub";

export const DIRECTORY_RADIUS_OPTIONS_KM = [25, 50, 100, 200];

const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function getClubCoordinates(club) {
  const { location } = parseDirectoryProfile(club?.directory_profile);
  if (location.lat == null || location.lng == null) return null;
  return { lat: location.lat, lng: location.lng };
}

export function formatDirectoryLocationLine(location) {
  if (!location) return "";
  const parts = [location.suburb, location.state, location.postcode, location.country].filter(Boolean);
  return parts.join(", ");
}

export function formatDistanceKm(km) {
  if (km == null || !Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 100) return `${km.toFixed(km < 10 ? 1 : 0)} km`;
  return `${Math.round(km)} km`;
}

export function clubMatchesEnvironment(club, environmentId) {
  if (!environmentId || !CLUB_ENVIRONMENT_IDS.includes(environmentId)) return true;
  const { environments } = parseDirectoryProfile(club?.directory_profile);
  return environments.includes(environmentId);
}

/**
 * Filter subscribed clubs by environment and optional radius from origin.
 * Adds `directoryDistanceKm` when origin + radius are active.
 */
export function filterClubsForDirectory(clubs, { environmentId, origin, radiusKm }) {
  let list = Array.isArray(clubs) ? clubs.slice() : [];

  if (environmentId) {
    list = list.filter((club) => clubMatchesEnvironment(club, environmentId));
  }

  const useRadius =
    origin &&
    origin.lat != null &&
    origin.lng != null &&
    radiusKm != null &&
    Number(radiusKm) > 0;

  if (!useRadius) {
    return list.map((club) => ({ ...club, directoryDistanceKm: null }));
  }

  const withDistance = list.map((club) => {
    const coords = getClubCoordinates(club);
    if (!coords) {
      return { club, distanceKm: null };
    }
    return {
      club,
      distanceKm: haversineDistanceKm(origin.lat, origin.lng, coords.lat, coords.lng),
    };
  });

  return withDistance
    .filter((row) => row.distanceKm != null && row.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .map((row) => ({ ...row.club, directoryDistanceKm: row.distanceKm }));
}

export function requestUserLocation() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        reject(err || new Error("denied"));
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );
  });
}
