import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/auth-context";
import AssistantChat from "@/components/AssistantChat";
import ThemeToggle from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "CyneMora — Cinema-Native Production OS",
  description:
    "Transform stories into structured cinematic productions. AI-powered orchestration, shot-based generation, continuity systems, and persistent identity management. A ChanceTEK LLC company.",
  keywords: [
    "CyneMora",
    "AI cinema",
    "cinematic production",
    "video generation",
    "AI filmmaking",
    "production operating system",
    "ChanceTEK",
  ],
  authors: [{ name: "ChanceTEK LLC" }],
  creator: "ChanceTEK LLC",
  openGraph: {
    title: "CyneMora — Cinema-Native Production OS",
    description:
      "Transform stories into structured cinematic productions with AI-powered orchestration.",
    url: "https://cynemora.us",
    siteName: "CyneMora",
    type: "website",
    images: [
      {
        url: "/icon-512x512.png",
        width: 512,
        height: 512,
        alt: "CyneMora Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CyneMora — Cinema-Native Production OS",
    description:
      "Transform stories into structured cinematic productions with AI-powered orchestration.",
    images: ["/icon-512x512.png"],
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
      </head>
      <body>
        <AuthProvider>
          {children}
          <AssistantChat />
          <ThemeToggle />
        </AuthProvider>
      </body>
    </html>
  );
}
