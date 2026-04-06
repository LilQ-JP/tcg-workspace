import { state } from './game-state.js';

let peer = null;
let peerConn = null;
export let myPeerId = null;
export let opponentData = null;
export let netConnected = false;

// We need a reference to the renderOpponentField function from renderer
let renderOpponentFieldFn = null;
let closeLobbyFn = null;

export function initNetworking(renderOppField, closeLobby) {
    renderOpponentFieldFn = renderOppField;
    closeLobbyFn = closeLobby;
}

function generateRoomId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = '';
    for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
}

export function openLobby() {
    const overlay = document.getElementById('lobby-overlay');
    const content = document.getElementById('lobby-content');
    overlay.style.display = 'flex';

    if (netConnected && peerConn) {
        content.innerHTML = `
            <div class="lobby-section">
                <h3>✅ 対戦中</h3>
                <p style="color:#a7ffeb;font-size:14px;">相手と接続されています</p>
                <p style="color:#888;font-size:12px;">ルームID: ${myPeerId}</p>
                <button class="lobby-btn lobby-btn-disconnect" id="btn-disconnect">🔌 切断する</button>
            </div>`;
        document.getElementById('btn-disconnect').onclick = disconnectPeer;
    } else {
        content.innerHTML = `
            <div class="lobby-section">
                <h3>🏠 部屋を作る</h3>
                <p style="color:#aaa;font-size:12px;">ルームIDを相手に共有してください</p>
                <button class="lobby-btn lobby-btn-create" id="btn-create-room">部屋を作成</button>
                <div id="room-created-info" style="display:none;margin-top:12px;">
                    <p style="color:#888;font-size:11px;">このIDを相手に送ってください：</p>
                    <div class="lobby-room-id" id="room-id-display"></div>
                    <button class="lobby-btn" style="background:#0097a7;font-size:12px;padding:8px 16px;" id="btn-copy-id">📋 IDをコピー</button>
                    <div class="lobby-status" id="room-status">⏳ 相手の接続を待っています...</div>
                </div>
            </div>
            <div style="color:#555;font-size:14px;margin:10px 0;">── または ──</div>
            <div class="lobby-section">
                <h3>🚪 部屋に参加</h3>
                <p style="color:#aaa;font-size:12px;">相手から受け取ったルームIDを入力</p>
                <input type="text" class="lobby-input" id="join-room-input" placeholder="ルームID" maxlength="10">
                <div style="margin-top:10px;">
                    <button class="lobby-btn lobby-btn-join" id="btn-join-room">参加する</button>
                </div>
                <div class="lobby-status" id="join-status"></div>
            </div>`;
        
        document.getElementById('btn-create-room').onclick = createRoom;
        document.getElementById('btn-copy-id').onclick = copyRoomId;
        document.getElementById('btn-join-room').onclick = joinRoom;
    }
}

export function closeLobby() {
    document.getElementById('lobby-overlay').style.display = 'none';
}

function copyRoomId() {
    const id = document.getElementById('room-id-display')?.textContent;
    if (id) {
        navigator.clipboard.writeText(id).then(() => {
            const el = document.getElementById('room-id-display');
            const orig = el.textContent;
            el.textContent = 'コピーしました！';
            el.style.color = '#69f0ae';
            setTimeout(() => { el.textContent = orig; el.style.color = '#a7ffeb'; }, 1200);
        });
    }
}

function createRoom() {
    const roomId = 'TCG-' + generateRoomId();
    initPeer(roomId, true);
}

function joinRoom() {
    const input = document.getElementById('join-room-input');
    const roomId = input.value.trim().toUpperCase();
    if (!roomId) return alert('ルームIDを入力してください');
    const statusEl = document.getElementById('join-status');
    statusEl.textContent = '⏳ 接続中...';
    initPeer(null, false, roomId);
}

