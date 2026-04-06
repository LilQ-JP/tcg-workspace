export function askAB(message, textA, textB) {
    return new Promise(resolve => {
        const overlay = document.getElementById('dialog-overlay');
        document.getElementById('dialog-msg').innerHTML = message.replace(/\n/g, '<br>');

        const btnA = document.getElementById('dialog-btn-a');
        const btnB = document.getElementById('dialog-btn-b');
        btnA.textContent = `A. ${textA}`;
        btnB.textContent = `B. ${textB}`;

        btnA.replaceWith(btnA.cloneNode(true));
        btnB.replaceWith(btnB.cloneNode(true));
        const newBtnA = document.getElementById('dialog-btn-a');
        const newBtnB = document.getElementById('dialog-btn-b');

        newBtnA.onclick = () => { overlay.style.display = 'none'; resolve('A'); };
        newBtnB.onclick = () => { overlay.style.display = 'none'; resolve('B'); };

        overlay.style.display = 'flex';
    });
}

export function openPreview(imgSrc) {
    const overlay = document.getElementById('preview-overlay');
    const popup = document.getElementById('preview-popup');
    document.getElementById('preview-img').src = imgSrc;
    overlay.style.display = 'block';
    
    const pw = Math.min(window.innerWidth * 0.88, 700);
    popup.style.left = Math.max(10, (window.innerWidth - pw) / 2) + 'px';
    popup.style.top = Math.max(10, (window.innerHeight - pw * 1.1) / 2) + 'px';
    popup.style.width = pw + 'px';
    makeDraggable(popup);
}

export function closePreview() {
    document.getElementById('preview-overlay').style.display = 'none';
}

export function makeDraggable(el) {
    el._dragHandler && el.removeEventListener('mousedown', el._dragHandler);
    let startX, startY, origLeft, origTop;
    const onMouseMove = (e) => {
        const nx = origLeft + (e.clientX - startX);
        const ny = origTop + (e.clientY - startY);
        el.style.left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, nx)) + 'px';
        el.style.top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, ny)) + 'px';
    };
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        el.style.cursor = 'grab';
    };
    el._dragHandler = (e) => {
        if (e.target.id === 'preview-close-btn' || e.target.tagName === 'IMG') return;
        startX = e.clientX; startY = e.clientY;
        origLeft = parseInt(el.style.left) || 0;
        origTop = parseInt(el.style.top) || 0;
        el.style.cursor = 'grabbing';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    el.style.cursor = 'grab';
    el.addEventListener('mousedown', el._dragHandler);
}

export function updateCardScale(val) {
    document.documentElement.style.setProperty('--card-w', Math.floor(70 * val) + 'px');
    document.documentElement.style.setProperty('--card-h', Math.floor(100 * val) + 'px');
}
