import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
        return NextResponse.json({ error: 'Channel ID required' }, { status: 400 });
    }

    try {
        const res = await fetch(`https://api.streamelements.com/kappa/v2/loyalty/${channelId}`);
        const data = await res.json();
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch loyalty' }, { status: 500 });
    }
}