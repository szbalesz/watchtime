import { readFileSync } from 'fs';
import { join } from 'path';

function formatNumber(num) {
    return new Intl.NumberFormat('hu-HU').format(num || 0);
}

function formatTime(totalMinutes) {
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

export default async function handler(req, res) {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(p => p.length > 0);

    const channelName = pathParts[0] || null;
    const userName = pathParts[1] || null;

    let title = "SE Watchtime & Pont Panel";
    let description = "Nézd meg a StreamElements nézési idődet és pontjaidat tetszőleges Twitch csatornán!";
    let avatarUrl = "https://cdn.streamelements.com/static/user/profile_header_default.png";

    if (channelName) {
        try {
            const chRes = await fetch(`https://api.streamelements.com/kappa/v2/channels/${channelName}`);
            if (chRes.ok) {
                const chData = await chRes.json();
                const displayName = chData.displayName || chData.username || channelName;
                avatarUrl = chData.avatar || avatarUrl;

                if (userName) {
                    const userRes = await fetch(`https://api.streamelements.com/kappa/v2/points/${chData._id}/${userName}`);
                    if (userRes.ok) {
                        const userData = await userRes.json();
                        title = `${userData.username} • ${displayName} csatornán`;
                        description = `⏱️ Nézési idő: ${formatTime(userData.watchtime)}\n💎 Jelenlegi pont: ${formatNumber(userData.points)} (Összes: ${formatNumber(userData.pointsAlltime)})\n🏆 Rang: #${formatNumber(userData.rank)}`;
                    } else {
                        title = `${displayName} statisztikája`;
                        description = `Lekérdezés ehhez a nézőhöz: ${userName}`;
                    }
                } else {
                    title = `${displayName} — StreamElements Statisztika`;
                    description = `Írd be a felhasználóneved a nézési időd és pontjaid lekérdezéséhez!`;
                }
            }
        } catch (e) {
            // Hiba esetén maradnak az alapértelmezett adatok
        }
    }

    const metaTags = `
    <!-- Open Graph / Discord Embed Meta -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${avatarUrl}">
    <meta property="og:site_name" content="SE Watchtime Panel">
    <meta name="theme-color" content="#9146FF">
    `;

    try {
        const indexPath = join(process.cwd(), 'index.html');
        let html = readFileSync(indexPath, 'utf8');

        // Beillesztjük a meta tageket közvetlenül a <head> részbe
        html = html.replace('</head>', `${metaTags}\n</head>`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
    } catch (err) {
        return res.status(500).send('Hiba a fájl betöltésekor.');
    }
}