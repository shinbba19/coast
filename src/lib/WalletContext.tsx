'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { BrowserProvider, JsonRpcSigner, Contract } from 'ethers';
import { CONTRACT_ADDRESSES, PROPERTY_TOKEN_IDS, ALL_TOKEN_IDS, SUPPORTED_CHAIN_IDS, CHAIN_NAMES, formatMusdt, parseMusdt, txExplorerUrl, isDeployed } from './contractAddresses';
import { MUSDT_ABI, PROPERTY_TOKEN_ABI, MARKETPLACE_ABI, DIVIDEND_VAULT_ABI } from './contractAbis';
import type { Transaction, Listing } from './mockData';

export interface OnChainTx {
  txHash: string;
  blockNumber: number;
  type: 'primary_buy' | 'secondary_buy' | 'listing_created' | 'listing_cancelled' | 'dividend_deposit' | 'dividend_claim';
  propertyId: string;
  address: string;
  tokenAmount: bigint;
  musdtAmount: bigint;
}

// Extend window type for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

interface WalletContextType {
  address: string | null;
  mUSDTBalance: bigint;
  mUSDTBalanceFormatted: string;
  connected: boolean;
  chainId: number | null;
  networkError: string | null;
  isLoading: boolean;
  txHash: string | null;
  txExplorerLink: string | null;
  holdings: Record<string, bigint>;       // propertyId -> token amount (bigint)
  claimableAmounts: Record<string, bigint>; // propertyId -> claimable mUSDT atoms
  transactions: Transaction[];
  listings: Listing[];
  connect: () => Promise<void>;
  disconnect: () => void;
  buyTokens: (propertyId: string, amount: number) => Promise<boolean>;
  sellTokens: (propertyId: string, amount: number, pricePerToken: number) => Promise<boolean>;
  claimDividend: (propertyId: string) => Promise<boolean>;
  buyListing: (listingId: string) => Promise<boolean>;
  cancelListing: (listingId: string) => Promise<boolean>;
  mintTestTokens: () => Promise<boolean>;
  depositDividend: (propertyId: string, amountMusdt: number) => Promise<boolean>;
  withdrawPrimarySales: (to: string, amount: number) => Promise<boolean>;
  createPropertyOnChain: (tokenId: number, priceMusdt: number, supply: number) => Promise<boolean>;
  primarySalesBalance: bigint;
  allTransactions: OnChainTx[];
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Map listingId (string from mock) to on-chain listingId (bigint)
// On-chain listings start at 0 and auto-increment
function onChainListingId(listingId: string): bigint {
  // Format: "lst-<number>" from new listings or just numeric string
  const n = listingId.replace(/^lst-/, '');
  return BigInt(n);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [mUSDTBalance, setMUSDTBalance] = useState<bigint>(0n);
  const [connected, setConnected] = useState(false);
  const [holdings, setHoldings] = useState<Record<string, bigint>>({});
  const [claimableAmounts, setClaimableAmounts] = useState<Record<string, bigint>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [primarySalesBalance, setPrimarySalesBalance] = useState<bigint>(0n);
  const [allTransactions, setAllTransactions] = useState<OnChainTx[]>([]);

  const loadBalances = useCallback(async (
    addr: string,
    prov: BrowserProvider,
    cId: number
  ) => {
    if (!isDeployed()) return;
    try {
      const musdt = new Contract(CONTRACT_ADDRESSES.musdt, MUSDT_ABI, prov);
      const propertyToken = new Contract(CONTRACT_ADDRESSES.propertyToken, PROPERTY_TOKEN_ABI, prov);
      const dividendVault = new Contract(CONTRACT_ADDRESSES.dividendVault, DIVIDEND_VAULT_ABI, prov);

      // mUSDT balance
      const bal: bigint = await musdt.balanceOf(addr) as bigint;
      setMUSDTBalance(bal);

      // Primary sales balance (withdrawable by admin)
      const marketplace = new Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, prov);
      const salesBal: bigint = await marketplace.primarySalesBalance() as bigint;
      setPrimarySalesBalance(salesBal);

      // Token holdings for all 5 properties
      const newHoldings: Record<string, bigint> = {};
      const newClaimable: Record<string, bigint> = {};
      for (const [propId, tokenId] of Object.entries(PROPERTY_TOKEN_IDS)) {
        const tokenBal: bigint = await propertyToken.balanceOf(addr, tokenId) as bigint;
        newHoldings[propId] = tokenBal;
        const claimable: bigint = await dividendVault.claimable(tokenId, addr) as bigint;
        newClaimable[propId] = claimable;
      }
      setHoldings(newHoldings);
      setClaimableAmounts(newClaimable);

      // Load secondary listings and all transactions from events
      await loadListings(prov);
      await loadAllTransactions(prov);
    } catch (err) {
      console.error('loadBalances error:', err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadListings = useCallback(async (prov: BrowserProvider) => {
    if (!isDeployed()) return;
    try {
      const marketplace = new Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, prov);
      const nextId: bigint = await marketplace.nextListingId() as bigint;

      const active: Listing[] = [];
      for (let i = 0n; i < nextId; i++) {
        const sl = await marketplace.secondaryListings(i) as {
          seller: string;
          tokenId: bigint;
          amount: bigint;
          pricePerToken: bigint;
          active: boolean;
        };
        if (!sl.active) continue;

        // Reverse lookup: tokenId -> propertyId
        const propId = Object.entries(PROPERTY_TOKEN_IDS).find(
          ([, tid]) => tid === sl.tokenId
        )?.[0] ?? `prop-00${sl.tokenId}`;

        active.push({
          id: String(i),
          seller: sl.seller,
          propertyId: propId,
          tokenAmount: Number(sl.amount),
          pricePerToken: Number(sl.pricePerToken) / 1e6,
          status: 'active',
          createdAt: new Date().toISOString(),
        });
      }
      setListings(active);
    } catch (err) {
      console.error('loadListings error:', err);
    }
  }, []);

  const loadAllTransactions = useCallback(async (prov: BrowserProvider) => {
    if (!isDeployed()) return;
    try {
      const marketplace = new Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, prov);
      const dividendVault = new Contract(CONTRACT_ADDRESSES.dividendVault, DIVIDEND_VAULT_ABI, prov);

      const tokenIdToPropId = (tokenId: bigint) =>
        Object.entries(PROPERTY_TOKEN_IDS).find(([, tid]) => tid === tokenId)?.[0] ?? `prop-00${tokenId}`;

      const [buyEvents, filledEvents, createdEvents, cancelledEvents, depositEvents, claimEvents] =
        await Promise.all([
          marketplace.queryFilter(marketplace.filters.TokensPurchased()),
          marketplace.queryFilter(marketplace.filters.ListingFilled()),
          marketplace.queryFilter(marketplace.filters.ListingCreated()),
          marketplace.queryFilter(marketplace.filters.ListingCancelled()),
          dividendVault.queryFilter(dividendVault.filters.DividendDeposited()),
          dividendVault.queryFilter(dividendVault.filters.DividendClaimed()),
        ]);

      const txs: OnChainTx[] = [];

      for (const e of buyEvents) {
        const args = (e as unknown as { args: [string, bigint, bigint, bigint] }).args;
        txs.push({ txHash: e.transactionHash, blockNumber: e.blockNumber, type: 'primary_buy', propertyId: tokenIdToPropId(args[1]), address: args[0], tokenAmount: args[2], musdtAmount: args[3] });
      }
      for (const e of filledEvents) {
        const args = (e as unknown as { args: [bigint, string, bigint] }).args;
        txs.push({ txHash: e.transactionHash, blockNumber: e.blockNumber, type: 'secondary_buy', propertyId: '', address: args[1], tokenAmount: 0n, musdtAmount: args[2] });
      }
      for (const e of createdEvents) {
        const args = (e as unknown as { args: [bigint, string, bigint, bigint, bigint] }).args;
        txs.push({ txHash: e.transactionHash, blockNumber: e.blockNumber, type: 'listing_created', propertyId: tokenIdToPropId(args[2]), address: args[1], tokenAmount: args[3], musdtAmount: args[4] });
      }
      for (const e of cancelledEvents) {
        txs.push({ txHash: e.transactionHash, blockNumber: e.blockNumber, type: 'listing_cancelled', propertyId: '', address: '', tokenAmount: 0n, musdtAmount: 0n });
      }
      for (const e of depositEvents) {
        const args = (e as unknown as { args: [bigint, bigint, bigint] }).args;
        txs.push({ txHash: e.transactionHash, blockNumber: e.blockNumber, type: 'dividend_deposit', propertyId: tokenIdToPropId(args[0]), address: CONTRACT_ADDRESSES.deployer, tokenAmount: 0n, musdtAmount: args[1] });
      }
      for (const e of claimEvents) {
        const args = (e as unknown as { args: [bigint, string, bigint] }).args;
        txs.push({ txHash: e.transactionHash, blockNumber: e.blockNumber, type: 'dividend_claim', propertyId: tokenIdToPropId(args[0]), address: args[1], tokenAmount: 0n, musdtAmount: args[2] });
      }

      txs.sort((a, b) => b.blockNumber - a.blockNumber);
      setAllTransactions(txs);
    } catch (err) {
      console.error('loadAllTransactions error:', err);
    }
  }, []);

  const validateNetwork = useCallback((cId: number): boolean => {
    if (!(SUPPORTED_CHAIN_IDS as readonly number[]).includes(cId)) {
      setNetworkError(
        `Wrong network (${cId}). Please switch to ${Object.values(CHAIN_NAMES).join(' or ')}.`
      );
      return false;
    }
    setNetworkError(null);
    return true;
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setNetworkError('MetaMask not detected. Please install MetaMask.');
      return;
    }
    setIsLoading(true);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const prov = new BrowserProvider(window.ethereum as unknown as import('ethers').Eip1193Provider);
      const sgn = await prov.getSigner();
      const addr = await sgn.getAddress();
      const network = await prov.getNetwork();
      const cId = Number(network.chainId);

      setProvider(prov);
      setSigner(sgn);
      setAddress(addr);
      setChainId(cId);
      setConnected(true);

      validateNetwork(cId);
      await loadBalances(addr, prov, cId);
    } catch (err) {
      console.error('connect error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadBalances, validateNetwork]);

  const disconnect = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setConnected(false);
    setMUSDTBalance(0n);
    setHoldings({});
    setClaimableAmounts({});
    setNetworkError(null);
    setTxHash(null);
    setTransactions([]);
    setListings([]);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!address || !provider || !chainId) return;
    await loadBalances(address, provider, chainId);
  }, [address, provider, chainId, loadBalances]);

  // MetaMask account/chain change listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = (accounts: unknown) => {
      const accs = accounts as string[];
      if (accs.length === 0) {
        disconnect();
      } else {
        setAddress(accs[0]);
        if (provider && chainId) loadBalances(accs[0], provider, chainId);
      }
    };

