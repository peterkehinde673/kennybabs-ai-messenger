async function updateDashboard() {
    try {
        const res = await fetch('http://localhost:3001/api/status');
        if (!res.ok) throw new Error();
        const data = await res.json();

        document.getElementById('status-text').innerText = 'Backend Online';
        document.getElementById('system-status-badge').classList.add('online');

        document.getElementById('val-nametag').innerText = '@' + (data.nametag || 'kennybabs');
        document.getElementById('val-network').innerText = data.network || 'testnet2';
        document.getElementById('val-address').innerText = data.directAddress || 'Unavailable';
        document.getElementById('val-pubkey').innerText = data.chainPublicKey || 'Unavailable';

        document.getElementById('val-listener').innerText = data.dmListenerActive ? 'Active' : 'Inactive';
        document.getElementById('val-gemini').innerText = data.geminiActive ? 'Active' : 'Inactive';
        document.getElementById('val-incoming').innerText = data.totalIncomingDms;
        document.getElementById('val-outgoing').innerText = data.totalOutgoingDms;

        const stream = document.getElementById('event-stream');
        if (data.recentEvents && data.recentEvents.length > 0) {
            stream.innerHTML = data.recentEvents.map(e => `
                <div class="event-item">
                    [${new Date(e.timestamp).toLocaleTimeString()}] <strong>${e.type}</strong>: ${e.sender || e.recipient || ''} - "${e.text}"
                </div>
            `).join('');
        } else {
            stream.innerHTML = '<div class="event-item">No DM events recorded yet. Send a DM to @kennybabs on Sphere wallet!</div>';
        }
    } catch (err) {
        document.getElementById('status-text').innerText = 'Backend Offline / Unreachable';
        document.getElementById('system-status-badge').classList.remove('online');
        document.getElementById('val-address').innerText = 'Unavailable (Start local backend agent)';
        document.getElementById('val-pubkey').innerText = 'Unavailable (Start local backend agent)';
        document.getElementById('val-listener').innerText = 'Offline';
        document.getElementById('val-gemini').innerText = 'Offline';
    }
}

updateDashboard();
setInterval(updateDashboard, 5000);
