import { state, findCardLocation, saveState } from './game-state.js';
import { askAB } from './ui-utils.js';

let renderFn = null;
export function initCardActions(render) {
    renderFn = render;
}

export async function processStackedCards(cards) {
    const hasStacks = cards.some(c => (c.stack && c.stack.length > 0) || (c.topCards && c.topCards.length > 0));
    if (!hasStacks) return cards;

    const choice = await askAB("重なっているカードが含まれています。\nどのように移動させますか？", "重なったまま移動する", "バラバラにして移動する");
    if (choice === 'A') return cards;

    let flattened = [];
    cards.forEach(c => {
        if (c.topCards) flattened.push(...c.topCards);
        flattened.push(c);
        if (c.stack) flattened.push(...c.stack);
        c.topCards = [];
        c.stack = [];
    });
    return flattened;
}

export async function moveCardToZone(cardId, targetZoneId) {
    const targetZone = state.zones.find(z => z.id === targetZoneId);
    if (!targetZone) return;
    const loc = findCardLocation(cardId);
    if (!loc) return;

    if (loc.zone.id === targetZoneId) {
        if (targetZone.type === 'deck' || targetZone.type === 'grave') {
            saveState();
            const card = loc.zone.cards.splice(loc.index, 1)[0];
            targetZone.cards.unshift(card);
            if (renderFn) renderFn();
        }
        return;
    }

    let hasStacks = (loc.card.stack && loc.card.stack.length > 0) || (loc.card.topCards && loc.card.topCards.length > 0);
    let flatten = false;
    if (hasStacks) {
        const choice = await askAB("重なっているカードが含まれています。\nどのように移動させますか？", "重なったまま移動する", "バラバラにして移動する");
        flatten = (choice === 'B');
    }

    saveState();
    const card = loc.zone.cards.splice(loc.index, 1)[0];

    let cardsToMove = [];
    if (flatten) {
        if (card.topCards) cardsToMove.push(...card.topCards);
        cardsToMove.push(card);
        if (card.stack) cardsToMove.push(...card.stack);
        card.topCards = []; card.stack = [];
    } else {
        cardsToMove.push(card);
    }

    cardsToMove.forEach(c => {
        if (targetZone.type === 'deck') { c.faceDown = true; c.rot = 0; targetZone.cards.unshift(c); }
        else if (targetZone.type === 'grave') { c.faceDown = false; c.rot = 0; targetZone.cards.unshift(c); }
        else if (targetZone.id === 'hand') { c.faceDown = false; c.rot = 0; targetZone.cards.push(c); }
        else { targetZone.cards.push(c); }
    });
    if (renderFn) renderFn();
}

export async function moveSelectedCards(targetZoneId) {
    const targetZone = state.zones.find(z => z.id === targetZoneId);
    if (!targetZone || state.selectedCardIds.length === 0) return;

    const validIds = state.selectedCardIds.filter(id => {
        const loc = findCardLocation(id);
        return loc && loc.zone.id !== targetZoneId;
    });
    if (validIds.length === 0) return;

    let hasStacks = false;
    validIds.forEach(id => {
        const loc = findCardLocation(id);
        if (loc && ((loc.card.stack && loc.card.stack.length > 0) || (loc.card.topCards && loc.card.topCards.length > 0))) hasStacks = true;
    });

    let flatten = false;
    if (hasStacks) {
        const choice = await askAB("重なっているカードが含まれています。\nどのように移動させますか？", "重なったまま一括移動", "すべてバラバラにして移動");
        flatten = (choice === 'B');
    }

    saveState();

    const idsToProcess = (targetZone.type === 'deck' || targetZone.type === 'grave') ? validIds.reverse() : validIds;
    let cardsToMove = [];

    idsToProcess.forEach(id => {
        const loc = findCardLocation(id);
        if (loc) {
            const card = loc.zone.cards.splice(loc.index, 1)[0];
            if (flatten) {
                if (card.topCards) cardsToMove.push(...card.topCards);
                cardsToMove.push(card);
                if (card.stack) cardsToMove.push(...card.stack);
                card.topCards = []; card.stack = [];
            } else {
                cardsToMove.push(card);
            }
        }
    });

    cardsToMove.forEach(c => {
        if (targetZone.type === 'deck') { c.faceDown = true; c.rot = 0; targetZone.cards.unshift(c); }
        else if (targetZone.type === 'grave') { c.faceDown = false; c.rot = 0; targetZone.cards.unshift(c); }
        else if (targetZone.id === 'hand') { c.faceDown = false; c.rot = 0; targetZone.cards.push(c); }
        else { targetZone.cards.push(c); }
    });

    state.selectedCardIds = [];
    if (renderFn) renderFn();
}

