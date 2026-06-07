export interface OSRMRouteResponse {
  code: string;
  routes: Array<{
    geometry: string;
    distance: number;
    duration: number;
    legs: Array<{
      distance: number;
      duration: number;
      steps: any[];
    }>;
  }>;
  waypoints: Array<{
    name: string;
    location: [number, number];
    distance: number;
  }>;
}

export interface DeliveryFeeCalculation {
  distanceKm: number;
  distanceMeters: number;
  baseFee: number;
  distanceFee: number;
  totalFee: number;
  freeDelivery: boolean;
  breakdown: {
    baseDelivery: number;
    extraDistanceKm: number;
    extraDistanceFee: number;
    freeDeliveryThresholdMet: boolean;
  };
}

const OSRM_PUBLIC_URL = 'https://router.project-osrm.org';
const OSRM_TIMEOUT_MS = 5000;

export interface DeliveryFeeConfig {
  baseFee: number;
  freeRadiusKm: number;
  perKmRate: number;
  freeDeliveryOrderValue: number;
}

const DEFAULT_DELIVERY_CONFIG: DeliveryFeeConfig = {
  baseFee: 20,
  freeRadiusKm: 2,
  perKmRate: 8,
  freeDeliveryOrderValue: 5000
};

export async function getRoadDistance(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): Promise<{ distanceKm: number; durationMinutes: number } | null> {
  try {
    const url = `${OSRM_PUBLIC_URL}/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OSRM_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('OSRM request failed:', response.status);
      return null;
    }

    const data: OSRMRouteResponse = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('OSRM no route found:', data.code);
      return null;
    }

    const route = data.routes[0];
    const distanceKm = route.distance / 1000;
    const durationMinutes = route.duration / 60;

    return {
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationMinutes: Math.round(durationMinutes * 100) / 100
    };
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.error('OSRM request timeout');
    } else {
      console.error('OSRM error:', err);
    }
    return null;
  }
}

export async function calculateDeliveryFee(
  distributorLat: number,
  distributorLng: number,
  retailerLat: number,
  retailerLng: number,
  orderValue: number,
  config: Partial<DeliveryFeeConfig> = {}
): Promise<DeliveryFeeCalculation> {
  const finalConfig = { ...DEFAULT_DELIVERY_CONFIG, ...config };

  const distanceResult = await getRoadDistance(
    distributorLat,
    distributorLng,
    retailerLat,
    retailerLng
  );

  let distanceKm = 0;
  let distanceMeters = 0;

  if (distanceResult) {
    distanceKm = distanceResult.distanceKm;
    distanceMeters = Math.round(distanceKm * 1000);
  } else {
    const straightDistance = calculateHaversineDistance(
      distributorLat,
      distributorLng,
      retailerLat,
      retailerLng
    );
    distanceKm = straightDistance;
    distanceMeters = Math.round(distanceKm * 1000);
  }

  const freeDelivery = orderValue >= finalConfig.freeDeliveryOrderValue;
  const baseFee = freeDelivery ? 0 : finalConfig.baseFee;
  let extraDistanceFee = 0;

  if (!freeDelivery && distanceKm > finalConfig.freeRadiusKm) {
    const extraKm = distanceKm - finalConfig.freeRadiusKm;
    extraDistanceFee = extraKm * finalConfig.perKmRate;
  }

  const totalFee = baseFee + extraDistanceFee;

  return {
    distanceKm,
    distanceMeters,
    baseFee,
    distanceFee: extraDistanceFee,
    totalFee: Math.round(totalFee * 100) / 100,
    freeDelivery,
    breakdown: {
      baseDelivery: baseFee,
      extraDistanceKm: Math.max(0, distanceKm - finalConfig.freeRadiusKm),
      extraDistanceFee,
      freeDeliveryThresholdMet: freeDelivery
    }
  };
}

export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export async function getNearbyDistributorsFromDB(
  supabase: any,
  retailerLat: number,
  retailerLng: number,
  radiusMeters: number = 5000
): Promise<any[]> {
  const { data, error } = await supabase.rpc('get_nearby_distributors', {
    user_lat: retailerLat,
    user_lng: retailerLng,
    radius_meters: radiusMeters
  });

  if (error) {
    console.error('Error fetching nearby distributors:', error);
    return [];
  }

  return data || [];
}

export async function getDeliveryFeeWithDistributor(
  supabase: any,
  distributorId: string,
  retailerLat: number,
  retailerLng: number,
  orderValue: number
): Promise<DeliveryFeeCalculation | null> {
  const { data: distributor, error } = await supabase
    .from('distributors')
    .select(`
      id,
      delivery_base_fee,
      delivery_per_km_fee,
      free_delivery_threshold,
      profiles:profile_id(
        id,
        lat,
        lng
      )
    `)
    .eq('id', distributorId)
    .single();

  if (error || !distributor) {
    console.error('Distributor not found:', error);
    return null;
  }

  const distributorLat = (distributor as any).profiles?.lat;
  const distributorLng = (distributor as any).profiles?.lng;

  if (!distributorLat || !distributorLng) {
    console.error('Distributor location not set');
    return null;
  }

  const config: Partial<DeliveryFeeConfig> = {};
  if (distributor.delivery_base_fee) {
    config.baseFee = Number(distributor.delivery_base_fee);
  }
  if (distributor.delivery_per_km_fee) {
    config.perKmRate = Number(distributor.delivery_per_km_fee);
  }
  if (distributor.free_delivery_threshold) {
    config.freeDeliveryOrderValue = Number(distributor.free_delivery_threshold);
  }

  return calculateDeliveryFee(
    distributorLat,
    distributorLng,
    retailerLat,
    retailerLng,
    orderValue,
    config
  );
}

export class DeliveryFeeEngine {
  static getRoadDistance = getRoadDistance;
  static calculateDeliveryFee = calculateDeliveryFee;
  static calculateHaversineDistance = calculateHaversineDistance;
  static getNearbyDistributorsFromDB = getNearbyDistributorsFromDB;
  static getDeliveryFeeWithDistributor = getDeliveryFeeWithDistributor;
}
