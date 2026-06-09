import logging
from fastapi import APIRouter, Request, Response, Query, HTTPException
from datetime import datetime
from api.database import get_admin_client

# Set up logging
logger = logging.getLogger("adms")
logger.setLevel(logging.INFO)

router = APIRouter(prefix="/iclock", tags=["ADMS Biometric"])

# ─── 1. HANDSHAKE & INITIAL CONFIGURATION (GET /iclock/cdata) ───
# When the device boots or reconnects, it calls this endpoint to get server registry/rules.
@router.get("/cdata")
def adms_handshake(sn: str = Query(..., alias="SN"), options: str = None):
    logger.info(f"🔌 Handshake received from device SN: {sn}, options: {options}")
    
    # Standard ZKTeco configuration options for push SDK:
    # RegistryCode: A dummy approval code.
    # Delay: Heartbeat interval in seconds.
    # TransFlag: Tells the device which logs to transmit (AttLog = Attendance Log).
    config_response = (
        "RegistryCode=LexusGymOK\n"
        "Delay=30\n"
        "ErrorDelay=60\n"
        "TransTimes=00:00;23:59\n"
        "TransInterval=1\n"
        "TransFlag=1111111111\n" # Tells device to sync all kinds of transactions
        "Realtime=1\n"
    )
    return Response(content=config_response, media_type="text/plain")

# ─── 2. RECEIVE DATA LOGS (POST /iclock/cdata) ───
# When a punch occurs, the device sends a plain-text HTTP POST request with ATTLOG.
@router.post("/cdata")
async def adms_receive_data(request: Request, sn: str = Query(..., alias="SN"), table: str = None):
    logger.info(f"📥 Received data post from SN: {sn}, Table: {table}")
    
    if table == "ATTLOG":
        body_bytes = await request.body()
        raw_logs = body_bytes.decode("utf-8")
        
        # ZK ADMS punch logs are space/tab-separated rows.
        # Example format: "12\t2026-06-09 17:05:00\t0\t0\t0\t0"
        # Row fields: [PIN/EmployeeCode, DateTime, Status, VerifyMethod, WorkCode, Reserved]
        lines = raw_logs.strip().split("\n")
        logger.info(f"Parsing {len(lines)} biometric log entries...")

        try:
            sb = get_admin_client()
        except Exception as db_err:
            logger.error(f"❌ Failed to get Supabase client: {db_err}")
            return Response(content="ERROR\n", media_type="text/plain")

        for line in lines:
            if not line.strip():
                continue
            
            parts = line.split()
            if len(parts) >= 3:
                employee_code = parts[0]
                date_str = parts[1]
                time_str = parts[2]
                
                # Combine date and time, and format to standard ISO format
                try:
                    dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
                    formatted_time = dt.isoformat()
                except Exception as parse_err:
                    logger.error(f"⚠️ Failed to parse date/time '{date_str} {time_str}': {parse_err}")
                    continue

                # Pad the ID to match your Supabase database convention (e.g. 12 -> "0012")
                admission_no = employee_code.zfill(4)
                
                try:
                    # 1. Look up the member by admission_no
                    member_res = sb.from_("members").select("id").eq("admission_no", admission_no).execute()
                    
                    if member_res.data:
                        member_id = member_res.data[0]["id"]
                        
                        # Check if this exact punch already exists to prevent duplicate entries
                        existing = sb.from_("attendance") \
                            .select("id") \
                            .eq("member_id", member_id) \
                            .eq("punch_time", formatted_time) \
                            .execute()
                            
                        if not existing.data:
                            # 2. Insert punch record into attendance
                            sb.from_("attendance").insert({
                                "member_id": member_id,
                                "punch_time": formatted_time,
                                "device_name": f"ADMS Device {sn}"
                            }).execute()
                            logger.info(f"✅ Synced punch: Member #{admission_no} checked in at {formatted_time}")
                        else:
                            logger.info(f"⏭️ Ignored duplicate punch: Member #{admission_no} at {formatted_time}")
                    else:
                        logger.warning(f"⚠️ Biometric code '{admission_no}' did not match any member in Supabase.")
                except Exception as db_op_err:
                    logger.error(f"❌ Supabase DB operation failed for user {admission_no}: {db_op_err}")
                    # Keep processing other logs even if one fails
                    continue

    # Return plain-text OK so the device knows the logs were successfully parsed and clears its buffer queue.
    return Response(content="OK\n", media_type="text/plain")

# ─── 3. COMMAND QUERY (GET /iclock/getrequest) ───
# The device periodically polls this to check if the web server has commands for it.
@router.get("/getrequest")
def adms_get_commands(sn: str = Query(..., alias="SN")):
    # Return OK to indicate no pending commands.
    return Response(content="OK\n", media_type="text/plain")

# ─── 4. COMMAND RESULT ACKNOWLEDGEMENT (POST /iclock/devicecmd) ───
# The device posts the execution results of commands here.
@router.post("/devicecmd")
def adms_device_cmd_response(sn: str = Query(..., alias="SN")):
    return Response(content="OK\n", media_type="text/plain")
