import type { Metadata, Viewport } from "next";
import { Caveat, Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap", style: ["normal", "italic"] });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", display: "swap" });
const hand = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: "Chronicle",
  description: "Learn history by its structure: what happened, when, why, and what it led to.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// CSS Custom Highlight API rules for note underlines. Inline because the CSS build pipeline
// does not recognise ::highlight() and drops it.
const highlightCss = `::highlight(note-remember){text-decoration:underline solid var(--ochre) 2px;text-underline-offset:4px;background-color:color-mix(in srgb,var(--ochre) 10%,transparent)}::highlight(note-question){text-decoration:underline dotted var(--brick) 2px;text-underline-offset:4px;background-color:color-mix(in srgb,var(--brick) 8%,transparent)}::highlight(note-disagree){text-decoration:underline wavy var(--violet) 1.5px;text-underline-offset:4px;background-color:color-mix(in srgb,var(--violet) 8%,transparent)}`;

// Apply the saved theme before first paint so there is no flash.
const themeScript = `try{var s=JSON.parse(localStorage.getItem("chronicle:workspace")||"null");var t=s&&s.state&&s.state.theme;if(!t&&matchMedia("(prefers-color-scheme: dark)").matches)t="ink";document.documentElement.dataset.theme=t||"paper"}catch(e){document.documentElement.dataset.theme="paper"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="paper"
      suppressHydrationWarning
      className={`${serif.variable} ${sans.variable} ${mono.variable} ${hand.variable}`}
    >
      <body>
        <Script id="theme" strategy="beforeInteractive">{themeScript}</Script>
        <style dangerouslySetInnerHTML={{ __html: highlightCss }} />
        {children}
      </body>
    </html>
  );
}
