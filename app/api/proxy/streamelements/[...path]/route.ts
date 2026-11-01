import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ path: string[] }> }
) {
    const resolvedParams = await params;
    const pathArray = resolvedParams.path || [];
    const sePath = pathArray.join('/');

    // Lekérjük a keresési paramétereket (pl. query string)
    const searchParams = request.nextUrl.searchParams.toString();
    const targetUrl = `https://api.streamelements.com/kappa/v2/${sePath}${searchParams ? `?${searchParams}` : ''}`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json',
            },
        });

        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json({ error: 'Failed to fetch from StreamElements API' }, { status: 500 });
    }
}