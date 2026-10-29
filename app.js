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

/* 1. Lépés: Csatorna keresése */
async function searchChannel() {
    const input = document.getElementById('channel-input').value.trim().toLowerCase();
    const errorEl = document.getElementById('channel-error');

    if (!input) return;

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

        const userInput = document.getElementById('user-input');
        userInput.value = '';

        toggleSection('sec-channel', false);
        setTimeout(() => {
            toggleSection('sec-viewer', true);
            userInput.focus();
        }, 300);

    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.add('visible');
    } finally {
        setLoading('channel-btn-text', 'channel-loading', false);
    }
}

/* 2. Lépés: Néző adatok lekérése */
async function searchUser() {
    if (!currentChannelId) return;

    const input = document.getElementById('user-input').value.trim().toLowerCase();
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

        document.getElementById('stat-rank').textContent = formatNumber(data.rank);
        document.getElementById('stat-points').textContent = formatNumber(data.points);
        document.getElementById('stat-points-alltime').textContent = formatNumber(data.pointsAlltime);

        updateWatchtimeDisplay();

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

    toggleSection('sec-stats', false);
    toggleSection('sec-viewer', false);

    setTimeout(() => {
        toggleSection('sec-channel', true);
        channelInput.focus();
    }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('channel-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') searchChannel();
    });
    document.getElementById('user-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') searchUser();
    });
});