import { NextRequest, NextResponse } from 'next/server';

// Server-side proxy for Wikipedia thumbnail images.
// Fetches the image and pipes it through to avoid client-side rate limiting.
// Usage: /api/wiki-image?person=Mahatma_Gandhi

const urlCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: NextRequest) {
  const person = req.nextUrl.searchParams.get('person');
  if (!person) {
    return NextResponse.json({ error: 'Missing person parameter' }, { status: 400 });
  }

  try {
    // Step 1: Get the image URL from Wikipedia API (cached)
    let imageUrl: string | null = null;
    const cached = urlCache.get(person);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      imageUrl = cached.url;
    } else {
      const summaryRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(person)}`,
        {
          headers: { 'User-Agent': 'SouloEnneagram/1.0 (contact@soulo.com)' },
        }
      );

      if (!summaryRes.ok) {
        return new NextResponse('Not found', { status: 404 });
      }

      const data = await summaryRes.json();
      imageUrl = data?.thumbnail?.source || data?.originalimage?.source || null;

      if (!imageUrl) {
        return new NextResponse('No image', { status: 404 });
      }

      urlCache.set(person, { url: imageUrl, timestamp: Date.now() });
    }

    // Step 2: Fetch the actual image and pipe it through
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'SouloEnneagram/1.0 (contact@soulo.com)' },
    });

    if (!imgRes.ok) {
      return new NextResponse('Image fetch failed', { status: 502 });
    }

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const buffer = await imgRes.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      },
    });
  } catch {
    return new NextResponse('Error', { status: 500 });
  }
}
