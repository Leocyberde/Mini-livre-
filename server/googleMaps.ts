import { Client, TravelMode } from "@googlemaps/google-maps-services-js";
import dotenv from "dotenv";
import { getCachedAddress, saveAddressToCache } from "./db.js";

dotenv.config();

const client = new Client({});
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || "";

// Cache em memória para evitar consultas repetidas no mesmo ciclo de vida do processo
const memoryCache = new Map<string, { lat: number; lng: number }>();

/**
 * Normaliza o endereço para busca e armazenamento.
 */
function normalizeAddress(address: string): string {
  return address.toLowerCase().trim();
}

/**
 * Obtém ou cria coordenadas para um endereço.
 * Prioriza cache em memória, depois banco de dados, e por fim a API do Google.
 */
export async function getOrCreateCoordinates(address: string): Promise<{ lat: number; lng: number } | null> {
  const normalized = normalizeAddress(address);

  // 1. Verificar cache em memória
  if (memoryCache.has(normalized)) {
    console.log(`[Cache-Memory] Hit: ${normalized}`);
    return memoryCache.get(normalized)!;
  }

  // 2. Verificar banco de dados
  try {
    const cached = await getCachedAddress(normalized);
    if (cached) {
      console.log(`[Cache-DB] Hit: ${normalized}`);
      const coords = { lat: cached.lat, lng: cached.lng };
      memoryCache.set(normalized, coords);
      return coords;
    }
  } catch (err) {
    console.error("Error checking DB cache:", err);
  }

  // 3. Chamar Google Geocoding API
  if (!GOOGLE_MAPS_API_KEY) {
    console.error("GOOGLE_MAPS_API_KEY not set");
    return null;
  }

  try {
    console.log(`[API-Geocoding] Calling for: ${normalized}`);
    const response = await client.geocode({
      params: {
        address: normalized,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      const coords = { lat: location.lat, lng: location.lng };

      // Salvar nos caches
      memoryCache.set(normalized, coords);
      await saveAddressToCache(normalized, coords.lat, coords.lng);

      return coords;
    }
    return null;
  } catch (err) {
    console.error("Error calling Google Geocoding API:", err);
    return null;
  }
}

/**
 * Obtém distância e duração entre dois pontos usando Google Routes API.
 */
export async function getDistanceBetweenPoints(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distanceKm: number; duration: string } | null> {
  if (!GOOGLE_MAPS_API_KEY) {
    console.error("GOOGLE_MAPS_API_KEY not set");
    return null;
  }

  try {
    console.log(`[API-Routes] Calling for route calculation`);
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        mode: TravelMode.driving,
        key: GOOGLE_MAPS_API_KEY,
      },
    });

    if (
      response.data.rows &&
      response.data.rows.length > 0 &&
      response.data.rows[0].elements &&
      response.data.rows[0].elements.length > 0
    ) {
      const element = response.data.rows[0].elements[0];
      if (element.status === "OK") {
        return {
          distanceKm: element.distance.value / 1000, // converter metros para km
          duration: element.duration.text,
        };
      }
    }
    return null;
  } catch (err) {
    console.error("Error calling Google Routes API:", err);
    return null;
  }
}
