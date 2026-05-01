'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/lib/WalletContext';

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function Navbar() {
  const { connected, address, mUSDTBalanceFormatted, connect, disconnect } = useWallet();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Marketplace' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/secondary', label: 'Secondary Market' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#0f172a] border-b border-slate-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl">🏖️</span>
            <span className="text-xl font-bold tracking-wider text-white">COAST</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right side: Admin + Wallet */}
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className={`text-xs px-3 py-1.5 rounded border transition-colors ${
                pathname === '/admin'
                  ? 'border-slate-400 text-slate-200 bg-slate-700'
                  : 'border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400'
              }`}
            >
              Admin
            </Link>

            {connected && address ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs text-slate-400">mUSDT Balance</span>
                  <span className="text-sm font-semibold text-emerald-400">
                    {mUSDTBalanceFormatted}
                  </span>
                </div>
                <button
                  onClick={disconnect}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-sm transition-colors"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                  <span className="text-slate-200 font-mono">{truncateAddress(address)}</span>
                </button>
              </div>
            ) : (
              <button
                onClick={connect}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden pb-3 flex gap-1 flex-wrap">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
