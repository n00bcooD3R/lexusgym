import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, FlatList } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import { BACKEND_API_URL, LOCAL_DEV_API_URL } from "../lib/config";

const API_BASE = __DEV__ ? LOCAL_DEV_API_URL : BACKEND_API_URL;

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [sendingReminder, setSendingReminder] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);

  const loadMemberDetails = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // 1. Fetch member
      const { data: m, error: mErr } = await supabase.from("members").select("*").eq("id", id).maybeSingle();
      if (mErr) throw mErr;
      if (!m) {
        Alert.alert("Error", "Member not found");
        router.back();
        return;
      }
      setMember(m);

      // 2. Fetch payments
      const { data: pay, error: payErr } = await supabase
        .from("payments")
        .select("*")
        .eq("member_id", id)
        .order("paid_on", { ascending: false });
      if (payErr) throw payErr;
      setPayments(pay || []);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error loading member details", err.message);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    loadMemberDetails();
  }, [loadMemberDetails]);

  const feeStatus = (nextDueDateStr: string | null, isStaff: boolean = false) => {
    if (isStaff) return "staff";
    if (!nextDueDateStr) return "overdue";
    const due = new Date(nextDueDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due.getTime() < today.getTime()) return "overdue";
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff <= 5) return "due-soon";
    return "ok";
  };

  const getDaysLeft = () => {
    if (!member?.next_due_date) return null;
    return Math.ceil((new Date(member.next_due_date).getTime() - Date.now()) / 86400000);
  };

  async function handleSendReminder() {
    setSendingReminder(true);
    const daysLeft = getDaysLeft();
    
    let template = "Hello {name},\n\nYour {gym_name} membership expires in {days} days. 💪\nPlease renew soon!\n\n— Team {gym_name}";
    let gymName = "Lexus Fitness Group";
    
    try {
      const resSettings = await fetch(`${API_BASE}/api/settings/list`);
      const settings = await resSettings.json();
      if (settings.msg_reminder) template = settings.msg_reminder;
      if (settings.gym_name) gymName = settings.gym_name;
    } catch (err) {
      console.warn("Failed to load settings in RN app:", err);
    }

    const expiry = member.next_due_date ? new Date(member.next_due_date).toLocaleDateString("en-IN") : "—";
    const amount = String(member.fee_amount ?? 0);

    const body = template
      .replace(/{name}/g, member.name)
      .replace(/{gym_name}/g, gymName)
      .replace(/{days}/g, String(daysLeft ?? 30))
      .replace(/{days_left}/g, String(daysLeft ?? 30))
      .replace(/{expiry}/g, expiry)
      .replace(/{amount}/g, amount);

    try {
      // Fetch session from supabase to get current token for authorization
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data?.session?.access_token;
      
      const res = await fetch(`${API_BASE}/api/wa/send`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify({ memberId: member.id, body })
      });
      const j = await res.json();
      if (j.simulated) {
        Alert.alert("📱 WhatsApp DEMO", `To: ${member.phone}\n\n${body}`);
      } else {
        Alert.alert(j.ok ? "Success" : "Error", j.ok ? "WhatsApp reminder sent!" : "Failed: " + (j.error || ""));
      }
    } catch (err: any) {
      Alert.alert("Network Error", err.message);
    } finally {
      setSendingReminder(false);
    }
  }

  async function handleRecordPayment() {
    Alert.alert(
      "Record Payment",
      `Are you sure you want to record a payment of ₹${member.fee_amount} for ${member.name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Record Payment",
          onPress: async () => {
            setRecordingPayment(true);
            try {
              const sessionData = await supabase.auth.getSession();
              const token = sessionData.data?.session?.access_token;

              // Insert payment and update due date
              const todayStr = new Date().toISOString().slice(0, 10);
              const nextDue = new Date();
              nextDue.setDate(nextDue.getDate() + (member.fee_cycle_days || 30));
              const nextDueStr = nextDue.toISOString().slice(0, 10);

              // 1. Save payment record
              const { error: payErr } = await supabase.from("payments").insert({
                member_id: member.id,
                amount: member.fee_amount,
                method: "cash",
                notes: "Recorded from Mobile Portal",
                paid_on: todayStr
              });
              if (payErr) throw payErr;

              // 2. Update member
              const { error: mErr } = await supabase.from("members").update({
                last_payment_date: todayStr,
                next_due_date: nextDueStr
              }).eq("id", member.id);
              if (mErr) throw mErr;

              // 3. Call backend endpoint to trigger WhatsApp invoice
              fetch(`${API_BASE}/api/payments/receipt`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": token ? `Bearer ${token}` : ""
                },
                body: JSON.stringify({ memberId: member.id, amount: member.fee_amount })
              }).catch(e => console.warn("Failed to send WhatsApp receipt:", e));

              Alert.alert("Success", "Payment recorded successfully!");
              loadMemberDetails();
            } catch (err: any) {
              Alert.alert("Error recording payment", err.message);
            } finally {
              setRecordingPayment(false);
            }
          }
        }
      ]
    );
  }

  if (loading || !member) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  const s = feeStatus(member.next_due_date, member.is_staff);
  const statusColor = s === "staff" ? "#a78bfa" : s === "overdue" ? "#fb7185" : s === "due-soon" ? "#fbbf24" : "#10b981";
  const statusLabel = s === "staff" ? "Staff" : s === "overdue" ? "Overdue" : s === "due-soon" ? "Due soon" : "Paid";

  return (
    <View style={styles.container}>
      {/* Header Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Detail</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          {member.photo_url ? (
            <Image source={{ uri: member.photo_url }} style={[styles.avatar, { borderColor: statusColor }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: statusColor }]}>
              <Text style={styles.avatarInitials}>{member.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          
          <Text style={styles.memberName}>{member.name}</Text>
          <Text style={styles.memberMeta}>Admission No: #{member.admission_no} · {member.phone}</Text>
          
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
            <Text style={[styles.statusLabelText, { color: statusColor }]}>● {statusLabel}</Text>
          </View>
        </View>

        {/* Member Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Information Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Age / Gender</Text>
            <Text style={styles.detailVal}>{member.age || "—"} / {member.gender || "—"}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Weight / Height</Text>
            <Text style={styles.detailVal}>{member.weight ? `${member.weight} kg` : "—"} / {member.height ? `${member.height} cm` : "—"}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Admission Fee</Text>
            <Text style={styles.detailVal}>₹{member.fee_amount}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Next Due Date</Text>
            <Text style={styles.detailVal}>{member.next_due_date ? new Date(member.next_due_date).toLocaleDateString("en-IN") : "—"}</Text>
          </View>

          {member.notes ? (
            <View style={styles.notesSection}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.notesVal}>{member.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity 
            style={[styles.actionBtn, styles.primaryBtn]} 
            onPress={handleRecordPayment}
            disabled={recordingPayment}
          >
            {recordingPayment ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.actionBtnText}>Record Cash Payment</Text>
            )}
          </TouchableOpacity>

          {!member.is_staff && (
            <TouchableOpacity 
              style={[styles.actionBtn, styles.cyanBtn]} 
              onPress={handleSendReminder}
              disabled={sendingReminder}
            >
              {sendingReminder ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.actionBtnText}>Send WhatsApp Reminder</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Payment History */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment History ({payments.length})</Text>
          {payments.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No payments recorded.</Text>
          ) : (
            payments.map((item) => (
              <View key={item.id} style={styles.paymentRow}>
                <View>
                  <Text style={styles.paymentDate}>{new Date(item.paid_on).toLocaleDateString("en-IN")}</Text>
                  <Text style={styles.paymentMethod}>Paid via: {item.method}</Text>
                </View>
                <Text style={styles.paymentAmount}>+ ₹{item.amount}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030310",
    paddingTop: 48,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#030310",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  profileCard: {
    backgroundColor: "rgba(20, 20, 35, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarInitials: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "700",
  },
  memberName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  memberMeta: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 12,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  statusLabelText: {
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "rgba(20, 20, 35, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 18,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#a78bfa",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  detailLabel: {
    fontSize: 14,
    color: "#94a3b8",
  },
  detailVal: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  notesSection: {
    marginTop: 12,
    gap: 4,
  },
  notesVal: {
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 20,
  },
  actionsCard: {
    gap: 12,
  },
  actionBtn: {
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: "#8b5cf6",
  },
  cyanBtn: {
    backgroundColor: "#06b6d4",
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  emptyHistoryText: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  paymentDate: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  paymentMethod: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10b981",
  },
});
