let currentChannelId = null;
let currentUserData = null;

// Cím- és URL-kezelő segédfüggvény
function updatePageTitleAndURL(channel = null, user = null) {
    let title = "SE Watchtime & Pont Panel";
    let path = '/';

    if (channel) {
        path += channel;
        const channelName = document.getElementById('channel-name').textContent || channel;

        if (user) {
            path += `/${user}`;
            title = `${user} • ${channelName} csatornán — SE Panel`;
        } else {
            title = `${channelName} — SE Statisztika`;
        }
    }

    document.title = title;
    window.history.pushState({}, '', path);
}

function toggleSection(sectionId, isOpen) {
    const section = document.getElementById(sectionId);
    if (!section) return;

    if (isOpen) {
        section.classList.add('open');
    } else {
        section.classList.remove('open');
    }
}

function formatNumber(num) {
    return new Intl.NumberFormat('hu-HU').format(num || 0);
}

function formatTime(totalMinutes, isOnlyMinutes) {
    if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) return '0 perc';

    if (isOnlyMinutes) {
        return `${formatNumber(totalMinutes)} perc`;
    }

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const minutes = totalMinutes % 60;

    const timeParts = [];
    if (days > 0) timeParts.push(`${days} nap`);
    if (hours > 0) timeParts.push(`${hours} óra`);
    if (minutes > 0 || timeParts.length === 0) {
        timeParts.push(`${minutes} perc`);
    }

    return timeParts.join(' ');
}

function updateWatchtimeDisplay() {
    if (!currentUserData) return;

    const format = document.querySelector('input[name="wt-format"]:checked').value;
    const totalMinutes = currentUserData.watchtime;
    const isOnlyMinutes = (format === 'minutes');

    document.getElementById('stat-watchtime').textContent = formatTime(totalMinutes, isOnlyMinutes);
}

function setLoading(btnTextId, spinnerId, loading) {
    const btnText = document.getElementById(btnTextId);
    const spinner = document.getElementById(spinnerId);

    if (loading) {
        btnText.style.display = 'none';
        spinner.classList.add('active');
    } else {
        btnText.style.display = 'inline';
        spinner.classList.remove('active');
    }
}

/* 1. Lépés: Csatorna keresése */
async function searchChannel(channelNameFromUrl = null) {
    const input = channelNameFromUrl || document.getElementById('channel-input').value.trim().toLowerCase();
    const errorEl = document.getElementById('channel-error');

    if (!input) return false;

    errorEl.classList.remove('visible');
    setLoading('channel-btn-text', 'channel-loading', true);

    try {
        const response = await fetch(`https://api.streamelements.com/kappa/v2/channels/${input}`);
        if (!response.ok) throw new Error('A csatorna nem található.');

        const data = await response.json();
        currentChannelId = data._id;

        const channelName = data.displayName || data.username || input;
        document.getElementById('channel-name').textContent = channelName;
        document.getElementById('channel-avatar').src = data.avatar || 'https://cdn.streamelements.com/static/user/profile_header_default.png';

        document.getElementById('link-streamelements').href = `https://streamelements.com/${input}`;
        document.getElementById('link-lurkology').href = `https://lurkology.com/${input}`;
        document.getElementById('stat-rank-link').href = `https://streamelements.com/${input}/leaderboard`;

        document.getElementById('channel-input').value = input;
        const userInput = document.getElementById('user-input');

        // Titulus és URL frissítése csatornára
        updatePageTitleAndURL(input);

        toggleSection('sec-channel', false);
        toggleSection('sec-viewer', true);
        if (!channelNameFromUrl) userInput.focus();

        return true;

    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.add('visible');
        return false;
    } finally {
        setLoading('channel-btn-text', 'channel-loading', false);
    }
}

