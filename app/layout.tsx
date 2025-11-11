'use client';

import {Inter , Kanit , Prompt , Sarabun} from "next/font/google";
import "./globals.css";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const inter = Inter({subsets: ["latin"],display: "swap",variable: "--font-inter",});
const kanit = Kanit({ subsets: ["thai", "latin"], weight: ["400", "600"] });
const prompt = Prompt({ subsets: ["thai", "latin"], weight: ["400", "500"] });
const sarabun = Sarabun({ subsets: ["thai", "latin"], weight: ["400", "600"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en" className="bg-zinc-950 text-white">
      <body
        className={`${inter.className} antialiased fancy-ui`}
      >
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </body>
    </html>
  );
}
