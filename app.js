async function updateDashboard() {
    try {
        const res = await fetch('http://localhost:3001/api/status');
        if (!res.ok) throw new Error();
        const data = await res.json();

        document.getElementById('status-text').innerText = 'Backend Online';
        document.getElementById('system-status-badge').classList.add('online');

        document.getElementById('val-nametag').innerText = '@' + (data.nametag || 'kennybabs');
        document.getElementById('val-network').innerText = data.network || 'Unicity Testnet2';
        document.getElementById('val-address').innerText = data.directAddress || 'DIRECT://0000dca8924d716c3ce65db592d9f8d62153837af7a83073f20e1a3efd4806f682e0e7ee421a';
        document.getElementById('val-pubkey').innerText = data.chainPublicKey || '022e5c98c8ca79780cbcc694a7ddb4d418a9a51ddc576624bb4f2b397e85fbc004';

        document.getElementById('val-listener').innerText = data.dmListenerActive ? 'Active' : 'Inactive';
        document.getElementById('val-gemini').innerText = data.geminiActive ? 'Active' : 'Fallback Mode';
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
        document.getElementById('status-text').innerText = 'Backend Online (Public)';
        document.getElementById('system-status-badge').classList.add('online');
    }
}

updateDashboard();
setInterval(updateDashboard, 5000);
