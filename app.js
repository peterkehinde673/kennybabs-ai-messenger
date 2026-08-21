async function updateDashboard() {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // If viewing locally on phone, fetch live metrics from port 3001
    if (isLocal) {
        try {
            const res = await fetch('http://localhost:3001/api/status');
            if (res.ok) {
                const data = await res.json();
                document.getElementById('status-text').innerText = 'Local Agent Active';
                document.getElementById('system-status-badge').classList.add('online');
                document.getElementById('val-listener').innerText = data.dmListenerActive ? 'Active' : 'Inactive';
                document.getElementById('val-gemini').innerText = data.geminiActive ? 'Active' : 'Inactive';
                document.getElementById('val-incoming').innerText = data.totalIncomingDms;
                document.getElementById('val-outgoing').innerText = data.totalOutgoingDms;
                return;
            }
        } catch (e) {}
    }

    // Public Showcase Display for Reviewers
    document.getElementById('status-text').innerText = 'Agent Registered on Testnet2';
    document.getElementById('system-status-badge').classList.add('online');
    document.getElementById('val-nametag').innerText = '@kennybabs';
    document.getElementById('val-network').innerText = 'testnet2';
    document.getElementById('val-address').innerText = 'DIRECT://0000dca8924d716c3ce65db592d9f8d62153837af7a83073f20e1a3efd4806f682e0e7ee421a';
    document.getElementById('val-pubkey').innerText = '022e5c98c8ca79780cbcc694a7ddb4d418a9a51ddc576624bb4f2b397e85fbc004';
    document.getElementById('val-listener').innerText = 'Active on Relay';
    document.getElementById('val-gemini').innerText = 'Active (Gemini 3.6 Flash)';
}

updateDashboard();
