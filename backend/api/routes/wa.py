from fastapi import APIRouter, Depends, HTTPException, Request
from api.database import get_admin_client
from api.auth import get_current_user
from api.whatsapp import send_whatsapp
from datetime import datetime

router = APIRouter(prefix="/api/wa", tags=["wa"])

@router.post("/send")
async def send_wa_message(
    request: Request,
    user = Depends(get_current_user)
):
    try:
        content_type = request.headers.get("content-type", "")
        
        member_id = None
        body = None
        document_bytes = None
        
        if "multipart/form-data" in content_type:
            form = await request.form()
            member_id = form.get("memberId")
            body = form.get("body")
            document = form.get("document")
            if document:
                # read bytes from UploadFile
                document_bytes = await document.read()
        else:
            json_data = await request.json()
            member_id = json_data.get("memberId")
            body = json_data.get("body")

        if not member_id:
            raise HTTPException(status_code=400, detail="memberId required")
            
        sb = get_admin_client()
        # Fetch member
        res = sb.from_("members").select("id, name, phone, fee_amount, next_due_date").eq("id", member_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Member not found")
            
        member = res.data[0]
        phone = member["phone"]
        
        name = member["name"]
        fee = member["fee_amount"] or 0
        due = member["next_due_date"]
        
        formatted_due = due or "N/A"
        overdue = False
        days_left = 0
        if due:
            try:
                dt = datetime.strptime(due, "%Y-%m-%d")
                formatted_due = dt.strftime("%d/%m/%Y")
                days_left = (dt.date() - datetime.now().date()).days
                overdue = days_left < 0
            except Exception:
                pass
        
        # Fetch settings
        res_settings = sb.from_("settings").select("key, value").execute()
        settings = {s["key"]: (s["value"] or "") for s in res_settings.data or []}
        gym_name = settings.get("gym_name", "Lexus Fitness Group")

        text = body
        if not text:
            if overdue:
                template = settings.get("msg_expired") or "Hello {name},\n\nYour {gym_name} membership has expired. 😔\nPlease renew to continue.\n\n— Team {gym_name}"
            else:
                template = settings.get("msg_reminder") or "Hello {name},\n\nYour {gym_name} membership expires in {days} days. 💪\nPlease renew soon!\n\n— Team {gym_name}"
            text = template
            
        # Replace placeholders in the final text (fallback for frontend/custom text too)
        text = text.replace("{name}", name)
        text = text.replace("{gym_name}", gym_name)
        text = text.replace("{days}", str(days_left))
        text = text.replace("{days_left}", str(days_left))
        text = text.replace("{amount}", str(fee))
        text = text.replace("{expiry}", formatted_due)

        # Send via WhatsApp utility
        result = send_whatsapp(phone, text, document_bytes)
        
        # Log to wa_messages table
        status = "sent" if result.get("ok") else "failed"
        err_msg = None if result.get("ok") else result.get("error")
        log_body = text + (" [PDF Attached]" if document_bytes else "")
        
        sb.from_("wa_messages").insert({
            "member_id": member["id"],
            "phone": phone,
            "body": log_body,
            "status": status,
            "error": err_msg
        }).execute()
        
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def check_wa_status(user = Depends(get_current_user)):
    from api.whatsapp import get_whatsapp_status
    return get_whatsapp_status()

@router.get("/qr")
async def get_wa_qr(user = Depends(get_current_user)):
    from api.whatsapp import get_whatsapp_qr
    return get_whatsapp_qr()

