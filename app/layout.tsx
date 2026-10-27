import type { Metadata, Viewport } from "next";
import { Archivo, Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Atkinson Hyperlegible Next for reading, UI and headings (with italics, for emphasis in lessons);
// Archivo, with its width axis, for the narrow heavy lettering on station boards and the wordmark;
// Atkinson Hyperlegible Mono for keys and code. Next has no fallback metrics for the Atkinson
// faces yet, so no size-adjusted fallback for them. The homepage loads its own faces
// (components/landing/theme.ts).
const text = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-atkinson", display: "swap", style: ["normal", "italic"], adjustFontFallback: false, fallback: ["Helvetica Neue", "Arial", "sans-serif"] });
const board = Archivo({ subsets: ["latin"], variable: "--font-archivo", display: "swap", axes: ["wdth"] });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ["latin"], variable: "--font-atkinson-mono", display: "swap", adjustFontFallback: false, fallback: ["ui-monospace", "Menlo", "monospace"] });

export const metadata: Metadata = {
  title: "Chronicle",
  description: "A history study companion for UPSC and state PSC: lessons made for your question, then a short daily review.",
  appleWebApp: { capable: true, title: "Chronicle", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// CSS Custom Highlight API rules for note underlines. Inline because the CSS build pipeline
// does not recognise ::highlight() and drops it.
const highlightCss = `::highlight(note-remember){text-decoration:underline solid var(--ochre) 2px;text-underline-offset:4px;background-color:color-mix(in srgb,var(--ochre) 10%,transparent)}::highlight(note-question){text-decoration:underline dotted var(--brick) 2px;text-underline-offset:4px;background-color:color-mix(in srgb,var(--brick) 8%,transparent)}::highlight(note-disagree){text-decoration:underline wavy var(--violet) 1.5px;text-underline-offset:4px;background-color:color-mix(in srgb,var(--violet) 8%,transparent)}`;

// Apply the saved theme before first paint so there is no flash. Older saves say "paper" or
// "sepia" (now light) or "ink" (now dark); see normalizeTheme in lib/store/workspace.ts.
const themeScript = `try{var s=JSON.parse(localStorage.getItem("chronicle:workspace")||"null");var t=s&&s.state&&s.state.theme;t=t?(t==="dark"||t==="ink"?"dark":"light"):(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="light"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${text.variable} ${board.variable} ${mono.variable}`}
    >
      <body>
        <Script id="theme" strategy="beforeInteractive">{themeScript}</Script>
        <style dangerouslySetInnerHTML={{ __html: highlightCss }} />
        {children}
      </body>
    </html>
  );
}
