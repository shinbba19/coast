'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/WalletContext';
import { mockProperties } from '@/lib/mockData';
import Link from 'next/link';

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function SecondaryMarketPage() {
  const {
    connected,
    connect,
    address,
    listings,
    buyListing,
    cancelListing,
    isLoading,
    networkError,
  } = useWallet();
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [buyFeedback, setBuyFeedback] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const activeListings = listings.filter((l) => l.status === 'active');

  const filteredListings =
    propertyFilter === 'all'
      ? activeListings
      : activeListings.filter((l) => l.propertyId === propertyFilter);

  const propertiesWithListings = mockProperties.filter((p) =>
    activeListings.some((l) => l.propertyId === p.id)
  );

  async function handleBuy(listingId: string) {
    if (!connected) {
      connect();
      return;
    }
    setLoadingId(listingId);
    try {
      const ok = await buyListing(listingId);
      if (ok) {
        setBuyFeedback((prev) => ({ ...prev, [listingId]: 'Purchased!' }));
      } else {
        setBuyFeedback((prev) => ({ ...prev, [listingId]: 'Failed' }));
        setTimeout(
          () => setBuyFeedback((prev) => { const n = { ...prev }; delete n[listingId]; return n; }),
          3000
        );
      }
    } catch {
      setBuyFeedback((prev) => ({ ...prev, [listingId]: 'Failed' }));
      setTimeout(
        () => setBuyFeedback((prev) => { const n = { ...prev }; delete n[listingId]; return n; }),
        3000
      );
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCancel(listingId: string) {
    setLoadingId(listingId);
    try {
      const ok = await cancelListing(listingId);
      if (!ok) alert('Cancel failed.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Secondary Market</h1>
          <p className="text-slate-400">
            Trade tokenized real estate directly with other investors. Buy existing listings at
            market-set prices.
          </p>
        </div>

        {/* Network Error Banner */}
        {networkError && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-6">
            <p className="text-rose-400 text-sm font-medium">Network Error</p>
            <p className="text-rose-300 text-xs mt-0.5">{networkError}</p>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500">Active Listings</p>
            <p className="text-xl font-bold text-white mt-0.5">{activeListings.length}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500">Properties Listed</p>
            <p className="text-xl font-bold text-white mt-0.5">{propertiesWithListings.length}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500">Total Tokens Available</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {activeListings.reduce((s, l) => s + l.tokenAmount, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500">Total mUSDT Volume</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {activeListings
                .reduce((s, l) => s + l.tokenAmount * l.pricePerToken, 0)
                .toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Wallet prompt */}
        {!connected && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-blue-300 font-medium text-sm">Connect to trade</p>
              <p className="text-blue-400/70 text-xs mt-0.5">
                Connect your wallet to purchase listings from the secondary market.
              </p>
            </div>
            <button
              onClick={connect}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              Connect Wallet
            </button>
          </div>
        )}

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setPropertyFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              propertyFilter === 'all'
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-400'
            }`}
          >
            All Properties
          </button>
          {propertiesWithListings.map((p) => (
            <button
              key={p.id}
              onClick={() => setPropertyFilter(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                propertyFilter === p.id
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-slate-600 text-slate-400 hover:text-white hover:border-slate-400'
              }`}
            >
              {p.name.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>

        {/* Listings Table */}
        {filteredListings.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-16 text-center">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-slate-400 text-lg">No active listings found.</p>
            {propertyFilter !== 'all' && (
              <button
                onClick={() => setPropertyFilter('all')}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left bg-slate-900/50">
                    <th className="px-5 py-3.5 text-xs text-slate-500 font-medium">Property</th>
                    <th className="px-5 py-3.5 text-xs text-slate-500 font-medium">Seller</th>
                    <th className="px-5 py-3.5 text-xs text-slate-500 font-medium text-right">
                      Tokens
                    </th>
                    <th className="px-5 py-3.5 text-xs text-slate-500 font-medium text-right">
                      Price/Token
                    </th>
                    <th className="px-5 py-3.5 text-xs text-slate-500 font-medium text-right">
                      Total mUSDT
                    </th>
                    <th className="px-5 py-3.5 text-xs text-slate-500 font-medium text-right">
                      Listed
                    </th>
                    <th className="px-5 py-3.5 text-xs text-slate-500 font-medium text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredListings.map((listing) => {
                    const property = mockProperties.find((p) => p.id === listing.propertyId);
                    const totalCost = listing.tokenAmount * listing.pricePerToken;
                    const primPrice = property?.tokenPriceMusdt ?? 0;
                    const premiumPct =
                      primPrice > 0
                        ? (((listing.pricePerToken - primPrice) / primPrice) * 100).toFixed(1)
                        : null;
                    const isOwn =
                      address && listing.seller.toLowerCase() === address.toLowerCase();
                    const feedback = buyFeedback[listing.id];
                    const isThisLoading = loadingId === listing.id;

                    return (
                      <tr
                        key={listing.id}
                        className="hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="px-5 py-4">
                          {property ? (
                            <Link
                              href={`/property/${property.id}`}
                              className="flex items-center gap-3 group"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={property.imageUrl}
                                alt={property.name}
                                className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                              />
                              <div>
                                <p className="text-white font-medium text-xs group-hover:text-blue-400 transition-colors leading-snug">
                                  {property.name}
                                </p>
                                <p className="text-slate-500 text-xs">{property.location}</p>
                              </div>
                            </Link>
                          ) : (
                            <span className="text-slate-500 text-xs font-mono">
                              {listing.propertyId}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs text-slate-400 font-mono">
                            {truncateAddress(listing.seller)}
                            {isOwn && (
                              <span className="ml-1.5 text-blue-400 font-sans">(you)</span>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right text-white font-medium">
                          {listing.tokenAmount.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div>
                            <span className="text-white">
                              {listing.pricePerToken.toFixed(2)}
                            </span>
                            {premiumPct !== null && (
                              <span
                                className={`ml-1.5 text-xs ${
                                  parseFloat(premiumPct) > 0
                                    ? 'text-amber-400'
                                    : parseFloat(premiumPct) < 0
                                    ? 'text-emerald-400'
                                    : 'text-slate-500'
                                }`}
                              >
                                {parseFloat(premiumPct) > 0 ? '+' : ''}
                                {premiumPct}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-white">
                          {totalCost.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-4 text-right text-xs text-slate-500">
                          {new Date(listing.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-4 text-center">
                          {feedback ? (
                            <span
                              className={`text-xs font-medium ${
                                feedback === 'Purchased!'
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {feedback}
                            </span>
                          ) : isOwn ? (
                            <button
                              onClick={() => handleCancel(listing.id)}
                              disabled={isThisLoading || isLoading}
                              className="text-xs bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-rose-400 font-medium px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {isThisLoading ? '...' : 'Cancel'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBuy(listing.id)}
                              disabled={isThisLoading || isLoading}
                              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                            >
                              {isThisLoading ? '...' : 'Buy'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-slate-700">
              {filteredListings.map((listing) => {
                const property = mockProperties.find((p) => p.id === listing.propertyId);
                const totalCost = listing.tokenAmount * listing.pricePerToken;
                const isOwn = address && listing.seller.toLowerCase() === address.toLowerCase();
                const feedback = buyFeedback[listing.id];
                const isThisLoading = loadingId === listing.id;

                return (
                  <div key={listing.id} className="p-4 space-y-3">
                    {property && (
                      <Link href={`/property/${property.id}`} className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={property.imageUrl}
                          alt={property.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-white text-sm font-medium">{property.name}</p>
                          <p className="text-slate-500 text-xs">{property.location}</p>
                        </div>
                      </Link>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500">Seller</p>
                        <p className="text-slate-300 font-mono text-xs mt-0.5">
                          {truncateAddress(listing.seller)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Tokens</p>
                        <p className="text-white font-medium mt-0.5">
                          {listing.tokenAmount.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Total</p>
                        <p className="text-white font-medium mt-0.5">
                          {totalCost.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    </div>
                    {feedback ? (
                      <p
                        className={`text-sm font-medium text-center ${
                          feedback === 'Purchased!' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {feedback}
                      </p>
                    ) : isOwn ? (
                      <button
                        onClick={() => handleCancel(listing.id)}
                        disabled={isThisLoading || isLoading}
                        className="w-full bg-rose-500/20 hover:bg-rose-500/30 disabled:opacity-40 disabled:cursor-not-allowed text-rose-400 text-sm font-medium py-2.5 rounded-lg transition-colors"
                      >
                        {isThisLoading ? 'Cancelling...' : 'Cancel Listing'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuy(listing.id)}
                        disabled={isThisLoading || isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
                      >
                        {isThisLoading ? 'Buying...' : `Buy — ${totalCost.toFixed(2)} mUSDT`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
