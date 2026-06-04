"use client";
import { useEffect } from "react";
import { setGymDetails, setLogoBase64 } from "@/lib/pdf-bill";

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

    async function loadLogo() {
      try {
        const logoRes = await fetch("/logo.png");
        const logoBlob = await logoRes.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoBase64(reader.result as string);
        };
        reader.readAsDataURL(logoBlob);
      } catch (e) {
        console.log("Logo load error", e);
      }
    }

    loadSettings();
    loadLogo();
  }, []);

  return null;
}