export async function applyDropStack(draggedId, targetId, position, isFaceDown) {
    const draggedLoc = findCardLocation(draggedId);
    const targetLoc = findCardLocation(targetId);
    if (!draggedLoc || !targetLoc) return;

    let hasStacks = (draggedLoc.card.stack && draggedLoc.card.stack.length > 0) || (draggedLoc.card.topCards && draggedLoc.card.topCards.length > 0);
    let flatten = false;
    if (hasStacks) {
        const choice = await askAB("重なっているカードを重ねようとしています。\nどのように重ねますか？", "そのままの塊で重ねる", "バラバラに分解して重ねる");
        flatten = (choice === 'B');
    }

    saveState();
    const card = draggedLoc.zone.cards.splice(draggedLoc.index, 1)[0];

    let cardsToMove = [];
    if (flatten) {
        if (card.topCards) cardsToMove.push(...card.topCards);
        cardsToMove.push(card);
        if (card.stack) cardsToMove.push(...card.stack);
        card.topCards = []; card.stack = [];
    } else {
        cardsToMove.push(card);
    }

    cardsToMove.forEach(c => {
        c.faceDown = isFaceDown; c.rot = 0;
        if (position === 'under') {
            if (!targetLoc.card.stack) targetLoc.card.stack = [];
            targetLoc.card.stack.push(c);
        } else if (position === 'top') {
            if (!targetLoc.card.topCards) targetLoc.card.topCards = [];
            targetLoc.card.topCards.push(c);
        }
    });
    if (renderFn) renderFn();
}

export async function applyDropStackMulti(draggedIds, targetId, position, isFaceDown) {
    const targetLoc = findCardLocation(targetId);
    if (!targetLoc) return;

    let rawCards = [];
    draggedIds.forEach(id => {
        const loc = findCardLocation(id);
        if (loc) rawCards.push(loc.card);
    });

    let hasStacks = false;
    rawCards.forEach(c => {
        if ((c.stack && c.stack.length > 0) || (c.topCards && c.topCards.length > 0)) hasStacks = true;
    });

    let flatten = false;
    if (hasStacks) {
        const choice = await askAB("重なっているカードが含まれています。\nどのように重ねますか？", "そのままの塊で重ねる", "すべてバラバラにして重ねる");
        flatten = (choice === 'B');
    }

    saveState();
    let cardsToMove = [];
    draggedIds.forEach(id => {
        const loc = findCardLocation(id);
        if (loc) {
            const card = loc.zone.cards.splice(loc.index, 1)[0];
            if (flatten) {
                if (card.topCards) cardsToMove.push(...card.topCards);
                cardsToMove.push(card);
                if (card.stack) cardsToMove.push(...card.stack);
                card.topCards = []; card.stack = [];
            } else {
                cardsToMove.push(card);
            }
        }
    });

    cardsToMove.forEach(c => {
        c.faceDown = isFaceDown; c.rot = 0;
        if (position === 'under') {
            if (!targetLoc.card.stack) targetLoc.card.stack = [];
            targetLoc.card.stack.push(c);
        } else if (position === 'top') {
            if (!targetLoc.card.topCards) targetLoc.card.topCards = [];
            targetLoc.card.topCards.push(c);
        }
    });
    state.selectedCardIds = [];
    if (renderFn) renderFn();
}

export async function moveToDeckEdge(cardId, deckZone, position, faceDown) {
    const loc = findCardLocation(cardId);
    if (!loc) return;
    saveState();
    const card = loc.zone.cards.splice(loc.index, 1)[0];
    card.faceDown = faceDown; card.rot = 0;
    if (position === 'top') deckZone.cards.unshift(card);
    else deckZone.cards.push(card);
    if (renderFn) renderFn();
}
