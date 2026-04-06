import { state, saveState, findCardLocation } from './game-state.js';
import { moveSelectedCards, moveCardToZone } from './card-actions.js';
import { showZoneMenu, showCardMenu, showDeckDropMenu, showDropChoiceMenu, showDropChoiceMenuForMulti } from './context-menu.js';
import { sendMyState } from './networking.js';

export function render() {
    const fieldTop = document.getElementById('field-top');
    const fieldMiddle = document.getElementById('field-middle');
    const fieldBottom = document.getElementById('field-bottom');
    if (fieldTop) fieldTop.innerHTML = '';
    if (fieldMiddle) fieldMiddle.innerHTML = '';
    if (fieldBottom) fieldBottom.innerHTML = '';

    state.zones.forEach(z => {
        const zEl = document.createElement('div');
        zEl.className = 'zone';

        if (z.width) zEl.style.width = z.width;
        if (z.height) zEl.style.height = z.height;

        zEl.innerHTML = `<div class="zone-header">
        <span class="zone-title">${z.name}</span>
        <span class="zone-drag-handle" draggable="true" title="ドラッグしてエリアを移動">≡</span>
    </div>
    <div class="zone-cards"></div>`;
        const zoneCards = zEl.querySelector('.zone-cards');

        // Note: ResizeObserver might trigger excessively if not careful, but works fine for simple layouts
        const ro = new ResizeObserver(() => {
            const w = zEl.style.width;
            const h = zEl.style.height;
            if (w) z.width = w;
            if (h) z.height = h;
        });
        ro.observe(zEl);

        const handle = zEl.querySelector('.zone-drag-handle');
        handle.ondragstart = e => {
            e.dataTransfer.setData('zone', z.id);
            e.stopPropagation();
        };

        zEl.ondragover = e => e.preventDefault();
        zEl.ondrop = async e => {
            e.preventDefault();
            const draggedZoneId = e.dataTransfer.getData('zone');
            if (draggedZoneId && draggedZoneId !== z.id) {
                saveState();
                const fromIdx = state.zones.findIndex(zone => zone.id === draggedZoneId);
                const toIdx = state.zones.findIndex(zone => zone.id === z.id);
                const movedZone = state.zones.splice(fromIdx, 1)[0];
                state.zones.splice(toIdx, 0, movedZone);
                render();
                return;
            }

            const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
            if (isNaN(draggedId)) return;

            if (z.type === 'deck') {
                const loc = findCardLocation(draggedId);
                if (loc && loc.zone.id === z.id) return;
                showDeckDropMenu(e, draggedId, z);
                return;
            }

            if (state.selectedCardIds.includes(draggedId) && state.selectedCardIds.length > 1) {
                await moveSelectedCards(z.id);
            } else {
                await moveCardToZone(draggedId, z.id);
            }
        };

        zEl.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); showZoneMenu(e, z); };

        const cardsToRender = (z.type === 'deck' || z.type === 'grave') ? z.cards.slice(0, 1) : z.cards;
        let faceDownIndex = 1;

        cardsToRender.forEach(c => {
            const cEl = document.createElement('div');
            const isSelected = state.selectedCardIds.includes(c.id);

            let visualFaceDown = c.faceDown;
            if (z.id === 'hand' && state.isHandMasked) {
                visualFaceDown = true;
            }

            cEl.className = `card ${visualFaceDown ? 'face-down' : ''} ${isSelected ? 'selected' : ''} rotated-${c.rot}`;
            if (!visualFaceDown) cEl.style.backgroundImage = `url(${c.img})`;
            cEl.draggable = true;

            if (isSelected) {
                const badge = document.createElement('div');
                badge.className = 'order-badge';
                badge.textContent = state.selectedCardIds.indexOf(c.id) + 1;
                cEl.appendChild(badge);
            }

            if (visualFaceDown && z.type !== 'deck') {
                const fdBadge = document.createElement('div');
                fdBadge.className = 'facedown-badge';
                fdBadge.textContent = faceDownIndex++;
                cEl.appendChild(fdBadge);
            }

            if (z.type === 'deck' || z.type === 'grave') {
                const zoneCountBadge = document.createElement('div');
                zoneCountBadge.className = 'zone-count-badge';
                zoneCountBadge.textContent = `${z.cards.length}枚`;
                cEl.appendChild(zoneCountBadge);
            }

            if (c.stack && c.stack.length > 0) {
                const sBadge = document.createElement('div');
                sBadge.className = 'badge-under';
                sBadge.textContent = `下: ${c.stack.length}枚`;
                cEl.appendChild(sBadge);
            }

            if (c.topCards && c.topCards.length > 0) {
                const latestTopCard = c.topCards[c.topCards.length - 1];
                const topLayer = document.createElement('div');
                topLayer.className = 'top-layer';

                if (latestTopCard.faceDown) {
                    topLayer.style.backgroundImage = "url('https://via.placeholder.com/140x200/222222/666666?text=TCG')";
                    topLayer.style.opacity = "1";
                    topLayer.classList.add('rotated-90');
                } else {
                    topLayer.style.backgroundImage = `url(${latestTopCard.img})`;
                    topLayer.style.opacity = "1";
                    topLayer.classList.remove('rotated-90');
                }
                cEl.appendChild(topLayer);

                const tBadge = document.createElement('div');
                tBadge.className = 'badge-top';
                tBadge.textContent = `上: ${c.topCards.length}枚`;
                cEl.appendChild(tBadge);
            }

            cEl.ondragstart = e => { e.dataTransfer.setData('text/plain', c.id); };
            cEl.ondragover = e => { e.preventDefault(); e.stopPropagation(); };
            cEl.ondrop = async e => {
                e.preventDefault(); e.stopPropagation();
                const draggedId = parseInt(e.dataTransfer.getData('text/plain'));
                if (isNaN(draggedId) || draggedId === c.id) return;

                if (z.type === 'deck') {
                    showDeckDropMenu(e, draggedId, z);
                    return;
                }

                if (state.selectedCardIds.includes(draggedId) && state.selectedCardIds.length > 1) {
                    showDropChoiceMenuForMulti(e, state.selectedCardIds, c.id);
                } else {
                    showDropChoiceMenu(e, draggedId, c.id);
                }
            };

            cEl.onclick = e => {
                e.stopPropagation();
                const idx = state.selectedCardIds.indexOf(c.id);
                if (idx === -1) { state.selectedCardIds.push(c.id); }
                else { state.selectedCardIds.splice(idx, 1); }
                render();
            };

            cEl.oncontextmenu = e => {
                e.preventDefault(); e.stopPropagation();
                if (z.type === 'deck' || z.type === 'grave') {
                    showZoneMenu(e, z);
                } else {
                    showCardMenu(e, c, cEl);
                }
            };

            zoneCards.appendChild(cEl);
        });

        if (z.id === 'hand') {
            if (fieldBottom) fieldBottom.appendChild(zEl);
        } else if (z.id === 'play') {
            if (fieldTop) fieldTop.appendChild(zEl);
        } else {
            if (fieldMiddle) fieldMiddle.appendChild(zEl);
        }
    });

    sendMyState();
}

