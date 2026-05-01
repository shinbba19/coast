'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/WalletContext';
import { mockProperties } from '@/lib/mockData';
import { formatMusdt } from '@/lib/contractAddresses';
import Link from 'next/link';

export default function PortfolioPage() {
  const {
    connected,
    connect,
    address,
    mUSDTBalanceFormatted,
    holdings,
    claimableAmounts,
    claimDividend,
  } = useWallet();

  const [claimingId, setClaimingId] = useState<string | null>(null);

  if (!connected || !address) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-6xl mb-5">💼</p>
          <h1 className="text-2xl font-bold text-white mb-3">View Your Portfolio</h1>
          <p className="text-slate-400 mb-6">
            Connect your wallet to view your holdings, transaction history, and claimable dividends.
          </p>
          <button
            onClick={connect}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-xl text-base transition-colors"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Build portfolio rows
  const portfolioRows = Object.entries(holdings)
    .filter(([, amount]) => (amount as bigint) > 0n)
    .map(([propertyId, tokenAmountBigint]) => {
      const property = mockProperties.find((p) => p.id === propertyId);
      if (!property) return null;
      const tokenAmount = Number(tokenAmountBigint as bigint);
      const ownershipPct = ((tokenAmount / property.totalTokens) * 100).toFixed(4);
      const valueMusdt = tokenAmount * property.tokenPriceMusdt;
      const claimableAtoms = (claimableAmounts[propertyId] as bigint) ?? 0n;
      return { property, tokenAmount, ownershipPct, valueMusdt, claimableAtoms };
    })
    .filter(Boolean) as {
    property: (typeof mockProperties)[0];
    tokenAmount: number;
    ownershipPct: string;
    valueMusdt: number;
    claimableAtoms: bigint;
  }[];

  const totalInvested = portfolioRows.reduce((sum, r) => sum + r.valueMusdt, 0);
  const totalTokens = portfolioRows.reduce((sum, r) => sum + r.tokenAmount, 0);
  const totalClaimableAtoms = portfolioRows.reduce(
    (sum, r) => sum + r.claimableAtoms,
    0n
  );

  async function handleClaim(propertyId: string) {
    const claimable = (claimableAmounts[propertyId] as bigint) ?? 0n;
    if (claimable <= 0n) {
      alert('Nothing to claim.');
      return;
    }
    setClaimingId(propertyId);
    try {
      const ok = await claimDividend(propertyId);
      if (!ok) alert('Claim failed.');
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">My Portfolio</h1>
          <p className="text-slate-400 text-sm font-mono">{address}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Total Invested Value</p>
            <p className="text-2xl font-bold text-white">
              {totalInvested.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">mUSDT</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <p className="text-xs text-slate-500 mb-1">Total Token Holdings</p>
            <p className="text-2xl font-bold text-white">{totalTokens.toLocaleString()}</p>
            <p className="text-xs text-slate-500 mt-0.5">across {portfolioRows.length} properties</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
            <p className="text-xs text-emerald-400 mb-1">Claimable Dividends</p>
            <p className="text-2xl font-bold text-emerald-400">
              {formatMusdt(totalClaimableAtoms)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">mUSDT available</p>
          </div>
        </div>

        {/* Wallet Balance */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-400">Available mUSDT Balance</p>
            <p className="text-lg font-bold text-white">
              {mUSDTBalanceFormatted}{' '}
              <span className="text-sm font-normal text-slate-400">mUSDT</span>
            </p>
          </div>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Buy More Tokens
          </Link>
        </div>

        {/* Holdings Table */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Holdings</h2>
          {portfolioRows.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center">
              <p className="text-3xl mb-3">🏗️</p>
              <p className="text-slate-400">No holdings yet.</p>
              <Link
                href="/"
                className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Explore Properties
              </Link>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left">
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium">Property</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Tokens</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Ownership</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">
                        Value (mUSDT)
                      </th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">
                        Claimable
                      </th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {portfolioRows.map(
                      ({ property, tokenAmount, ownershipPct, valueMusdt, claimableAtoms }) => (
                        <tr key={property.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-4">
                            <Link
                              href={`/property/${property.id}`}
                              className="flex items-center gap-3 group"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={property.imageUrl}
                                alt={property.name}
                                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                              />
                              <div>
                                <p className="text-white font-medium group-hover:text-blue-400 transition-colors leading-snug">
                                  {property.name}
                                </p>
                                <p className="text-xs text-slate-500">{property.location}</p>
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-4 text-right text-white">
                            {tokenAmount.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 text-right text-slate-300">{ownershipPct}%</td>
                          <td className="px-4 py-4 text-right text-white">
                            {valueMusdt.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-4 text-right text-emerald-400">
                            {formatMusdt(claimableAtoms)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2 justify-end">
                              <Link
                                href={`/property/${property.id}`}
                                className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-2.5 py-1.5 rounded-md transition-colors"
                              >
                                Sell
                              </Link>
                              <button
                                onClick={() => handleClaim(property.id)}
                                disabled={claimableAtoms <= 0n || claimingId === property.id}
                                className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium px-2.5 py-1.5 rounded-md transition-colors"
                              >
                                {claimingId === property.id ? '...' : 'Claim'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