/* 2. Lépés: Néző adatok lekérése */
async function searchUser(userNameFromUrl = null) {
    if (!currentChannelId) return;

    const input = userNameFromUrl || document.getElementById('user-input').value.trim().toLowerCase();
    const errorEl = document.getElementById('user-error');

    if (!input) return;

    errorEl.classList.remove('visible');
    setLoading('user-btn-text', 'user-loading', true);

    const rateEl = document.getElementById('stat-points-rate');
    if (rateEl) {
        rateEl.innerHTML = '';
    }

    try {
        const [pointsRes, loyaltyRes] = await Promise.all([
            fetch(`https://api.streamelements.com/kappa/v2/points/${currentChannelId}/${input}`),
            fetch(`/api/loyalty?channelId=${currentChannelId}`).catch(() => null)
        ]);

        if (!pointsRes.ok) throw new Error('Nem található adat ehhez a nézőhöz.');

        const data = await pointsRes.json();
        currentUserData = data;

        document.getElementById('user-input').value = input;
        document.getElementById('stat-rank').textContent = formatNumber(data.rank);
        document.getElementById('stat-points').textContent = formatNumber(data.points);
        document.getElementById('stat-points-alltime').textContent = formatNumber(data.pointsAlltime);

        // Loyalty adatok feldolgozása
        if (rateEl && loyaltyRes && loyaltyRes.ok) {
            try {
                const rawData = await loyaltyRes.json();
                const l = rawData.loyalty || rawData;

                if (l && l.enabled !== false) {
                    const amount = l.amount || 0;
                    const interval = l.interval || 0;
                    const subMult = l.subscriberMultiplier || 0;

                    let txt = `⚡ +${amount} pont / ${interval} perc`;
                    if (subMult > 1) {
                        txt += ` (${subMult}x sub szorzó)`;
                    }
                    if (rateEl) rateEl.innerHTML = txt;
                } else {
                    if (rateEl) rateEl.innerHTML = '⚠️ A pontgyűjtés ki van kapcsolva';
                }
            } catch (lErr) {
                console.error('Loyalty error:', lErr);
            }
        }

        updateWatchtimeDisplay();

        // Titulus és URL frissítése csatorna + néző párosra
        const channelInput = document.getElementById('channel-input').value.trim().toLowerCase();
        updatePageTitleAndURL(channelInput, input);

        toggleSection('sec-stats', true);

    } catch (error) {
        toggleSection('sec-stats', false);
        errorEl.textContent = error.message;
        errorEl.classList.add('visible');
    } finally {
        setLoading('user-btn-text', 'user-loading', false);
    }
}

/* Visszaállítás (X gomb) */
function resetApp() {
    currentChannelId = null;
    currentUserData = null;

    document.getElementById('channel-error').classList.remove('visible');
    document.getElementById('user-error').classList.remove('visible');

    const channelInput = document.getElementById('channel-input');
    channelInput.value = '';
    document.getElementById('user-input').value = '';

    const rateEl = document.getElementById('stat-points-rate');
    if (rateEl) {
        rateEl.innerHTML = '';
    }

    // Titulus és URL visszaállítása alapértelmezettre
    updatePageTitleAndURL(null);

    toggleSection('sec-stats', false);
    toggleSection('sec-viewer', false);

    setTimeout(() => {
        toggleSection('sec-channel', true);
        channelInput.focus();
    }, 300);
}

/* URL és vissza gomb (Back/Forward) támogatás */
async function initFromURL() {
    const pathParts = window.location.pathname.split('/').filter(p => p.length > 0);

    if (pathParts.length >= 1) {
        const channelName = pathParts[0];
        const success = await searchChannel(channelName);

        if (success && pathParts.length >= 2) {
            const userName = pathParts[1];
            await searchUser(userName);
        }
    } else {
        updatePageTitleAndURL(null);
    }
}

// Böngésző Vissza/Előre gombjának kezelése
window.addEventListener('popstate', () => {
    initFromURL();
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('channel-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') searchChannel();
    });
    document.getElementById('user-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') searchUser();
    });

    initFromURL();
});