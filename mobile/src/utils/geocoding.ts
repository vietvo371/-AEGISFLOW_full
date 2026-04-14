// Geocoding utility functions for reverse geocoding (lat/lng to address)

export interface GeocodingResult {
  address: string;
  city: string;
  state: string;
  country: string;
  formattedAddress: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Reverse geocoding using OpenStreetMap Nominatim API (free)
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Promise<GeocodingResult>
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<GeocodingResult> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=en`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.address) {
      throw new Error('No address data found');
    }
    
    const address = data.address;
    
    return {
      address: address.road || address.house_number || '',
      city: address.city || address.town || address.village || address.municipality || '',
      state: address.state || address.province || address.region || '',
      country: address.country || '',
      formattedAddress: data.display_name || `${lat}, ${lng}`
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    // Fallback to coordinates if API fails
    return {
      address: '',
      city: '',
      state: '',
      country: '',
      formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    };
  }
};

/**
 * Alternative reverse geocoding using Google Maps API (requires API key)
 * @param lat - Latitude
 * @param lng - Longitude
 * @param apiKey - Google Maps API key
 * @returns Promise<GeocodingResult>
 */
export const reverseGeocodeGoogle = async (
  lat: number, 
  lng: number, 
  apiKey: string
): Promise<GeocodingResult> => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      throw new Error('No results found');
    }
    
    const result = data.results[0];
    const components = result.address_components;
    
    let address = '';
    let city = '';
    let state = '';
    let country = '';
    
    components.forEach((component: any) => {
      const types = component.types;
      if (types.includes('street_number') || types.includes('route')) {
        address += component.long_name + ' ';
      } else if (types.includes('locality') || types.includes('administrative_area_level_2')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      }
    });
    
    return {
      address: address.trim(),
      city,
      state,
      country,
      formattedAddress: result.formatted_address
    };
  } catch (error) {
    console.error('Google reverse geocoding error:', error);
    // Fallback to coordinates if API fails
    return {
      address: '',
      city: '',
      state: '',
      country: '',
      formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    };
  }
};

/**
 * Format address components into a readable string
 * @param geocodingResult - Result from reverse geocoding
 * @returns Formatted address string
 */
export const formatAddress = (geocodingResult: GeocodingResult): string => {
  const parts = [];
  
  if (geocodingResult.address) {
    parts.push(geocodingResult.address);
  }
  if (geocodingResult.city) {
    parts.push(geocodingResult.city);
  }
  if (geocodingResult.state) {
    parts.push(geocodingResult.state);
  }
  if (geocodingResult.country) {
    parts.push(geocodingResult.country);
  }
  
  return parts.length > 0 ? parts.join(', ') : geocodingResult.formattedAddress;
};

/**
 * Get a short address (city, state, country only)
 * @param geocodingResult - Result from reverse geocoding
 * @returns Short address string
 */
export const getShortAddress = (geocodingResult: GeocodingResult): string => {
  const parts = [];
  
  if (geocodingResult.city) {
    parts.push(geocodingResult.city);
  }
  if (geocodingResult.state) {
    parts.push(geocodingResult.state);
  }
  if (geocodingResult.country) {
    parts.push(geocodingResult.country);
  }
  
  return parts.length > 0 ? parts.join(', ') : 'Unknown Location';
};
