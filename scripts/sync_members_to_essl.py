import os
import sys
import httpx
import pyodbc
from datetime import datetime
from dotenv import load_dotenv

# ─── AUTO-LOAD PROJECT ENVIRONMENT VARIABLES ───
env_loaded = False
for path in [".env.local", "../.env.local", "../../.env.local", os.path.join(os.path.dirname(__file__), "../.env.local")]:
    if os.path.exists(path):
        load_dotenv(path)
        env_loaded = True
        break
if not env_loaded:
    load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[ERROR] Could not read SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY from env configuration.")
    print("Please ensure your .env.local file is configured.")
    sys.exit(1)

# ─── ESSL DATABASE CONNECTION STRING CONFIGURATION ───
db_server = os.getenv("ESSL_DB_SERVER") or "LOCALHOST\\SQLEXPRESS"
db_name = os.getenv("ESSL_DB_NAME") or "eTimeTrackLite1"
db_user = os.getenv("ESSL_DB_USER")
db_pass = os.getenv("ESSL_DB_PASS")

if db_user and db_pass:
    ESSL_CONNECTION_STRING = (
        f"Driver={{SQL Server}};"
        f"Server={db_server};"
        f"Database={db_name};"
        f"UID={db_user};"
        f"PWD={db_pass};"
    )
else:
    ESSL_CONNECTION_STRING = (
        f"Driver={{SQL Server}};"
        f"Server={db_server};"
        f"Database={db_name};"
        f"Trusted_Connection=yes;"
    )

def fetch_supabase_members():
    print("[SUPABASE] Fetching members from Supabase cloud database...")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    
    try:
        with httpx.Client() as client:
            response = client.get(
                f"{SUPABASE_URL}/rest/v1/members?select=id,name,admission_no,phone,active",
                headers=headers,
                timeout=15.0
            )
            if response.status_code != 200:
                print(f"[ERROR] Fetching from Supabase failed: {response.text}")
                return []
            
            members = response.json()
            # Filter out members without admission numbers and keep active ones
            valid_members = [m for m in members if m.get("admission_no") and m.get("active") is not False]
            print(f"[SUCCESS] Found {len(valid_members)} valid members in Supabase.")
            return valid_members
    except Exception as e:
        print(f"[ERROR] Connection error to Supabase: {e}")
        return []

