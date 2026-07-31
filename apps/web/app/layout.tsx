import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "template-next-mongo",
  description: "Next.js + MongoDB template",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
