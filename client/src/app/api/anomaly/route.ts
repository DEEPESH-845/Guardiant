import { NextResponse } from 'next/server';

// Proxies to the FastAPI anomaly-detection service so the browser never needs
// the service URL and CORS/mixed-content never comes up.
const ANOMALY_API_URL = process.env.ANOMALY_API_URL;

export async function POST(request: Request) {
  if (!ANOMALY_API_URL) {
    return NextResponse.json(
      { error: 'ANOMALY_API_URL is not configured' },
      { status: 503 },
    );
  }

  try {
    const { transactions } = await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: 'transactions must be a non-empty array' },
        { status: 400 },
      );
    }

    const upstream = await fetch(
      `${ANOMALY_API_URL.replace(/\/$/, '')}/detect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
        // Free-tier hosts can be slow to wake; don't hang the request forever.
        signal: AbortSignal.timeout(20_000),
      },
    );

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.ok ? 200 : 502 });
  } catch (error) {
    console.error('Anomaly API error:', error);
    return NextResponse.json(
      {
        error: 'Anomaly service unavailable',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
