import { state, saveState } from './game-state.js';
import { processStackedCards } from './card-actions.js';
import { openPreview } from './ui-utils.js';

let renderFn = null;
let showModalExtractMenuFn = null;

export function initModal(render, showMenu) {
    renderFn = render;
    showModalExtractMenuFn = showMenu;
}

export async function moveCardsToModalWait(ids) {
    saveState();
    let cards = extractCardsFromModalContext(ids);
    state.selectedCardIds = state.selectedCardIds.filter(id => !ids.includes(id));
    cards = await processStackedCards(cards);
    cards.forEach(c => state.modalWaitCards.push(c));
    updateModalView();
}

export async function moveCardsToModalMain(ids, position = 'bottom') {
    saveState();
    let cards = extractCardsFromModalContext(ids);
    state.selectedCardIds = state.selectedCardIds.filter(id => !ids.includes(id));
    cards = await processStackedCards(cards);

    if (state.currentModalMode === 'zone' || state.currentModalMode === 'peek') {
        cards.forEach(c => {
            if (state.currentViewerZone.type === 'deck') c.faceDown = true;
            else if (state.currentViewerZone.type === 'grave') c.faceDown = false;
        });
        if (position === 'top') state.currentViewerZone.cards.unshift(...cards);
        else state.currentViewerZone.cards.push(...cards);
    } else if (state.currentModalMode === 'stack') {
        if (position === 'top') state.currentModalMainCard.topCards.push(...cards);
        else state.currentModalMainCard.stack.push(...cards);
    }
    updateModalView();
    if (renderFn) renderFn();
}

export function closeModal() {
    if (state.modalWaitCards.length > 0) {
        if ((state.currentModalMode === 'zone' || state.currentModalMode === 'peek') && state.currentViewerZone) {
            state.currentViewerZone.cards.unshift(...state.modalWaitCards);
        } else {
            let w = state.zones.find(z => z.id === 'wait') || state.zones[0];
            w.cards.push(...state.modalWaitCards);
        }
        state.modalWaitCards = [];
    }
    document.getElementById('modal-overlay').style.display = 'none';
    state.currentModalMode = null;
    state.currentModalMainCard = null;
    state.currentViewerZone = null;
    state.selectedCardIds = [];
    if (renderFn) renderFn();
}

export function openModalCommon() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay.style.left || !modalOverlay.style.top) {
        modalOverlay.style.right = '20px';
        modalOverlay.style.top = '60px';
        modalOverlay.style.left = '';
    }
    modalOverlay.style.display = 'flex';
    const headerBar = document.getElementById('modal-header-bar');
    headerBar._dragHandler && headerBar.removeEventListener('mousedown', headerBar._dragHandler);
    let startX, startY, origLeft, origTop;
    const onMove = (e) => {
        const nx = origLeft + (e.clientX - startX);
        const ny = origTop + (e.clientY - startY);
        modalOverlay.style.left = Math.max(0, Math.min(window.innerWidth - modalOverlay.offsetWidth, nx)) + 'px';
        modalOverlay.style.top = Math.max(0, Math.min(window.innerHeight - 60, ny)) + 'px';
        modalOverlay.style.right = 'auto';
    };
    const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        headerBar.style.cursor = 'grab';
    };
    headerBar._dragHandler = (e) => {
        if (e.target.id === 'modal-close-x') return;
        startX = e.clientX; startY = e.clientY;
        const rect = modalOverlay.getBoundingClientRect();
        origLeft = rect.left; origTop = rect.top;
        modalOverlay.style.left = origLeft + 'px';
        modalOverlay.style.top = origTop + 'px';
        modalOverlay.style.right = 'auto';
        headerBar.style.cursor = 'grabbing';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };
    headerBar.addEventListener('mousedown', headerBar._dragHandler);
}

export function openCardStackModal(mainCard) {
    state.currentModalMode = 'stack';
    state.currentModalMainCard = mainCard;
    updateModalView();
    openModalCommon();
}

export function openZoneViewerModal(zone) {
    state.currentModalMode = 'zone';
    state.currentViewerZone = zone;
    updateModalView();
    openModalCommon();
}

export function shuffleAndClose() {
    if ((state.currentModalMode === 'zone' || state.currentModalMode === 'peek') && state.currentViewerZone && state.currentViewerZone.type === 'deck') {
        saveState();
        if (state.modalWaitCards.length > 0) {
            state.currentViewerZone.cards.unshift(...state.modalWaitCards);
            state.modalWaitCards = [];
        }
        state.currentViewerZone.cards.sort(() => Math.random() - 0.5);
        if (renderFn) renderFn();
    }
    closeModal();
}

