/**
 * deliveryCalc.ts - Cálculo de distância e taxa de entrega
 *
 * Fórmula de Haversine para distância em linha reta entre dois pontos geográficos.
 * Multiplicador 0.8 para aproximar a distância real de rota.
 *
 * Taxa de entrega:
 *   - Até 5 km: R$ 12,00
 *   - Acima de 5 km: R$ 12,00 + R$ 2,00 por km adicional
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calcula a distância em km entre dois pontos usando Haversine.
 * Aplica fator 0.8 para aproximar da distância real de rota.
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371; // Raio da Terra em km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const aVal =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;

  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
  const straightLine = R * c;

  // Fator de correção para aproximar da distância real de rota
  return straightLine * 0.8;
}

/**
 * Calcula o valor que o motoboy recebe por corrida.
 * - Até 5 km: R$ 8,50 fixo
 * - Acima de 5 km: R$ 8,50 + R$ 1,50 por km adicional
 */
export function calcMotoRideValue(distanceKm: number): number {
  if (distanceKm <= 5) return 8.5;
  return parseFloat((8.5 + (distanceKm - 5) * 1.5).toFixed(2));
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

  if (distanceKm <= BASE_DISTANCE) {
    return BASE_FEE;
  }

  const extraKm = distanceKm - BASE_DISTANCE;
  return BASE_FEE + extraKm * EXTRA_PER_KM;
}

/**
 * Geocodifica um endereço usando a API ViaCEP + Nominatim (OpenStreetMap).
 * Retorna as coordenadas lat/lng ou null se não encontrar.
 */
export async function geocodeAddress(
  logradouro: string,
  numero: string,
  cidade: string,
  uf: string,
  cep: string
): Promise<Coordinates | null> {
  try {
    // Tenta via Nominatim (OpenStreetMap) - gratuito e sem chave
    const query = encodeURIComponent(
      `${logradouro} ${numero}, ${cidade}, ${uf}, Brasil`
    );
    const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=br`;

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'pt-BR',
        'User-Agent': 'MarketplaceRegional/1.0',
      },
    });

    if (!response.ok) throw new Error('Nominatim error');

    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }

    // Fallback: tenta só pelo CEP
    const cepClean = cep.replace(/\D/g, '');
    const cepQuery = encodeURIComponent(`${cepClean}, Brasil`);
    const cepUrl = `https://nominatim.openstreetmap.org/search?q=${cepQuery}&format=json&limit=1&countrycodes=br`;

    const cepResp = await fetch(cepUrl, {
      headers: {
        'Accept-Language': 'pt-BR',
        'User-Agent': 'MarketplaceRegional/1.0',
      },
    });

    if (!cepResp.ok) throw new Error('CEP geocode error');

    const cepData = await cepResp.json();
    if (cepData && cepData.length > 0) {
      return {
        lat: parseFloat(cepData[0].lat),
        lng: parseFloat(cepData[0].lon),
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Calcula a taxa de entrega entre a loja e o endereço do cliente.
 * Retorna { distanceKm, fee } ou null se não for possível calcular.
 */
export async function calcDeliveryFromAddresses(
  storeAddress: { logradouro: string; numero: string; cidade: string; uf: string; cep: string; lat?: number; lng?: number },
  clientAddress: { logradouro: string; numero: string; cidade: string; uf: string; cep: string; lat?: number; lng?: number }
): Promise<{ distanceKm: number; fee: number } | null> {
  let storeCoords: Coordinates | null = storeAddress.lat && storeAddress.lng
    ? { lat: storeAddress.lat, lng: storeAddress.lng }
    : null;

  let clientCoords: Coordinates | null = clientAddress.lat && clientAddress.lng
    ? { lat: clientAddress.lat, lng: clientAddress.lng }
    : null;

  if (!storeCoords) {
    storeCoords = await geocodeAddress(
      storeAddress.logradouro,
      storeAddress.numero,
      storeAddress.cidade,
      storeAddress.uf,
      storeAddress.cep
    );
  }

  if (!clientCoords) {
    clientCoords = await geocodeAddress(
      clientAddress.logradouro,
      clientAddress.numero,
      clientAddress.cidade,
      clientAddress.uf,
      clientAddress.cep
    );
  }

  if (!storeCoords || !clientCoords) return null;

  const distanceKm = haversineDistance(storeCoords, clientCoords);
  const fee = calcDeliveryFee(distanceKm);

  return { distanceKm, fee };
}
