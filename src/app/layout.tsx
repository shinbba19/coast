import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/lib/WalletContext';
import Navbar from '@/components/Navbar';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'COAST — Tokenized Real Estate',
  description: 'Invest in tokenized Thai real estate with fractional ownership.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0f172a] text-slate-100">
        <WalletProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-800 py-6 text-center text-sm text-slate-500">
            <p>
              COAST &copy; {new Date().getFullYear()} &mdash; Tokenized Real Estate on the Blockchain
            </p>
            <p className="text-xs mt-1 text-slate-600">
              Prototype only &mdash; not financial advice. All transactions are simulated.
            </p>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
