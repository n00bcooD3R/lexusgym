import os
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

# Try to find and load .env.local in current or parent directories
for path in [".env.local", "../.env.local", "../../.env.local"]:
    if os.path.exists(path):
        load_dotenv(path)
load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL:
    raise ValueError("Missing SUPABASE_URL environment variable")

def get_db_client(auth_header: str = None) -> Client:
    """
    Returns a client-side Supabase client.
    If an Authorization header is provided, it configures the client to run queries
    authenticated under that user session context (respecting RLS).
    """
    if auth_header:
        # Strip Bearer if present in incoming header
        token = auth_header.replace("Bearer ", "").strip()
        options = ClientOptions(headers={"Authorization": f"Bearer {token}"})
        return create_client(SUPABASE_URL, SUPABASE_ANON_KEY, options=options)
    
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def get_admin_client() -> Client:
    """
    Returns an admin Supabase client using the service role key, bypassing RLS.
    """
    if not SUPABASE_SERVICE_KEY:
        raise ValueError("Missing SUPABASE_SERVICE_ROLE_KEY environment variable")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
