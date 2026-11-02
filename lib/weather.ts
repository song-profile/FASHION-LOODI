export type WeatherState =
  | { status: "loading" }
  | {
      status: "success";
      temperature: number;
      icon: string;
      label: string;
      location: string | null;
    }
  | { status: "denied" | "error"; message: string };

export function weatherFromCode(code: number) {
  if (code === 0) return { icon: "☀️", label: "Sunny" };
  if (code <= 3) return { icon: "☁️", label: "Cloudy" };
  if ([45, 48].includes(code)) return { icon: "🌫️", label: "Foggy" };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return { icon: "🌧️", label: "Rainy" };
  }
  if (code >= 71 && code <= 77) return { icon: "❄️", label: "Snowy" };
  if (code >= 95) return { icon: "⛈️", label: "Stormy" };
  return { icon: "🌤️", label: "Weather" };
}

export function normalizeLocationName(value: string) {
  const normalized = value
    .replace("서울특별시", "서울시")
    .replace("부산광역시", "부산시")
    .replace("대구광역시", "대구시")
    .replace("인천광역시", "인천시")
    .replace("광주광역시", "광주시")
    .replace("대전광역시", "대전시")
    .replace("울산광역시", "울산시");

  if (normalized === "세종특별자치시") return "세종시";
  return normalized;
}

export function cleanLocationPart(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = normalizeLocationName(value.trim());
  if (!cleaned || cleaned === "대한민국" || cleaned === "South Korea") return null;
  return cleaned;
}

export function compactLocationParts(parts: Array<string | null>) {
  const cleaned = parts.filter((part): part is string => Boolean(part));
  const unique = Array.from(new Set(cleaned));
  return unique.slice(0, 2).join(" ") || null;
}

export function locationLabelFromData(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const record = data as {
    city?: unknown;
    locality?: unknown;
    principalSubdivision?: unknown;
    localityInfo?: {
      administrative?: Array<{
        name?: unknown;
        description?: unknown;
        adminLevel?: unknown;
      }>;
    };
  };

  const administrative = record.localityInfo?.administrative ?? [];
  const administrativeNames = administrative
    .map((item) => cleanLocationPart(item.name))
    .filter((part): part is string => Boolean(part));

  const city =
    cleanLocationPart(record.city) ??
    administrativeNames.find((name) => /(시|군)$/.test(name)) ??
    cleanLocationPart(record.principalSubdivision) ??
    null;
  const district =
    cleanLocationPart(record.locality) ??
    administrativeNames.find((name) => /(구|동|읍|면)$/.test(name)) ??
    null;

  return compactLocationParts([city, district]);
}

export function locationLabelFromOsm(data: unknown) {
  if (!data || typeof data !== "object") return null;

  const record = data as {
    address?: Record<string, unknown>;
  };
  const address = record.address;
  if (!address) return null;

  const city =
    cleanLocationPart(address.city) ??
    cleanLocationPart(address.town) ??
    cleanLocationPart(address.county) ??
    cleanLocationPart(address.state);
  const district =
    cleanLocationPart(address.borough) ??
    cleanLocationPart(address.suburb) ??
    cleanLocationPart(address.neighbourhood) ??
    cleanLocationPart(address.quarter);

  return compactLocationParts([city, district]);
}

export async function fetchLocationLabel(latitude: number, longitude: number) {
  try {
    const locationParams = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      localityLanguage: "ko",
    });
    const locationResponse = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?${locationParams.toString()}`,
    );

    if (locationResponse.ok) {
      const label = locationLabelFromData(await locationResponse.json());
      if (label) return label;
    }
  } catch {
    // Try the OpenStreetMap fallback below.
  }

  try {
    const osmParams = new URLSearchParams({
      format: "jsonv2",
      lat: String(latitude),
      lon: String(longitude),
      zoom: "16",
      addressdetails: "1",
      "accept-language": "ko",
    });
    const osmResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${osmParams.toString()}`,
    );

    if (osmResponse.ok) {
      return locationLabelFromOsm(await osmResponse.json());
    }
  } catch {
    return null;
  }

  return null;
}

export async function fetchWeatherForCoordinates(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "weather_code,temperature_2m",
    timezone: "auto",
  });
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  );

  if (!response.ok) throw new Error("weather fetch failed");

  const data = await response.json();
  const temperature = Number(data?.current?.temperature_2m);
  const code = Number(data?.current?.weather_code ?? 1);
  if (!Number.isFinite(temperature)) throw new Error("invalid weather data");
  const condition = weatherFromCode(code);
  const location = await fetchLocationLabel(latitude, longitude);

  return {
    status: "success" as const,
    temperature,
    location,
    ...condition,
  };
}

export async function fetchApproximateCoordinates() {
  const response = await fetch("https://ipapi.co/json/");
  if (!response.ok) throw new Error("location fallback failed");

  const data = await response.json();
  const latitude = Number(data?.latitude);
  const longitude = Number(data?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("invalid fallback coordinates");
  }

  const location =
    cleanLocationPart(data?.city) ??
    cleanLocationPart(data?.region) ??
    null;

  return { latitude, longitude, location };
}

