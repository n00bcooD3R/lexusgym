import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "My Fitness Plan · Lexus Fitness",
  description: "Your personal workout and diet plan from Lexus Fitness Group",
};

// Client portal has its own layout - no admin nav/header
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
