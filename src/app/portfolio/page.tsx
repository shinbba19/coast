'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/WalletContext';
import { formatMusdt, txExplorerUrl } from '@/lib/contractAddresses';
import Link from 'next/link';

export default function PortfolioPage() {
  const {
    connected,
    connect,
    address,
    chainId,
    mUSDTBalanceFormatted,
    holdings,
    claimableAmounts,
    claimDividend,
    sellTokens,
    transactions,
    allProperties,
    isLoading,
  } = useWallet();

  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Sell modal state
  const [sellModalId, setSellModalId] = useState<string | null>(null);
  const [sellAmount, setSellAmount] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [sellMessage, setSellMessage] = useState('');
  const [isSelling, setIsSelling] = useState(false);

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

  // Build portfolio rows using on-chain allProperties (includes dynamically registered properties)
  const portfolioRows = Object.entries(holdings)
    .filter(([, amount]) => (amount as bigint) > 0n)
    .map(([propertyId, tokenAmountBigint]) => {
      const property = allProperties.find((p) => p.id === propertyId);
      if (!property) return null;
      const tokenAmount = Number(tokenAmountBigint as bigint);
      const ownershipPct = ((tokenAmount / property.totalTokens) * 100).toFixed(4);
      const valueMusdt = tokenAmount * property.tokenPriceMusdt;
      const claimableAtoms = (claimableAmounts[propertyId] as bigint) ?? 0n;
      return { property, tokenAmount, ownershipPct, valueMusdt, claimableAtoms };
    })
    .filter(Boolean) as {
    property: (typeof allProperties)[0];
    tokenAmount: number;
    ownershipPct: string;
    valueMusdt: number;
    claimableAtoms: bigint;
  }[];

  const totalInvested = portfolioRows.reduce((sum, r) => sum + r.valueMusdt, 0);
  const totalTokens = portfolioRows.reduce((sum, r) => sum + r.tokenAmount, 0);
  const totalClaimableAtoms = portfolioRows.reduce((sum, r) => sum + r.claimableAtoms, 0n);

  async function handleClaim(propertyId: string) {
    const claimable = (claimableAmounts[propertyId] as bigint) ?? 0n;
    if (claimable <= 0n) return;
    setClaimingId(propertyId);
    try {
      await claimDividend(propertyId);
    } finally {
      setClaimingId(null);
    }
  }

  function openSellModal(propertyId: string) {
    setSellModalId(propertyId);
    setSellAmount('');
    setSellPrice('');
    setSellMessage('');
  }

  function closeSellModal() {
    setSellModalId(null);
    setSellAmount('');
    setSellPrice('');
    setSellMessage('');
  }

  async function handleSell() {
    if (!sellModalId) return;
    const amount = parseInt(sellAmount) || 0;
    const price = parseFloat(sellPrice) || 0;
    const maxTokens = Number((holdings[sellModalId] as bigint) ?? 0n);

    if (amount <= 0 || price <= 0) {
      setSellMessage('Enter a valid amount and price.');
      return;
    }
    if (amount > maxTokens) {
      setSellMessage(`You only hold ${maxTokens.toLocaleString()} tokens.`);
      return;
    }

    setIsSelling(true);
    setSellMessage('');
    try {
      const ok = await sellTokens(sellModalId, amount, price);
      if (ok) {
        setSellMessage(`Listed ${amount.toLocaleString()} tokens at ${price.toFixed(2)} mUSDT each.`);
        setSellAmount('');
        setSellPrice('');
        setTimeout(closeSellModal, 2000);
      } else {
        setSellMessage('Listing failed. Please try again.');
      }
    } finally {
      setIsSelling(false);
    }
  }

  const sellModalRow = sellModalId ? portfolioRows.find((r) => r.property.id === sellModalId) : null;
  const sellAmountNum = parseInt(sellAmount) || 0;
  const sellPriceNum = parseFloat(sellPrice) || 0;

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
                              <button
                                onClick={() => openSellModal(property.id)}
                                className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium px-2.5 py-1.5 rounded-md transition-colors"
                              >
                                Sell
                              </button>
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

        {/* Transaction History */}
        <div className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Transaction History</h2>
          {transactions.length === 0 ? (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <p className="text-2xl mb-2">📋</p>
              <p className="text-slate-400 text-sm">No transactions this session.</p>
            </div>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 text-left">
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium">Type</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium">Property</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Tokens</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Amount (mUSDT)</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Date</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {transactions.map((tx) => {
                      const property = allProperties.find((p) => p.id === tx.propertyId);
                      const explorerUrl = chainId ? txExplorerUrl(chainId, tx.txHash) : null;
                      return (
                        <tr key={tx.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full ${
                                tx.type === 'buy'
                                  ? 'bg-blue-500/15 text-blue-400'
                                  : tx.type === 'sell'
                                  ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-emerald-500/15 text-emerald-400'
                              }`}
                            >
                              {tx.type === 'buy' ? 'Buy' : tx.type === 'sell' ? 'Sell' : 'Dividend'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {property?.name ?? tx.propertyId}
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {tx.type !== 'dividend' ? tx.tokenAmount.toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-white">
                            {tx.totalPriceMusdt.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400 text-xs">
                            {new Date(tx.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {explorerUrl ? (
                              <a
                                href={explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 font-mono"
                                title={tx.txHash}
                              >
                                {tx.txHash.slice(0, 8)}…
                              </a>
                            ) : (
                              <span className="text-xs text-slate-600 font-mono" title={tx.txHash}>
                                {tx.txHash.slice(0, 8)}…
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sell Modal */}
      {sellModalId && sellModalRow && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeSellModal(); }}
        >
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-700">
              <div>
                <h3 className="font-semibold text-white">List Tokens for Sale</h3>
                <p className="text-xs text-slate-400 mt-0.5">{sellModalRow.property.name}</p>
              </div>
              <button
                onClick={closeSellModal}
                className="text-slate-400 hover:text-white text-xl leading-none transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-400 flex justify-between">
                <span>Your holdings</span>
                <span className="text-white font-medium">
                  {sellModalRow.tokenAmount.toLocaleString()} tokens
                </span>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Amount to list (max {sellModalRow.tokenAmount.toLocaleString()})
                </label>
                <input
                  type="number"
                  min="1"
                  max={sellModalRow.tokenAmount}
                  value={sellAmount}
                  onChange={(e) => { setSellAmount(e.target.value); setSellMessage(''); }}
                  placeholder="Token amount..."
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder-slate-600"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1.5">
                  Price per token (mUSDT)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={sellPrice}
                  onChange={(e) => { setSellPrice(e.target.value); setSellMessage(''); }}
                  placeholder={`e.g. ${sellModalRow.property.tokenPriceMusdt.toFixed(2)}`}
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder-slate-600"
                />
              </div>

              {sellAmountNum > 0 && sellPriceNum > 0 && (
                <div className="bg-slate-900 rounded-lg p-3 text-sm flex justify-between">
                  <span className="text-slate-400">Total listing value</span>
                  <span className="text-white font-semibold">
                    {(sellAmountNum * sellPriceNum).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    mUSDT
                  </span>
                </div>
              )}

              {sellMessage && (
                <p
                  className={`text-sm px-3 py-2 rounded-lg ${
                    sellMessage.startsWith('Listed')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}
                >
                  {sellMessage}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeSellModal}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSell}
                  disabled={isSelling || isLoading}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {isSelling || isLoading ? 'Listing...' : 'List for Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
