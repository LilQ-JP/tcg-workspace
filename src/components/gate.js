export function initGate(onSuccess) {
    // プレリリース用の簡易パスワード保護
    // ※ クライアントサイドでの検証なので完全なセキュリティではありません
    const ACCESS_CODE_HASH = async (code) => {
        const msgUint8 = new TextEncoder().encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // "lilqTCG" の SHA-256 ハッシュ (仮のパスワード)
    const VALID_HASH = "f2a0668b3abed4fb7a852e25e5f85613c58fdbd2258f1f5a6276368c622829d1";

    const isAuthorized = localStorage.getItem('tcg_authorized') === 'true';

    function showPwaGuide() {
        if (localStorage.getItem('tcg_pwa_guided')) return;
        localStorage.setItem('tcg_pwa_guided', 'true');
        const videoOverlay = document.getElementById('video-overlay');
        const tutorialVideo = document.getElementById('tutorial-video');
        if (videoOverlay && tutorialVideo) {
            videoOverlay.style.display = 'flex';
            tutorialVideo.play().catch(e => console.log('Auto-play prevented:', e));
        }
    }

    if (isAuthorized) {
        document.getElementById('gate-overlay').style.display = 'none';
        onSuccess();
        setTimeout(showPwaGuide, 500);
        return;
    }

    const gateBtn = document.getElementById('gate-btn');
    const gateInput = document.getElementById('gate-code');
    const gateError = document.getElementById('gate-error');

    const verify = async () => {
        const val = gateInput.value.trim();
        if (!val) return;
        gateBtn.disabled = true;
        gateBtn.textContent = '確認中...';
        
        try {
            const hash = await ACCESS_CODE_HASH(val);
            if (hash === VALID_HASH) {
                localStorage.setItem('tcg_authorized', 'true');
                
                // Success animation
                gateInput.style.borderColor = '#2e7d32'; // original success green
                setTimeout(() => {
                    document.getElementById('gate-overlay').style.opacity = '0';
                    document.getElementById('gate-overlay').style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        document.getElementById('gate-overlay').style.display = 'none';
                        onSuccess();
                        setTimeout(showPwaGuide, 500);
                    }, 500);
                }, 400);
            } else {
                gateError.textContent = 'アクセスコードが正しくありません';
                gateInput.style.borderColor = 'var(--danger)';
                gateInput.value = '';
                gateBtn.disabled = false;
                gateBtn.textContent = '入場する';
            }
        } catch (e) {
            console.error(e);
            gateBtn.disabled = false;
            gateBtn.textContent = '入場する';
        }
    };

    gateBtn.onclick = verify;
    gateInput.onkeydown = (e) => {
        if (e.key === 'Enter') verify();
        else {
            gateError.textContent = '';
            gateInput.style.borderColor = '';
        }
    };
}
