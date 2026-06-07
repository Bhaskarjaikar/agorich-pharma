export interface MapplsAutoSuggestResult {
  eLoc: string;
  placeName: string;
  placeAddress: string;
  structuredAddress: {
    houseNumber?: string;
    houseName?: string;
    street?: string;
    subSubLocality?: string;
    subLocality?: string;
    locality?: string;
    vtc?: string;
    district?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  latitude: number;
  longitude: number;
  tokens: {
    inputed: string;
    matched: string;
  }[];
  confidence: number;
  type: string;
  isPincode?: boolean;
}

export interface MapplsSearchResponse {
  suggestions: MapplsAutoSuggestResult[];
}

export interface MapplsPlaceDetail {
  structuredAddress: {
    houseNumber?: string;
    houseName?: string;
    street?: string;
    subSubLocality?: string;
    subLocality?: string;
    locality?: string;
    vtc?: string;
    district?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  latitude: number;
  longitude: number;
  placeName: string;
  placeAddress: string;
}

const MAPPLS_API_KEY = process.env.MAPPLS_API_KEY || '';
const MAPPLS_BASE_URL = 'https://apis.mappls.com/api/v5';

function mapplsRequestHeaders() {
  return {
    'Content-Type': 'application/json',
    'mappls-hybrid-key': MAPPLS_API_KEY
  };
}

export async function searchAddress(query: string, location?: { lat: number; lng: number }): Promise<MapplsAutoSuggestResult[]> {
  if (!MAPPLS_API_KEY) {
    console.warn('MAPPLS_API_KEY not configured');
    return [];
  }

  try {
    let url = `${MAPPLS_BASE_URL}/search/searchPlaces?searchText=${encodeURIComponent(query)}&page=1&count=10`;

    if (location) {
      url += `&location=${location.lat},${location.lng}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: mapplsRequestHeaders()
    });

    if (!response.ok) {
      console.error('Mappls search failed:', response.status, await response.text());
      return [];
    }

    const data: MapplsSearchResponse = await response.json();
    return data.suggestions || [];
  } catch (err) {
    console.error('Mappls search error:', err);
    return [];
  }
}

export async function getPlaceDetails(eloc: string): Promise<MapplsPlaceDetail | null> {
  if (!MAPPLS_API_KEY) {
    console.warn('MAPPLS_API_KEY not configured');
    return null;
  }

  try {
    const url = `${MAPPLS_BASE_URL}/place/details?eloc=${eloc}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: mapplsRequestHeaders()
    });

    if (!response.ok) {
      console.error('Mappls place details failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data || null;
  } catch (err) {
    console.error('Mappls place details error:', err);
    return null;
  }
}

export function formatMapplsAddress(result: MapplsAutoSuggestResult): {
  formattedAddress: string;
  lat: number;
  lng: number;
  eloc: string;
  pincode?: string;
} {
  const addr = result.structuredAddress;

  const addressParts = [
    addr.houseNumber,
    addr.houseName,
    addr.street,
    addr.subLocality,
    addr.locality,
    addr.vtc
  ].filter(Boolean);

  const formattedAddress = addressParts.join(', ');

  return {
    formattedAddress: formattedAddress || result.placeAddress,
    lat: result.latitude,
    lng: result.longitude,
    eloc: result.eLoc,
    pincode: addr.pincode
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<MapplsPlaceDetail | null> {
  if (!MAPPLS_API_KEY) {
    console.warn('MAPPLS_API_KEY not configured');
    return null;
  }

  try {
    const url = `${MAPPLS_BASE_URL}/place/reverse/geocode?lat=${lat}&lng=${lng}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: mapplsRequestHeaders()
    });

    if (!response.ok) {
      console.error('Mappls reverse geocode failed:', response.status);
      return null;
    }

    const data = await response.json();
    return data || null;
  } catch (err) {
    console.error('Mappls reverse geocode error:', err);
    return null;
  }
}

export function validateMapplsResponse(data: any): data is MapplsSearchResponse {
  return data && Array.isArray(data.suggestions);
}
