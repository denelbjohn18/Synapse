import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Synapse — StudyBoard',
  description: 'Ask anything. Get a complete study package.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
