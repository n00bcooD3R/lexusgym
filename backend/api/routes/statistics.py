from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from api.database import get_admin_client
from api.auth import get_current_user
from datetime import datetime, timedelta
from collections import defaultdict

router = APIRouter(prefix="/api/statistics", tags=["statistics"])

@router.get("/summary")
def get_stats_summary(
    month: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    user = Depends(get_current_user)
):
    """
    Computes aggregated KPIs, 6-month historical trends, plan distributions,
    and returns a filtered transaction register for the selected month or date range.
    """
    sb = get_admin_client()
    try:
        # Fetch all payments with nested member data
        res_payments = sb.from_("payments").select(
            "id, amount, paid_on, method, notes, member_id, members(id, name, join_date, is_staff)"
        ).execute()
        payments = res_payments.data or []
        
        # Fetch all members to count registrations
        res_members = sb.from_("members").select(
            "id, name, join_date, is_staff, active, fee_amount, fee_cycle_days"
        ).execute()
        members = res_members.data or []
        
        # Exclude staff from stats
        members = [m for m in members if not m.get("is_staff")]
        
        today = datetime.now().date()
        
        # Parse start and end filters
        filter_start = None
        filter_end = None
        
        if start_date and end_date:
            filter_start = datetime.strptime(start_date, "%Y-%m-%d").date()
            filter_end = datetime.strptime(end_date, "%Y-%m-%d").date()
        elif month:
            parts = month.split("-")
            year = int(parts[0])
            m_val = int(parts[1])
            filter_start = datetime(year, m_val, 1).date()
            if m_val == 12:
                filter_end = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                filter_end = datetime(year, m_val + 1, 1).date() - timedelta(days=1)
        else:
            # Default to current month
            filter_start = datetime(today.year, today.month, 1).date()
            if today.month == 12:
                filter_end = datetime(today.year + 1, 1, 1).date() - timedelta(days=1)
            else:
                filter_end = datetime(today.year, today.month + 1, 1).date() - timedelta(days=1)

        # Filter payments in range
        filtered_payments = []
        for p in payments:
            if not p.get("paid_on"):
                continue
            try:
                p_date = datetime.strptime(p["paid_on"].split("T")[0], "%Y-%m-%d").date()
            except Exception:
                continue
            if filter_start <= p_date <= filter_end:
                p["_date"] = p_date
                filtered_payments.append(p)
                
        # Calculate KPI metrics
        total_revenue = 0.0
        new_admission_revenue = 0.0
        renewal_revenue = 0.0
        new_joins_count = 0
        
        # Count joins in filter range
        for m in members:
            join_str = m.get("join_date")
            if join_str:
                try:
                    j_date = datetime.strptime(join_str.split("T")[0], "%Y-%m-%d").date()
                    if filter_start <= j_date <= filter_end:
                        new_joins_count += 1
                except Exception:
                    pass
                    
        for p in filtered_payments:
            amt = float(p.get("amount") or 0.0)
            total_revenue += amt
            
            # Check if this payment matches join date month
            m_info = p.get("members")
            is_new = False
            if m_info and m_info.get("join_date"):
                try:
                    j_date = datetime.strptime(m_info["join_date"].split("T")[0], "%Y-%m-%d").date()
                    if filter_start <= j_date <= filter_end:
                        is_new = True
                except Exception:
                    pass
            
            if is_new:
                new_admission_revenue += amt
            else:
                renewal_revenue += amt
                
        # Plan & Payment Mode breakdowns
        plan_breakdown = defaultdict(int)
        method_breakdown = defaultdict(int)
        
        for m in members:
            if not m.get("active"):
                continue
            fee = float(m.get("fee_amount") or 0)
            if fee == 1000:
                plan_breakdown["Flex Plan (30 Days)"] += 1
            elif fee == 2700:
                plan_breakdown["Power Plan (90 Days)"] += 1
            elif fee == 5400:
                plan_breakdown["Transform Plan (180 Days)"] += 1
            elif fee == 9999:
                plan_breakdown["Prime Plan (365 Days)"] += 1
            else:
                plan_breakdown["Custom/Manual Fees"] += 1
                
        for p in filtered_payments:
            mode = str(p.get("method") or "cash").lower()
            if mode == "cash":
                method_breakdown["Cash"] += 1
            elif mode == "upi":
                method_breakdown["UPI/QR"] += 1
            elif mode == "card":
                method_breakdown["Card"] += 1
            elif mode == "bank":
                method_breakdown["Bank Transfer"] += 1
            else:
                method_breakdown["Online/Other"] += 1
                
        # Dynamic trend intervals based on duration
        days_duration = (filter_end - filter_start).days + 1
        use_daily = (month is not None) or (days_duration <= 31)
        
        intervals = []
        if use_daily:
            # Generate every day in the range
            curr = filter_start
            while curr <= filter_end:
                label = curr.strftime("%d %b")
                intervals.append((curr, curr, label))
                curr += timedelta(days=1)
        else:
            # Generate months spanning the range
            curr = filter_start.replace(day=1)
            while curr <= filter_end:
                yr = curr.year
                mn = curr.month
                label = curr.strftime("%b %Y")
                
                t_start = max(filter_start, curr)
                if mn == 12:
                    month_end = datetime(yr + 1, 1, 1).date() - timedelta(days=1)
                else:
                    month_end = datetime(yr, mn + 1, 1).date() - timedelta(days=1)
                t_end = min(filter_end, month_end)
                
                intervals.append((t_start, t_end, label))
                
                if mn == 12:
                    curr = datetime(yr + 1, 1, 1).date()
                else:
                    curr = datetime(yr, mn + 1, 1).date()
        
        revenue_trend = []
        admission_trend = []
        renewal_trend = []
        trend_labels = []
        
        for t_start, t_end, label in intervals:
            trend_labels.append(label)
            
            m_rev = 0.0
            m_admissions = 0
            m_renewals = 0
            
            for p in payments:
                if not p.get("paid_on"):
                    continue
                try:
                    p_date = datetime.strptime(p["paid_on"].split("T")[0], "%Y-%m-%d").date()
                except Exception:
                    continue
                if t_start <= p_date <= t_end:
                    amt = float(p.get("amount") or 0.0)
                    m_rev += amt
                    
                    m_info = p.get("members")
                    is_new = False
                    if m_info and m_info.get("join_date"):
                        try:
                            j_date = datetime.strptime(m_info["join_date"].split("T")[0], "%Y-%m-%d").date()
                            if use_daily:
                                if j_date == p_date:
                                    is_new = True
                            else:
                                if t_start <= j_date <= t_end:
                                    is_new = True
                        except Exception:
                            pass
                    if is_new:
                        m_admissions += 1
                    else:
                        m_renewals += 1
                        
            revenue_trend.append(m_rev)
            admission_trend.append(m_admissions)
            renewal_trend.append(m_renewals)
            
        # Transaction log compile
        transactions = []
        for p in filtered_payments:
            m_info = p.get("members") or {}
            transactions.append({
                "id": p.get("id"),
                "date": p.get("paid_on"),
                "name": m_info.get("name", "N/A"),
                "method": str(p.get("method") or "cash").upper(),
                "amount": float(p.get("amount") or 0.0),
                "notes": p.get("notes") or ""
            })
            
        transactions.sort(key=lambda x: x["date"] or "", reverse=True)
        
        # MoM / Period-over-period calculations
        days_duration = (filter_end - filter_start).days + 1
        prior_start = filter_start - timedelta(days=days_duration)
        prior_end = filter_start - timedelta(days=1)
        
        prior_revenue = 0.0
        for p in payments:
            if not p.get("paid_on"):
                continue
            try:
                p_date = datetime.strptime(p["paid_on"].split("T")[0], "%Y-%m-%d").date()
            except Exception:
                continue
            if prior_start <= p_date <= prior_end:
                prior_revenue += float(p.get("amount") or 0.0)
                
        growth_pct = 0.0
        if prior_revenue > 0:
            growth_pct = ((total_revenue - prior_revenue) / prior_revenue) * 100.0
        elif total_revenue > 0:
            growth_pct = 100.0
            
        return {
            "period": {
                "start": filter_start.isoformat(),
                "end": filter_end.isoformat(),
                "duration_days": days_duration
            },
            "kpis": {
                "total_revenue": total_revenue,
                "new_joins_revenue": new_admission_revenue,
                "renewals_revenue": renewal_revenue,
                "new_joins_count": new_joins_count,
                "growth_pct": round(growth_pct, 1),
                "prior_revenue": prior_revenue
            },
            "trends": {
                "labels": trend_labels,
                "revenue": revenue_trend,
                "admissions": admission_trend,
                "renewals": renewal_trend
            },
            "breakdowns": {
                "plans": dict(plan_breakdown),
                "methods": dict(method_breakdown)
            },
            "transactions": transactions
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
