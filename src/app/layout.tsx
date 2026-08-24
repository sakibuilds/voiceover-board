import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voiceover Board",
  description: "Turn slide outlines into a narrated voiceover storyboard with timing, transitions, and recording notes.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