function initPeer(roomId, isHost, targetId) {
    if (peer) { peer.destroy(); peer = null; }

    const peerOptions = { debug: 0 };

    if (isHost) {
        peer = new Peer(roomId, peerOptions);
    } else {
        peer = new Peer(peerOptions);
    }

    peer.on('open', (id) => {
        myPeerId = id;
        if (isHost) {
            document.getElementById('room-created-info').style.display = 'block';
            document.getElementById('room-id-display').textContent = roomId;
            document.getElementById('room-status').textContent = '⏳ 相手の接続を待っています...';
        } else {
            peerConn = peer.connect(targetId);
            setupConnection(peerConn);
        }
    });

    peer.on('connection', (conn) => {
        peerConn = conn;
        setupConnection(conn);
    });

    peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        const joinStatus = document.getElementById('join-status');
        const roomStatus = document.getElementById('room-status');
        const msg = '❌ 接続エラー: ' + (err.type === 'peer-unavailable' ? 'ルームが見つかりません' : err.type);
        if (joinStatus) joinStatus.textContent = msg;
        if (roomStatus) roomStatus.textContent = msg;
    });
}

function setupConnection(conn) {
    conn.on('open', () => {
        netConnected = true;
        updateNetStatusBar(true);
        const roomStatus = document.getElementById('room-status');
        if (roomStatus) roomStatus.textContent = '✅ 接続完了！';
        const joinStatus = document.getElementById('join-status');
        if (joinStatus) joinStatus.textContent = '✅ 接続完了！';
        
        setTimeout(() => {
            if (closeLobbyFn) closeLobbyFn();
            sendMyState();
        }, 800);
    });

    conn.on('data', (data) => {
        if (data.type === 'state') {
            opponentData = data.payload;
            if (renderOpponentFieldFn) renderOpponentFieldFn();
        } else if (data.type === 'reset') {
            opponentData = null;
            if (renderOpponentFieldFn) renderOpponentFieldFn();
        }
    });

    conn.on('close', () => {
        netConnected = false;
        peerConn = null;
        opponentData = null;
        updateNetStatusBar(false);
        if (renderOpponentFieldFn) renderOpponentFieldFn();
        alert('相手との接続が切断されました。');
    });

    conn.on('error', (err) => {
        console.error('Connection error:', err);
    });
}

function disconnectPeer() {
    if (peerConn) peerConn.close();
    if (peer) { peer.destroy(); peer = null; }
    netConnected = false;
    peerConn = null;
    opponentData = null;
    updateNetStatusBar(false);
    if (renderOpponentFieldFn) renderOpponentFieldFn();
    if (closeLobbyFn) closeLobbyFn();
}

function updateNetStatusBar(connected) {
    const bar = document.getElementById('net-status-bar');
    const dot = document.getElementById('net-status-dot');
    const text = document.getElementById('net-status-text');
    if (bar && dot && text) {
        if (connected) {
            bar.classList.add('connected');
            dot.className = 'status-dot green';
            text.textContent = '🟢 相手と接続中';
        } else {
            bar.classList.remove('connected');
        }
    }
}

export function sendMyState() {
    if (!peerConn || !netConnected) return;
    const payload = buildStatePayload();
    try { peerConn.send({ type: 'state', payload: payload }); } catch(e) { console.error(e); }
}

function buildStatePayload() {
    return state.zones.map(z => {
        if (z.id === 'hand') {
            return { id: z.id, name: z.name, type: z.type, handCount: z.cards.length, cards: [] };
        }
        return {
            id: z.id, name: z.name, type: z.type,
            cards: z.cards.map(c => serializeCard(c))
        };
    });
}

function serializeCard(c) {
    return {
        id: c.id,
        img: c.faceDown ? null : c.img,
        faceDown: c.faceDown,
        rot: c.rot,
        stackCount: c.stack ? c.stack.length : 0,
        topCount: c.topCards ? c.topCards.length : 0,
        topCards: (c.topCards || []).map(tc => ({
            id: tc.id,
            img: tc.faceDown ? null : tc.img,
            faceDown: tc.faceDown,
            rot: tc.rot
        }))
    };
}
