'use client';

import { useState, use } from 'react';
import { notFound } from 'next/navigation';
import { mockProperties, type Property } from '@/lib/mockData';
import { useWallet } from '@/lib/WalletContext';
import Link from 'next/link';

type TabType = 'primary' | 'secondary';

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

// ---- Inner component receives a guaranteed non-null property ----
function PropertyDetail({ property }: { property: Property }) {
  const {
    connected,
    connect,
    address,
    mUSDTBalance,
    mUSDTBalanceFormatted,
    holdings,
    buyTokens,
    sellTokens,
    listings,
    buyListing,
    isLoading,
    networkError,
    txHash,
    txExplorerLink,
    chainId,
    mintTestTokens,
  } = useWallet();

  const [activeTab, setActiveTab] = useState<TabType>('primary');
  const [buyAmount, setBuyAmount] = useState<string>('');
  const [buyMessage, setBuyMessage] = useState<string>('');
  const [sellAmount, setSellAmount] = useState<string>('');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [sellMessage, setSellMessage] = useState<string>('');
  const [isBuying, setIsBuying] = useState(false);
  const [isSelling, setIsSelling] = useState(false);
  const [isMinting, setIsMinting] = useState(false);

  const soldPct = Math.round(
    ((property.totalTokens - property.remainingTokens) / property.totalTokens) * 100
  );

  const myTokensRaw = holdings[property.id] ?? 0n;
  const myTokens = Number(myTokensRaw);
  const ownershipPct =
    myTokens > 0 ? ((myTokens / property.totalTokens) * 100).toFixed(4) : '0';

  const buyAmountNum = parseInt(buyAmount) || 0;
  const totalCost = buyAmountNum * property.tokenPriceMusdt;
  // For balance comparison: convert to bigint atoms (6 decimals)
  const totalCostAtoms = BigInt(Math.round(totalCost * 1e6));
  const insufficientBalance = buyAmountNum > 0 && mUSDTBalance < totalCostAtoms;

  const activeListings = listings.filter(
    (l) => l.propertyId === property.id && l.status === 'active'
  );

  async function handleBuy() {
    if (!buyAmountNum || buyAmountNum <= 0) {
      setBuyMessage('Enter a valid token amount first.');
      return;
    }
    if (insufficientBalance) {
      setBuyMessage('Insufficient mUSDT balance.');
      return;
    }
    if (buyAmountNum > property.remainingTokens) {
      setBuyMessage(`Only ${property.remainingTokens.toLocaleString()} tokens remaining.`);
      return;
    }
    setBuyMessage('');
    setIsBuying(true);
    try {
      const ok = await buyTokens(property.id, buyAmountNum);
      if (ok) {
        setBuyMessage(`Successfully purchased ${buyAmountNum.toLocaleString()} tokens!`);
        setBuyAmount('');
      } else {
        setBuyMessage('Transaction failed. Check your balance.');
      }
    } catch {
      setBuyMessage('Transaction failed. Check your balance.');
    } finally {
      setIsBuying(false);
    }
  }

  async function handleListForSale() {
    const amount = parseInt(sellAmount) || 0;
    const price = parseFloat(sellPrice) || 0;
    if (amount <= 0 || price <= 0) {
      setSellMessage('Enter valid amount and price.');
      return;
    }
    if (amount > myTokens) {
      setSellMessage(`You only hold ${myTokens.toLocaleString()} tokens.`);
      return;
    }
    setIsSelling(true);
    try {
      const ok = await sellTokens(property.id, amount, price);
      if (ok) {
        setSellMessage(`Listed ${amount.toLocaleString()} tokens at ${price.toFixed(2)} mUSDT each.`);
        setSellAmount('');
        setSellPrice('');
      } else {
        setSellMessage('Listing failed.');
      }
    } catch {
      setSellMessage('Listing failed.');
    } finally {
      setIsSelling(false);
    }
  }

  async function handleBuyListing(listingId: string) {
    const ok = await buyListing(listingId);
    if (!ok) {
      alert('Purchase failed. Check your balance or connect wallet.');
    }
  }

  async function handleMintTestTokens() {
    setIsMinting(true);
    try {
      await mintTestTokens();
    } finally {
      setIsMinting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <span>←</span> Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left: Image + Info */}
          <div className="lg:col-span-3 space-y-6">
            {/* Image */}
            <div className="rounded-xl overflow-hidden border border-slate-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={property.imageUrl}
                alt={property.name}
                className="w-full h-72 sm:h-96 object-cover"
              />
            </div>

            {/* Property Info */}
            <div>
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{property.name}</h1>
                  <p className="text-slate-400 flex items-center gap-1.5">
                    <span>📍</span> {property.location}
                  </p>
                </div>
                <span
                  className={`text-sm font-medium px-3 py-1 rounded-full border ${
                    property.status === 'active'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {property.status === 'active' ? 'Active' : 'Sold Out'}
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed text-sm">{property.description}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  label: 'Property Value',
                  value: `฿${(property.propertyValue / 1_000_000).toFixed(1)}M`,
                  sub: 'THB',
                  icon: '🏢',
                  highlight: false,
                },
                {
                  label: 'Token Price',
                  value: `${property.tokenPriceMusdt.toFixed(2)}`,
                  sub: 'mUSDT',
                  icon: '🪙',
                  highlight: false,
                },
                {
                  label: 'Annual Yield',
                  value: `${property.annualYield}%`,
                  sub: 'per year',
                  icon: '📈',
                  highlight: true,
                },
                {
                  label: 'Total Tokens',
                  value: property.totalTokens.toLocaleString(),
                  sub: 'COAST tokens',
                  icon: '🔢',
                  highlight: false,
                },
                {
                  label: 'Remaining',
                  value: property.remainingTokens.toLocaleString(),
                  sub: 'available',
                  icon: '📊',
                  highlight: false,
                },
                {
                  label: 'Token ID',
                  value: property.tokenId,
                  sub: 'identifier',
                  icon: '🏷️',
                  highlight: false,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4"
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-base">{stat.icon}</span>
                    <span className="text-xs text-slate-500">{stat.label}</span>
                  </div>
                  <p
                    className={`text-lg font-bold ${stat.highlight ? 'text-emerald-400' : 'text-white'}`}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Funding Progress</span>
                <span className="text-white font-medium">{soldPct}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${soldPct >= 100 ? 'bg-rose-500' : 'bg-blue-500'}`}
                  style={{ width: `${soldPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>
                  {(property.totalTokens - property.remainingTokens).toLocaleString()} sold
                </span>
                <span>{property.remainingTokens.toLocaleString()} remaining</span>
              </div>
            </div>
          </div>

          {/* Right: Trading Panel */}
          <div className="lg:col-span-2 space-y-5">
            {/* Network Error Banner */}
            {networkError && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                <p className="text-rose-400 text-sm font-medium">Network Error</p>
                <p className="text-rose-300 text-xs mt-0.5">{networkError}</p>
              </div>
            )}

            {/* Mint Test mUSDT — available on all test networks */}
            {connected && chainId !== null && chainId !== 1 && (
              <div className="bg-slate-800 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-400 font-medium">Testnet — Get free mUSDT</p>
                  <p className="text-xs text-slate-500 mt-0.5">Claim 50,000 mUSDT from the faucet</p>
                </div>
                <button
                  onClick={handleMintTestTokens}
                  disabled={isMinting || isLoading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs px-3 py-2 rounded-lg transition-colors flex-shrink-0"
                >
                  {isMinting ? (
                    <span className="flex items-center gap-1.5">
                      <span className="animate-spin inline-block">⏳</span> Minting...
                    </span>
                  ) : (
                    'Mint Test mUSDT'
                  )}
                </button>
              </div>
            )}

            {/* My Holdings */}
            {connected && myTokens > 0 && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <p className="text-xs text-emerald-400 font-medium mb-2">Your Holdings</p>
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold text-white">
                    {myTokens.toLocaleString()}
                  </span>
                  <span className="text-sm text-slate-400">
                    tokens ({ownershipPct}%)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Est. value:{' '}
                  <span className="text-slate-300">
                    {(myTokens * property.tokenPriceMusdt).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    mUSDT
                  </span>
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex border-b border-slate-700">
                {(['primary', 'secondary'] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'primary' ? 'Primary Market' : 'Secondary Listings'}
                    {tab === 'secondary' && activeListings.length > 0 && (
                      <span className="ml-1.5 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {activeListings.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* PRIMARY MARKET */}
              {activeTab === 'primary' && (
                <div className="p-5 space-y-4">
                  {!connected ? (
                    <div className="text-center py-6">
                      <p className="text-4xl mb-3">🔒</p>
                      <p className="text-slate-300 font-medium mb-1">Connect Wallet First</p>
                      <p className="text-slate-500 text-sm mb-4">
                        You need a connected wallet to purchase tokens.
                      </p>
                      <button
                        onClick={connect}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  ) : property.status === 'sold_out' ? (
                    <div className="text-center py-6">
                      <p className="text-4xl mb-3">🏷️</p>
                      <p className="text-slate-300 font-medium">Primary market sold out</p>
                      <p className="text-slate-500 text-sm mt-1">
                        Check Secondary Listings for available tokens.
                      </p>
                      <button
                        onClick={() => setActiveTab('secondary')}
                        className="mt-4 text-blue-400 hover:text-blue-300 text-sm underline"
                      >
                        View Secondary Listings
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1.5">
                          Number of Tokens
                        </label>
                        <input
                          type="number"
                          min="1"
                          max={property.remainingTokens}
                          value={buyAmount}
                          onChange={(e) => {
                            setBuyAmount(e.target.value);
                            setBuyMessage('');
                          }}
                          placeholder="Enter amount..."
                          className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                        />
                      </div>

                      {buyAmountNum > 0 && (
                        <div className="bg-slate-900 rounded-lg p-3 space-y-1.5 text-sm">
                          <div className="flex justify-between text-slate-400">
                            <span>Tokens</span>
                            <span className="text-white">
                              {buyAmountNum.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Price / token</span>
                            <span className="text-white">
                              {property.tokenPriceMusdt.toFixed(2)} mUSDT
                            </span>
                          </div>
                          <div className="border-t border-slate-700 pt-1.5 flex justify-between font-semibold">
                            <span className="text-slate-300">Total Cost</span>
                            <span className="text-white">
                              {totalCost.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              mUSDT
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500">
                            <span>Your balance</span>
                            <span className={insufficientBalance ? 'text-rose-400' : 'text-slate-400'}>
                              {mUSDTBalanceFormatted} mUSDT
                            </span>
                          </div>
                        </div>
                      )}

                      {buyMessage && (
                        <p
                          className={`text-sm px-3 py-2 rounded-lg ${
                            buyMessage.startsWith('Successfully')
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {buyMessage}
                        </p>
                      )}

                      {/* Tx hash success block */}
                      {txHash && buyMessage.startsWith('Successfully') && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-xs">
                          <p className="text-emerald-400 font-medium mb-1">Transaction confirmed</p>
                          <p className="text-slate-400 font-mono break-all">
                            {txHash.slice(0, 20)}...{txHash.slice(-8)}
                          </p>
                          {txExplorerLink && (
                            <a
                              href={txExplorerLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 underline mt-1 inline-block"
                            >
                              View on Explorer →
                            </a>
                          )}
                        </div>
                      )}

                      <button
                        onClick={handleBuy}
                        disabled={isBuying || isLoading || insufficientBalance}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
                      >
                        {isBuying || isLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin inline-block">⏳</span> Processing...
                          </span>
                        ) : (
                          'Buy Tokens'
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* SECONDARY MARKET */}
              {activeTab === 'secondary' && (
                <div className="p-5">
                  {activeListings.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-3xl mb-2">📭</p>
                      <p className="text-slate-400 text-sm">No active secondary listings.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeListings.map((listing) => {
                        const totalListingCost = listing.tokenAmount * listing.pricePerToken;
                        const isOwnListing =
                          address &&
                          listing.seller.toLowerCase() === address.toLowerCase();
                        return (
                          <div
                            key={listing.id}
                            className="bg-slate-900 rounded-lg p-3 border border-slate-700"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="text-xs text-slate-500 font-mono">
                                  {truncateAddress(listing.seller)}
                                  {isOwnListing && (
                                    <span className="ml-1.5 text-blue-400">(you)</span>
                                  )}
                                </p>
                                <p className="text-sm text-white font-medium mt-0.5">
                                  {listing.tokenAmount.toLocaleString()} tokens
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-500">Price/token</p>
                                <p className="text-sm font-semibold text-white">
                                  {listing.pricePerToken.toFixed(2)} mUSDT
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-slate-500">
                                Total:{' '}
                                <span className="text-slate-300">
                                  {totalListingCost.toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}{' '}
                                  mUSDT
                                </span>
                              </p>
                              {!isOwnListing && (
                                <button
                                  onClick={() => handleBuyListing(listing.id)}
                                  disabled={!connected || isLoading}
                                  className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-md transition-colors"
                                >
                                  {isLoading ? '...' : 'Buy'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sell Tokens Panel */}
            {connected && myTokens > 0 && (
              <div className="bg-slate-800 border border-amber-500/20 rounded-xl p-5">
                <h3 className="font-semibold text-amber-400 mb-4 flex items-center gap-2">
                  <span>💰</span> List Tokens for Sale
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      Amount (max {myTokens.toLocaleString()})
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={myTokens}
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      placeholder="Token amount..."
                      className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      Price per Token (mUSDT)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                      placeholder={`e.g. ${property.tokenPriceMusdt.toFixed(2)}`}
                      className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 placeholder-slate-600"
                    />
                  </div>

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

                  <button
                    onClick={handleListForSale}
                    disabled={isSelling || isLoading}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-semibold py-2.5 rounded-lg text-sm transition-colors"
                  >
                    {isSelling || isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="animate-spin inline-block">⏳</span> Listing...
                      </span>
                    ) : (
                      'List for Sale'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Outer page component ----
export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const property = mockProperties.find((p) => p.id === id);

  if (!property) return notFound();

  return <PropertyDetail property={property} />;
}
