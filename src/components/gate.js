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
    const VALID_HASH = "8c6b7cb056a0041d8e13fcdb262d5d852077e68bc3f1e18cdca2774ac05c3b17";

    const isAuthorized = sessionStorage.getItem('tcg_authorized') === 'true';

    if (isAuthorized) {
        document.getElementById('gate-overlay').style.display = 'none';
        onSuccess();
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
                sessionStorage.setItem('tcg_authorized', 'true');
                
                // Success animation
                gateInput.style.borderColor = 'var(--success)';
                setTimeout(() => {
                    document.getElementById('gate-overlay').style.opacity = '0';
                    document.getElementById('gate-overlay').style.transition = 'opacity 0.5s';
                    setTimeout(() => {
                        document.getElementById('gate-overlay').style.display = 'none';
                        onSuccess();
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
