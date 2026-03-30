/**
 * deliveryCalc.ts - Cálculo de distância e taxa de entrega (Refatorado para Backend)
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface DeliveryResult {
  distance: number;
  duration: string;
  deliveryFee: number;
}

/**
 * Chama o backend para calcular a taxa de entrega entre a loja e o endereço do cliente.
 * Retorna { distance, duration, deliveryFee } ou null se não for possível calcular.
 */
export async function calcDeliveryFromAddresses(
  storeAddress: string,
  customerAddress: string
): Promise<DeliveryResult | null> {
  try {
    const response = await fetch("/api/delivery/calculate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        storeAddress,
        customerAddress,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to calculate delivery via backend");
    }

    return await response.json();
  } catch (error) {
    console.error("Error calculating delivery:", error);
    return null;
  }
}

/**
 * Calcula distância em km entre dois pontos (Haversine).
 */
export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      sinDLon *
      sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

/**
 * Formata distância para exibição.
 * Ex: 0.85 → "850 m" | 1.2 → "1,2 km" | 3.0 → "3,0 km"
 */
export function formatKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/**
 * Calcula a taxa de entrega cobrada do cliente.
 * Espelha a lógica do backend (server/delivery.ts → calcDeliveryFee).
 * - Até 5 km: R$ 12,00
 * - Acima de 5 km: R$ 12,00 + R$ 2,00 por km adicional
 */
export function calcDeliveryFee(distanceKm: number): number {
  const BASE_FEE = 12.0;
  const BASE_DISTANCE = 5.0;
  const EXTRA_PER_KM = 2.0;
  if (distanceKm <= BASE_DISTANCE) return BASE_FEE;
  return parseFloat((BASE_FEE + (distanceKm - BASE_DISTANCE) * EXTRA_PER_KM).toFixed(2));
}

/**
 * Calcula o valor de repasse ao motoboy (ganho do entregador), NÃO a taxa cobrada do cliente.
 * - Até 5 km: R$ 8,50
 * - Acima de 5 km: R$ 8,50 + R$ 1,50 por km adicional
 */
export function calcMotoRideValue(distanceKm: number): number {
  if (distanceKm <= 5) return 8.5;
  return parseFloat((8.5 + (distanceKm - 5) * 1.5).toFixed(2));
}

/**
 * Calcula os valores de frete do motoboy para uma rota agrupada (2 pedidos).
 * totalRouteKm = (Loja → entrega mais próxima) + (1ª entrega → 2ª entrega)
 *
 * Regras:
 *  - Até 5 km: R$ 8,50 (pedido 1) + R$ 5,00 (pedido 2)
 *  - Acima de 5 km: R$ 8,50 + R$ 5,00 + R$ 1,50 por km excedente (aplicado ao pedido 2)
 */
export function calcDoubleRouteValues(totalRouteKm: number): { order1Value: number; order2Value: number } {
  const BASE_1 = 8.50;
  const BASE_2 = 5.00;
  const EXTRA_PER_KM = 1.50;
  const extraKm = Math.max(0, totalRouteKm - 5);
  return {
    order1Value: BASE_1,
    order2Value: parseFloat((BASE_2 + extraKm * EXTRA_PER_KM).toFixed(2)),
  };
}
