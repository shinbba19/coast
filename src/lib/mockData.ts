export interface Property {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  location: string;
  propertyValue: number; // THB
  totalTokens: number;
  remainingTokens: number;
  tokenPriceMusdt: number;
  tokenId: string;
  status: 'active' | 'sold_out' | 'coming_soon';
  annualYield: number; // percent
}

export interface Listing {
  id: string;
  seller: string;
  propertyId: string;
  tokenAmount: number;
  pricePerToken: number;
  status: 'active' | 'cancelled' | 'sold';
  createdAt: string;
}

export interface Transaction {
  id: string;
  walletAddress: string;
  propertyId: string;
  tokenAmount: number;
  totalPriceMusdt: number;
  txHash: string;
  type: 'buy' | 'sell' | 'dividend';
  createdAt: string;
}

export interface Holding {
  walletAddress: string;
  propertyId: string;
  tokenAmount: number;
}

export interface WalletState {
  address: string | null;
  mUSDTBalance: number;
  connected: boolean;
}

export const mockProperties: Property[] = [
  {
    id: 'prop-001',
    name: 'The Palm Wongamat',
    description:
      'A stunning 90 sqm 2-bedroom unit in The Palm — one of Wongamat Beach\'s most sought-after high-rise condominiums in Pattaya. Featuring floor-to-ceiling windows with panoramic sea views, fully-fitted European kitchen, and access to the building\'s infinity pool, gym, and private beach club. Strong short-term rental demand from international tourists and expats. Managed by a professional property management company with guaranteed occupancy support.',
    imageUrl: 'https://images.unsplash.com/photo-1748457115128-7981122d3ce4?w=800&h=500&fit=crop&q=80',
    location: 'Wongamat Beach, Pattaya',
    propertyValue: 20_000_000,
    totalTokens: 10_000,
    remainingTokens: 6_500,
    tokenPriceMusdt: 66.67,   // 20,000,000 THB ÷ 10,000 tokens ÷ 30 THB/mUSDT
    tokenId: 'COAST-PLM-001',
    status: 'active',
    annualYield: 7.5,
  },
  {
    id: 'prop-002',
    name: 'Andromeda Phrathamnak',
    description:
      'A modern 75 sqm 2-bedroom condominium in the prestigious Andromeda project, nestled on Phrathamnak Hill — Pattaya\'s most exclusive residential area. This elegantly designed unit offers tranquil garden views, high-end finishes, and proximity to the Royal Thai Navy Beach and Cozy Beach. The building provides 24-hour security, rooftop pool, and fitness center. Ideal for medium-to-long term rental to quality tenants.',
    imageUrl: 'https://images.unsplash.com/photo-1753724933350-c2e0e2990445?w=800&h=500&fit=crop&q=80',
    location: 'Phrathamnak Hill, Pattaya',
    propertyValue: 12_000_000,
    totalTokens: 7_500,
    remainingTokens: 0,
    tokenPriceMusdt: 53.33,   // 12,000,000 THB ÷ 7,500 tokens ÷ 30 THB/mUSDT
    tokenId: 'COAST-AND-002',
    status: 'sold_out',
    annualYield: 6.8,
  },
  {
    id: 'prop-003',
    name: 'Arom Wongamat',
    description:
      'A luxurious 70 sqm 2-bedroom unit in Arom Wongamat — a boutique low-rise condominium directly on Wongamat Beach with only 159 units ensuring exclusivity and privacy. This beachfront property features a private balcony with direct sea views, premium Italian marble interiors, and smart home automation. The development is renowned for its resort-style facilities including beachfront infinity pool and yoga deck, delivering premium rental yields.',
    imageUrl: 'https://images.unsplash.com/photo-1759372945658-1e9f56e751bd?w=800&h=500&fit=crop&q=80',
    location: 'Wongamat Beach, Pattaya',
    propertyValue: 30_000_000,
    totalTokens: 5_000,
    remainingTokens: 3_100,
    tokenPriceMusdt: 200.00,  // 30,000,000 THB ÷ 5,000 tokens ÷ 30 THB/mUSDT
    tokenId: 'COAST-ARM-003',
    status: 'active',
    annualYield: 8.2,
  },
  {
    id: 'prop-004',
    name: 'Grand Florida Pattaya',
    description:
      'A well-priced 50 sqm 1-bedroom unit in Grand Florida — a popular resort-style condominium on Pattaya\'s beachfront road. Fully furnished with modern appliances, pool view balcony, and convenient access to Walking Street and Central Festival Pattaya. The building offers extensive facilities including three swimming pools, waterfall garden, and on-site restaurant. Consistently high occupancy from budget-conscious expats and tourists makes this an attractive entry-level investment.',
    imageUrl: 'https://images.unsplash.com/photo-1680639883617-0771b2da1e4f?w=800&h=500&fit=crop&q=80',
    location: 'Pattaya Beach Road, Pattaya',
    propertyValue: 6_000_000,
    totalTokens: 15_000,
    remainingTokens: 9_800,
    tokenPriceMusdt: 13.33,   // 6,000,000 THB ÷ 15,000 tokens ÷ 30 THB/mUSDT
    tokenId: 'COAST-GRF-004',
    status: 'active',
    annualYield: 6.2,
  },
  {
    id: 'prop-005',
    name: 'Riviera Wongamat',
    description:
      'An upscale 85 sqm 2-bedroom residence in Riviera Wongamat — an award-winning development recognised for its iconic curved architecture and world-class facilities. Located steps from the pristine Wongamat Beach, the unit features a wrap-around balcony, designer kitchen, and master en-suite with soaking tub. Building amenities include a sky pool on the 40th floor, private cinema, and concierge service. One of Pattaya\'s most prestigious addresses with strong capital appreciation potential.',
    imageUrl: 'https://images.unsplash.com/photo-1674043581340-dd48595fed29?w=800&h=500&fit=crop&q=80',
    location: 'Wongamat Beach, Pattaya',
    propertyValue: 12_000_000,
    totalTokens: 12_000,
    remainingTokens: 7_400,
    tokenPriceMusdt: 33.33,   // 12,000,000 THB ÷ 12,000 tokens ÷ 30 THB/mUSDT
    tokenId: 'COAST-RIV-005',
    status: 'active',
    annualYield: 7.1,
  },
];

