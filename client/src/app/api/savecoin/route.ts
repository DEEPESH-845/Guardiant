import { NextResponse } from 'next/server';
import { z } from 'zod';
import getMongoClient from '../../../lib/mongodb';

// Every value that reaches a Mongo query filter must be a validated primitive.
// Previously `tokenAddress` went straight from the JSON body into
// `findOne({ tokenAddress })` and `updateOne({ tokenAddress }, ...)`, so a body
// of {"tokenAddress":{"$ne":null}} matched the first document in the collection
// and overwrote an arbitrary token's name, symbol, supply and image URL.
const saveCoinSchema = z.object({
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'tokenAddress must be a 20-byte hex address'),
  tokenName: z.string().max(128).optional(),
  tokenSymbol: z.string().max(32).optional(),
  initialSupply: z.union([z.string().max(78), z.number()]).optional(),
  // Base64 image payload. Bounded so a single request cannot push an arbitrary
  // amount of data at ImgBB or into the free-tier cluster.
  imageBuffer: z.string().max(8 * 1024 * 1024).optional(),
});

export async function GET() {
  try {
    const client = await getMongoClient();
    const db = client.db('memecoins');
    const data = await db.collection('coins').find({}).limit(500).toArray();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = saveCoinSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { imageBuffer, tokenAddress, tokenName, tokenSymbol, initialSupply } =
      parsed.data;

    let imageUrl = '';

    if (imageBuffer && imageBuffer.length > 0) {
      try {
        const imgbbKey = process.env.IMGBB_API_KEY;
        if (!imgbbKey) {
          console.warn('IMGBB_API_KEY is not configured; skipping image upload.');
        } else {
          const formData = new URLSearchParams();
          formData.append('image', imageBuffer);

          const imgbbResponse = await fetch(
            `https://api.imgbb.com/1/upload?key=${imgbbKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: formData.toString(),
              signal: AbortSignal.timeout(20_000),
            },
          );

          const imgbbData = await imgbbResponse.json();
          if (typeof imgbbData?.data?.url === 'string') {
            imageUrl = imgbbData.data.url;
          } else {
            console.warn('ImgBB upload did not return a URL');
          }
        }
      } catch (imgError) {
        console.error('Error uploading image:', imgError);
        // Continue even if image upload fails.
      }
    }

    const client = await getMongoClient();
    const db = client.db('memecoins');
    const coins = db.collection('coins');

    const existingToken = await coins.findOne({ tokenAddress });

    if (existingToken) {
      const updateData: Record<string, unknown> = {
        name: tokenName || existingToken.name,
        symbol: tokenSymbol || existingToken.symbol,
        initialSupply: initialSupply ?? existingToken.initialSupply,
        updatedAt: new Date(),
      };
      if (imageUrl) updateData.imageUrl = imageUrl;

      await coins.updateOne({ tokenAddress }, { $set: updateData });

      return NextResponse.json({
        success: true,
        updated: true,
        message: 'Token updated successfully',
      });
    }

    const newToken = {
      tokenAddress,
      imageUrl,
      name: tokenName,
      symbol: tokenSymbol,
      initialSupply,
      createdAt: new Date(),
    };

    const result = await coins.insertOne(newToken);

    return NextResponse.json({
      success: true,
      created: true,
      message: 'Token created successfully',
      token: { ...newToken, _id: result.insertedId },
    });
  } catch (error) {
    // Logged server-side only. The response previously carried error.message and
    // a full stack trace, which leaks server paths and database topology.
    console.error('Error saving token:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
