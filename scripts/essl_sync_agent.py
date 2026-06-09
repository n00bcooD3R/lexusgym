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

# ─── ESSL DATABASE CONNECTION STRING CONFIGURATION ───
# Can be configured inside your `.env.local` file for remote servers
db_server = os.getenv("ESSL_DB_SERVER") or "LOCALHOST\\SQLEXPRESS"
db_name = os.getenv("ESSL_DB_NAME") or "eTimeTrackLite1"
db_user = os.getenv("ESSL_DB_USER")
db_pass = os.getenv("ESSL_DB_PASS")

if db_user and db_pass:
    # SQL Server Authentication (recommended for remote systems on LAN)
    ESSL_CONNECTION_STRING = (
        f"Driver={{SQL Server}};"
        f"Server={db_server};"
        f"Database={db_name};"
        f"UID={db_user};"
        f"PWD={db_pass};"
    )
else:
    # Windows Authentication (default for localhost)
    ESSL_CONNECTION_STRING = (
        f"Driver={{SQL Server}};"
        f"Server={db_server};"
        f"Database={db_name};"
        f"Trusted_Connection=yes;"
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
    print(f"Cloud DB:  {SUPABASE_URL}")
    print(f"eSSL DB:   {db_server} (Database: {db_name})")
    print("Monitoring database for biometric punch logs...")
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
            
            # Select new logs sorted chronologically using standard ZKTeco/eSSL column names (DeviceLogId, UserId)
            cursor.execute(
                "SELECT DeviceLogId, UserId, LogDate, DeviceId FROM DeviceLogs WHERE DeviceLogId > ? ORDER BY DeviceLogId ASC",
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
            print("🚨 Local DB Connection Error or Query Error:", pe)
            if "207" in str(pe) or "Column" in str(pe) or "column" in str(pe):
                print("\n🔍 [Auto-Diagnosis] Column mismatch detected. Printing database schema structures:")
                try:
                    diag_conn = pyodbc.connect(ESSL_CONNECTION_STRING)
                    diag_cursor = diag_conn.cursor()
                    diag_cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")
                    tables = [r[0] for r in diag_cursor.fetchall()]
                    print("  Available tables in DB:", tables)
                    
                    target_table = "DeviceLogs" if "DeviceLogs" in tables else (tables[0] if tables else None)
                    if target_table:
                        diag_cursor.execute(f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='{target_table}'")
                        cols = [r[0] for r in diag_cursor.fetchall()]
                        print(f"  Columns in '{target_table}':", cols)
                    diag_conn.close()
                except Exception as diag_err:
                    print("  Could not execute diagnostics:", diag_err)
        except Exception as e:
            print("🚨 Sync Error:", e)
            
        # Poll for new logs every 10 seconds
        time.sleep(10)

if __name__ == "__main__":
    start_sync()
