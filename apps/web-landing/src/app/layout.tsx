// This is not a client component anymore.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FamRemit",
  description: "Money transfer for family",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}