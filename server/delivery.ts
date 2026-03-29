import { getOrCreateCoordinates, getDistanceBetweenPoints } from "./googleMaps.js";
import { getCachedDistance, saveDistanceToCache } from "./db.js";

/**
 * Cache em memória para distâncias já calculadas nesta sessão do processo.
 */
const distanceMemoryCache = new Map<string, { distanceKm: number; duration: string }>();

function buildMemoryKey(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): string {
  const r = (n: number) => Math.round(n * 10000) / 10000;
  return `${r(origin.lat)},${r(origin.lng)}->${r(dest.lat)},${r(dest.lng)}`;
}

/**
 * Calcula a distância em km entre dois pontos usando Haversine.
 */
export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const aVal =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  return R * c * 1.2;
}

/**
 * Calcula a taxa de entrega com base na distância em km.
 * - Até 5 km: R$ 12,00
 * - Acima de 5 km: R$ 12,00 + R$ 2,00 por km adicional
 */
export function calcDeliveryFee(distanceKm: number): number {
  const BASE_FEE = 12.0;
  const BASE_DISTANCE = 5.0;
  const EXTRA_PER_KM = 2.0;

  if (distanceKm <= BASE_DISTANCE) return BASE_FEE;
  return BASE_FEE + (distanceKm - BASE_DISTANCE) * EXTRA_PER_KM;
}

/**
 * Obtém distância de rota real usando sistema de cache em 3 camadas:
 *   1. Cache em memória (instantâneo, sem I/O)
 *   2. Cache no banco de dados (sem custo de API)
 *   3. Google Distance Matrix API (apenas quando necessário, resultado salvo em cache)
 */
async function getRouteDistance(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): Promise<{ distanceKm: number; duration: string } | null> {
  const memKey = buildMemoryKey(origin, dest);

  // 1. Cache em memória
  if (distanceMemoryCache.has(memKey)) {
    console.log(`[Dist-Cache-Memory] Hit`);
    return distanceMemoryCache.get(memKey)!;
  }

  // 2. Cache no banco de dados
  try {
    const dbCached = await getCachedDistance(origin, dest);
    if (dbCached) {
      console.log(`[Dist-Cache-DB] Hit: ${dbCached.distanceKm.toFixed(2)}km`);
      distanceMemoryCache.set(memKey, dbCached);
      return dbCached;
    }
  } catch (err) {
    console.error('[Dist-Cache-DB] Error reading cache:', err);
  }

  // 3. Chamar Google Distance Matrix API
  console.log(`[Google-DistMatrix] Calling API for new route`);
  const result = await getDistanceBetweenPoints(origin, dest);
  if (result) {
    distanceMemoryCache.set(memKey, result);
    try {
      await saveDistanceToCache(origin, dest, result.distanceKm, result.duration);
    } catch (err) {
      console.error('[Dist-Cache-DB] Error saving to cache:', err);
    }
    return result;
  }

  return null;
}

/**
 * Calcula a entrega usando Google Distance Matrix com cache de 3 camadas.
 *
 * Fluxo:
 *   1. Geocodificação dos endereços (memória → DB → Google Geocoding API)
 *   2. Distância de rota real (memória → DB → Google Distance Matrix API)
 *   3. Haversine usado apenas como fallback se o Google estiver indisponível
 */
export async function calculateDelivery(
  storeAddress: string,
  customerAddress: string
): Promise<{ distance: number; duration: string; deliveryFee: number } | null> {
  // 1. Obter coordenadas de ambos os endereços (com cache de geocodificação)
  const storeCoords = await getOrCreateCoordinates(storeAddress);
  const customerCoords = await getOrCreateCoordinates(customerAddress);

  if (!storeCoords || !customerCoords) {
    console.error("Could not get coordinates for addresses");
    return null;
  }

  // 2. Calcular distância via Haversine (custo zero, usado como referência)
  const haversineDist = haversineDistance(storeCoords, customerCoords);

  let finalDistance = haversineDist;
  let duration = "N/A";

  // 3. Sempre usa Google Distance Matrix (com cache) para máxima precisão
  console.log(`[Google] Buscando distância real de rota (${haversineDist.toFixed(2)}km estimado)`);
  const routeData = await getRouteDistance(storeCoords, customerCoords);
  if (routeData) {
    finalDistance = routeData.distanceKm;
    duration = routeData.duration;
  } else {
    console.log(`[Fallback] Google indisponível, usando Haversine (${haversineDist.toFixed(2)}km)`);
  }

  const deliveryFee = calcDeliveryFee(finalDistance);

  return {
    distance: parseFloat(finalDistance.toFixed(2)),
    duration,
    deliveryFee: parseFloat(deliveryFee.toFixed(2)),
  };
}