export const mockListings: Listing[] = [
  {
    id: 'lst-001',
    seller: '0xA1b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6A1b2',
    propertyId: 'prop-001',
    tokenAmount: 50,
    pricePerToken: 290.0,
    status: 'active',
    createdAt: '2026-04-15T08:30:00Z',
  },
  {
    id: 'lst-002',
    seller: '0xB2c3D4e5F6a7B2c3D4e5F6a7B2c3D4e5F6a7B2c3',
    propertyId: 'prop-001',
    tokenAmount: 120,
    pricePerToken: 285.5,
    status: 'active',
    createdAt: '2026-04-18T14:22:00Z',
  },
  {
    id: 'lst-003',
    seller: '0xC3d4E5f6A7b8C3d4E5f6A7b8C3d4E5f6A7b8C3d4',
    propertyId: 'prop-003',
    tokenAmount: 75,
    pricePerToken: 175.0,
    status: 'active',
    createdAt: '2026-04-20T09:10:00Z',
  },
  {
    id: 'lst-004',
    seller: '0xD4e5F6a7B8c9D4e5F6a7B8c9D4e5F6a7B8c9D4e5',
    propertyId: 'prop-003',
    tokenAmount: 200,
    pricePerToken: 172.0,
    status: 'active',
    createdAt: '2026-04-21T16:45:00Z',
  },
  {
    id: 'lst-005',
    seller: '0xE5f6A7b8C9d0E5f6A7b8C9d0E5f6A7b8C9d0E5f6',
    propertyId: 'prop-004',
    tokenAmount: 300,
    pricePerToken: 282.0,
    status: 'active',
    createdAt: '2026-04-22T11:00:00Z',
  },
  {
    id: 'lst-006',
    seller: '0xF6a7B8c9D0e1F6a7B8c9D0e1F6a7B8c9D0e1F6a7',
    propertyId: 'prop-005',
    tokenAmount: 60,
    pricePerToken: 295.0,
    status: 'active',
    createdAt: '2026-04-23T07:30:00Z',
  },
  {
    id: 'lst-007',
    seller: '0xA1b2C3d4E5f6A1b2C3d4E5f6A1b2C3d4E5f6A1b2',
    propertyId: 'prop-005',
    tokenAmount: 90,
    pricePerToken: 291.0,
    status: 'active',
    createdAt: '2026-04-25T13:15:00Z',
  },
  {
    id: 'lst-008',
    seller: '0xB2c3D4e5F6a7B2c3D4e5F6a7B2c3D4e5F6a7B2c3',
    propertyId: 'prop-002',
    tokenAmount: 150,
    pricePerToken: 270.0,
    status: 'sold',
    createdAt: '2026-04-10T09:00:00Z',
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    walletAddress: '0xMockWallet1234',
    propertyId: 'prop-001',
    tokenAmount: 100,
    totalPriceMusdt: 28000.0,
    txHash: '0x4a8f2e1b9c3d7e6f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
    type: 'buy',
    createdAt: '2026-03-10T10:00:00Z',
  },
  {
    id: 'tx-002',
    walletAddress: '0xMockWallet1234',
    propertyId: 'prop-003',
    tokenAmount: 50,
    totalPriceMusdt: 8500.0,
    txHash: '0x5b9g3f2c0d4e8f7a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4',
    type: 'buy',
    createdAt: '2026-03-15T14:30:00Z',
  },
  {
    id: 'tx-003',
    walletAddress: '0xMockWallet1234',
    propertyId: 'prop-001',
    tokenAmount: 100,
    totalPriceMusdt: 2016.0,
    txHash: '0x6c0h4g3d1e5f9g8b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5',
    type: 'dividend',
    createdAt: '2026-04-10T09:00:00Z',
  },
  {
    id: 'tx-004',
    walletAddress: '0xMockWallet1234',
    propertyId: 'prop-005',
    tokenAmount: 30,
    totalPriceMusdt: 8499.9,
    txHash: '0x7d1i5h4e2f6g0h9c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6',
    type: 'buy',
    createdAt: '2026-04-01T11:15:00Z',
  },
];

export const mockHoldings: Holding[] = [
  { walletAddress: '0xMockWallet1234', propertyId: 'prop-001', tokenAmount: 100 },
  { walletAddress: '0xMockWallet1234', propertyId: 'prop-003', tokenAmount: 50 },
  { walletAddress: '0xMockWallet1234', propertyId: 'prop-005', tokenAmount: 30 },
];

export const mockWalletState: WalletState = {
  address: null,
  mUSDTBalance: 0,
  connected: false,
};

// Claimable dividend per token per year (in mUSDT) = tokenPrice * annualYield / 100 / 12 (monthly)
export function calculateClaimableDividend(propertyId: string, tokenAmount: number): number {
  const property = mockProperties.find((p) => p.id === propertyId);
  if (!property) return 0;
  const annualDividendPerToken = (property.tokenPriceMusdt * property.annualYield) / 100;
  const monthlyDividend = annualDividendPerToken / 12;
  return parseFloat((monthlyDividend * tokenAmount).toFixed(2));
}
