'use client';

import Link from 'next/link';
import type { Property } from '@/lib/mockData';

interface PropertyCardProps {
  property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const soldPct = Math.round(
    ((property.totalTokens - property.remainingTokens) / property.totalTokens) * 100
  );

  const statusBadge = {
    active: { label: 'Active', classes: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    sold_out: { label: 'Sold Out', classes: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
    coming_soon: { label: 'Coming Soon', classes: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  }[property.status];

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10 flex flex-col">
      {/* Image */}
      <div className="relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={property.imageUrl}
          alt={property.name}
          className="w-full h-48 object-cover"
        />
        <span
          className={`absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadge.classes}`}
        >
          {statusBadge.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <div className="mb-3">
          <h3 className="font-semibold text-white text-base leading-snug mb-1">{property.name}</h3>
          <p className="text-slate-400 text-xs flex items-center gap-1">
            <span>📍</span> {property.location}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-900 rounded-lg p-2.5">
            <p className="text-xs text-slate-500 mb-0.5">Price / Token</p>
            <p className="text-sm font-semibold text-white">
              {property.tokenPriceMusdt.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              <span className="text-xs text-slate-400">mUSDT</span>
            </p>
          </div>
          <div className="bg-slate-900 rounded-lg p-2.5">
            <p className="text-xs text-slate-500 mb-0.5">Annual Yield</p>
            <p className="text-sm font-semibold text-emerald-400">{property.annualYield}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>Tokens Sold</span>
            <span>
              {(property.totalTokens - property.remainingTokens).toLocaleString()} /{' '}
              {property.totalTokens.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                soldPct >= 100 ? 'bg-rose-500' : soldPct >= 80 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${soldPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">{soldPct}% funded</p>
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <Link
            href={`/property/${property.id}`}
            className={`block w-full text-center py-2.5 rounded-lg text-sm font-medium transition-colors ${
              property.status === 'sold_out'
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {property.status === 'sold_out' ? 'View Listings' : 'View Property'}
          </Link>
        </div>
      </div>
    </div>
  );
}
