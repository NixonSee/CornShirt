import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CornShirt",
  description: "Concert ticketing platform",
  icons: {
    icon: [{ url: "/CornShirt Logo.jpeg", type: "image/jpeg" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}