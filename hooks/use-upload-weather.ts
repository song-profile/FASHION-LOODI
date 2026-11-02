"use client";
import { useEffect, useState } from "react";
function weatherLabelFromCode(code: number, temperature: number) {
  if (code === 0) return `Sunny · ${Math.round(temperature)}°C`;
  if (code <= 3) return `Cloudy · ${Math.round(temperature)}°C`;
  if ([45, 48].includes(code)) return `Foggy · ${Math.round(temperature)}°C`;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return `Rainy · ${Math.round(temperature)}°C`;
  }
  if (code >= 71 && code <= 77) return `Snowy · ${Math.round(temperature)}°C`;
  if (code >= 95) return `Stormy · ${Math.round(temperature)}°C`;
  return `Weather tagged · ${Math.round(temperature)}°C`;
}


export function useUploadWeather() {
  const [weatherTag, setWeatherTag] = useState<string | null>(null);
  const [weatherStatus, setWeatherStatus] = useState<
    "idle" | "loading" | "success" | "denied" | "error"
  >("idle");
  const [manualWeatherOpen, setManualWeatherOpen] = useState(false);
  const [manualWeatherInput, setManualWeatherInput] = useState("");
  useEffect(() => {
    const loadWeather = () => {
      if (weatherTag) return;
      if (!navigator.geolocation) {
        setWeatherStatus("denied");
        setManualWeatherOpen(true);
        return;
      }

      setWeatherStatus("loading");
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=weather_code,temperature_2m`
            );
            if (!res.ok) throw new Error("weather fetch failed");
            const data = await res.json();
            const code = Number(data?.current?.weather_code ?? 1);
            const temp = Number(data?.current?.temperature_2m ?? 20);
            setWeatherTag(weatherLabelFromCode(code, temp));
            setWeatherStatus("success");
          } catch {
            setWeatherStatus("error");
            setManualWeatherOpen(true);
          }
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setWeatherStatus("denied");
          } else {
            setWeatherStatus("error");
          }
          setManualWeatherOpen(true);
        },
        { timeout: 6000 }
      );
    };

    loadWeather();
  }, [weatherTag]);
return { weatherTag, setWeatherTag, weatherStatus, setWeatherStatus, manualWeatherOpen, setManualWeatherOpen, manualWeatherInput, setManualWeatherInput };
}
