import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET() {
  try {
    console.log('Fetching all tokens from database...');
    const client = await clientPromise;
    const db = client.db('memecoins');
    const data = await db.collection('coins').find({}).toArray();
    console.log(`Found ${data.length} tokens in database`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  console.log('Token save request received');

  try {
    const body = await request.json();
    console.log('Request body parsed successfully');

    const { imageBuffer, tokenAddress, tokenName, tokenSymbol, initialSupply } =
      body;

    if (!tokenAddress) {
      console.error('Missing token address in request');
      return NextResponse.json(
        { error: 'Missing tokenAddress' },
        { status: 400 },
      );
    }

    console.log('Saving token data:', {
      tokenAddress,
      tokenName,
      tokenSymbol,
      initialSupply,
      hasImage: !!imageBuffer && imageBuffer.length > 0,
    });

    let imageUrl = '';

    // Only process image if we have image data
    if (imageBuffer && imageBuffer.length > 0) {
      try {
        const imgbbKey = process.env.IMGBB_API_KEY;
        if (!imgbbKey) {
          console.warn('IMGBB_API_KEY environment variable is not configured.');
        } else {
          console.log('Uploading image to ImgBB...');
          const uploadUrl = `https://api.imgbb.com/1/upload?key=${imgbbKey}`;
          const formData = new URLSearchParams();
          formData.append('image', imageBuffer);

          const imgbbResponse = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          });

          const imgbbData = await imgbbResponse.json();
          if (imgbbData?.data?.url) {
            imageUrl = imgbbData.data.url;
            console.log('Image uploaded successfully:', imageUrl);
          } else {
            console.warn('Failed to upload image to imgbb:', imgbbData);
          }
        }
      } catch (imgError) {
        console.error('Error uploading image:', imgError);
        // Continue even if image upload fails
      }
    }

    console.log('Connecting to MongoDB...');
    const client = await clientPromise;
    console.log('MongoDB connection successful');

    const db = client.db('memecoins');
    console.log('Database selected: memecoins');

    // Check if this token already exists in the database
    console.log('Checking if token exists in database:', tokenAddress);
    const existingToken = await db
      .collection('coins')
      .findOne({ tokenAddress });
    console.log('Existing token check result:', !!existingToken);

    if (existingToken) {
      // Update the existing token
      console.log('Updating existing token in database');
      const updateData: any = {
        name: tokenName || existingToken.name,
        symbol: tokenSymbol || existingToken.symbol,
        initialSupply: initialSupply || existingToken.initialSupply,
        updatedAt: new Date(),
      };

      // Only update image if we have a new one
      if (imageUrl) {
        updateData.imageUrl = imageUrl;
      }

      const result = await db
        .collection('coins')
        .updateOne({ tokenAddress }, { $set: updateData });

      console.log('Token updated in database:', result);
      return NextResponse.json({
        success: true,
        data: result,
        updated: true,
        message: 'Token updated successfully',
      });
    } else {
      // Insert new token
      console.log('Inserting new token in database');
      const newToken = {
        tokenAddress,
        imageUrl,
        name: tokenName,
        symbol: tokenSymbol,
        initialSupply,
        createdAt: new Date(),
      };

      const result = await db.collection('coins').insertOne(newToken);
      console.log('New token inserted in database:', result);

      // Verify the insert by retrieving the document
      const verifyResult = await db
        .collection('coins')
        .findOne({ _id: result.insertedId });
      console.log('Inserted token verified:', !!verifyResult);

      return NextResponse.json({
        success: true,
        data: result,
        created: true,
        message: 'Token created successfully',
        token: verifyResult,
      });
    }
  } catch (error) {
    console.error('Error saving token:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
