import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session || !session.accessToken || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = session.user.id;

        // 1. Lekérjük a bejelentkezett felhasználó pontos login nevét
        const userRes = await fetch('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID || '',
                'Authorization': `Bearer ${session.accessToken}`,
            },
        });

        if (!userRes.ok) {
            return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: userRes.status });
        }

        const userData = await userRes.json();
        const userLogin = userData.data?.[0]?.login?.toLowerCase();

        if (!userLogin) {
            return NextResponse.json({ error: 'User login not found' }, { status: 400 });
        }

        // 2. Az ÖSSZES követett csatorna lekérése paginációval
        let followedChannels: Array<{ broadcaster_id: string; broadcaster_name: string; broadcaster_login: string }> = [];
        let cursor: string | null = null;
        let fetchMore = true;
        let pageCount = 0;

        while (fetchMore && pageCount < 5) {
            const targetUrl: string = `https://api.twitch.tv/helix/channels/followed?user_id=${userId}&first=100${cursor ? `&after=${cursor}` : ''}`;

            const followsRes: Response = await fetch(targetUrl, {
                headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID || '',
                    'Authorization': `Bearer ${session.accessToken}`,
                },
            });

            if (!followsRes.ok) break;

            const followsData: { data?: Array<{ broadcaster_id: string; broadcaster_name: string; broadcaster_login: string }>; pagination?: { cursor?: string } } = await followsRes.json();
            const items = followsData.data || [];
            followedChannels = [...followedChannels, ...items];

            cursor = followsData.pagination?.cursor || null;
            if (!cursor || items.length < 100) {
                fetchMore = false;
            }
            pageCount++;
        }

        // 3. Batchelt lekérdezés a StreamElements API felé
        const BATCH_SIZE = 15;
        const results = [];

        for (let i = 0; i < followedChannels.length; i += BATCH_SIZE) {
            const batch = followedChannels.slice(i, i + BATCH_SIZE);

            const batchResults = await Promise.all(
                batch.map(async (channel) => {
                    try {
                        const seChannelRes = await fetch(`https://api.streamelements.com/kappa/v2/channels/${channel.broadcaster_login}`);
                        if (!seChannelRes.ok) return null;
                        const seChannelData = await seChannelRes.json();

                        if (!seChannelData?._id) return null;

                        const pointsRes = await fetch(`https://api.streamelements.com/kappa/v2/points/${seChannelData._id}/${userLogin}`);
                        if (!pointsRes.ok) return null;
                        const pointsData = await pointsRes.json();

                        const watchtime = pointsData.watchtime || 0;
                        const points = pointsData.points || 0;

                        if (watchtime === 0 && points === 0) return null;

                        return {
                            channelName: channel.broadcaster_name,
                            channelLogin: channel.broadcaster_login,
                            avatar: seChannelData.avatar || 'https://cdn.streamelements.com/static/user/profile_header_default.png',
                            watchtime: watchtime,
                            points: points,
                            pointsAlltime: pointsData.pointsAlltime || 0,
                            rank: pointsData.rank || 0,
                        };
                    } catch {
                        return null;
                    }
                })
            );

            results.push(...batchResults);
        }

        const sortedStats = results
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort((a, b) => b.watchtime - a.watchtime || b.points - a.points);

        return NextResponse.json({
            stats: sortedStats,
            totalFollows: followedChannels.length
        });

    } catch (err) {
        console.error('API Error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}