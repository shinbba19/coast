'use client';

import { useState } from 'react';
import {
  mockProperties,
  mockListings,
  mockTransactions,
  type Property,
} from '@/lib/mockData';
import { useWallet, type OnChainTx } from '@/lib/WalletContext';
import { CONTRACT_ADDRESSES, txExplorerUrl } from '@/lib/contractAddresses';

interface AdminProperty extends Property {
  active: boolean;
  tokensSold: number;
}

const initialAdminProperties: AdminProperty[] = mockProperties.map((p) => ({
  ...p,
  active: p.status === 'active',
  tokensSold: p.totalTokens - p.remainingTokens,
}));

interface DividendDeposit {
  propertyId: string;
  amount: string;
}

interface NewProperty {
  name: string;
  location: string;
  propertyValue: string;
  totalTokens: string;
  tokenPriceMusdt: string;
  annualYield: string;
  description: string;
}

const emptyNewProperty: NewProperty = {
  name: '',
  location: '',
  propertyValue: '',
  totalTokens: '',
  tokenPriceMusdt: '',
  annualYield: '',
  description: '',
};

export default function AdminPage() {
  const {
    connected,
    address,
    depositDividend,
    withdrawPrimarySales,
    primarySalesBalance,
    allTransactions,
    isLoading,
    networkError,
    chainId,
  } = useWallet();

  const [adminProperties, setAdminProperties] = useState<AdminProperty[]>(
    initialAdminProperties
  );
  const [dividendForm, setDividendForm] = useState<DividendDeposit>({
    propertyId: mockProperties[0]?.id ?? '',
    amount: '',
  });
  const [dividendMsg, setDividendMsg] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [newProperty, setNewProperty] = useState<NewProperty>(emptyNewProperty);
  const [createMsg, setCreateMsg] = useState('');
  const [activeSection, setActiveSection] = useState<'properties' | 'dividends' | 'withdraw' | 'transactions' | 'create'>(
    'properties'
  );
  const [withdrawForm, setWithdrawForm] = useState({ to: '', amount: '' });
  const [withdrawMsg, setWithdrawMsg] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const totalMUSDTVolume = mockTransactions.reduce((s, tx) => s + tx.totalPriceMusdt, 0);
  const activeListings = mockListings.filter((l) => l.status === 'active').length;

  // Check if the connected wallet is the deployer/admin
  const isAdmin =
    connected &&
    address &&
    address.toLowerCase() === CONTRACT_ADDRESSES.deployer.toLowerCase();

  function toggleActive(id: string) {
    setAdminProperties((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, active: !p.active, status: !p.active ? 'active' : ('inactive' as never) } : p
      )
    );
  }

  async function handleDepositDividend() {
    const amount = parseFloat(dividendForm.amount);
    if (!dividendForm.propertyId || !amount || amount <= 0) {
      setDividendMsg('Please select a property and enter a valid amount.');
      return;
    }
    setIsDepositing(true);
    setDividendMsg('');
    try {
      const ok = await depositDividend(dividendForm.propertyId, amount);
      if (ok) {
        setDividendMsg(
          `✓ Deposited ${amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} mUSDT as dividend for "${
            mockProperties.find((p) => p.id === dividendForm.propertyId)?.name
          }". Distribution pending.`
        );
        setDividendForm((prev) => ({ ...prev, amount: '' }));
      } else {
        setDividendMsg('Deposit failed. Check your wallet and try again.');
      }
    } catch {
      setDividendMsg('Deposit failed. Check your wallet and try again.');
    } finally {
      setIsDepositing(false);
    }
  }

  async function handleWithdraw() {
    const amount = parseFloat(withdrawForm.amount);
    if (!withdrawForm.to || !amount || amount <= 0) {
      setWithdrawMsg('Please enter a recipient address and amount.');
      return;
    }
    const availableMusdt = Number(primarySalesBalance) / 1e6;
    if (amount > availableMusdt) {
      setWithdrawMsg(`Insufficient balance. Available: ${availableMusdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mUSDT`);
      return;
    }
    setIsWithdrawing(true);
    setWithdrawMsg('');
    try {
      const ok = await withdrawPrimarySales(withdrawForm.to, amount);
      if (ok) {
        setWithdrawMsg(`✓ Withdrew ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mUSDT to ${withdrawForm.to.slice(0, 10)}...`);
        setWithdrawForm({ to: '', amount: '' });
      } else {
        setWithdrawMsg('Withdrawal failed. Check your wallet and try again.');
      }
    } catch {
      setWithdrawMsg('Withdrawal failed. Check your wallet and try again.');
    } finally {
      setIsWithdrawing(false);
    }
  }

  function handleCreateProperty() {
    const fields = Object.values(newProperty);
    if (fields.some((v) => !v.trim())) {
      setCreateMsg('Please fill in all fields.');
      return;
    }
    // NOTE: On-chain property creation goes through configurePrimary on the contract.
    // This prototype form stores the property locally for UI preview only.
    const p: AdminProperty = {
      id: `prop-${Date.now()}`,
      name: newProperty.name,
      description: newProperty.description,
      imageUrl: `https://picsum.photos/seed/new${Date.now()}/800/500`,
      location: newProperty.location,
      propertyValue: parseFloat(newProperty.propertyValue),
      totalTokens: parseInt(newProperty.totalTokens),
      remainingTokens: parseInt(newProperty.totalTokens),
      tokenPriceMusdt: parseFloat(newProperty.tokenPriceMusdt),
      tokenId: `COAST-NEW-${Date.now()}`,
      status: 'active',
      annualYield: parseFloat(newProperty.annualYield),
      active: true,
      tokensSold: 0,
    };
    setAdminProperties((prev) => [...prev, p]);
    setCreateMsg(`✓ Property "${p.name}" saved locally. To publish on-chain, call configurePrimary on the contract.`);
    setNewProperty(emptyNewProperty);
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-2xl">⚙️</span>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-slate-500 text-sm">COAST platform management — prototype only</p>
          </div>
        </div>

        {/* Network Error Banner */}
        {networkError && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 mb-6">
            <p className="text-rose-400 text-sm font-medium">Network Error</p>
            <p className="text-rose-300 text-xs mt-0.5">{networkError}</p>
          </div>
        )}

        {/* Admin Wallet Required Banner */}
        {connected && !isAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-amber-400 text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-amber-400 text-sm font-medium">Admin Wallet Required</p>
              <p className="text-amber-300/70 text-xs mt-0.5">
                The connected wallet is not the deployer address. On-chain admin actions (like
                depositing dividends) will fail. Connect with the deployer wallet to proceed.
              </p>
              <p className="text-slate-500 text-xs mt-1 font-mono">
                Expected: {CONTRACT_ADDRESSES.deployer}
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500">Total Properties</p>
            <p className="text-2xl font-bold text-white mt-0.5">{adminProperties.length}</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500">Active Properties</p>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">
              {adminProperties.filter((p) => p.active).length}
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500">Total mUSDT Volume</p>
            <p className="text-2xl font-bold text-white mt-0.5">
              {totalMUSDTVolume.toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <p className="text-xs text-slate-500">Active Listings</p>
            <p className="text-2xl font-bold text-blue-400 mt-0.5">{activeListings}</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 bg-slate-800 border border-slate-700 p-1 rounded-xl w-fit">
          {(
            [
              { key: 'properties', label: '🏢 Properties' },
              { key: 'dividends', label: '💸 Deposit Dividend' },
              { key: 'withdraw', label: '🏦 Withdraw Funds' },
              { key: 'transactions', label: '📋 Transactions' },
              { key: 'create', label: '➕ Create Property' },
            ] as { key: typeof activeSection; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveSection(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeSection === key
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ---- PROPERTIES SECTION ---- */}
        {activeSection === 'properties' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-white">Property Management</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900/40">
                    <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Property</th>
                    <th className="px-5 py-3 text-xs text-slate-500 font-medium text-left">Location</th>
                    <th className="px-5 py-3 text-xs text-slate-500 font-medium text-right">
                      Total Tokens
                    </th>
                    <th className="px-5 py-3 text-xs text-slate-500 font-medium text-right">
                      Tokens Sold
                    </th>
                    <th className="px-5 py-3 text-xs text-slate-500 font-medium text-right">
                      Sold %
                    </th>
                    <th className="px-5 py-3 text-xs text-slate-500 font-medium text-right">
                      Token Price
                    </th>
                    <th className="px-5 py-3 text-xs text-slate-500 font-medium text-right">
                      Yield
                    </th>
                    <th className="px-5 py-3 text-xs text-slate-500 font-medium text-center">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs text-slate-500 font-medium text-center">
                      Toggle
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {adminProperties.map((p) => {
                    const soldPct = Math.round((p.tokensSold / p.totalTokens) * 100);
                    return (
                      <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                            />
                            <div>
                              <p className="text-white font-medium text-xs leading-snug">{p.name}</p>
                              <p className="text-slate-500 text-xs font-mono">{p.tokenId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-400 text-xs">{p.location}</td>
                        <td className="px-5 py-4 text-right text-white">
                          {p.totalTokens.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right text-white">
                          {p.tokensSold.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${soldPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-400">{soldPct}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right text-white text-xs">
                          {p.tokenPriceMusdt.toFixed(2)} mUSDT
                        </td>
                        <td className="px-5 py-4 text-right text-emerald-400 text-xs">
                          {p.annualYield}%
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span
                            className={`text-xs px-2 py-1 rounded-full border ${
                              p.active
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {p.active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => toggleActive(p.id)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                              p.active
                                ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'
                            }`}
                          >
                            {p.active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ---- DEPOSIT DIVIDEND SECTION ---- */}
        {activeSection === 'dividends' && (
          <div className="max-w-xl">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-1">Deposit Dividend</h2>
              <p className="text-slate-500 text-sm mb-6">
                Distribute rental income or profit share to all token holders of a property.
                Calls <code className="text-slate-400">depositDividend</code> on the DividendVault contract.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Select Property</label>
                  <select
                    value={dividendForm.propertyId}
                    onChange={(e) =>
                      setDividendForm((prev) => ({ ...prev, propertyId: e.target.value }))
                    }
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 appearance-none"
                  >
                    {mockProperties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {p.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">
                    Amount (mUSDT)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={dividendForm.amount}
                    onChange={(e) =>
                      setDividendForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
                    placeholder="e.g. 5000.00"
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                  />
                </div>

                {dividendForm.amount && parseFloat(dividendForm.amount) > 0 && (
                  <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Property</span>
                      <span className="text-white">
                        {mockProperties.find((p) => p.id === dividendForm.propertyId)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total tokens issued</span>
                      <span className="text-white">
                        {(
                          mockProperties.find((p) => p.id === dividendForm.propertyId)
                            ?.totalTokens ?? 0
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-1.5 font-medium">
                      <span>Dividend per token</span>
                      <span className="text-emerald-400">
                        {(
                          parseFloat(dividendForm.amount) /
                          (mockProperties.find((p) => p.id === dividendForm.propertyId)
                            ?.totalTokens ?? 1)
                        ).toFixed(4)}{' '}
                        mUSDT
                      </span>
                    </div>
                  </div>
                )}

                {dividendMsg && (
                  <div
                    className={`text-sm px-3 py-3 rounded-lg ${
                      dividendMsg.startsWith('✓')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {dividendMsg}
                  </div>
                )}

                <button
                  onClick={handleDepositDividend}
                  disabled={isDepositing || isLoading || !isAdmin}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {isDepositing || isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin inline-block">⏳</span> Depositing...
                    </span>
                  ) : (
                    'Deposit Dividend'
                  )}
                </button>

                {!isAdmin && connected && (
                  <p className="text-xs text-amber-400 text-center">
                    Admin wallet required to deposit dividends.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- WITHDRAW FUNDS SECTION ---- */}
        {activeSection === 'withdraw' && (
          <div className="max-w-xl">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-1">Withdraw Primary Sales</h2>
              <p className="text-slate-500 text-sm mb-4">
                Transfer mUSDT collected from primary token sales out of the Marketplace contract.
              </p>

              {/* Balance display */}
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Available to Withdraw</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {(Number(primarySalesBalance) / 1e6).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} mUSDT
                  </p>
                </div>
                <span className="text-3xl">🏦</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Recipient Address</label>
                  <input
                    type="text"
                    value={withdrawForm.to}
                    onChange={(e) => setWithdrawForm((prev) => ({ ...prev, to: e.target.value }))}
                    placeholder="0x..."
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Amount (mUSDT)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={withdrawForm.amount}
                      onChange={(e) => setWithdrawForm((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="e.g. 10000.00"
                      className="flex-1 bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                    />
                    <button
                      onClick={() => setWithdrawForm((prev) => ({
                        ...prev,
                        amount: (Number(primarySalesBalance) / 1e6).toFixed(2),
                      }))}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors whitespace-nowrap"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {withdrawMsg && (
                  <div className={`text-sm px-3 py-3 rounded-lg ${
                    withdrawMsg.startsWith('✓')
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {withdrawMsg}
                  </div>
                )}

                <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || isLoading || !isAdmin || primarySalesBalance === 0n}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {isWithdrawing || isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin inline-block">⏳</span> Withdrawing...
                    </span>
                  ) : (
                    'Withdraw to Address'
                  )}
                </button>

                {!isAdmin && connected && (
                  <p className="text-xs text-amber-400 text-center">Admin wallet required.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- TRANSACTIONS SECTION ---- */}
        {activeSection === 'transactions' && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">All On-Chain Transactions</h2>
              <span className="text-xs text-slate-500">{allTransactions.length} events</span>
            </div>
            {allTransactions.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-500 text-sm">
                {connected ? 'No transactions found on-chain.' : 'Connect wallet to load transactions.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700 bg-slate-900/40">
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-left">Type</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-left">Property</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-left">Address</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">Tokens</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-right">mUSDT</th>
                      <th className="px-4 py-3 text-xs text-slate-500 font-medium text-center">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {allTransactions.map((tx: OnChainTx) => {
                      const propName = mockProperties.find(p => p.id === tx.propertyId)?.name ?? tx.propertyId;
                      const explorerLink = chainId ? txExplorerUrl(chainId, tx.txHash) : null;
                      const typeConfig: Record<OnChainTx['type'], { label: string; color: string }> = {
                        primary_buy:       { label: 'Primary Buy',    color: 'bg-blue-500/20 text-blue-400' },
                        secondary_buy:     { label: 'Secondary Buy',  color: 'bg-indigo-500/20 text-indigo-400' },
                        listing_created:   { label: 'Listed',         color: 'bg-slate-500/20 text-slate-400' },
                        listing_cancelled: { label: 'Cancelled',      color: 'bg-rose-500/20 text-rose-400' },
                        dividend_deposit:  { label: 'Div. Deposit',   color: 'bg-emerald-500/20 text-emerald-400' },
                        dividend_claim:    { label: 'Div. Claim',     color: 'bg-teal-500/20 text-teal-400' },
                      };
                      const { label, color } = typeConfig[tx.type];
                      return (
                        <tr key={`${tx.txHash}-${tx.type}`} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${color}`}>{label}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-300 text-xs">{propName || '—'}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs font-mono">
                            {tx.address ? `${tx.address.slice(0, 6)}...${tx.address.slice(-4)}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-white text-xs">
                            {tx.tokenAmount > 0n ? Number(tx.tokenAmount).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-400 text-xs">
                            {tx.musdtAmount > 0n
                              ? (Number(tx.musdtAmount) / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {explorerLink ? (
                              <a href={explorerLink} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 font-mono">
                                {tx.txHash.slice(0, 8)}…
                              </a>
                            ) : (
                              <span className="text-xs text-slate-600 font-mono">{tx.txHash.slice(0, 8)}…</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ---- CREATE PROPERTY SECTION ---- */}
        {activeSection === 'create' && (
          <div className="max-w-2xl">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-1">Create New Property</h2>
              <p className="text-slate-500 text-sm mb-2">
                List a new property on the COAST marketplace for tokenized investment.
              </p>
              {/* Note: Full on-chain creation requires calling configurePrimary on the contract.
                  This form saves the property locally for UI preview only (prototype behavior). */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-6">
                <p className="text-blue-300 text-xs font-medium">Blockchain Feature Note</p>
                <p className="text-blue-400/70 text-xs mt-0.5">
                  On-chain property creation is done via <code>configurePrimary</code> on the
                  PropertyToken contract. This form saves locally for prototype preview; real
                  deployment requires a separate contract call from the deployer wallet.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Property Name</label>
                    <input
                      type="text"
                      value={newProperty.name}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="e.g. Sukhumvit Garden Tower"
                      className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Location</label>
                    <input
                      type="text"
                      value={newProperty.location}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="e.g. Sukhumvit, Bangkok"
                      className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      Property Value (THB)
                    </label>
                    <input
                      type="number"
                      value={newProperty.propertyValue}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, propertyValue: e.target.value }))
                      }
                      placeholder="e.g. 150000000"
                      className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Total Tokens</label>
                    <input
                      type="number"
                      value={newProperty.totalTokens}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, totalTokens: e.target.value }))
                      }
                      placeholder="e.g. 10000"
                      className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      Token Price (mUSDT)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newProperty.tokenPriceMusdt}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, tokenPriceMusdt: e.target.value }))
                      }
                      placeholder="e.g. 150.00"
                      className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">
                      Annual Yield (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newProperty.annualYield}
                      onChange={(e) =>
                        setNewProperty((prev) => ({ ...prev, annualYield: e.target.value }))
                      }
                      placeholder="e.g. 7.5"
                      className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Description</label>
                  <textarea
                    rows={4}
                    value={newProperty.description}
                    onChange={(e) =>
                      setNewProperty((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe the property, its features, and investment thesis..."
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600 resize-none"
                  />
                </div>

                {createMsg && (
                  <div
                    className={`text-sm px-3 py-3 rounded-lg ${
                      createMsg.startsWith('✓')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    {createMsg}
                  </div>
                )}

                <button
                  onClick={handleCreateProperty}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
                >
                  Save Property (Local Preview)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
