import { Metadata } from 'next';
import HomePage from '../page';

type Props = {
    params: Promise<{ slug?: string[] }>;
};

function formatNumber(num: number) {
    return new Intl.NumberFormat('hu-HU').format(num || 0);
}

function formatTime(totalMinutes: number) {
    if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) return '0 perc';
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} nap`);
    if (hours > 0) parts.push(`${hours} óra`);
    if (minutes > 0 || parts.length === 0) parts.push(`${minutes} perc`);
    return parts.join(' ');
}

/* Discord Open Graph Embed generálása szerver oldalon */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const slug = resolvedParams.slug || [];

    const channelName = slug[0] || null;
    const userName = slug[1] || null;

    let title = "⚡ SE Watchtime & Pont Panel";
    let description = "Kérdezd le a nézési idődet és pontjaidat bármelyik StreamElements-et használó Twitch csatornán!";
    let avatarUrl = "https://cdn.streamelements.com/assets/homepage/streamelements-logo.png";

    if (channelName) {
        try {
            const chRes = await fetch(`https://api.streamelements.com/kappa/v2/channels/${channelName}`, { next: { revalidate: 60 } });
            if (chRes.ok) {
                const chData = await chRes.json();
                const displayName = chData.displayName || chData.username || channelName;
                avatarUrl = chData.avatar || avatarUrl;

                if (userName) {
                    const userRes = await fetch(`https://api.streamelements.com/kappa/v2/points/${chData._id}/${userName}`, { next: { revalidate: 60 } });
                    if (userRes.ok) {
                        const userData = await userRes.json();
                        title = `${userData.username} • ${displayName} csatornán`;
                        description = `⏱️ Nézési idő: ${formatTime(userData.watchtime)}\n💎 Jelenlegi pont: ${formatNumber(userData.points)} (Összes: ${formatNumber(userData.pointsAlltime)})\n🏆 Rang: #${formatNumber(userData.rank)}`;
                    } else {
                        title = `${displayName} statisztikája`;
                        description = `Nem található adat a(z) ${userName} nézőhöz ezen a csatornán.`;
                    }
                } else {
                    title = `${displayName} — StreamElements Statisztika`;
                    description = `Írd be a felhasználóneved a nézési időd és pontjaid lekérdezéséhez a(z) ${displayName} csatornán!`;
                }
            }
        } catch {
            // Fallback az alapértelmezett adatokra
        }
    }

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: [{ url: avatarUrl }],
            siteName: '⚡ SE Watchtime Panel',
        },
        twitter: {
            card: 'summary',
            title,
            description,
            images: [avatarUrl],
        },
    };
}

export default function SlugPage() {
    return <HomePage />;
}