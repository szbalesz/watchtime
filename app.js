let currentChannelId = null;
let currentUserData = null;

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

/* URL frissítése a böngészősávban oldalújratöltés nélkül */
function updateURL(channel, user = null) {
    let path = '/';
    if (channel) {
        path += channel;
        if (user) {
            path += `/${user}`;
        }
    }
    window.history.pushState({}, '', path);
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

        // Dinamikus gomb linkek
        document.getElementById('link-streamelements').href = `https://streamelements.com/${input}`;
        document.getElementById('link-lurkology').href = `https://lurkology.com/${input}`;

        // Rang kártya linkjének frissítése
        document.getElementById('stat-rank-link').href = `https://streamelements.com/${input}/leaderboard`;

        document.getElementById('channel-input').value = input;
        const userInput = document.getElementById('user-input');

        // URL frissítése
        updateURL(input);

        toggleSection('sec-channel', false);
        setTimeout(() => {
            toggleSection('sec-viewer', true);
            if (!channelNameFromUrl) userInput.focus();
        }, 300);

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

    toggleSection('sec-stats', false);

    try {
        const response = await fetch(`https://api.streamelements.com/kappa/v2/points/${currentChannelId}/${input}`);
        if (!response.ok) throw new Error('Nem található adat ehhez a nézőhöz.');

        const data = await response.json();
        currentUserData = data;

        document.getElementById('user-input').value = input;
        document.getElementById('stat-rank').textContent = formatNumber(data.rank);
        document.getElementById('stat-points').textContent = formatNumber(data.points);
        document.getElementById('stat-points-alltime').textContent = formatNumber(data.pointsAlltime);

        updateWatchtimeDisplay();

        // URL frissítése a csatorna + néző párossal
        const channelInput = document.getElementById('channel-input').value.trim().toLowerCase();
        updateURL(channelInput, input);

        setTimeout(() => toggleSection('sec-stats', true), 200);

    } catch (error) {
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

    // URL visszaállítása gyökérre
    updateURL(null);

    toggleSection('sec-stats', false);
    toggleSection('sec-viewer', false);

    setTimeout(() => {
        toggleSection('sec-channel', true);
        channelInput.focus();
    }, 300);
}

/* URL kiértékelése betöltéskor (pl. /2okos/szbalesz) */
async function initFromURL() {
    const pathParts = window.location.pathname.split('/').filter(p => p.length > 0);

    if (pathParts.length >= 1) {
        const channelName = pathParts[0];
        const success = await searchChannel(channelName);

        if (success && pathParts.length >= 2) {
            const userName = pathParts[1];
            await searchUser(userName);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('channel-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') searchChannel();
    });
    document.getElementById('user-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') searchUser();
    });

    // Indításkor URL paraméterek ellenőrzése
    initFromURL();
});