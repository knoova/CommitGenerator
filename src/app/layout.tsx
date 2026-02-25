import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Idiotsyncratic Commits Generator",
  description: "GitHub webhook engine that turns commits into idiotic karaoke videos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
