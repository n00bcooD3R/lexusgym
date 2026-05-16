"use client";
import { useEffect, useState } from "react";
import { setGymDetails } from "@/lib/pdf-bill";

export default function SettingsLoader({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings/seed");
        const data = await res.json();
        
        const settingsRes = await fetch("/api/settings/list");
        const settings = await settingsRes.json();
        
        if (settings.gym_name) {
          setGymDetails(settings);
        }
      } catch (e) {
        console.log("Settings load error", e);
      }
      setLoaded(true);
    }
    loadSettings();
  }, []);

  if (!loaded) return null;

  return <>{children}</>;
}