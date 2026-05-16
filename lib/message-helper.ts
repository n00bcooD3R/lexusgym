"use client";
import { useState, useEffect } from "react";

export function useSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/settings/list");
        const data = await res.json();
        setSettings(data);
      } catch (e) {
        console.log("Using default settings");
      }
      setLoading(false);
    }
    load();
  }, []);

  return { settings, loading };
}

export function processMessage(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`{${key}}`, "g"), value);
  }
  return result;
}