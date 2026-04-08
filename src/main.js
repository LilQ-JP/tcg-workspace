import { state, saveState, createCard, clearSelection } from './modules/game-state.js';
import { initCardActions } from './modules/card-actions.js';
import { initContextMenu } from './modules/context-menu.js';
import { initModal, closeModal, shuffleAndClose, moveSelectedToWaitFromModal, openCardStackModal, openZoneViewerModal, updateModalView, openModalCommon } from './modules/modal.js';
import { render, renderOpponentField } from './modules/renderer.js';
import { initNetworking, openLobby } from './modules/networking.js';
import { updateCardScale } from './modules/ui-utils.js';
import { initGate } from './components/gate.js';

import './styles/index.css';

// Dependency injection for modules
initCardActions(render);
initModal(render, null); // Second argument (showMenu) set later to avoid cycles if needed
initContextMenu(render, {
    openCardStackModal,
    openZoneViewerModal,
    updateModalView,
    openModalCommon
});
initNetworking(
    () => renderOpponentField(window.TCGApp.opponentData(), window.TCGApp.netConnected()), 
    () => document.getElementById('lobby-overlay').style.display = 'none'
);

function initApp() {
    // Setup toolbar actions
    document.getElementById('loader').onchange = e => {
        state.pool = [];
        const files = [...e.target.files];
        files.forEach(f => {
            const reader = new FileReader();
            reader.onload = ev => state.pool.push(ev.target.result);
            reader.readAsDataURL(f);
        });
        alert(`${files.length}枚の画像を読み込みました。`);
    };

    document.getElementById('btn-init-deck').onclick = () => {
        if (state.pool.length === 0) return alert('先に画像を読み込んでください。');
        saveState();
        const deckZone = state.zones.find(z => z.type === 'deck');
        if (!deckZone) return alert('山札ゾーンがありません！');
        state.zones.forEach(z => z.cards = []);
        const deck = state.pool.map(img => createCard(img));
        deck.sort(() => Math.random() - 0.5);
        deckZone.cards = deck;
        state.selectedCardIds = [];
        state.modalWaitCards = [];
        render();
    };

    document.getElementById('btn-add-zone').onclick = () => {
        const name = prompt("新しいエリアの名前を入力してください", "新エリア");
        if (name) {
            saveState();
            state.zones.push({ id: 'z_' + Date.now(), name: name, type: 'normal', isFixed: false, cards: [] });
            render();
        }
    };

    document.getElementById('card-scale-slider').oninput = (e) => {
        updateCardScale(e.target.value);
    };

    document.getElementById('btn-clear-selection').onclick = () => {
        if (state.selectedCardIds.length > 0) {
            clearSelection();
            render();
        }
    };

    document.getElementById('btn-undo').onclick = () => {
        if (state.stateHistory.length > 0) {
            const prevState = state.stateHistory.pop();
            // JSON deep copy parsing already done in state history
            state.zones = prevState.zones;
            state.modalWaitCards = prevState.modalWaitCards;
            state.selectedCardIds = [];
            closeModal();
            render();
        }
    };

    document.getElementById('btn-lobby').onclick = openLobby;
    document.getElementById('btn-lobby-close').onclick = () => {
        document.getElementById('lobby-overlay').style.display = 'none';
    };

    // Video Tutorial / Install Guide
    const videoOverlay = document.getElementById('video-overlay');
    const tutorialVideo = document.getElementById('tutorial-video');
    document.getElementById('btn-install-guide').onclick = () => {
        videoOverlay.style.display = 'flex';
        tutorialVideo.play().catch(e => console.log('Auto-play prevented:', e));
    };
    document.getElementById('video-close-btn').onclick = () => {
        videoOverlay.style.display = 'none';
        tutorialVideo.pause();
    };

    // Global click handler to close menus
    window.onclick = e => {
        const menu = document.getElementById('context-menu');
        const modalOverlay = document.getElementById('modal-overlay');
        const dialogOverlay = document.getElementById('dialog-overlay');
        
        if (!e.target.closest('#context-menu') && !e.target.closest('#modal-overlay') && !e.target.closest('#dialog-overlay')) {
            if(menu) menu.style.display = 'none';
        }
        if (!e.target.closest('.card') && 
            !e.target.closest('#context-menu') && 
            !e.target.closest('#toolbar') && 
            !e.target.closest('#modal-overlay') && 
            !e.target.closest('#preview-overlay') && 
            !e.target.closest('#dialog-overlay') && 
            !e.target.closest('.resizer')) {
            clearSelection();
            render();
        }
    };

    // Resizer logic
    let activeResizer = null;
    let startY = 0;
    let startPrevH = 0;
    let startNextH = 0;

    document.querySelectorAll('.resizer').forEach(resizer => {
        resizer.addEventListener('mousedown', e => {
            activeResizer = resizer;
            startY = e.clientY;
            const prev = resizer.previousElementSibling;
            const next = resizer.nextElementSibling;
            startPrevH = prev.getBoundingClientRect().height;
            startNextH = next.getBoundingClientRect().height;
            resizer.classList.add('dragging');
            document.body.style.cursor = 'row-resize';
            e.preventDefault();
        });
    });

    document.addEventListener('mousemove', e => {
        if (!activeResizer) return;
        const dy = e.clientY - startY;
        const prev = activeResizer.previousElementSibling;
        const next = activeResizer.nextElementSibling;
        const newPrevH = Math.max(60, startPrevH + dy);
        const newNextH = Math.max(60, startNextH - dy);
        
        if (newPrevH > 60 && newNextH > 60) {
            prev.style.flex = `0 0 ${newPrevH}px`;
            next.style.flex = `0 0 ${newNextH}px`;
        } else {
            const total = startPrevH + startNextH;
            if (newPrevH <= 60) {
                prev.style.flex = `0 0 60px`;
                next.style.flex = `0 0 ${total - 60}px`;
            } else if (newNextH <= 60) {
                next.style.flex = `0 0 60px`;
                prev.style.flex = `0 0 ${total - 60}px`;
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (activeResizer) {
            activeResizer.classList.remove('dragging');
            activeResizer = null;
            document.body.style.cursor = '';
        }
    });
    
    // Initial render
    render();
}

// Expose some functions to window that are used in HTML onClick attributes
import { opponentData, netConnected } from './modules/networking.js';
import { closePreview } from './modules/ui-utils.js';

window.TCGApp = {
    closeModal,
    shuffleAndClose,
    moveSelectedToWaitFromModal,
    opponentData: () => opponentData,
    netConnected: () => netConnected,
    closeLobby: () => document.getElementById('lobby-overlay').style.display = 'none',
    closePreview
};

// Application Bootstrap
document.addEventListener('DOMContentLoaded', () => {
    initGate(() => {
        initApp();
    });
});
