import { NextResponse } from 'next/server';
import getMongoClient from '../../../../lib/mongodb';

/**
 * Connectivity check for the Atlas cluster.
 *
 * This used to accept any JSON body and insert it verbatim into
 * `test_collection`, unauthenticated — an open write endpoint against a 512 MB
 * free-tier cluster, reachable by anyone who could guess the path. It now pings
 * the server instead, which verifies exactly what the runbook needs (credentials
 * work, network access allows Vercel) without storing anything.
 */
async function check() {
  try {
    const client = await getMongoClient();
    await client.db('memecoins').command({ ping: 1 });
    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
    });
  } catch (error) {
    console.error('MongoDB connection check failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to MongoDB' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return check();
}

export async function POST() {
  return check();
}
