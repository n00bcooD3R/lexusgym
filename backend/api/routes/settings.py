from fastapi import APIRouter, Depends, HTTPException
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
    { "key": "msg_welcome", "value": "Hello {name},\n\nWelcome to {gym_name}! 💪🔥\nWe are excited to have you as a part of the {gym_name} family.\n\nYour membership has been successfully activated, and your fitness journey officially starts today.\n\n— Team {gym_name}" },
    { "key": "msg_renewal", "value": "Hello {name},\n\nYour {gym_name} membership has been successfully renewed! 💪🔥\n\nThank you for continuing your fitness journey with us.\n\n— Team {gym_name}" },
    { "key": "msg_reminder", "value": "Hello {name},\n\nThis is a friendly reminder that your {gym_name} membership will expire in {days} days. 💪\n\nTo continue enjoying uninterrupted access to the gym, please renew your membership before the expiry date.\n\n— Team {gym_name}" },
    { "key": "msg_expired", "value": "Hello {name},\n\nYour {gym_name} membership has expired. 😔\n\nPlease renew your membership at the earliest to continue your fitness journey.\n\n— Team {gym_name}" },
    { "key": "msg_payment", "value": "Hello {name},\n\nThank you for your payment of ₹{amount}! 💪\n\nYour payment has been successfully received. Your membership is now active until {expiry}.\n\nPlease find the attached invoice for your records.\n\n— Team {gym_name}" }
]

@router.get("/list", dependencies=[Depends(get_current_user)])
def list_settings():
    try:
        sb = get_admin_client()
        res = sb.from_("settings").select("key, value").execute()
        
        # Format list as key-value dictionary
        obj = {}
        for s in res.data or []:
            obj[s["key"]] = s["value"] or ""
        return obj
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
