import React, { useState, useEffect, useCallback, useMemo } from "react";
import { StyleSheet, Text, View, TextInput, FlatList, TouchableOpacity, RefreshControl, Image, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import LoginScreen from "../login";

export default function DashboardScreen() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Check auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadData = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("members")
        .select("id, admission_no, name, phone, photo_url, next_due_date, fee_amount, is_pt_client, active, is_staff")
        .order("name");
      if (error) throw error;
      setMembers(data || []);
    } catch (err) {
      console.error("Failed to load members in RN app:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session, loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

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

  // Compute Stats
  const stats = useMemo(() => {
    let active = 0;
    let overdue = 0;
    let dueSoon = 0;
    let staff = 0;

    members.forEach((m) => {
      if (m.is_staff) {
        staff++;
      } else {
        const s = feeStatus(m.next_due_date, m.is_staff);
        if (s === "overdue") overdue++;
        else if (s === "due-soon") dueSoon++;
        else active++;
      }
    });

    return { active, overdue, dueSoon, staff };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.phone || "").toLowerCase().includes(q) ||
        m.admission_no.toLowerCase().includes(q)
    );
  }, [members, searchQuery]);

  if (!authChecked) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (!session) {
    return <LoginScreen onLoginSuccess={() => loadData()} />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lexus Gym</Text>
        <Text style={styles.headerSubtitle}>Member Manager</Text>
      </View>

      {/* Stats scroll row */}
      <View style={styles.statsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={[styles.statCard, { borderColor: "rgba(16, 185, 129, 0.3)" }]}>
            <Text style={[styles.statValue, { color: "#10b981" }]}>{stats.active}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={[styles.statCard, { borderColor: "rgba(244, 63, 94, 0.3)" }]}>
            <Text style={[styles.statValue, { color: "#fb7185" }]}>{stats.overdue}</Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
          <View style={[styles.statCard, { borderColor: "rgba(245, 158, 11, 0.3)" }]}>
            <Text style={[styles.statValue, { color: "#f59e0b" }]}>{stats.dueSoon}</Text>
            <Text style={styles.statLabel}>Due Soon</Text>
          </View>
          <View style={[styles.statCard, { borderColor: "rgba(139, 92, 246, 0.3)" }]}>
            <Text style={[styles.statValue, { color: "#a78bfa" }]}>{stats.staff}</Text>
            <Text style={styles.statLabel}>Staff</Text>
          </View>
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search members by name, phone..."
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Member List */}
      {loading ? (
        <View style={styles.listLoading}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>🔭 No members found.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const s = feeStatus(item.next_due_date, item.is_staff);
            const statusColor = s === "staff" ? "#a78bfa" : s === "overdue" ? "#fb7185" : s === "due-soon" ? "#fbbf24" : "#10b981";
            const statusLabel = s === "staff" ? "Staff" : s === "overdue" ? "Overdue" : s === "due-soon" ? "Due" : "Paid";

            return (
              <TouchableOpacity
                style={styles.itemRow}
                onPress={() => {
                  router.push({
                    pathname: "/member-detail",
                    params: { id: item.id }
                  });
                }}
              >
                {item.photo_url ? (
                  <Image source={{ uri: item.photo_url }} style={[styles.avatar, { borderColor: statusColor }]} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: statusColor }]}>
                    <Text style={styles.avatarInitials}>{item.name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}

                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: statusColor }]}>
                    {item.name}
                    {item.is_pt_client ? <Text style={styles.ptBadge}> (PT)</Text> : null}
                  </Text>
                  <Text style={styles.itemMeta}>#{item.admission_no} · {item.phone}</Text>
                </View>

                <View style={styles.itemStatus}>
                  <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  <Text style={styles.feeText}>{s === "staff" ? "Unlimited" : `₹${item.fee_amount}`}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
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
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#ffffff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  statsContainer: {
    marginBottom: 16,
  },
  statsScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    width: 110,
    backgroundColor: "#0f172a",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 10,
    color: "#ffffff",
    fontSize: 15,
    padding: 12,
  },
  listLoading: {
    padding: 32,
  },
  emptyContainer: {
    padding: 48,
    alignItems: "center",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 15,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  itemInfo: {
    flex: 1,
    paddingLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "700",
  },
  ptBadge: {
    fontSize: 12,
    color: "#06b6d4",
    fontWeight: "600",
  },
  itemMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  itemStatus: {
    alignItems: "flex-end",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  feeText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
});
