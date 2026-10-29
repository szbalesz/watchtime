export const config = {
    runtime: 'edge',
};

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

export default async function handler(req) {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p.length > 0);

    let channelName = pathParts[0] || null;
    const userName = pathParts[1] || null;

    if (channelName === 'index.html') {
        channelName = null;
    }

    let title = "⚡ SE Watchtime & Pont Panel";
    let description = "Kérdezd le a nézési idődet és pontjaidat bármelyik StreamElements-et használó Twitch csatornán egyetlen kattintással!";
    let avatarUrl = "https://cdn.streamelements.com/assets/homepage/streamelements-logo.png";

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
                        description = `Nem található adat a(z) ${userName} nézőhöz ezen a csatornán.`;
                    }
                } else {
                    title = `${displayName} — StreamElements Statisztika`;
                    description = `Írd be a felhasználóneved a nézési időd és pontjaid lekérdezéséhez a(z) ${displayName} csatornán!`;
                }
            }
        } catch (e) {
            // Fallback
        }
    }

    const html = `<!DOCTYPE html>
<html lang="hu">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239146FF'><path stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 10V3L4 14h7v7l9-11h-7z'/></svg>">
    <title>${title}</title>

    <!-- Open Graph / Discord Embed Meta -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${url.href}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${avatarUrl}">
    <meta property="og:site_name" content="⚡ SE Watchtime & Pont Panel">
    <meta name="theme-color" content="#9146FF">

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${avatarUrl}">

    <link rel="stylesheet" href="/styles.css">
</head>
<body>

    <div class="main-container">
        <div class="header">
            <h1>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                SE Watchtime & Pont Panel
            </h1>
        </div>

        <!-- 1. Lépés: Csatorna keresés -->
        <div id="sec-channel" class="collapsible-section open">
            <div class="section-inner">
                <div class="section-content">
                    <label for="channel-input" class="form-label">Twitch Csatorna Neve</label>
                    <input type="text" id="channel-input" placeholder="pl. csatornanév" class="form-input">

                    <button onclick="searchChannel()" class="btn btn-primary">
                        <span id="channel-btn-text">Csatorna Keresése</span>
                        <div id="channel-loading" class="spinner"></div>
                    </button>
                    <p id="channel-error" class="error-text"></p>
                </div>
            </div>
        </div>

        <!-- 2. Lépés: Aktív csatorna, gombok és Néző keresés -->
        <div id="sec-viewer" class="collapsible-section">
            <div class="section-inner">
                <div class="section-content">
                    <div class="channel-card">
                        <div class="channel-info">
                            <img id="channel-avatar" src="" alt="Avatar" class="channel-avatar">
                            <div>
                                <h2 id="channel-name" class="channel-name"></h2>
                                <p class="channel-subtitle">Kiválasztott csatorna</p>
                            </div>
                        </div>
                        <button onclick="resetApp()" class="close-btn" title="Vissza a kereséshez">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div class="quick-links">
                        <a id="link-streamelements" href="#" target="_blank" class="quick-link">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>StreamElements</span>
                        </a>
                        <a id="link-lurkology" href="#" target="_blank" class="quick-link">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Lurkology</span>
                        </a>
                    </div>

                    <label for="user-input" class="form-label">Néző Felhasználóneve</label>
                    <input type="text" id="user-input" placeholder="pl. felhasználónév" class="form-input">

                    <button onclick="searchUser()" class="btn btn-secondary">
                        <span id="user-btn-text">Adatok Lekérdezése</span>
                        <div id="user-loading" class="spinner"></div>
                    </button>
                    <p id="user-error" class="error-text"></p>
                </div>
            </div>
        </div>

        <!-- 3. Lépés: Statisztikák és opciók -->
        <div id="sec-stats" class="collapsible-section">
            <div class="section-inner">
                <div class="stats-section">
                    <div class="toggles-group">
                        <div class="toggle-bar toggle-neutral">
                            <label>
                                <input type="radio" name="wt-format" value="formatted" checked onchange="updateWatchtimeDisplay()">
                                <div class="toggle-label">Nap / Óra</div>
                            </label>
                            <label>
                                <input type="radio" name="wt-format" value="minutes" onchange="updateWatchtimeDisplay()">
                                <div class="toggle-label">Csak Perc</div>
                            </label>
                        </div>
                    </div>

                    <div class="stats-grid">
                        <a id="stat-rank-link" href="#" target="_blank" class="stat-card stat-card-link" title="Megnyitás a StreamElements ranglistán">
                            <div class="stat-link-header">
                                <p class="stat-label">Rang / Helyezés</p>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="external-icon">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </div>
                            <p class="stat-value">#<span id="stat-rank">0</span></p>
                        </a>
                        <div class="stat-card stat-card-watchtime">
                            <p class="stat-label">Nézési Idő</p>
                            <p class="stat-value" id="stat-watchtime">0 perc</p>
                        </div>
                       <div class="stat-card stat-card-wide">
                        <div class="stat-card-top">
                            <div class="stat-left">
                                <p class="stat-label">Összes Pont (All-time)</p>
                                <p class="stat-value" id="stat-points-alltime">0</p>
                            </div>
                            <div class="stat-right">
                                <p class="stat-label">Jelenlegi pont</p>
                                <p class="stat-value" id="stat-points">0</p>
                            </div>
                        </div>
                        <div class="stat-card-bottom">
                            <div id="stat-points-rate" class="stat-rate"></div>
                        </div>
                    </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="info-banner">
            <div class="info-banner-inner">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p>
                    <strong>Fontos:</strong> Ez az eszköz csak olyan csatornáknál mutat adatokat, ahol a StreamElements aktívan számolja a nézési időt és a pontokat.
                </p>
            </div>
        </div>
    </div>

    <script src="/app.js"></script>
</body>
</html>`;

    return new Response(html, {
        headers: {
            'content-type': 'text/html; charset=utf-8',
        },
    });
}