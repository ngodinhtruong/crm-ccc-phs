import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PHS CRM",
  description: "PHS CRM Mini System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}