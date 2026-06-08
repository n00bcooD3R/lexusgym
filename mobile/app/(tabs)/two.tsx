import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from "react-native";
import { supabase } from "../../lib/supabase";

export default function TabTwoScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            setLoading(true);
            await supabase.auth.signOut();
            setLoading(false);
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Portal Settings</Text>
        <Text style={styles.headerSubtitle}>App configuration & profile</Text>
      </View>

      {/* Profile Info Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔐 Admin Profile</Text>
        {user ? (
          <View style={styles.profileDetails}>
            <Text style={styles.profileLabel}>Email</Text>
            <Text style={styles.profileVal}>{user.email}</Text>

            <Text style={styles.profileLabel}>Session ID</Text>
            <Text style={styles.profileVal}>{user.id.slice(0, 12)}...</Text>
          </View>
        ) : (
          <Text style={styles.emptyText}>Not authenticated.</Text>
        )}
      </View>

      {/* Info Settings Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📱 App Info</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Build Version</Text>
          <Text style={styles.infoVal}>1.0.0 (Release)</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Environment</Text>
          <Text style={styles.infoVal}>Production (Vite & FastAPI)</Text>
        </View>
      </View>

      {/* Actions */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Sign Out from Server</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030310",
    paddingTop: 48,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#030310",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 8,
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
    marginBottom: 12,
  },
  profileDetails: {
    gap: 8,
  },
  profileLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  profileVal: {
    fontSize: 15,
    color: "#ffffff",
    fontWeight: "600",
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  infoLabel: {
    fontSize: 14,
    color: "#94a3b8",
  },
  infoVal: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "rgba(244, 63, 94, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.3)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  logoutButtonText: {
    color: "#fb7185",
    fontSize: 15,
    fontWeight: "700",
  },
});
