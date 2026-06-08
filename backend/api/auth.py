from fastapi import Header, HTTPException
from api.database import get_db_client

def get_current_user(authorization: str = Header(None)):
    """
    FastAPI dependency to validate user JWT session token.
    Raises 401 Unauthorized if authentication fails.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        sb = get_db_client(authorization)
        res = sb.auth.get_user()
        if not res or not res.user:
            raise HTTPException(status_code=401, detail="Unauthorized")
        return res.user
    except HTTPException:
        raise
    except Exception:
        # Do NOT leak internal error details to the client
        raise HTTPException(status_code=401, detail="Unauthorized")
