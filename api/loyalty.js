export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const url = new URL(req.url);
    const channelId = url.searchParams.get('channelId');

    if (!channelId) {
        return new Response(JSON.stringify({ error: 'Channel ID required' }), {
            status: 400,
            headers: { 'content-type': 'application/json' },
        });
    }

    try {
        const response = await fetch(`https://api.streamelements.com/kappa/v2/loyalty/${channelId}`);
        const data = await response.json();

        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
                'content-type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Failed to fetch' }), {
            status: 500,
            headers: { 'content-type': 'application/json' },
        });
    }
}