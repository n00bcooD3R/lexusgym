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
        
        # Build reminder message if not provided
        text = body
        if not text:
            name = member["name"]
            fee = member["fee_amount"] or 0
            due = member["next_due_date"]
            
            formatted_due = due
            overdue = False
            if due:
                try:
                    dt = datetime.strptime(due, "%Y-%m-%d")
                    formatted_due = dt.strftime("%d %b %Y")
                    overdue = dt.date() < datetime.now().date()
                except Exception:
                    pass
            
            if overdue:
                text = f"Hi {name}, your gym fee of ₹{fee} was due on {formatted_due}. Please clear it at the earliest. - Gym"
            else:
                text = f"Hi {name}, friendly reminder — your gym fee of ₹{fee} is due on {formatted_due}. - Gym"

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
