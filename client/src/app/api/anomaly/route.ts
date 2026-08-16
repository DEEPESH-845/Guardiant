import { NextResponse } from 'next/server';
import { z } from 'zod';

// Proxies to the FastAPI anomaly-detection service so the browser never needs
// the service URL and CORS/mixed-content never comes up.
const ANOMALY_API_URL = process.env.ANOMALY_API_URL;

// Bounded and shape-checked before anything is forwarded upstream: the endpoint
// is unauthenticated, and the service behind it is a free-tier CPU Space.
const numericString = z.string().regex(/^\d+$/).max(78);

const requestSchema = z.object({
  transactions: z
    .array(
      z.object({
        hash: z.string().max(66),
        timeStamp: numericString,
        value: numericString,
        gas: numericString,
        gasPrice: numericString,
      }),
    )
    .min(1)
    .max(500),
});

export async function POST(request: Request) {
  if (!ANOMALY_API_URL) {
    return NextResponse.json(
      { error: 'ANOMALY_API_URL is not configured' },
      { status: 503 },
    );
  }

  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'transactions must be an array of 1-500 valid transactions' },
        { status: 400 },
      );
    }

    const upstream = await fetch(
      `${ANOMALY_API_URL.replace(/\/$/, '')}/detect`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: parsed.data.transactions }),
        // Free-tier hosts can be slow to wake; don't hang the request forever.
        signal: AbortSignal.timeout(20_000),
      },
    );

    if (!upstream.ok) {
      console.error('Anomaly service responded', upstream.status);
      return NextResponse.json(
        { error: 'Anomaly service error' },
        { status: 502 },
      );
    }

    return NextResponse.json(await upstream.json());
  } catch (error) {
    console.error('Anomaly API error:', error);
    return NextResponse.json(
      { error: 'Anomaly service unavailable' },
      { status: 502 },
    );
  }
}
