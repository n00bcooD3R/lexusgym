"use client";
import { useEffect } from "react";
import { setGymDetails } from "@/lib/pdf-bill";

export default function SettingsLoader() {
  useEffect(() => {
    async function loadSettings() {
      try {
        await fetch("/api/settings/seed");
        const settingsRes = await fetch("/api/settings/list");
        const settings = await settingsRes.json();
        if (settings.gym_name) {
          setGymDetails(settings);
        }
      } catch (e) {
        console.log("Settings load error", e);
      }
    }
    loadSettings();
  }, []);

  return null;
}