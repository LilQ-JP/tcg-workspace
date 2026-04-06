export const state = {
    cardIdCounter: 1,
    pool: [],
    selectedCardIds: [],
    modalWaitCards: [],
    stateHistory: [],
    isHandMasked: false,
    zones: [
        { id: 'deck', name: '山札', type: 'deck', isFixed: true, cards: [] },
        { id: 'hand', name: '手札', type: 'normal', isFixed: true, cards: [] },
        { id: 'grave', name: '捨て札', type: 'grave', isFixed: true, cards: [] },
        { id: 'play', name: 'プレイエリア', type: 'normal', isFixed: true, cards: [] },
        { id: 'wait', name: '待機エリア', type: 'normal', isFixed: true, cards: [] }
    ],
    // UI state
    currentModalMode: null,
    currentViewerZone: null,
    currentModalMainCard: null,
    modalFieldZonesCollapsed: false
};

export function saveState() {
    state.stateHistory.push({
        zones: JSON.parse(JSON.stringify(state.zones)),
        modalWaitCards: JSON.parse(JSON.stringify(state.modalWaitCards))
    });
    if (state.stateHistory.length > 20) state.stateHistory.shift();
}

export function createCard(imgData) {
    return { id: state.cardIdCounter++, img: imgData, faceDown: true, rot: 0, stack: [], topCards: [] };
}

export function findCardLocation(cardId) {
    for (let z of state.zones) {
        for (let i = 0; i < z.cards.length; i++) {
            if (z.cards[i].id === cardId) return { zone: z, index: i, card: z.cards[i] };
        }
    }
    return null;
}

export function clearSelection() {
    state.selectedCardIds = [];
}