export async function moveSelectedToWaitFromModal() {
    const waitZone = state.zones.find(z => z.id === 'wait');
    if (!waitZone) return alert('待機エリアが見つかりません');

    saveState();
    let extracted = extractCardsFromModalContext([...state.selectedCardIds]);
    extracted = await processStackedCards(extracted);

    extracted.forEach(c => {
        c.rot = 0;
        if (state.currentModalMode === 'zone' || state.currentModalMode === 'peek') {
            c.faceDown = false;
        }
        waitZone.cards.push(c);
    });
    state.selectedCardIds = [];
    updateModalView();
    if (renderFn) renderFn();
}

export function updateModalView() {
    const modalWaitWrapper = document.getElementById('modal-wait-wrapper');
    const modalContent = document.getElementById('modal-content');
    const modalWaitContent = document.getElementById('modal-wait-content');
    const modalTitle = document.getElementById('modal-title');
    const modalButtons = document.getElementById('modal-buttons');

    modalWaitWrapper.style.display = 'block';
    modalContent.innerHTML = '';
    modalWaitContent.innerHTML = '';

    if (state.currentModalMode === 'peek') {
        modalTitle.textContent = `${state.currentViewerZone.name} の上からめくったカード`;
        modalContent.style.display = 'none';
        document.getElementById('modal-divider').style.display = 'none';
        document.getElementById('modal-subtitle').textContent = '▼ めくったカード (右クリックで移動) ▼';
    } else {
        modalContent.style.display = 'flex';
        document.getElementById('modal-divider').style.display = 'block';
        document.getElementById('modal-subtitle').textContent = '▼ 一時待機エリア ▼';
        if (state.currentModalMode === 'zone') {
            modalTitle.textContent = `${state.currentViewerZone.name} の中身 (${state.currentViewerZone.cards.length}枚)`;
        } else if (state.currentModalMode === 'stack') {
            modalTitle.textContent = "重なっているカード一覧";
        }
    }

    const createModalCard = (c, isMain, forceFaceUp = false, labelText = "", context = 'main') => {
        const cEl = document.createElement('div');
        const isSelected = state.selectedCardIds.includes(c.id);
        const isVisualFaceDown = forceFaceUp ? false : c.faceDown;

        let rotClass = '';
        if (isVisualFaceDown) {
            if (state.currentModalMode === 'stack') rotClass = '';
            else rotClass = 'rotated-90';
        }

        cEl.className = `card ${isSelected ? 'selected' : ''} ${isVisualFaceDown ? 'face-down' : ''} ${rotClass}`;
        cEl.style.width = '50px';
        cEl.style.height = '70px';
        cEl.style.backgroundSize = 'cover';
        if (!isVisualFaceDown) cEl.style.backgroundImage = `url(${c.img})`;

        if (isMain) cEl.style.boxShadow = "0 0 15px #ffcc00";

        if (isSelected && !isMain) {
            const badge = document.createElement('div');
            badge.className = 'order-badge';
            badge.textContent = state.selectedCardIds.indexOf(c.id) + 1;
            badge.style.cssText += 'width:16px;height:16px;font-size:9px;top:-6px;left:-6px;';
            cEl.appendChild(badge);
        }

        if (labelText) {
            const label = document.createElement('div');
            label.style.position = 'absolute';
            label.style.bottom = '-18px';
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%)';
            label.style.width = '80px';
            label.style.textAlign = 'center';
            label.style.fontSize = '9px';
            label.style.color = '#fff';
            label.style.background = '#000';
            label.style.padding = '1px 0';
            label.style.borderRadius = '3px';
            label.style.pointerEvents = 'none';
            label.style.whiteSpace = 'nowrap';
            label.style.overflow = 'hidden';
            label.textContent = labelText;
            cEl.appendChild(label);
            cEl.style.marginBottom = '20px';
        }

        if (!isMain) {
            cEl.draggable = true;
            cEl.ondragstart = (e) => {
                e.dataTransfer.setData('application/x-modal-card-id', c.id.toString());
                e.dataTransfer.setData('application/x-modal-card-context', context);
                e.stopPropagation();
            };
            cEl.ondragover = (e) => {
                if (e.dataTransfer.types.includes('application/x-modal-card-id')) {
                    e.preventDefault();
                    cEl.style.outline = '2px solid #0078d7';
                }
            };
            cEl.ondragleave = () => { cEl.style.outline = ''; };
            cEl.ondrop = (e) => {
                e.preventDefault(); e.stopPropagation();
                cEl.style.outline = '';
                const srcId = parseInt(e.dataTransfer.getData('application/x-modal-card-id'));
                const srcCtx = e.dataTransfer.getData('application/x-modal-card-context');
                if (isNaN(srcId) || srcId === c.id || srcCtx !== context) return;
                saveState();
                let list;
                if (context === 'main') list = state.currentModalMode === 'zone' ? state.currentViewerZone.cards : null;
                else if (context === 'wait') list = state.modalWaitCards;
                if (!list) return;
                const fromIdx = list.findIndex(x => x.id === srcId);
                const toIdx = list.findIndex(x => x.id === c.id);
                if (fromIdx === -1 || toIdx === -1) return;
                const [moved] = list.splice(fromIdx, 1);
                list.splice(toIdx, 0, moved);
                updateModalView();
                if (renderFn) renderFn();
            };
        }

        cEl.onclick = (e) => {
            e.stopPropagation();
            if (isMain) return alert("メインのカードは直接移動できません。\n盤面から移動させてください。");
            const idx = state.selectedCardIds.indexOf(c.id);
            if (idx === -1) { state.selectedCardIds.push(c.id); }
            else { state.selectedCardIds.splice(idx, 1); }
            updateModalView();
            if (renderFn) renderFn();
        };

        cEl.oncontextmenu = (e) => {
            e.stopPropagation(); e.preventDefault();
            if (isMain) {
                if (!isVisualFaceDown) openPreview(c.img);
                return;
            }
            if (showModalExtractMenuFn) showModalExtractMenuFn(e, c, cEl, isVisualFaceDown ? null : c.img);
        };
        return cEl;
    };

    if (state.currentModalMode === 'zone') {
        state.currentViewerZone.cards.forEach(c => modalContent.appendChild(createModalCard(c, false, true, '', 'main')));
    } else if (state.currentModalMode === 'stack') {
        if (state.currentModalMainCard.topCards) {
            const tops = [...state.currentModalMainCard.topCards].reverse();
            tops.forEach((c, i) => modalContent.appendChild(createModalCard(c, false, false, `上: ${i + 1}枚目${i === 0 ? ' (一番上)' : ''}`, 'main')));
        }
        modalContent.appendChild(createModalCard(state.currentModalMainCard, true, false, "メイン", 'main'));
        if (state.currentModalMainCard.stack) {
            state.currentModalMainCard.stack.forEach((c, i) => modalContent.appendChild(createModalCard(c, false, false, `下: ${i + 1}枚目`, 'main')));
        }
    }

    const forceWaitFaceUp = (state.currentModalMode === 'zone' && state.currentViewerZone && state.currentViewerZone.type === 'deck') || state.currentModalMode === 'peek';
    state.modalWaitCards.forEach(c => {
        modalWaitContent.appendChild(createModalCard(c, false, forceWaitFaceUp, '', 'wait'));
    });

    const selectedCount = state.selectedCardIds.length;
    let buttonsHtml = `<button class="btn-modal" onclick="window.TCGApp.closeModal()">閉じる</button>`;
    if ((state.currentModalMode === 'zone' || state.currentModalMode === 'peek') && state.currentViewerZone.type === 'deck') {
        const btnText = state.currentModalMode === 'peek' ? '🔀 残りを戻してシャッフル' : '🔀 シャッフルして閉じる';
        buttonsHtml += `<button class="btn-modal btn-modal-primary" onclick="window.TCGApp.shuffleAndClose()">${btnText}</button>`;
    }
    if (selectedCount > 0) {
        buttonsHtml += `<button class="btn-modal btn-modal-success" onclick="window.TCGApp.moveSelectedToWaitFromModal()">📥 選択中の ${selectedCount} 枚を待機エリアへ</button>`;
    }
    modalButtons.innerHTML = buttonsHtml;

    renderModalFieldZones();
}

