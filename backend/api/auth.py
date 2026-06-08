from fastapi import Header, HTTPException
from api.database import get_db_client

def get_current_user(authorization: str = Header(None)):
    """
    FastAPI dependency to validate user JWT session token.
    Raises 401 Unauthorized if authentication fails.
    """
    print("DEBUG: authorization header received:", authorization)
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    try:
        token = authorization.replace("Bearer ", "").strip()
        sb = get_db_client(authorization)
        res = sb.auth.get_user(token)
        if not res or not res.user:
            print("DEBUG: auth.get_user() returned empty or no user")
            raise HTTPException(status_code=401, detail="Unauthorized")
        print("DEBUG: authenticated user:", res.user.email)
        return res.user
    except HTTPException as he:
        print("DEBUG: HTTPException in auth:", he.detail)
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Do NOT leak internal error details to the client
        raise HTTPException(status_code=401, detail="Unauthorized")
