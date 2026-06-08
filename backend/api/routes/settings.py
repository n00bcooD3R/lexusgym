from fastapi import APIRouter, Depends, HTTPException, Response
from typing import Dict
from api.database import get_admin_client
from api.auth import get_current_user

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SETTINGS = [
    { "key": "gym_name", "value": "Lexus Fitness Group" },
    { "key": "gym_tagline", "value": "Fitness Center & Personal Training" },
    { "key": "gym_address", "value": "123 Fitness Street, City - 123456" },
    { "key": "gym_phone", "value": "+91 9876543210" },
    { "key": "gym_email", "value": "info@lexusfitness.com" },
    { "key": "gym_gst", "value": "27AAABCU9603R1ZM" },
    { "key": "wa_bridge_url", "value": "http://140.245.215.154:3001" },
    { "key": "msg_welcome", "value": "Hello {name}, 👋\n\nWelcome to {gym_name}! 💪🔥\nWe are excited to have you as a part of the {gym_name} family.\n\nYour membership has been successfully activated, and your fitness journey officially starts today. Whether your goal is muscle building, fat loss, strength improvement, endurance, or overall fitness, our team is here to support and guide you every step of the way.\n\nAt {gym_name}, we believe that consistency, discipline, and dedication create real transformation. With our professional training environment, modern equipment, and motivating atmosphere, you now have everything you need to become the strongest version of yourself.\n\nRemember:\n✅ Every workout brings progress\n✅ Every drop of sweat is an investment in yourself\n✅ Small daily efforts create big results over time\n\nWe encourage you to stay committed to your training schedule, maintain proper nutrition, and never give up on your goals. Results take time, but with patience and consistency, success is guaranteed.\n\nIf you need any assistance regarding workouts, diet guidance, membership support, or gym facilities, feel free to contact our team anytime. We are always happy to help.\n\nThank you once again for trusting {gym_name} with your fitness journey.\n\nLet’s train hard, stay focused, and achieve greatness together! 🔥🏋️\n\n— Team {gym_name}" },
    { "key": "msg_renewal", "value": "Hello {name},\n\nYour {gym_name} membership has been renewed! 💪🔥\n\n— Team {gym_name}" },
    { "key": "msg_reminder", "value": "Hello {name},\n\nYour {gym_name} membership expires in {days} days. 💪\nPlease renew soon!\n\n— Team {gym_name}" },
    { "key": "msg_expired", "value": "Hello {name},\n\nYour {gym_name} membership has expired. 😔\nPlease renew to continue.\n\n— Team {gym_name}" },
    { "key": "msg_payment", "value": "Hello {name},\n\nThank you for ₹{amount}! 💪\nMembership active until {expiry}.\n\n— Team {gym_name}" }
]

@router.get("/list", dependencies=[Depends(get_current_user)])
def list_settings(response: Response):
    # Disable caching for the settings list response
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    
    try:
        sb = get_admin_client()
        res = sb.from_("settings").select("key, value").execute()
        existing = {s["key"]: s["value"] or "" for s in res.data or []}
        
        # Check and seed any missing default settings
        missing = []
        for setting in DEFAULT_SETTINGS:
            if setting["key"] not in existing:
                missing.append(setting)
                existing[setting["key"]] = setting["value"]
                
        if missing:
            for m in missing:
                sb.from_("settings").insert(m).execute()
                
        return existing
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/list", dependencies=[Depends(get_current_user)])
def save_settings(settings: Dict[str, str]):
    try:
        sb = get_admin_client()
        for key, value in settings.items():
            sb.from_("settings").upsert({
                "key": key,
                "value": str(value)
            }, on_conflict="key").execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/seed", dependencies=[Depends(get_current_user)])
def seed_settings():
    try:
        sb = get_admin_client()
        
        # Check existing settings keys to prevent overwrites
        res = sb.from_("settings").select("key").execute()
        existing_keys = {s["key"] for s in res.data or []}
        
        for setting in DEFAULT_SETTINGS:
            if setting["key"] not in existing_keys:
                sb.from_("settings").insert(setting).execute()
        
        return {"ok": True, "message": "Settings seeded successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