function renderModalFieldZones() {
    const fieldZonesDiv = document.getElementById('modal-field-zones');
    const divider2 = document.getElementById('modal-divider2');
    fieldZonesDiv.innerHTML = '';
    divider2.style.display = 'block';
    fieldZonesDiv.style.display = 'block';

    const label = document.createElement('div');
    label.style.cssText = 'width:100%; font-size:11px; color:#aaa; font-weight:bold; background:var(--bg-top); padding:5px 8px; box-sizing:border-box; cursor:pointer; display:flex; justify-content:space-between; align-items:center; border-radius:4px; user-select:none; margin-bottom:4px;';
    label.innerHTML = '<span>' + (state.modalFieldZonesCollapsed ? '▶' : '▼') + ' 盤面エリアへ直接D&D</span>' +
        '<span style="font-size:10px;color:#888;">' + (state.modalFieldZonesCollapsed ? '展開' : '最小化') + '</span>';
    fieldZonesDiv.appendChild(label);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:' + (state.modalFieldZonesCollapsed ? 'none' : 'flex') + '; flex-wrap:wrap; gap:6px; width:100%; padding:4px 0;';

    label.onclick = () => {
        state.modalFieldZonesCollapsed = !state.modalFieldZonesCollapsed;
        renderModalFieldZones();
    };

    state.zones.forEach(z => {
        const zBtn = document.createElement('div');
        zBtn.style.cssText = `
            background: rgba(255,255,255,0.06);
            border: 1px dashed rgba(255,255,255,0.3);
            border-radius: 6px;
            padding: 6px 10px;
            min-width: 90px;
            flex: 1;
            cursor: pointer;
            font-size: 12px;
            color: #ccc;
            text-align: center;
            transition: all 0.2s;
        `;
        zBtn.textContent = `${z.name} (${z.cards.length}枚)`;

        zBtn.ondragover = (e) => {
            if (e.dataTransfer.types.includes('application/x-modal-card-id')) {
                e.preventDefault();
                zBtn.style.background = 'rgba(58, 134, 255, 0.3)';
                zBtn.style.borderColor = 'var(--primary)';
            }
        };
        zBtn.ondragleave = () => {
            zBtn.style.background = 'rgba(255,255,255,0.06)';
            zBtn.style.borderColor = 'rgba(255,255,255,0.3)';
        };
        zBtn.ondrop = async (e) => {
            e.preventDefault(); e.stopPropagation();
            zBtn.style.background = 'rgba(255,255,255,0.06)';
            zBtn.style.borderColor = 'rgba(255,255,255,0.3)';
            const idStr = e.dataTransfer.getData('application/x-modal-card-id');
            if (!idStr) return;
            const cardId = parseInt(idStr);
            const idsToMove = state.selectedCardIds.includes(cardId) && state.selectedCardIds.length > 1 ? [...state.selectedCardIds] : [cardId];
            if (state.currentModalMode === 'stack' && idsToMove.includes(state.currentModalMainCard.id)) {
                alert("メインのカードは直接移動できません。");
                return;
            }
            await moveModalCardsToFieldZone(idsToMove, z.id);
        };

        grid.appendChild(zBtn);
    });
    fieldZonesDiv.appendChild(grid);
}

