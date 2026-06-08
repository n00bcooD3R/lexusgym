from fastapi import APIRouter, Depends, HTTPException, Response, Request
from pydantic import BaseModel
from typing import Optional
import os
import bcrypt
from api.database import get_admin_client
from api.auth import get_current_user

router = APIRouter(prefix="/api/pt", tags=["pt"])

class CredentialsPayload(BaseModel):
    memberId: str
    username: str
    password: str

class LoginPayload(BaseModel):
    username: str
    password: str

@router.post("/credentials")
def create_pt_credentials(payload: CredentialsPayload, user = Depends(get_current_user)):
    """
    Creates or updates PT portal credentials for a gym member.
    """
    username = payload.username.lower().strip()
    password = payload.password
    
    if len(username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
        
    sb = get_admin_client()
    try:
        # Check if username is taken by another member
        res_existing = sb.from_("client_tokens").select("member_id").eq("username", username).execute()
        existing = res_existing.data or []
        
        if existing and existing[0]["member_id"] != payload.memberId:
            raise HTTPException(status_code=409, detail="Username already taken")
            
        # Hash password using bcrypt
        salt = bcrypt.gensalt(rounds=12)
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        # Upsert credentials
        res_upsert = sb.from_("client_tokens").upsert({
            "member_id": payload.memberId,
            "username": username,
            "password_hash": password_hash
        }, on_conflict="member_id").execute()
        
        if not res_upsert.data:
            raise HTTPException(status_code=500, detail="Failed to save credentials")
            
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/login")
def pt_login(payload: LoginPayload, response: Response):
    """
    Validates PT client credentials and sets a secure httpOnly session cookie.
    """
    username = payload.username.lower().strip()
    password = payload.password
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
        
    sb = get_admin_client()
    try:
        res_user = sb.from_("client_tokens").select("token, password_hash, member_id").eq("username", username).execute()
        rows = res_user.data or []
        
        if not rows or not rows[0].get("password_hash"):
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        row = rows[0]
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), row["password_hash"].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid username or password")
            
        token = row["token"]
        
        # Set cookie in response (valid for 30 days, HTTPS-only)
        response.set_cookie(
            key="client_session",
            value=token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=60 * 60 * 24 * 30,
            path="/"
        )
        
        return {"ok": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
def pt_logout(response: Response):
    """
    Clears the PT client session cookie.
    """
    response.set_cookie(
        key="client_session",
        value="",
        httponly=True,
        samesite="lax",
        max_age=0,
        path="/"
    )
    return {"ok": True}

@router.get("/portal-data")
def get_portal_data(request: Request, token: str):
    """
    Returns the logged-in client's profile, workout plan, and diet plan.
    Validates against the client_session cookie.
    """
    session_token = request.cookies.get("client_session")
    if not session_token or session_token != token:
        raise HTTPException(status_code=401, detail="Unauthorized session")
        
    sb = get_admin_client()
    try:
        # Check token and get member_id
        res_token = sb.from_("client_tokens").select("member_id").eq("token", token).execute()
        token_rows = res_token.data or []
        if not token_rows:
            raise HTTPException(status_code=404, detail="Session token not found")
            
        member_id = token_rows[0]["member_id"]
        
        # Query details
        res_member = sb.from_("members").select("id, name, photo_url, admission_no").eq("id", member_id).single().execute()
        res_workouts = sb.from_("workout_plans").select("*").eq("member_id", member_id).order("day_number").execute()
        res_diets = sb.from_("diet_plans").select("*").eq("member_id", member_id).order("meal_order").execute()
        
        if not res_member.data:
            raise HTTPException(status_code=404, detail="Member profile not found")
            
        return {
            "member": res_member.data,
            "workoutDays": res_workouts.data or [],
            "dietMeals": res_diets.data or []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

