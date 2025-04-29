import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export async function POST(request: Request) {
  try {
    console.log('Testing MongoDB connection...');
    const body = await request.json();

    // Test MongoDB connection
    const client = await clientPromise;
    console.log('MongoDB client connected successfully');

    const db = client.db('memecoins');
    console.log('Database selected: memecoins');

    // Insert a test document
    const testData = {
      test: true,
      message: 'Test connection',
      timestamp: new Date(),
      data: body,
    };

    const result = await db.collection('test_collection').insertOne(testData);
    console.log('Test document inserted:', result);

    // Try to retrieve the document to verify
    const verifyResult = await db
      .collection('test_collection')
      .findOne({ _id: result.insertedId });
    console.log('Test document retrieved:', verifyResult);

    return NextResponse.json({
      success: true,
      message: 'MongoDB connection successful',
      insertResult: result,
      verifyResult,
    });
  } catch (error) {
    console.error('MongoDB test connection error:', error);
    return NextResponse.json(
      {
        error: 'Failed to connect to MongoDB',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