export async function moveModalCardsToFieldZone(ids, targetZoneId) {
    saveState();
    const idsToExtract = [...ids];
    let cards = extractCardsFromModalContext(idsToExtract);
    state.selectedCardIds = state.selectedCardIds.filter(id => !idsToExtract.includes(id));
    cards = await processStackedCards(cards);

    const targetZone = state.zones.find(z => z.id === targetZoneId);
    if (!targetZone) return;

    cards.forEach(c => {
        c.rot = 0;
        if (targetZone.type === 'deck') c.faceDown = true;
        else if (targetZone.type === 'grave') c.faceDown = false;
        else if (targetZone.id === 'hand') c.faceDown = false;
        else if (state.currentModalMode === 'zone' || state.currentModalMode === 'peek') c.faceDown = false;
        targetZone.cards.push(c);
    });
    updateModalView();
    if (renderFn) renderFn();
}

export function extractCardsFromModalContext(idsToExtract) {
    let extracted = [];
    idsToExtract.forEach(id => {
        let idx = state.modalWaitCards.findIndex(c => c.id === id);
        if (idx !== -1) { extracted.push(state.modalWaitCards.splice(idx, 1)[0]); return; }

        if (state.currentModalMode === 'zone') {
            idx = state.currentViewerZone.cards.findIndex(c => c.id === id);
            if (idx !== -1) { extracted.push(state.currentViewerZone.cards.splice(idx, 1)[0]); return; }
        } else if (state.currentModalMode === 'stack') {
            idx = state.currentModalMainCard.topCards.findIndex(c => c.id === id);
            if (idx !== -1) { extracted.push(state.currentModalMainCard.topCards.splice(idx, 1)[0]); return; }
            idx = state.currentModalMainCard.stack.findIndex(c => c.id === id);
            if (idx !== -1) { extracted.push(state.currentModalMainCard.stack.splice(idx, 1)[0]); return; }
        }
    });
    return extracted;
}
