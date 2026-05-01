'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/WalletContext';
import PropertyCard from '@/components/PropertyCard';

type FilterType = 'all' | 'active' | 'sold_out';

export default function MarketplacePage() {
  const { allProperties } = useWallet();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredProperties = allProperties.filter((p) => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const totalValue = allProperties.reduce((sum, p) => sum + p.propertyValue, 0);
  const activeCount = allProperties.filter((p) => p.status === 'active').length;
  const totalTokenized = allProperties.reduce((sum, p) => sum + p.totalTokens, 0);

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Hero */}
      <div className="bg-gradient-to-b from-slate-900 to-[#0f172a] border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm px-4 py-1.5 rounded-full mb-5">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Web3 Real Estate Platform
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              COAST — Tokenized Real Estate
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-8">
              Invest in fractional ownership of premium Thai real estate. Start with as little as one
              token and earn passive rental income.
            </p>
            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 mt-8">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  ฿{(totalValue / 1_000_000).toFixed(0)}M+
                </p>
                <p className="text-sm text-slate-500 mt-0.5">Total Property Value (THB)</p>
              </div>
              <div className="w-px bg-slate-700 hidden sm:block"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{activeCount}</p>
                <p className="text-sm text-slate-500 mt-0.5">Active Offerings</p>
              </div>
              <div className="w-px bg-slate-700 hidden sm:block"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">
                  {totalTokenized.toLocaleString()}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">Total Tokens Issued</p>
              </div>
              <div className="w-px bg-slate-700 hidden sm:block"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">Up to 9.1%</p>
                <p className="text-sm text-slate-500 mt-0.5">Annual Yield</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700">
            {(['all', 'active', 'sold_out'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  filter === f
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {f === 'sold_out' ? 'Sold Out' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            Showing {filteredProperties.length} of {allProperties.length} properties
          </p>
        </div>

        {/* Property Grid */}
        {filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-slate-500">
            <p className="text-4xl mb-3">🏗️</p>
            <p className="text-lg">No properties match this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
