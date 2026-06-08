from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from typing import List, Optional
from api.database import get_db_client
from api.auth import get_current_user

router = APIRouter(prefix="/api/members", tags=["members"])

class DeleteRequest(BaseModel):
    id: str

@router.get("/search")
def search_members(
    q: str = Query(..., min_length=2),
    exclude: Optional[str] = Query(None),
    authorization: str = Header(None),
    user = Depends(get_current_user)
):
    try:
        # Sanitize input — strip special chars that could be injected into filters
        safe_q = q.replace("%", "").replace(",", "").replace(".", "").strip()
        if len(safe_q) < 2:
            raise HTTPException(status_code=400, detail="Query too short after sanitization")
        
        sb = get_db_client(authorization)
        query = sb.from_("members").select("id, name, admission_no, phone, is_staff")
        
        # Build Case Insensitive ILIKE match across Name, Phone, and Admission No
        search_filter = f"name.ilike.%{safe_q}%,phone.ilike.%{safe_q}%,admission_no.ilike.%{safe_q}%"
        query = query.or_(search_filter)
        
        if exclude and exclude.strip():
            query = query.neq("id", exclude)
            
        res = query.limit(8).execute()
        return res.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/delete")
def delete_member(
    req: DeleteRequest,
    authorization: str = Header(None),
    user = Depends(get_current_user)
):
    try:
        sb = get_db_client(authorization)
        res = sb.from_("members").delete().eq("id", req.id).execute()
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
