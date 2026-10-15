import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE, themeOf } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = { title: "Game boards", description: "Where each game stands, and what waits on you" };
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1216" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = themeOf((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
