from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel
from typing import Optional
import os
from api.database import get_admin_client
from api.pdf import generate_invoice_pdf
from api.whatsapp import send_whatsapp
from datetime import datetime

router = APIRouter(prefix="/api/payment", tags=["payments"])

class WebhookPayload(BaseModel):
    payment_id: str
    amount: float
    status: str
    phone: Optional[str] = None
    member_id: Optional[str] = None
    method: Optional[str] = "online"

@router.post("/webhook")
async def payment_webhook(payload: WebhookPayload, x_webhook_secret: Optional[str] = Header(None)):
    # Verify webhook secret — prevents forged payment events
    webhook_secret = os.getenv("WEBHOOK_SECRET") or os.getenv("CRON_SECRET")
    if webhook_secret:
        if not x_webhook_secret or x_webhook_secret != webhook_secret:
            raise HTTPException(status_code=401, detail="Invalid or missing webhook secret")
    sb = get_admin_client()

    try:
        if not payload.phone and not payload.member_id:
            raise HTTPException(status_code=400, detail="phone or member_id required")
            
        member = None
        if payload.member_id:
            res_member = sb.from_("members").select("*").eq("id", payload.member_id).execute()
            if res_member.data:
                member = res_member.data[0]
        elif payload.phone:
            res_member = sb.from_("members").select("*").eq("phone", payload.phone).execute()
            if res_member.data:
                member = res_member.data[0]
                
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
            
        if payload.status in ("captured", "success"):
            today_str = datetime.now().date().isoformat()
            
            # Record payment in payments table
            res_pay = sb.from_("payments").insert({
                "member_id": member["id"],
                "amount": float(payload.amount) / 100.0,
                "method": payload.method or "online",
                "notes": f"Payment ID: {payload.payment_id}",
                "paid_on": today_str
            }).execute()
            
            if not res_pay.data:
                raise HTTPException(status_code=500, detail="Failed to log payment transaction")
                
            payment = res_pay.data[0]
            
            # Fetch settings for branding details
            res_settings = sb.from_("settings").select("key, value").execute()
            settings = {s["key"]: (s["value"] or "") for s in res_settings.data or []}
            
            # Compile PDF Invoice
            pdf_bytes = generate_invoice_pdf(member, payment, settings)
            
            # Send WhatsApp confirmation with PDF attached
            amount_display = float(payload.amount) / 100.0
            msg_body = f"Hi {member['name']}, your payment of \u20b9{amount_display:.2f} has been received. Thank you for renewing your membership! - {settings.get('gym_name', 'Lexus Fitness Group')}"
            
            send_whatsapp(member["phone"], msg_body, pdf_bytes)
            
            return {"ok": True, "message": "Payment recorded and receipt sent"}
            
        return {"ok": False, "error": "Payment status was not successful"}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
