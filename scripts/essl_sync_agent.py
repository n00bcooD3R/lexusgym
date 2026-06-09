import os
import time
import sqlite3
import pyodbc
import httpx
from datetime import datetime
from dotenv import load_dotenv

# ─── AUTO-LOAD PROJECT ENVIRONMENT VARIABLES ───
# Finds and loads your .env.local file automatically
env_loaded = False
for path in [".env.local", "../.env.local", "../../.env.local", os.path.join(os.path.dirname(__file__), "../.env.local")]:
    if os.path.exists(path):
        load_dotenv(path)
        env_loaded = True
        break
if not env_loaded:
    load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
# Use Service Role Key to safely perform DB updates bypassing RLS policies
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: Could not read SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY from .env.local")
    print("Please make sure you run this script from the project root directory or copy your .env.local here.")
    exit(1)

# SQLite DB path to keep track of the last synced log ID locally
SYNC_DB_PATH = "essl_sync_progress.db"

# Local eSSL Database Connection String (adjust server instance/DB name if different)
# eTimeTrackLite / SmartOffice defaults to SQL Server Express localdb (localhost\SQLEXPRESS)
ESSL_CONNECTION_STRING = (
    "Driver={SQL Server};"
    "Server=LOCALHOST\\SQLEXPRESS;"
    "Database=eTimeTrackLite1;"
    "Trusted_Connection=yes;"
)

def init_local_tracker():
    conn = sqlite3.connect(SYNC_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS sync (last_id INTEGER)")
    cursor.execute("SELECT last_id FROM sync")
    row = cursor.fetchone()
    if not row:
        cursor.execute("INSERT INTO sync VALUES (0)")
        conn.commit()
    conn.close()

def get_last_synced_id():
    conn = sqlite3.connect(SYNC_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT last_id FROM sync")
    last_id = cursor.fetchone()[0]
    conn.close()
    return last_id

def update_last_synced_id(new_id):
    conn = sqlite3.connect(SYNC_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE sync SET last_id = ?", (new_id,))
    conn.commit()
    conn.close()

def start_sync():
    init_local_tracker()
    print("==========================================================")
    print("🚀 eSSL Biometric Sync Agent started successfully.")
    print(f"Cloud DB: {SUPABASE_URL}")
    print("Monitoring local SQL Server for biometric punch logs...")
    print("==========================================================")

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    while True:
        try:
            last_id = get_last_synced_id()
            
            # Connect to local biometric SQL database
            local_conn = pyodbc.connect(ESSL_CONNECTION_STRING)
            cursor = local_conn.cursor()
            
            # Select new logs sorted chronologically
            cursor.execute(
                "SELECT LogId, MemberId, LogDate, DeviceId FROM DeviceLogs WHERE LogId > ? ORDER BY LogId ASC",
                last_id
            )
            logs = cursor.fetchall()
            local_conn.close()

            if logs:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Found {len(logs)} new biometric punches. Syncing...")
                
                for log in logs:
                    log_id, employee_code, log_date, device_id = log
                    formatted_time = log_date.isoformat()

                    # Format the user ID to match your member admission numbers (e.g. padded like '0012')
                    # If your app registers them as integers, change str(employee_code).zfill(4) to str(employee_code)
                    admission_no = str(employee_code).zfill(4)
                    
                    # 1. Fetch the matching member UUID from the cloud database
                    with httpx.Client() as client:
                        member_res = client.get(
                            f"{SUPABASE_URL}/rest/v1/members?admission_no=eq.{admission_no}&select=id",
                            headers=headers
                        )
                        
                        if member_res.status_code == 200 and member_res.json():
                            member_id = member_res.json()[0]["id"]
                            
                            # 2. Insert punch record into Supabase attendance table
                            attendance_payload = {
                                "member_id": member_id,
                                "punch_time": formatted_time,
                                "device_name": f"Device {device_id}"
                            }
                            
                            insert_res = client.post(
                                f"{SUPABASE_URL}/rest/v1/attendance",
                                json=attendance_payload,
                                headers=headers
                            )
                            
                            if insert_res.status_code in (200, 201):
                                print(f"  ✅ Synced: Member #{admission_no} checked in at {formatted_time}")
                            else:
                                print(f"  ❌ Sync error for Member #{admission_no}: {insert_res.text}")
                        else:
                            print(f"  ⚠️ Warning: Biometric Code '{admission_no}' doesn't match any gym member in database.")
                    
                    # Update local progress index
                    update_last_synced_id(log_id)
            
        except pyodbc.Error as pe:
            print("🚨 Local DB Connection Error (is eSSL server MSSQL service running?):", pe)
        except Exception as e:
            print("🚨 Sync Error:", e)
            
        # Poll for new logs every 10 seconds
        time.sleep(10)

if __name__ == "__main__":
    start_sync()
