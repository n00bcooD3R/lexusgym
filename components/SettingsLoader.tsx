"use client";
import { useEffect } from "react";
import { setGymDetails, setLogoBase64, setSealBase64 } from "@/lib/pdf-bill";

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
        const img = new Image();
        img.src = "/logo.png";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get 2d context");
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imgData.data;
            
            let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
            let found = false;
            
            for (let y = 0; y < canvas.height; y++) {
              for (let x = 0; x < canvas.width; x++) {
                const alpha = data[(y * canvas.width + x) * 4 + 3];
                if (alpha > 10) { // threshold for non-transparent pixel
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                  found = true;
                }
              }
            }
            
            if (found) {
              const cropWidth = maxX - minX + 1;
              const cropHeight = maxY - minY + 1;
              
              const croppedCanvas = document.createElement("canvas");
              croppedCanvas.width = cropWidth;
              croppedCanvas.height = cropHeight;
              const croppedCtx = croppedCanvas.getContext("2d");
              if (croppedCtx) {
                croppedCtx.drawImage(
                  canvas,
                  minX, minY, cropWidth, cropHeight, // source rect
                  0, 0, cropWidth, cropHeight       // dest rect
                );
                setLogoBase64(croppedCanvas.toDataURL("image/png"));
                return;
              }
            }
            
            // Fallback if not found or canvas context error
            setLogoBase64(img.src);
          } catch (err) {
            console.error("Error cropping logo transparency:", err);
            // Fallback to standard Base64 read
            const reader = new FileReader();
            reader.onloadend = () => {
              setLogoBase64(reader.result as string);
            };
            fetch("/logo.png")
              .then(res => res.blob())
              .then(blob => reader.readAsDataURL(blob));
          }
        };
        img.onerror = () => {
          console.error("Failed to load /logo.png");
        };
      } catch (e) {
        console.log("Logo load error", e);
      }
    }

    async function loadSeal() {
      try {
        const sealRes = await fetch("/paid-seal.png");
        const sealBlob = await sealRes.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          setSealBase64(reader.result as string);
        };
        reader.readAsDataURL(sealBlob);
      } catch (e) {
        console.log("Seal load error", e);
      }
    }

    loadSettings();
    loadLogo();
    loadSeal();
  }, []);

  return null;
}