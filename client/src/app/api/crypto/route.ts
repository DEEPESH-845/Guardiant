import { NextResponse } from 'next/server';

// Server-side only. This was previously read from NEXT_PUBLIC_COIN_BACK_API_KEY;
// anything with that prefix is inlined into the browser bundle by Next.js the
// moment it is referenced from client code, so a paid API key was one import
// away from being published. Falls back to the old name so an existing
// deployment keeps working until the variable is renamed.
const CMC_API_KEY =
  process.env.COINMARKETCAP_API_KEY ||
  process.env.NEXT_PUBLIC_COIN_BACK_API_KEY ||
  '';

// Illustrative placeholders, served only so the UI has a shape to render when
// the upstream is unavailable. Flagged as `fallback` so callers can label them
// rather than presenting invented numbers as live market data.
const FALLBACK_PRICES = [
  { id: 1, symbol: 'BTC', name: 'Bitcoin', quote: { USD: { price: 45000, percent_change_24h: 2.5 } } },
  { id: 2, symbol: 'ETH', name: 'Ethereum', quote: { USD: { price: 3000, percent_change_24h: 1.8 } } },
  { id: 3, symbol: 'LINK', name: 'Chainlink', quote: { USD: { price: 15, percent_change_24h: -0.5 } } },
  { id: 4, symbol: 'DOT', name: 'Polkadot', quote: { USD: { price: 20, percent_change_24h: 1.2 } } },
];

export async function GET() {
  if (!CMC_API_KEY) {
    return NextResponse.json({ data: FALLBACK_PRICES, fallback: true });
  }

  try {
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
      {
        headers: { 'X-CMC_PRO_API_KEY': CMC_API_KEY },
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!response.ok) {
      throw new Error(`CoinMarketCap responded ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ ...data, fallback: false });
  } catch (error) {
    console.error('CoinMarketCap fetch failed:', error);
    return NextResponse.json({ data: FALLBACK_PRICES, fallback: true });
  }
}
