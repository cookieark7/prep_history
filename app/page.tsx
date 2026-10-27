import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";

// The public landing page. The app's own home (recent lessons, the composer) lives at /start.

export const metadata: Metadata = {
  title: "Chronicle — History for UPSC and state PSC",
  description: "Ask about any topic in history and get a lesson built for your question, every claim marked by how certain it is, then a short daily review of what to remember.",
};

export default function Page() {
  return <Landing />;
}
