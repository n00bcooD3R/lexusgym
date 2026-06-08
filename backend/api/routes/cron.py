import os
from fastapi import APIRouter, Header, HTTPException
from api.database import get_admin_client
from api.whatsapp import send_whatsapp
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/cron", tags=["cron"])

REMINDER_MSG = """Hello {name},

This is a friendly reminder that your Lexus Fitness Group membership will expire in {days} days. 💪

To continue enjoying uninterrupted access to the gym and your fitness journey, please renew your membership before the expiry date.

For renewal assistance, feel free to contact our team anytime.

— Team Lexus Fitness Group"""

EXPIRED_MSG = """Hello {name},

Your Lexus Fitness Group membership has expired. 😔

Please renew your membership at the earliest to continue your fitness journey.

For renewal assistance, feel free to contact our team anytime.

— Team Lexus Fitness Group"""

@router.get("/reminders")
def run_cron_reminders(authorization: str = Header(None)):
    cron_secret = os.getenv("CRON_SECRET")
    token = authorization.replace("Bearer ", "").strip() if authorization else ""
    if cron_secret and token != cron_secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    sb = get_admin_client()
    today = datetime.now().date()
    
    # Query all active members
    res = sb.from_("members") \
        .select("id, name, phone, fee_amount, next_due_date, active, is_staff") \
        .eq("active", True) \
        .execute()
        
    members = res.data or []
    results = []
    
    for m in members:
        if m.get("is_staff"):
            continue
        if not m.get("phone"):
            continue
        due_str = m.get("next_due_date")
        if not due_str:
            continue
            
        try:
            # Parse YYYY-MM-DD
            due_date = datetime.strptime(due_str.split("T")[0], "%Y-%m-%d").date()
        except Exception:
            continue
            
        diff_days = (due_date - today).days
        
        # Send alerts for due date <= 4 days (today, in 1-4 days, or overdue)
        if diff_days <= 4:
            if diff_days < 0:
                body = EXPIRED_MSG.format(name=m["name"])
            else:
                body = REMINDER_MSG.format(name=m["name"], days=diff_days)
                
            r = send_whatsapp(m["phone"], body)
            
            status = "sent" if r.get("ok") else "failed"
            err_msg = None if r.get("ok") else r.get("error")
            
            sb.from_("wa_messages").insert({
                "member_id": m["id"],
                "phone": m["phone"],
                "body": body,
                "status": status,
                "error": err_msg
            }).execute()
            
            results.append({
                "id": m["id"],
                "name": m["name"],
                "daysDiff": diff_days,
                "ok": r.get("ok", False)
            })
            
    return {"ok": True, "count": len(results), "results": results}
