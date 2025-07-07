import type { Metadata } from "next";
import { Providers } from '../components/Providers'; // Import our new provider

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
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}