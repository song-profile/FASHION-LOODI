"use client";
import { useEffect, useState } from "react";
import { type WeatherState, fetchApproximateCoordinates, fetchWeatherForCoordinates } from "@/lib/weather";
export function useWeather() {
  const [weather, setWeather] = useState<WeatherState>({ status: "loading" });
  useEffect(() => {
    const loadApproximateWeather = async () => {
      try {
        const { latitude, longitude, location } = await fetchApproximateCoordinates();
        const approximateWeather = await fetchWeatherForCoordinates(latitude, longitude);
        setWeather({
          ...approximateWeather,
          location: approximateWeather.location ?? location,
        });
      } catch {
        setWeather({
          status: "error",
          message: "Weather: 위치 권한을 허용하면 더 정확히 잡을 수 있어요",
        });
      }
    };

    if (!navigator.geolocation) {
      loadApproximateWeather();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          setWeather(await fetchWeatherForCoordinates(latitude, longitude));
        } catch {
          setWeather({
            status: "error",
            message: "Weather: 날씨를 불러오지 못했어요",
          });
        }
      },
      () => {
        loadApproximateWeather();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60 * 1000 }
    );
  }, []);
return weather;
}
