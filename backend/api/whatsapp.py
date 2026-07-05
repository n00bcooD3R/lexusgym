import os
import re
import base64
import requests

def send_whatsapp(to_raw: str, body: str, document_bytes: bytes = None) -> dict:
    """
    Unified WhatsApp sender. Selects provider based on WA_PROVIDER env variable.
    """
    to = re.sub(r'\D', '', to_raw)
    provider = os.getenv("WA_PROVIDER", "none").strip().lower()

    print(f"[WhatsApp] Provider: {provider} | To: {to}")
    print(f"[WhatsApp] Message: {body}")
    if document_bytes:
        print(f"[WhatsApp] Document attached ({len(document_bytes)} bytes)")

    if provider in ("none", "demo", ""):
        return {
            "ok": True,
            "simulated": True,
            "message": "WhatsApp is in demo mode — message logged but not sent. Set WA_PROVIDER=evolution to enable real WhatsApp."
        }

    if provider == "meta":
        return send_via_meta(to, body, document_bytes)
    if provider == "local":
        return send_via_local(to, body, document_bytes)
    if provider == "evolution":
        return send_via_evolution(to, body, document_bytes)

    return {"ok": False, "error": f"Unknown WA_PROVIDER: {provider}"}

def send_via_meta(to: str, body: str, document_bytes: bytes = None) -> dict:
    token = os.getenv("META_WA_TOKEN")
    phone_id = os.getenv("META_WA_PHONE_ID")
    if not token or not phone_id:
        return {"ok": False, "error": "Meta WA env missing (META_WA_TOKEN / META_WA_PHONE_ID)"}

    url = f"https://graph.facebook.com/v21.0/{phone_id}/messages"
    headers = {"Authorization": f"Bearer {token}"}

    try:
        if document_bytes:
            files = {
                "document": ("document.pdf", document_bytes, "application/pdf")
            }
            data = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "document",
                "caption": body
            }
            res = requests.post(url, headers=headers, data=data, files=files)
        else:
            headers["Content-Type"] = "application/json"
            payload = {
                "messaging_product": "whatsapp",
                "to": to,
                "type": "text",
                "text": {"body": body}
            }
            res = requests.post(url, headers=headers, json=payload)

        json_res = res.json()
        if res.status_code != 200:
            return {"ok": False, "error": res.text, "raw": json_res}
        return {"ok": True, "raw": json_res}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def send_via_local(to: str, body: str, document_bytes: bytes = None) -> dict:
    url = os.getenv("LOCAL_WA_URL")
    secret = os.getenv("LOCAL_WA_SECRET") or os.getenv("SECRET")
    if not url:
        return {"ok": False, "error": "LOCAL_WA_URL missing"}
    
    url = url.rstrip("/")
    headers = {"Content-Type": "application/json", "x-secret": secret or ""}
    
    try:
        media = None
        if document_bytes:
            b64_str = base64.b64encode(document_bytes).decode("utf-8")
            media = {
                "mimetype": "application/pdf",
                "filename": "Invoice.pdf",
                "data": b64_str
            }
        
        payload = {"to": to, "body": body}
        if media:
            payload["media"] = media
            
        res = requests.post(f"{url}/send", headers=headers, json=payload)
        json_res = res.json()
        if res.status_code != 200:
            return {"ok": False, "error": res.text}
        return {"ok": True, "raw": json_res}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def send_via_evolution(to: str, body: str, document_bytes: bytes = None) -> dict:
    base_url = os.getenv("EVOLUTION_API_URL")
    api_key = os.getenv("EVOLUTION_API_KEY")
    instance = os.getenv("EVOLUTION_INSTANCE", "gymapp")

    if not base_url:
        return {"ok": False, "error": "EVOLUTION_API_URL missing"}
    if not api_key:
        return {"ok": False, "error": "EVOLUTION_API_KEY missing"}

    phone = f"{to}@s.whatsapp.net"
    url = base_url.rstrip("/")
    headers = {"Content-Type": "application/json", "apikey": api_key}

    try:
        if document_bytes:
            b64_str = base64.b64encode(document_bytes).decode("utf-8")
            payload = {
                "number": phone,
                "mediatype": "document",
                "mimetype": "application/pdf",
                "caption": body,
                "media": b64_str,
                "fileName": "Invoice.pdf"
            }
            res = requests.post(f"{url}/message/sendMedia/{instance}", headers=headers, json=payload)
        else:
            payload = {
                "number": phone,
                "text": body
            }
            res = requests.post(f"{url}/message/sendText/{instance}", headers=headers, json=payload)

        json_res = res.json()
        if res.status_code not in (200, 201):
            return {"ok": False, "error": res.text, "raw": json_res}
        return {"ok": True, "raw": json_res}
    except Exception as e:
        return {"ok": False, "error": str(e)}

def get_whatsapp_status() -> dict:
    """
    Checks connection status of the WhatsApp instance.
    """
    provider = os.getenv("WA_PROVIDER", "none").strip().lower()
    if provider in ("none", "demo", ""):
        return {"ok": True, "provider": "demo", "status": "open", "message": "Demo mode"}
    
    if provider == "evolution":
        base_url = os.getenv("EVOLUTION_API_URL")
        api_key = os.getenv("EVOLUTION_API_KEY")
        instance = os.getenv("EVOLUTION_INSTANCE", "gymapp")
        
        if not base_url or not api_key:
            return {"ok": False, "error": "Evolution credentials missing"}
            
        url = f"{base_url.rstrip('/')}/instance/connectionState/{instance}"
        headers = {"apikey": api_key}
        try:
            res = requests.get(url, headers=headers, timeout=10)
            if res.status_code == 200:
                data = res.json()
                state = data.get("instance", {}).get("state", "close")
                return {"ok": True, "provider": "evolution", "status": state}
            return {"ok": False, "error": f"Evolution status error: {res.text}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
            
    return {"ok": True, "provider": provider, "status": "unknown"}

def get_whatsapp_qr() -> dict:
    """
    Fetches the connection QR code for WhatsApp.
    """
    provider = os.getenv("WA_PROVIDER", "none").strip().lower()
    if provider in ("none", "demo", ""):
        return {"ok": True, "provider": "demo", "message": "Demo mode - no QR code required"}
        
    if provider == "evolution":
        base_url = os.getenv("EVOLUTION_API_URL")
        api_key = os.getenv("EVOLUTION_API_KEY")
        instance = os.getenv("EVOLUTION_INSTANCE", "gymapp")
        
        if not base_url or not api_key:
            return {"ok": False, "error": "Evolution credentials missing"}
            
        url = f"{base_url.rstrip('/')}/instance/connect/{instance}"
        headers = {"apikey": api_key}
        try:
            res = requests.get(url, headers=headers, timeout=15)
            if res.status_code == 200:
                data = res.json()
                # Return code and base64
                return {
                    "ok": True, 
                    "provider": "evolution", 
                    "code": data.get("code"),
                    "base64": data.get("base64")
                }
            return {"ok": False, "error": f"Evolution connect error: {res.text}"}
        except Exception as e:
            return {"ok": False, "error": str(e)}
            
    return {"ok": False, "error": f"QR code generation not supported for provider: {provider}"}