def analyze_and_sync():
    # 1. Fetch cloud members
    supabase_members = fetch_supabase_members()
    if not supabase_members:
        print("[WARNING] No members to sync or error fetching members. Exiting.")
        return

    # 2. Connect to local biometric database
    print(f"[DB] Connecting to local eSSL database: {db_server} (Database: {db_name})...")
    try:
        conn = pyodbc.connect(ESSL_CONNECTION_STRING)
        cursor = conn.cursor()
    except Exception as e:
        print(f"[ERROR] Local Database Connection Error: {e}")
        print("\nSuggestions:")
        print("  1. Verify SQL Server service is running.")
        print("  2. Check SQL Server instance name (e.g., LOCALHOST\\SQLEXPRESS).")
        print("  3. Double check the database name in .env.local (ESSL_DB_NAME).")
        sys.exit(1)

    try:
        # Detect actual table names (case-insensitive)
        cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'")
        tables = [r[0] for r in cursor.fetchall()]
        
        table_name = None
        for t in ["Employees", "Employee", "Users"]:
            if t.lower() in [tab.lower() for tab in tables]:
                table_name = next(tab for tab in tables if tab.lower() == t.lower())
                break
                
        if not table_name:
            print(f"[ERROR] Could not find 'Employees' or 'Users' table in database. Available tables: {tables}")
            conn.close()
            return

        print(f"[DB] Target table detected: '{table_name}'")

        # Discover column information
        cursor.execute(f"SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME=?", (table_name,))
        columns_info = cursor.fetchall()
        
        # Identify Identity/Auto-increment columns in MS SQL Server
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = ? 
              AND COLUMNPROPERTY(object_id(TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1
        """, (table_name,))
        identity_cols = {r[0] for r in cursor.fetchall()}
        if identity_cols:
            print(f"  [INFO] Skipping auto-increment primary keys: {list(identity_cols)}")

        # Find code and name columns
        code_col = next((c[0] for c in columns_info if c[0].lower() in ['employeecode', 'employee_code', 'code', 'usercode']), None)
        name_col = next((c[0] for c in columns_info if c[0].lower() in ['employeename', 'employee_name', 'name', 'username', 'first_name']), None)

        if not code_col or not name_col:
            print(f"[ERROR] Could not map code column or name column. Columns found: {[c[0] for c in columns_info]}")
            conn.close()
            return

        print(f"  Code Column Map -> '{code_col}'")
        print(f"  Name Column Map -> '{name_col}'")

        # Determine data type of code column
        code_col_type = next(c[1] for c in columns_info if c[0] == code_col)
        is_code_numeric = "int" in code_col_type.lower() or "numeric" in code_col_type.lower()
        print(f"  Code Column Data Type -> '{code_col_type}' (Numeric: {is_code_numeric})")

        # Fetch a sample row to copy defaults for mandatory columns
        cursor.execute(f"SELECT TOP 1 * FROM {table_name}")
        sample_row = cursor.fetchone()
        sample_dict = {}
        if sample_row:
            col_names = [desc[0] for desc in cursor.description]
            sample_dict = dict(zip(col_names, sample_row))
            print("  [INFO] Found existing records. Copying configuration profiles and defaults.")
        else:
            print("  [INFO] No existing records found. Using generic default profiles.")

        # Identify existing EmployeeCodes in local DB to prevent duplicates
        cursor.execute(f"SELECT {code_col} FROM {table_name}")
        existing_codes = {str(r[0]).strip().zfill(4) for r in cursor.fetchall() if r[0] is not None}
        print(f"[DB] Found {len(existing_codes)} existing member profiles in local eSSL database.")

        # Filter members that need to be added
        to_add = []
        for member in supabase_members:
            adm_no = str(member["admission_no"]).strip()
            padded_adm_no = adm_no.zfill(4)
            if padded_adm_no not in existing_codes and adm_no not in existing_codes:
                to_add.append(member)

        print(f"[INFO] Members to add: {len(to_add)}")
        if not to_add:
            print("[SUCCESS] All cloud members are already registered in the local biometric database!")
            conn.close()
            return

        # Print preview of members to add
        print("\n--- Sync Preview ---")
        for i, m in enumerate(to_add[:15], 1):
            print(f"  {i}. [Code: {m['admission_no'].zfill(4)}] {m['name']} (Phone: {m.get('phone') or 'N/A'})")
        if len(to_add) > 15:
            print(f"  ... and {len(to_add) - 15} more.")

        # Interactive Confirmation
        confirm = input(f"\n>> Do you want to sync these {len(to_add)} members to the biometric database? (y/n): ")
        if confirm.lower() not in ['y', 'yes']:
            print("[WARNING] Sync cancelled by user.")
            conn.close()
            return

        # Prepare default values for eSSL database columns
        # E.g. CompanyId=1, DepartmentId=1, CategoryId=1, Status='Working'
        defaults = {
            "CompanyId": 1,
            "DepartmentId": 1,
            "CategoryId": 1,
            "Status": "Working",
            "EmploymentType": "Regular",
            "HolidayGroup": 1,
            "DOJ": datetime.now(),
            "DOB": datetime(1990, 1, 1),
            "LocationId": 1,
        }

        # Override defaults with sample row if available
        if sample_dict:
            for k, v in sample_dict.items():
                if k not in [code_col, name_col] and k not in identity_cols:
                    # Keep valid database defaults
                    defaults[k] = v

        # Insert records
        synced_count = 0
        for m in to_add:
            try:
                adm_no = m["admission_no"].strip()
                # Use raw string or integer representation depending on DB type
                code_value = int(adm_no) if is_code_numeric else adm_no.zfill(4)
                name_value = m["name"][:50] # Truncate if exceeds typical column limit
                
                # Construct dynamic insert
                insert_fields = [code_col, name_col]
                insert_values = [code_value, name_value]
                
                # Add mandatory or other columns discovered
                for col in columns_info:
                    c_name = col[0]
                    c_nullable = col[2]
                    c_default = col[3]
                    
                    if c_name in identity_cols or c_name in insert_fields:
                        continue
                        
                    # If column is non-nullable and doesn't have a default
                    if c_nullable == 'NO' and c_default is None:
                        # Find value in defaults, fallback to standard default or None
                        val = defaults.get(c_name)
                        if val is None:
                            # Fallback based on type
                            c_type = col[1].lower()
                            if "int" in c_type or "numeric" in c_type:
                                val = 1
                            elif "date" in c_type:
                                val = datetime.now()
                            else:
                                val = ""
                        insert_fields.append(c_name)
                        insert_values.append(val)
                    elif c_name in defaults:
                        # Also include other useful default fields to populate record correctly
                        insert_fields.append(c_name)
                        insert_values.append(defaults[c_name])

                placeholders = ", ".join(["?"] * len(insert_values))
                fields_str = ", ".join(insert_fields)
                sql = f"INSERT INTO {table_name} ({fields_str}) VALUES ({placeholders})"
                
                cursor.execute(sql, tuple(insert_values))
                synced_count += 1
            except Exception as ins_e:
                print(f"  [ERROR] Syncing member {m['name']} (Code: {m['admission_no']}): {ins_e}")

        conn.commit()
        print(f"\n[SUCCESS] Successfully synchronized {synced_count} members to local biometric database.")
        conn.close()

    except Exception as e:
        print(f"[ERROR] During sync execution: {e}")
        try:
            conn.rollback()
        except:
            pass
        conn.close()

if __name__ == "__main__":
    print("==========================================================")
    print("     Gym App -> eSSL Member Database Sync Tool            ")
    print("==========================================================")
    analyze_and_sync()