export function renderOpponentField(opponentData, netConnected) {
    const wrapper = document.getElementById('opponent-field-wrapper');
    const container = document.getElementById('opponent-field');
    if (!container || !wrapper) return;
    
    container.innerHTML = '';

    if (!opponentData || !netConnected) {
        wrapper.classList.remove('active');
        return;
    }
    wrapper.classList.add('active');

    opponentData.forEach(z => {
        const zEl = document.createElement('div');
        zEl.className = 'zone';
        zEl.style.minWidth = '140px';

        const header = document.createElement('div');
        header.className = 'zone-header';
        header.innerHTML = `<span class="zone-title">${z.name}</span>`;
        zEl.appendChild(header);

        const cardsDiv = document.createElement('div');
        cardsDiv.className = 'zone-cards';

        if (z.id === 'hand') {
            for (let i = 0; i < (z.handCount || 0); i++) {
                const cEl = document.createElement('div');
                cEl.className = 'card face-down';
                cEl.style.width = '45px';
                cEl.style.height = '65px';
                cardsDiv.appendChild(cEl);
            }
            if (z.handCount > 0) {
                const badge = document.createElement('div');
                badge.style.cssText = 'position:absolute;bottom:4px;left:4px;background:rgba(0,0,0,0.8);color:#fff;padding:2px 6px;border-radius:12px;font-size:10px;font-weight:700;border:1px solid rgba(255,255,255,0.2);';
                badge.textContent = z.handCount + '枚';
                zEl.style.position = 'relative';
                zEl.appendChild(badge);
            }
        } else {
            const cards = (z.type === 'deck' || z.type === 'grave') ? z.cards.slice(0, 1) : z.cards;
            cards.forEach(c => {
                const cEl = document.createElement('div');
                cEl.className = `card ${c.faceDown ? 'face-down' : ''} rotated-${c.rot}`;
                cEl.style.width = '45px';
                cEl.style.height = '65px';
                cEl.style.backgroundSize = 'cover';
                if (!c.faceDown && c.img) cEl.style.backgroundImage = `url(${c.img})`;

                if ((z.type === 'deck' || z.type === 'grave') && z.cards.length > 0) {
                    const badge = document.createElement('div');
                    badge.className = 'zone-count-badge';
                    badge.textContent = z.cards.length + '枚';
                    cEl.appendChild(badge);
                }
                if (c.stackCount > 0) {
                    const sb = document.createElement('div');
                    sb.className = 'badge-under';
                    sb.textContent = `下:${c.stackCount}`;
                    sb.style.fontSize = '9px';
                    cEl.appendChild(sb);
                }
                if (c.topCount > 0) {
                    const tb = document.createElement('div');
                    tb.className = 'badge-top';
                    tb.textContent = `上:${c.topCount}`;
                    tb.style.fontSize = '9px';
                    cEl.appendChild(tb);

                    if (c.topCards && c.topCards.length > 0) {
                        const latest = c.topCards[c.topCards.length - 1];
                        const topLayer = document.createElement('div');
                        topLayer.className = 'top-layer';
                        if (latest.faceDown) {
                            topLayer.style.backgroundImage = "url('https://via.placeholder.com/140x200/222222/666666?text=TCG')";
                            topLayer.classList.add('rotated-90');
                        } else if (latest.img) {
                            topLayer.style.backgroundImage = `url(${latest.img})`;
                        }
                        topLayer.style.opacity = '1';
                        cEl.appendChild(topLayer);
                    }
                }
                cardsDiv.appendChild(cEl);
            });
        }
        zEl.appendChild(cardsDiv);
        container.appendChild(zEl);
    });
}
