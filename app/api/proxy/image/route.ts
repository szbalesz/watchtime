import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) return new NextResponse('Missing url', { status: 400 });

    try {
        const imageRes = await fetch(url);
        const buffer = await imageRes.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': imageRes.headers.get('content-type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch {
        return new NextResponse('Failed to load image', { status: 500 });
    }
}