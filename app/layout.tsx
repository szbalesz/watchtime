import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './components/Providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '⚡ SE Watchtime & Pont Panel',
  description: 'Kérdezd le a nézési idődet és pontjaidat bármelyik StreamElements-et használó Twitch csatornán!',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239146FF'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'/></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hu">
      <body
        suppressHydrationWarning
        className={`${inter.className} bg-[#030712] text-[#e5e7eb] min-h-screen flex flex-col selection:bg-[#9146FF] selection:text-white antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}