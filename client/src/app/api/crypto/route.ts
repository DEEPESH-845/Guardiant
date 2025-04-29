import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': process.env.NEXT_PUBLIC_COIN_BACK_API_KEY || '',
        },
        next: { revalidate: 60 },
      },
    );

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        data: [
          {
            id: 1,
            symbol: 'BTC',
            name: 'Bitcoin',
            quote: { USD: { price: 45000, percent_change_24h: 2.5 } },
          },
          {
            id: 2,
            symbol: 'ETH',
            name: 'Ethereum',
            quote: { USD: { price: 3000, percent_change_24h: 1.8 } },
          },
          {
            id: 3,
            symbol: 'LINK',
            name: 'Chainlink',
            quote: { USD: { price: 15, percent_change_24h: -0.5 } },
          },
          {
            id: 4,
            symbol: 'DOT',
            name: 'Polkadot',
            quote: { USD: { price: 20, percent_change_24h: 1.2 } },
          },
        ],
      },
      { status: 200 },
    );
  }
}
