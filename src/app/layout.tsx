import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CornShirt",
  description: "Concert ticketing platform",
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