    const onChainChanged = (chainIdHex: unknown) => {
      const cId = parseInt(chainIdHex as string, 16);
      setChainId(cId);
      validateNetwork(cId);
      // Re-init provider on chain change
      if (window.ethereum) {
        const prov = new BrowserProvider(window.ethereum as unknown as import('ethers').Eip1193Provider);
        setProvider(prov);
        if (address) loadBalances(address, prov, cId);
      }
    };

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', onAccountsChanged);
      window.ethereum?.removeListener('chainChanged', onChainChanged);
    };
  }, [provider, address, chainId, disconnect, loadBalances, validateNetwork]);

  // ── Transaction helper ──────────────────────────────────────────────────

  async function withTx<T>(fn: (signer: JsonRpcSigner) => Promise<T>): Promise<T | false> {
    if (!signer || !address || !provider) return false;
    if (!isDeployed()) {
      setNetworkError('Contracts not deployed. Run: cd contracts && npm run deploy:local');
      return false;
    }
    setIsLoading(true);
    setTxHash(null);
    try {
      const result = await fn(signer);
      await refreshBalances();
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('user rejected') && !msg.includes('ACTION_REJECTED')) {
        console.error('Transaction error:', msg);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  function appendTx(tx: Transaction) {
    setTransactions((prev) => [tx, ...prev]);
  }

  // ── Buy tokens (primary market) ─────────────────────────────────────────

  const buyTokens = useCallback(async (propertyId: string, amount: number): Promise<boolean> => {
    const result = await withTx(async (sgn) => {
      const tokenId = PROPERTY_TOKEN_IDS[propertyId];
      if (!tokenId) throw new Error('Unknown property');

      const musdt = new Contract(CONTRACT_ADDRESSES.musdt, MUSDT_ABI, sgn);
      const marketplace = new Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, sgn);

      // Read price from contract
      const listing = await marketplace.primaryListings(tokenId) as { pricePerToken: bigint };
      const totalCost = listing.pricePerToken * BigInt(amount);

      // Step 1: Approve
      const approveTx = await musdt.approve(CONTRACT_ADDRESSES.marketplace, totalCost);
      await (approveTx as { wait: () => Promise<unknown> }).wait();

      // Step 2: Buy
      const buyTx = await marketplace.buy(tokenId, BigInt(amount));
      const receipt = await (buyTx as { wait: () => Promise<{ hash: string }> }).wait();
      setTxHash(receipt.hash);

      appendTx({
        id: `tx-${Date.now()}`,
        walletAddress: address!,
        propertyId,
        tokenAmount: amount,
        totalPriceMusdt: Number(totalCost) / 1e6,
        txHash: receipt.hash,
        type: 'buy',
        createdAt: new Date().toISOString(),
      });

      return true;
    });
    return result !== false;
  }, [address, provider, signer]);

  // ── Sell tokens (list on secondary) ────────────────────────────────────

  const sellTokens = useCallback(async (
    propertyId: string,
    amount: number,
    pricePerToken: number
  ): Promise<boolean> => {
    const result = await withTx(async (sgn) => {
      const tokenId = PROPERTY_TOKEN_IDS[propertyId];
      if (!tokenId) throw new Error('Unknown property');

      const propertyToken = new Contract(CONTRACT_ADDRESSES.propertyToken, PROPERTY_TOKEN_ABI, sgn);
      const marketplace = new Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, sgn);

      // Approve if not already
      const approved: boolean = await propertyToken.isApprovedForAll(
        address, CONTRACT_ADDRESSES.marketplace
      ) as boolean;
      if (!approved) {
        const approveTx = await propertyToken.setApprovalForAll(CONTRACT_ADDRESSES.marketplace, true);
        await (approveTx as { wait: () => Promise<unknown> }).wait();
      }

      // List
      const priceAtoms = parseMusdt(pricePerToken);
      const listTx = await marketplace.list(tokenId, BigInt(amount), priceAtoms);
      const receipt = await (listTx as { wait: () => Promise<{ hash: string }> }).wait();
      setTxHash(receipt.hash);

      appendTx({
        id: `tx-${Date.now()}`,
        walletAddress: address!,
        propertyId,
        tokenAmount: amount,
        totalPriceMusdt: amount * pricePerToken,
        txHash: receipt.hash,
        type: 'sell',
        createdAt: new Date().toISOString(),
      });

      // Reload listings after listing
      await loadListings(provider!);
      return true;
    });
    return result !== false;
  }, [address, provider, signer, loadListings]);

  // ── Claim dividend ───────────────────────────────────────────────────────

  const claimDividend = useCallback(async (propertyId: string): Promise<boolean> => {
    const result = await withTx(async (sgn) => {
      const tokenId = PROPERTY_TOKEN_IDS[propertyId];
      if (!tokenId) throw new Error('Unknown property');

      const dividendVault = new Contract(CONTRACT_ADDRESSES.dividendVault, DIVIDEND_VAULT_ABI, sgn);
      const claimable: bigint = await dividendVault.claimable(tokenId, address) as bigint;

      const claimTx = await dividendVault.claim(tokenId);
      const receipt = await (claimTx as { wait: () => Promise<{ hash: string }> }).wait();
      setTxHash(receipt.hash);

      appendTx({
        id: `tx-${Date.now()}`,
        walletAddress: address!,
        propertyId,
        tokenAmount: Number(holdings[propertyId] ?? 0n),
        totalPriceMusdt: Number(claimable) / 1e6,
        txHash: receipt.hash,
        type: 'dividend',
        createdAt: new Date().toISOString(),
      });

      return true;
    });
    return result !== false;
  }, [address, provider, signer, holdings]);

  // ── Buy listing (secondary) ──────────────────────────────────────────────

  const buyListing = useCallback(async (listingId: string): Promise<boolean> => {
    const result = await withTx(async (sgn) => {
      const listing = listings.find((l) => l.id === listingId && l.status === 'active');
      if (!listing) throw new Error('Listing not found');

      const musdt = new Contract(CONTRACT_ADDRESSES.musdt, MUSDT_ABI, sgn);
      const marketplace = new Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, sgn);

      const onChainId = BigInt(listingId);
      const sl = await marketplace.secondaryListings(onChainId) as {
        pricePerToken: bigint;
        amount: bigint;
      };
      const totalCost = sl.pricePerToken * sl.amount;

      // Approve mUSDT
      const approveTx = await musdt.approve(CONTRACT_ADDRESSES.marketplace, totalCost);
      await (approveTx as { wait: () => Promise<unknown> }).wait();

      // Buy
      const buyTx = await marketplace.buyFromListing(onChainId);
      const receipt = await (buyTx as { wait: () => Promise<{ hash: string }> }).wait();
      setTxHash(receipt.hash);

      appendTx({
        id: `tx-${Date.now()}`,
        walletAddress: address!,
        propertyId: listing.propertyId,
        tokenAmount: listing.tokenAmount,
        totalPriceMusdt: Number(totalCost) / 1e6,
        txHash: receipt.hash,
        type: 'buy',
        createdAt: new Date().toISOString(),
      });

      await loadListings(provider!);
      return true;
    });
    return result !== false;
  }, [address, provider, signer, listings, loadListings]);

  // ── Cancel listing ───────────────────────────────────────────────────────

  const cancelListing = useCallback(async (listingId: string): Promise<boolean> => {
    const result = await withTx(async (sgn) => {
      const marketplace = new Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, sgn);
      const cancelTx = await marketplace.cancelListing(BigInt(listingId));
      await (cancelTx as { wait: () => Promise<unknown> }).wait();
      await loadListings(provider!);
      return true;
    });
    return result !== false;
  }, [provider, signer, loadListings]);

  // ── Mint test tokens (local dev only) ────────────────────────────────────

  const mintTestTokens = useCallback(async (): Promise<boolean> => {
    const result = await withTx(async (sgn) => {
      const musdt = new Contract(CONTRACT_ADDRESSES.musdt, MUSDT_ABI, sgn);
      const amount = 50_000n * 10n ** 6n;
      const tx = await musdt.faucet(amount);
      await (tx as { wait: () => Promise<unknown> }).wait();
      return true;
    });
    return result !== false;
  }, [provider, signer]);

  // ── Deposit dividend (admin) ──────────────────────────────────────────────

  const depositDividend = useCallback(async (
    propertyId: string,
    amountMusdt: number
  ): Promise<boolean> => {
    const result = await withTx(async (sgn) => {
      const tokenId = PROPERTY_TOKEN_IDS[propertyId];
      if (!tokenId) throw new Error('Unknown property');

      const musdt = new Contract(CONTRACT_ADDRESSES.musdt, MUSDT_ABI, sgn);
      const dividendVault = new Contract(CONTRACT_ADDRESSES.dividendVault, DIVIDEND_VAULT_ABI, sgn);

      const atoms = parseMusdt(amountMusdt);

      const approveTx = await musdt.approve(CONTRACT_ADDRESSES.dividendVault, atoms);
      await (approveTx as { wait: () => Promise<unknown> }).wait();

      const depositTx = await dividendVault.deposit(tokenId, atoms);
      const receipt = await (depositTx as { wait: () => Promise<{ hash: string }> }).wait();
      setTxHash(receipt.hash);

      return true;
    });
    return result !== false;
  }, [provider, signer]);

  // ── Withdraw primary sales (admin) ───────────────────────────────────────

  const withdrawPrimarySales = useCallback(async (
    to: string,
    amount: number
  ): Promise<boolean> => {
    const result = await withTx(async (sgn) => {
      const marketplace = new Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, sgn);
      const atoms = parseMusdt(amount);
      const tx = await marketplace.withdrawPrimarySales(to, atoms);
      const receipt = await (tx as { wait: () => Promise<{ hash: string }> }).wait();
      setTxHash(receipt.hash);
      return true;
    });
    return result !== false;
  }, [provider, signer]);

  // ── Create property on-chain (admin) ─────────────────────────────────────

  const createPropertyOnChain = useCallback(async (
    tokenId: number,
    priceMusdt: number,
    supply: number
  ): Promise<boolean> => {
    const result = await withTx(async (sgn) => {
      const propertyToken = new Contract(CONTRACT_ADDRESSES.propertyToken, PROPERTY_TOKEN_ABI, sgn);
      const marketplace = new Contract(CONTRACT_ADDRESSES.marketplace, MARKETPLACE_ABI, sgn);
      const priceAtoms = parseMusdt(priceMusdt);
      const supplyBig = BigInt(supply);
      const tokenIdBig = BigInt(tokenId);

      const registerTx = await propertyToken.registerProperty(tokenIdBig, priceAtoms, supplyBig);
      await (registerTx as { wait: () => Promise<unknown> }).wait();

      const configureTx = await marketplace.configurePrimary(tokenIdBig, priceAtoms, supplyBig);
      const receipt = await (configureTx as { wait: () => Promise<{ hash: string }> }).wait();
      setTxHash(receipt.hash);
      return true;
    });
    return result !== false;
  }, [provider, signer]);

  const mUSDTBalanceFormatted = formatMusdt(mUSDTBalance);
  const txExplorerLink = txHash && chainId ? txExplorerUrl(chainId, txHash) : null;

  return (
    <WalletContext.Provider
      value={{
        address,
        mUSDTBalance,
        mUSDTBalanceFormatted,
        connected,
        chainId,
        networkError,
        isLoading,
        txHash,
        txExplorerLink,
        holdings,
        claimableAmounts,
        transactions,
        listings,
        connect,
        disconnect,
        buyTokens,
        sellTokens,
        claimDividend,
        buyListing,
        cancelListing,
        mintTestTokens,
        depositDividend,
        withdrawPrimarySales,
        createPropertyOnChain,
        primarySalesBalance,
        allTransactions,
        refreshBalances,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextType {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
}
