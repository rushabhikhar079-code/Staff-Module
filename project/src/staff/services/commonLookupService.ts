export interface LookupOption {
  id: number;
  name: string;
}

// Live endpoints verified in the legacy backend source:
// im-backend/Controllers/CommonController.cs -> GET api/Common/countries,
// GET api/Common/states/{countryId}, GET api/Common/cities/{stateId}
// (SQL: CommonQueries.GetCountries / GetStatesByCountryId / GetCitiesByStateId
// against the country / countrystate / countrycity tables).
// Responses use the ApiResponse envelope: { status, statusCode, message, data }.

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

export const FALLBACK_COUNTRIES: LookupOption[] = [{ id: 0, name: 'India' }];
export const FALLBACK_STATES: LookupOption[] = [{ id: 0, name: 'Maharashtra' }];
export const FALLBACK_CITIES: LookupOption[] = ['Nagpur', 'Pune', 'Mumbai'].map((name) => ({ id: 0, name }));

async function fetchDropdown(path: string, fallback: LookupOption[]): Promise<LookupOption[]> {
  if (!API_BASE) return fallback;
  try {
    const response = await fetch(`${API_BASE}/api/Common/${path}`);
    if (!response.ok) return fallback;
    const payload: unknown = await response.json();
    const data = (payload as { data?: unknown })?.data;
    if (!Array.isArray(data)) return fallback;
    const options = data
      .filter((item): item is { id: number | string; name: string } =>
        Boolean(item) && typeof (item as { name?: unknown }).name === 'string')
      .map((item) => ({ id: Number(item.id) || 0, name: item.name }));
    return options.length > 0 ? options : fallback;
  } catch {
    return fallback;
  }
}

let countriesCache: Promise<LookupOption[]> | null = null;

export function fetchCountries(): Promise<LookupOption[]> {
  if (!countriesCache) {
    countriesCache = fetchDropdown('countries', FALLBACK_COUNTRIES);
  }
  return countriesCache;
}

export function fetchStates(countryId: number): Promise<LookupOption[]> {
  return fetchDropdown(`states/${countryId}`, FALLBACK_STATES);
}

export function fetchCities(stateId: number): Promise<LookupOption[]> {
  return fetchDropdown(`cities/${stateId}`, FALLBACK_CITIES);
}
