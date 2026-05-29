(() => {
    'use strict';

    const COLORS = ['merah', 'biru', 'putih', 'kuning', 'hijau'];
    const COLOR_LABELS = {
        merah: 'MERAH', biru: 'BIRU', putih: 'PUTIH',
        kuning: 'KUNING', hijau: 'HIJAU'
    };

    const THEME_PRESETS = {
        kayu: {
            name: 'Kayu Klasik',
            colorBg: '#6b3a1a',
            colorGold: '#ffd76b',
            colorBall: '#2778c4',
        },
        songket: {
            name: 'Songket Merah',
            colorBg: '#7a1818',
            colorGold: '#ffd76b',
            colorBall: '#c8881e',
        },
        malam: {
            name: 'Malam Biru',
            colorBg: '#1a2b5a',
            colorGold: '#ffd76b',
            colorBall: '#4a9eea',
        },
        hijau: {
            name: 'Hijau Daun',
            colorBg: '#1f4d2b',
            colorGold: '#ffd76b',
            colorBall: '#2778c4',
        },
    };

    const DEFAULT_SETTINGS = {
        preset: 'kayu',
        colorBg: '#6b3a1a',
        colorGold: '#ffd76b',
        colorBall: '#2778c4',
        logo: null,
        eventName: 'KIM',
        eventTagline: 'Kesenian Irama Minang',
        footerMsg: '',
        boardOrder: 'row',  // 'row' = kiri→kanan, atas→bawah; 'column' = atas→bawah, kiri→kanan
        showcase: {
            enabled: false,
            items: [],  // [{ id, src, position: 'top'|'left'|'right'|'bottom' }]
        },
    };

    const state = {
        activeColor: 'putih',
        grid: { cols: 9, rows: 10 },
        settings: { ...DEFAULT_SETTINGS },
        sessions: {
            merah:  { drawn: [], history: [] },
            biru:   { drawn: [], history: [] },
            putih:  { drawn: [], history: [] },
            kuning: { drawn: [], history: [] },
            hijau:  { drawn: [], history: [] },
        }
    };

    const STORAGE_KEY = 'kim-app-state-v1';
    const MEDIA_KEY = 'kim-media-v1';
    const CHANNEL_NAME = 'kim-app-sync';
    const isPesertaView = window.location.hash === '#peserta';

    let channel = null;
    try {
        if (typeof BroadcastChannel !== 'undefined') {
            channel = new BroadcastChannel(CHANNEL_NAME);
        }
    } catch (e) {}

    function broadcast(payload) {
        if (isPesertaView) return;
        try {
            if (channel) channel.postMessage(payload);
        } catch (e) {}
    }

    function saveState(opts = {}) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) {}
        broadcast({ type: 'state', state, justDrawn: opts.justDrawn ?? null });
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (saved && saved.sessions && saved.activeColor) {
                state.activeColor = saved.activeColor;
                COLORS.forEach(c => {
                    if (saved.sessions[c]) {
                        state.sessions[c] = saved.sessions[c];
                    }
                });
            }
            if (saved && saved.grid && saved.grid.cols && saved.grid.rows) {
                state.grid = { cols: saved.grid.cols, rows: saved.grid.rows };
            }
            if (saved && saved.settings) {
                state.settings = { ...DEFAULT_SETTINGS, ...saved.settings };
            }
        } catch (e) {}
    }

    const els = {};

    function $(id) { return document.getElementById(id); }

    /* ===== Color helpers ===== */
    function hexToRgb(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
    }
    function rgbToHex(r, g, b) {
        const h = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
        return `#${h(r)}${h(g)}${h(b)}`;
    }
    function shadeColor(hex, percent) {
        const rgb = hexToRgb(hex);
        if (!rgb) return hex;
        const t = percent < 0 ? 0 : 255;
        const p = Math.abs(percent) / 100;
        return rgbToHex(
            (t - rgb.r) * p + rgb.r,
            (t - rgb.g) * p + rgb.g,
            (t - rgb.b) * p + rgb.b
        );
    }

    /* ===== Apply settings (theme, logo, names) ===== */
    function applySettings() {
        const s = state.settings;
        const root = document.documentElement.style;

        const bg = s.colorBg;
        root.setProperty('--bg-accent', bg);
        root.setProperty('--bg-accent-light', shadeColor(bg, 15));
        root.setProperty('--bg-accent-dark', shadeColor(bg, -20));
        root.setProperty('--bg-base', shadeColor(bg, -55));
        root.setProperty('--bg-deep', shadeColor(bg, -70));
        root.setProperty('--bg-radial-top', bg);
        root.setProperty('--bg-radial-bot', shadeColor(bg, -45));
        root.setProperty('--border-dark', shadeColor(bg, -60));

        const gold = s.colorGold;
        root.setProperty('--gold', gold);
        root.setProperty('--gold-dark', shadeColor(gold, -25));
        root.setProperty('--gold-deep', shadeColor(gold, -50));

        const ball = s.colorBall;
        root.setProperty('--ball-blue', ball);
        root.setProperty('--ball-blue-light', shadeColor(ball, 35));
        root.setProperty('--ball-blue-dark', shadeColor(ball, -50));

        // Update brand area (panel kiri operator)
        const brandCircle = $('brandCircle');
        if (brandCircle) {
            brandCircle.innerHTML = s.logo
                ? `<img src="${s.logo}" alt="Logo">`
                : `<span class="brand-text">${(s.eventName || 'KIM').slice(0, 4)}</span>`;
        }
        const brandTitle = $('brandTitle');
        if (brandTitle) {
            brandTitle.textContent = s.eventTagline || '';
        }

        // Update logo preview di halaman settings (kalau lagi terbuka)
        const logoPreview = $('logoPreview');
        if (logoPreview) {
            logoPreview.innerHTML = s.logo
                ? `<img src="${s.logo}" alt="Logo">`
                : `<span class="logo-placeholder">${(s.eventName || 'KIM').slice(0, 4)}</span>`;
        }

        // Layar peserta
        const pesertaBrand = $('pesertaBrand');
        if (pesertaBrand) {
            pesertaBrand.textContent = s.eventTagline || s.eventName || 'KIM';
        }
        const pesertaBrandLogo = $('pesertaBrandLogo');
        if (pesertaBrandLogo) {
            pesertaBrandLogo.innerHTML = s.logo
                ? `<img src="${s.logo}" alt="Logo">`
                : `<span class="peserta-brand-text">${(s.eventName || 'KIM').slice(0, 4)}</span>`;
        }
        const pesertaFooter = $('pesertaFooterMsg');
        if (pesertaFooter) {
            if (s.footerMsg && s.footerMsg.trim()) {
                pesertaFooter.textContent = s.footerMsg;
                pesertaFooter.hidden = false;
            } else {
                pesertaFooter.hidden = true;
            }
        }
    }

    function currentSession() {
        return state.sessions[state.activeColor];
    }

    function totalNumbers() {
        return state.grid.cols * state.grid.rows;
    }

    // Return array angka per posisi visual (row-by-row di DOM).
    // - 'row':    [1, 2, 3, 4, …] (kiri→kanan, atas→bawah)
    // - 'column': angka di slot (r, c) = c * rows + r + 1 (atas→bawah dulu, lalu kolom berikutnya)
    function getBoardNumbers() {
        const { cols, rows } = state.grid;
        const total = cols * rows;
        const order = state.settings.boardOrder || 'row';
        const out = new Array(total);
        if (order === 'column') {
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    out[r * cols + c] = c * rows + r + 1;
                }
            }
        } else {
            for (let i = 0; i < total; i++) out[i] = i + 1;
        }
        return out;
    }

    function buildBoard() {
        const board = els.board;
        const { cols, rows } = state.grid;
        board.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'board-grid';
        grid.style.setProperty('--cols', cols);
        grid.style.setProperty('--rows', rows);
        const numbers = getBoardNumbers();
        for (const n of numbers) {
            const ball = document.createElement('div');
            ball.className = 'ball';
            ball.dataset.number = String(n);
            ball.textContent = n;
            grid.appendChild(ball);
        }
        board.appendChild(grid);
        els.boardGrid = grid;
        updateBoardSize();
    }

    function updateBoardSize() {
        const board = els.board;
        if (!board || !els.boardGrid) return;
        const cs = getComputedStyle(board);
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const w = board.clientWidth - padX;
        const h = board.clientHeight - padY;
        els.boardGrid.style.setProperty('--avail-w', `${w}px`);
        els.boardGrid.style.setProperty('--avail-h', `${h}px`);
    }

    function renderBoard(justDrawn = null) {
        const drawn = new Set(currentSession().drawn);
        els.board.querySelectorAll('.ball').forEach(ball => {
            const n = Number(ball.dataset.number);
            ball.classList.toggle('drawn', drawn.has(n));
            ball.classList.remove('just-drawn');
            if (n === justDrawn) {
                requestAnimationFrame(() => ball.classList.add('just-drawn'));
            }
        });
    }

    function renderBigBall(number, animate = false) {
        const node = els.currentNumber;
        const ball = els.bigBall;
        if (number == null) {
            node.textContent = 'KIM';
            node.classList.add('placeholder');
        } else {
            node.textContent = String(number);
            node.classList.remove('placeholder');
        }
        if (animate) {
            ball.classList.remove('pulse');
            void ball.offsetWidth;
            ball.classList.add('pulse');
        }

        const mini = els.headerNumberMini;
        const miniText = els.headerNumber;
        if (mini && miniText) {
            if (number == null) {
                miniText.textContent = '—';
                mini.classList.add('placeholder');
            } else {
                miniText.textContent = String(number);
                mini.classList.remove('placeholder');
            }
            if (animate) {
                mini.classList.remove('pop');
                void mini.offsetWidth;
                mini.classList.add('pop');
            }
        }
    }

    function renderHistory() {
        const list = els.historyList;
        const history = currentSession().history.slice(-5).reverse();
        if (history.length === 0) {
            list.innerHTML = '<span class="history-empty">Belum ada angka</span>';
            return;
        }
        list.innerHTML = '';
        history.forEach((n, i) => {
            const pill = document.createElement('span');
            pill.className = 'pill' + (i === 0 ? ' latest' : '');
            pill.textContent = n;
            list.appendChild(pill);
        });
    }

    function renderCounter() {
        els.counterDrawn.textContent = currentSession().drawn.length;
        els.counterTotal.textContent = totalNumbers();
    }

    function renderColorLabel() {
        els.activeColorLabel.textContent = COLOR_LABELS[state.activeColor];
        if (els.activeColorBadge) {
            els.activeColorBadge.className = `color-badge color-badge-${state.activeColor}`;
        }
        document.querySelectorAll('.swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.color === state.activeColor);
        });
    }

    function renderAll(justDrawn = null, animate = false) {
        renderColorLabel();
        renderBoard(justDrawn);
        renderHistory();
        renderCounter();
        const last = currentSession().history[currentSession().history.length - 1];
        renderBigBall(last ?? null, animate);
        const remaining = totalNumbers() - currentSession().drawn.length;
        const undoDisabled = currentSession().history.length === 0;
        els.btnDraw.disabled = remaining === 0;
        els.btnUndo.disabled = undoDisabled;
        const qd = $('btnQuickDraw');
        const qu = $('btnQuickUndo');
        if (qd) qd.disabled = remaining === 0;
        if (qu) qu.disabled = undoDisabled;
    }

    /* ===== Render Peserta View ===== */
    const PESERTA_OVERLAY_MS = 5000;
    let pesertaOverlayTimer = null;
    let pesertaPendingNumber = null;  // angka baru yang sedang ditampilkan di overlay; ditahan dari kolom kiri & papan kanan

    function buildPesertaBoard() {
        const board = $('pesertaBoard');
        if (!board) return;
        const { cols, rows } = state.grid;
        board.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'board-grid';
        grid.style.setProperty('--cols', cols);
        grid.style.setProperty('--rows', rows);
        const numbers = getBoardNumbers();
        for (const n of numbers) {
            const ball = document.createElement('div');
            ball.className = 'ball';
            ball.dataset.number = String(n);
            ball.textContent = n;
            grid.appendChild(ball);
        }
        board.appendChild(grid);
        updatePesertaBoardSize();
    }

    function updatePesertaBoardSize() {
        const board = $('pesertaBoard');
        if (!board) return;
        const grid = board.querySelector('.board-grid');
        if (!grid) return;
        const cs = getComputedStyle(board);
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const w = board.clientWidth - padX;
        const h = board.clientHeight - padY;
        grid.style.setProperty('--avail-w', `${w}px`);
        grid.style.setProperty('--avail-h', `${h}px`);
    }

    // Render kolom kiri (bola sedang + riwayat) berdasarkan history yang sudah difilter
    function renderPesertaSide(historyToShow) {
        const last = historyToShow.length ? historyToShow[historyToShow.length - 1] : null;
        const sideNum = $('pesertaSideNumber');
        if (last == null) {
            sideNum.textContent = 'KIM';
            sideNum.classList.add('placeholder');
        } else {
            sideNum.textContent = String(last);
            sideNum.classList.remove('placeholder');
        }

        const list = $('pesertaHistoryList');
        const all = historyToShow.slice().reverse();
        if (all.length === 0) {
            list.innerHTML = '<span class="peserta-history-empty">—</span>';
        } else {
            list.innerHTML = '';
            all.forEach((n, i) => {
                const el = document.createElement('div');
                el.className = 'ball-mini' + (i === 0 ? ' first' : '');
                el.textContent = n;
                list.appendChild(el);
            });
        }
    }

    // Render papan kanan berdasarkan set angka yang ditampilkan sebagai 'drawn'
    function renderPesertaBoard(drawnSet) {
        const board = $('pesertaBoard');
        if (!board) return;
        board.querySelectorAll('.ball').forEach(ball => {
            const n = Number(ball.dataset.number);
            ball.classList.toggle('drawn', drawnSet.has(n));
        });
    }

    function renderPesertaHeader(session) {
        $('pesertaColorText').textContent = COLOR_LABELS[state.activeColor];
        $('pesertaColorBadge').className = `color-badge color-badge-${state.activeColor}`;
        $('pesertaCounterDrawn').textContent = session.drawn.length;
        $('pesertaCounterTotal').textContent = totalNumbers();
        const mock = $('pesertaKuponMock');
        if (mock) {
            mock.className = `peserta-kupon-mock color-${state.activeColor}`;
        }
        const headerText = $('pesertaHeaderColorText');
        if (headerText) headerText.textContent = COLOR_LABELS[state.activeColor];
        const headerIcon = $('pesertaHeaderKuponIcon');
        if (headerIcon) headerIcon.className = `peserta-kupon-icon color-${state.activeColor}`;
    }

    function renderPesertaWaiting(historyLength) {
        const waiting = $('pesertaWaiting');
        if (!waiting) return;
        if (historyLength === 0 && !pesertaPendingNumber) {
            waiting.classList.remove('hidden');
        } else {
            waiting.classList.add('hidden');
        }
    }

    const SHOWCASE_SLOT_IDS = {
        top: 'showcaseSlotTop',
        left: 'showcaseSlotLeft',
        right: 'showcaseSlotRight',
        bottom: 'showcaseSlotBottom',
    };

    function pickRandomShowcaseItem() {
        const sc = state.settings.showcase;
        if (!sc || !sc.enabled || !Array.isArray(sc.items) || sc.items.length === 0) return null;
        const valid = sc.items.filter(it =>
            it && it.src && ['top', 'left', 'right', 'bottom'].includes(it.position)
        );
        if (valid.length === 0) return null;
        return valid[Math.floor(Math.random() * valid.length)];
    }

    function renderShowcaseSlots() {
        // Reset semua slot
        ['top', 'left', 'right', 'bottom'].forEach(slot => {
            const node = $(SHOWCASE_SLOT_IDS[slot]);
            if (node) {
                node.innerHTML = '';
                node.hidden = true;
            }
        });
        // Pilih 1 item random, tampilkan di posisinya
        const pick = pickRandomShowcaseItem();
        if (!pick) return;
        const node = $(SHOWCASE_SLOT_IDS[pick.position]);
        if (!node) return;
        node.innerHTML = `<img src="${pick.src}" alt="">`;
        node.hidden = false;
    }

    function showBigOverlay(number) {
        const overlay = $('pesertaBigOverlay');
        const ball = $('pesertaBall');
        const nEl = $('pesertaNumber');
        if (!overlay || !ball || !nEl) return;
        nEl.textContent = String(number);
        renderShowcaseSlots();
        overlay.hidden = false;
        overlay.classList.remove('hiding');
        // Restart pop animation
        ball.classList.remove('pop');
        void ball.offsetWidth;
        ball.classList.add('pop');
        // Trigger flash
        const flash = $('pesertaFlash');
        if (flash) {
            flash.classList.remove('active');
            void flash.offsetWidth;
            flash.classList.add('active');
        }
    }

    function hideBigOverlay() {
        const overlay = $('pesertaBigOverlay');
        if (!overlay || overlay.hidden) return;
        overlay.classList.add('hiding');
        setTimeout(() => {
            overlay.hidden = true;
            overlay.classList.remove('hiding');
        }, 400);
    }

    function renderPeserta(justDrawn = null) {
        if (!isPesertaView) return;
        const session = currentSession();

        // Header (kupon/counter/warna) selalu update real-time — tidak masuk delay
        renderPesertaHeader(session);

        // Kalau ada angka baru yang masuk → mulai siklus overlay 5 detik
        if (justDrawn != null) {
            // Pastikan angka itu memang yang terakhir di history
            // (kalau bukan, anggap saja state biasa)
            const lastInHistory = session.history[session.history.length - 1];
            if (lastInHistory === justDrawn) {
                // Bersihkan timer sebelumnya kalau ada (mis. user spam undi)
                if (pesertaOverlayTimer) {
                    clearTimeout(pesertaOverlayTimer);
                }

                pesertaPendingNumber = justDrawn;

                // Tampilkan kolom kiri & papan dalam STATE LAMA (tanpa angka baru ini)
                const historyMinusLast = session.history.slice(0, -1);
                const drawnMinusLast = new Set(session.drawn.filter(n => n !== justDrawn));
                renderPesertaSide(historyMinusLast);
                renderPesertaBoard(drawnMinusLast);
                renderPesertaWaiting(historyMinusLast.length);

                // Tampilkan overlay raksasa
                showBigOverlay(justDrawn);

                // Setelah 5 detik: hide overlay, render state baru
                pesertaOverlayTimer = setTimeout(() => {
                    pesertaPendingNumber = null;
                    pesertaOverlayTimer = null;
                    hideBigOverlay();
                    const s = currentSession();
                    renderPesertaSide(s.history);
                    renderPesertaBoard(new Set(s.drawn));
                    renderPesertaWaiting(s.history.length);
                }, PESERTA_OVERLAY_MS);

                return;
            }
        }

        // State biasa (no new draw, atau dipanggil saat overlay masih aktif untuk update non-angka):
        // - Kalau overlay masih jalan, jangan ganggu kolom kiri & papan; biarkan setTimeout yang handle.
        // - Kalau tidak ada overlay: render normal.
        if (pesertaPendingNumber == null) {
            renderPesertaSide(session.history);
            renderPesertaBoard(new Set(session.drawn));
            renderPesertaWaiting(session.history.length);
        }
    }

    function drawAuto() {
        const session = currentSession();
        const drawn = new Set(session.drawn);
        const total = totalNumbers();
        const remaining = [];
        for (let n = 1; n <= total; n++) {
            if (!drawn.has(n)) remaining.push(n);
        }
        if (remaining.length === 0) return;
        const pick = remaining[Math.floor(Math.random() * remaining.length)];
        session.drawn.push(pick);
        session.history.push(pick);
        saveState({ justDrawn: pick });
        renderAll(pick, true);
    }

    function drawManual(num) {
        const n = Number(num);
        const total = totalNumbers();
        if (!Number.isInteger(n) || n < 1 || n > total) {
            return `Angka harus antara 1 dan ${total}.`;
        }
        const session = currentSession();
        if (session.drawn.includes(n)) {
            return `Angka ${n} sudah pernah diundi.`;
        }
        session.drawn.push(n);
        session.history.push(n);
        saveState({ justDrawn: n });
        renderAll(n, true);
        return null;
    }

    let pendingPick = null;
    function openPickModal(n) {
        pendingPick = n;
        $('pickNumber').textContent = n;
        const ball = $('pickBall');
        ball.style.animation = 'none';
        void ball.offsetWidth;
        ball.style.animation = '';
        showModal('modalPick');
    }
    function confirmPick() {
        if (pendingPick == null) return;
        const session = currentSession();
        if (!session.drawn.includes(pendingPick)) {
            session.drawn.push(pendingPick);
            session.history.push(pendingPick);
            saveState({ justDrawn: pendingPick });
            renderAll(pendingPick, true);
        }
        pendingPick = null;
        hideModal('modalPick');
    }

    function undo() {
        const session = currentSession();
        if (session.history.length === 0) return;
        const last = session.history.pop();
        const idx = session.drawn.lastIndexOf(last);
        if (idx !== -1) session.drawn.splice(idx, 1);
        saveState();
        renderAll(null, false);
    }

    function resetSession() {
        currentSession().drawn = [];
        currentSession().history = [];
        saveState();
        renderAll(null, false);
    }

    function switchColor(color) {
        if (!COLORS.includes(color)) return;
        state.activeColor = color;
        saveState();
        renderAll(null, false);
    }

    function applyGrid(cols, rows) {
        const c = Math.floor(Number(cols));
        const r = Math.floor(Number(rows));
        if (!Number.isInteger(c) || !Number.isInteger(r)) return 'Kolom dan baris harus angka.';
        if (c < 2 || r < 2) return 'Kolom dan baris minimal 2.';
        if (c > 30 || r > 30) return 'Kolom dan baris maksimal 30.';
        if (c * r < 4) return 'Total kotak minimal 4.';
        state.grid = { cols: c, rows: r };
        const total = c * r;
        COLORS.forEach(color => {
            const s = state.sessions[color];
            s.drawn = s.drawn.filter(n => n <= total);
            s.history = s.history.filter(n => n <= total);
        });
        saveState();
        buildBoard();
        renderAll(null, false);
        syncGridSelect();
        return null;
    }

    function syncGridSelect() {
        const key = `${state.grid.cols}x${state.grid.rows}`;
        const sel = els.gridSelect;
        const preset = [...sel.options].find(o => o.value === key);
        sel.value = preset ? key : 'custom';
    }

    function updateGridPreviewLabel() {
        const c = Number($('gridCols').value);
        const r = Number($('gridRows').value);
        const label = $('gridPreviewLabel');
        if (!label) return;
        if (!Number.isInteger(c) || !Number.isInteger(r) || c < 2 || r < 2) {
            label.textContent = 'Masukkan angka kolom dan baris (min 2 × 2).';
            return;
        }
        const total = c * r;
        label.textContent = `Total: ${total} angka (1–${total})`;
    }

    function showModal(id) { $(id).classList.add('active'); }
    function hideModal(id) { $(id).classList.remove('active'); }

    function showPage(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        $(pageId).classList.add('active');
    }

    /* ===== Kupon Generator ===== */
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function generateKupon5x5() {
        const nums = shuffle(Array.from({length: 90}, (_, i) => i + 1)).slice(0, 25);
        return { format: '5x5', numbers: nums };
    }

    function generateKupon9x3() {
        const columns = [];
        for (let c = 0; c < 9; c++) {
            const start = c * 10 + 1;
            const end = c === 8 ? 90 : start + 9;
            const pool = [];
            for (let n = start; n <= end; n++) pool.push(n);
            columns.push(shuffle(pool));
        }
        const rows = [[], [], []];
        const colCounts = new Array(9).fill(0);
        const rowCounts = [0, 0, 0];
        const targetPerRow = 5;
        const slots = [];
        for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) slots.push({r, c});
        const shuffledSlots = shuffle(slots);
        for (const {r, c} of shuffledSlots) {
            if (rowCounts[r] >= targetPerRow) continue;
            if (colCounts[c] >= 3) continue;
            const totalNeeded = 5 * 3 - rowCounts.reduce((a, b) => a + b, 0);
            const slotsLeftAfter = shuffledSlots.length - shuffledSlots.indexOf({r, c}) - 1;
            void slotsLeftAfter;
            rows[r].push({ c, n: columns[c][colCounts[c]] });
            colCounts[c]++;
            rowCounts[r]++;
            void totalNeeded;
        }
        for (let r = 0; r < 3; r++) {
            if (rowCounts[r] < targetPerRow) {
                return generateKupon9x3();
            }
        }
        const cells = [];
        for (let r = 0; r < 3; r++) {
            const rowMap = new Map();
            rows[r].forEach(({c, n}) => rowMap.set(c, n));
            for (let c = 0; c < 9; c++) {
                cells.push(rowMap.has(c) ? rowMap.get(c) : null);
            }
        }
        return { format: '9x3', numbers: cells };
    }

    function renderKuponSet(setIndex, format) {
        const setEl = document.createElement('div');
        setEl.className = 'kupon-set';
        COLORS.forEach(color => {
            const kupon = format === '5x5' ? generateKupon5x5() : generateKupon9x3();
            const card = document.createElement('div');
            card.className = `kupon-card color-${color}`;
            const header = document.createElement('div');
            header.className = 'kupon-header';
            header.innerHTML = `
                <span class="kupon-title">${COLOR_LABELS[color]}</span>
                <span class="kupon-id">#${String(setIndex).padStart(3, '0')}</span>
            `;
            card.appendChild(header);

            const grid = document.createElement('div');
            grid.className = format === '5x5' ? 'kupon-grid-5x5' : 'kupon-grid-9x3';
            kupon.numbers.forEach(n => {
                const cell = document.createElement('div');
                cell.className = 'kupon-cell' + (n == null ? ' empty' : '');
                cell.textContent = n == null ? '' : n;
                grid.appendChild(cell);
            });
            card.appendChild(grid);
            setEl.appendChild(card);
        });
        return setEl;
    }

    function generateKupons() {
        const format = els.genFormat.value;
        const count = Math.max(1, Math.min(100, Number(els.genCount.value) || 1));
        els.genPreview.innerHTML = '';
        const heading = document.createElement('p');
        heading.style.cssText = 'color:#ffd76b;font-weight:700;margin-bottom:16px;';
        heading.textContent = `${count} set kupon (${count * 5} kupon total) — Format ${format}`;
        els.genPreview.appendChild(heading);
        for (let i = 1; i <= count; i++) {
            els.genPreview.appendChild(renderKuponSet(i, format));
        }
    }

    /* ===== Settings Page ===== */
    let draftSettings = null;

    function openSettings() {
        draftSettings = { ...state.settings };
        loadSettingsFormFromDraft();
        showPage('page-settings');
    }

    function loadSettingsFormFromDraft() {
        $('colorBg').value = draftSettings.colorBg;
        $('colorGold').value = draftSettings.colorGold;
        $('colorBall').value = draftSettings.colorBall;
        $('settingEventName').value = draftSettings.eventName || '';
        $('settingEventTagline').value = draftSettings.eventTagline || '';
        $('settingFooterMsg').value = draftSettings.footerMsg || '';
        document.querySelectorAll('.theme-preset').forEach(p => {
            p.classList.toggle('active', p.dataset.preset === draftSettings.preset);
        });
        const orderVal = draftSettings.boardOrder === 'column' ? 'column' : 'row';
        document.querySelectorAll('input[name="boardOrder"]').forEach(r => {
            r.checked = r.value === orderVal;
        });
        const preview = $('logoPreview');
        preview.innerHTML = draftSettings.logo
            ? `<img src="${draftSettings.logo}" alt="Logo">`
            : `<span class="logo-placeholder">${(draftSettings.eventName || 'KIM').slice(0, 4)}</span>`;
        $('logoError').textContent = '';

        if (!draftSettings.showcase) {
            draftSettings.showcase = { enabled: false, items: [] };
        }
        if (!Array.isArray(draftSettings.showcase.items)) {
            draftSettings.showcase.items = [];
        }
        $('showcaseEnabled').checked = !!draftSettings.showcase.enabled;
        renderShowcaseItemsList();
    }

    const SHOWCASE_POSITIONS = ['top', 'left', 'right', 'bottom'];
    const SHOWCASE_POSITION_LABELS = { top: '⬆ Atas', left: '⬅ Kiri', right: '➡ Kanan', bottom: '⬇ Bawah' };

    function showcaseGenId() {
        return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    }

    function renderShowcaseItemsList() {
        const list = $('showcaseItemsList');
        if (!list) return;
        const items = (draftSettings.showcase && draftSettings.showcase.items) || [];
        if (items.length === 0) {
            list.innerHTML = '<p class="showcase-empty">Belum ada gambar di pustaka.</p>';
            return;
        }
        list.innerHTML = '';
        items.forEach(item => {
            const card = document.createElement('div');
            card.className = 'showcase-item';
            const positionOptions = SHOWCASE_POSITIONS.map(p =>
                `<option value="${p}"${p === item.position ? ' selected' : ''}>${SHOWCASE_POSITION_LABELS[p]}</option>`
            ).join('');
            card.innerHTML = `
                <div class="showcase-item-preview"><img src="${item.src}" alt=""></div>
                <div class="showcase-item-position">
                    <label>Posisi:</label>
                    <select data-id="${item.id}" class="showcase-item-position-select">${positionOptions}</select>
                </div>
                <button class="btn btn-small btn-danger showcase-item-delete" data-id="${item.id}">🗑 Hapus</button>
            `;
            list.appendChild(card);
        });
        list.querySelectorAll('.showcase-item-position-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const item = draftSettings.showcase.items.find(x => x.id === sel.dataset.id);
                if (item) item.position = sel.value;
            });
        });
        list.querySelectorAll('.showcase-item-delete').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = draftSettings.showcase.items.findIndex(x => x.id === btn.dataset.id);
                if (idx !== -1) {
                    draftSettings.showcase.items.splice(idx, 1);
                    renderShowcaseItemsList();
                }
            });
        });
    }

    function addShowcaseItem(src) {
        if (!draftSettings.showcase) draftSettings.showcase = { enabled: false, items: [] };
        if (!Array.isArray(draftSettings.showcase.items)) draftSettings.showcase.items = [];
        draftSettings.showcase.items.push({
            id: showcaseGenId(),
            src,
            position: 'top',
        });
        renderShowcaseItemsList();
    }

    function handleShowcaseUpload(file) {
        if (!file) return;
        if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
            alert('Format harus PNG, JPG, atau WEBP.');
            return;
        }
        if (file.size > 1024 * 1024) {
            alert(`Ukuran ${(file.size/1024).toFixed(0)} KB > 1 MB. Pakai gambar lebih kecil.`);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => addShowcaseItem(reader.result);
        reader.onerror = () => alert('Gagal membaca file.');
        reader.readAsDataURL(file);
    }

    function openShowcaseUrlModal() {
        $('showcaseUrlInput').value = '';
        $('showcaseUrlError').textContent = '';
        showModal('modalShowcaseUrl');
        setTimeout(() => $('showcaseUrlInput').focus(), 50);
    }
    function confirmShowcaseUrl() {
        const url = $('showcaseUrlInput').value.trim();
        if (!/^https?:\/\//i.test(url)) {
            $('showcaseUrlError').textContent = 'URL harus dimulai dengan http:// atau https://';
            return;
        }
        addShowcaseItem(url);
        hideModal('modalShowcaseUrl');
    }

    function previewDraft() {
        const saved = state.settings;
        state.settings = draftSettings;
        applySettings();
        state.settings = saved;
    }

    function applyPreset(key) {
        const p = THEME_PRESETS[key];
        if (!p) return;
        draftSettings.preset = key;
        draftSettings.colorBg = p.colorBg;
        draftSettings.colorGold = p.colorGold;
        draftSettings.colorBall = p.colorBall;
        loadSettingsFormFromDraft();
        previewDraft();
    }

    function handleLogoUpload(file) {
        const errEl = $('logoError');
        errEl.textContent = '';
        if (!file) return;
        if (!/^image\/(png|jpeg|svg\+xml)$/.test(file.type)) {
            errEl.textContent = 'Format harus PNG, JPG, atau SVG.';
            return;
        }
        if (file.size > 500 * 1024) {
            errEl.textContent = `Ukuran ${(file.size/1024).toFixed(0)} KB > 500 KB. Pakai gambar lebih kecil.`;
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            draftSettings.logo = reader.result;
            loadSettingsFormFromDraft();
            previewDraft();
        };
        reader.onerror = () => { errEl.textContent = 'Gagal membaca file.'; };
        reader.readAsDataURL(file);
    }

    function saveSettings() {
        const orderChanged = (state.settings.boardOrder || 'row') !== (draftSettings.boardOrder || 'row');
        state.settings = { ...draftSettings };
        applySettings();
        if (orderChanged && !isPesertaView) {
            buildBoard();
            renderAll(null, false);
        }
        saveState();
        showPage('page-game');
    }

    function resetSettings() {
        draftSettings = { ...DEFAULT_SETTINGS };
        loadSettingsFormFromDraft();
        previewDraft();
    }

    function cancelSettings() {
        applySettings();
        showPage('page-game');
    }

    /* ===== Media Center: IndexedDB untuk video blob ===== */
    const IDB_NAME = 'kim-media-db';
    const IDB_STORE = 'videos';
    let idbReady = null;

    function openIdb() {
        if (idbReady) return idbReady;
        idbReady = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') return reject('IndexedDB tidak tersedia');
            const req = indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) {
                    db.createObjectStore(IDB_STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return idbReady;
    }

    async function idbPut(id, blob) {
        const db = await openIdb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).put(blob, id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    async function idbGet(id) {
        const db = await openIdb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).get(id);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async function idbDelete(id) {
        const db = await openIdb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            tx.objectStore(IDB_STORE).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    // Cache object URL per video id agar tidak rebuild blob URL setiap render
    const videoBlobUrls = new Map();

    async function getVideoBlobUrl(id) {
        if (videoBlobUrls.has(id)) return videoBlobUrls.get(id);
        const blob = await idbGet(id);
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        videoBlobUrls.set(id, url);
        return url;
    }

    function revokeVideoBlobUrl(id) {
        if (videoBlobUrls.has(id)) {
            URL.revokeObjectURL(videoBlobUrls.get(id));
            videoBlobUrls.delete(id);
        }
    }

    /* ===== Media Center ===== */
    const mediaStore = {
        items: [],   // [{id, kind: 'image'|'url', title, src}]
        activeId: null,
    };

    function loadMedia() {
        try {
            const raw = localStorage.getItem(MEDIA_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed.items)) mediaStore.items = parsed.items;
            }
        } catch (e) {}
    }

    function saveMedia() {
        try {
            localStorage.setItem(MEDIA_KEY, JSON.stringify({ items: mediaStore.items }));
        } catch (e) {
            alert('Penyimpanan media penuh. Hapus beberapa item dan coba lagi.');
        }
    }

    function totalMediaSize() {
        let bytes = 0;
        mediaStore.items.forEach(it => { bytes += (it.src || '').length; });
        return bytes;
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
    }

    function genId() {
        return 'm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    }

    function addMediaImage(file) {
        return new Promise((resolve, reject) => {
            if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
                reject('Format harus PNG, JPG, atau WEBP.');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                reject(`Ukuran ${formatBytes(file.size)} > 2 MB. Pakai gambar lebih kecil.`);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                const item = {
                    id: genId(),
                    kind: 'image',
                    title: file.name.replace(/\.[^.]+$/, ''),
                    src: reader.result,
                };
                mediaStore.items.push(item);
                saveMedia();
                resolve(item);
            };
            reader.onerror = () => reject('Gagal membaca file.');
            reader.readAsDataURL(file);
        });
    }

    async function addMediaVideo(file) {
        if (!/^video\/(mp4|webm)$/.test(file.type)) {
            throw new Error('Format video harus MP4 atau WEBM.');
        }
        if (file.size > 10 * 1024 * 1024) {
            throw new Error(`Ukuran ${formatBytes(file.size)} > 10 MB. Kompresi video terlebih dahulu.`);
        }
        const id = genId();
        await idbPut(id, file);
        const item = {
            id,
            kind: 'video',
            title: file.name.replace(/\.[^.]+$/, ''),
            sizeBytes: file.size,
            mime: file.type,
        };
        mediaStore.items.push(item);
        saveMedia();
        return item;
    }

    function parseYouTubeId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?[^#]*v=)([\w-]{11})/,
            /(?:youtu\.be\/)([\w-]{11})/,
            /(?:youtube\.com\/embed\/)([\w-]{11})/,
            /(?:youtube\.com\/shorts\/)([\w-]{11})/,
        ];
        for (const p of patterns) {
            const m = url.match(p);
            if (m) return m[1];
        }
        return null;
    }

    function addMediaUrl(url, title) {
        if (!/^https?:\/\//i.test(url)) {
            throw new Error('URL harus dimulai dengan http:// atau https://');
        }
        const item = {
            id: genId(),
            kind: 'url',
            title: title || url.split('/').pop() || 'Gambar URL',
            src: url,
        };
        mediaStore.items.push(item);
        saveMedia();
        return item;
    }

    function addMediaVideoUrl(url, title) {
        if (!/^https?:\/\//i.test(url)) {
            throw new Error('URL harus dimulai dengan http:// atau https://');
        }
        const ytId = parseYouTubeId(url);
        const item = ytId
            ? { id: genId(), kind: 'youtube', title: title || 'Video YouTube', src: ytId }
            : { id: genId(), kind: 'video-url', title: title || url.split('/').pop() || 'Video URL', src: url };
        mediaStore.items.push(item);
        saveMedia();
        return item;
    }

    async function deleteMedia(id) {
        const idx = mediaStore.items.findIndex(it => it.id === id);
        if (idx === -1) return;
        const item = mediaStore.items[idx];
        mediaStore.items.splice(idx, 1);
        if (item.kind === 'video') {
            revokeVideoBlobUrl(id);
            try { await idbDelete(id); } catch (e) {}
        }
        if (mediaStore.activeId === id) {
            mediaStore.activeId = null;
            broadcast({ type: 'media-hide' });
            renderMediaOverlay();
        }
        saveMedia();
        renderMediaGrid();
        renderMediaPopoverList();
        renderQuickMediaBtn();
    }

    function renameMedia(id, title) {
        const it = mediaStore.items.find(x => x.id === id);
        if (it) {
            it.title = title;
            saveMedia();
        }
    }

    async function showMedia(id) {
        const it = mediaStore.items.find(x => x.id === id);
        if (!it) return;
        mediaStore.activeId = id;

        // Untuk video lokal: konversi blob ke base64 untuk broadcast cross-window
        // (Blob URL hanya valid di window operator, layar peserta perlu data URL sendiri)
        let payloadSrc = it.src;
        let payloadMime = it.mime;
        if (it.kind === 'video') {
            const blob = await idbGet(it.id);
            if (!blob) {
                alert('File video tidak ditemukan di penyimpanan.');
                return;
            }
            payloadSrc = await blobToDataUrl(blob);
        }

        broadcast({
            type: 'media-show',
            media: { id: it.id, kind: it.kind, src: payloadSrc, mime: payloadMime, title: it.title },
        });
        renderMediaOverlay();
        renderMediaGrid();
        renderMediaPopoverList();
        renderQuickMediaBtn();
    }

    function blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    }

    function hideMedia() {
        mediaStore.activeId = null;
        broadcast({ type: 'media-hide' });
        renderMediaOverlay();
        renderMediaGrid();
        renderMediaPopoverList();
        renderQuickMediaBtn();
    }

    // Operator window: overlay tidak ditampilkan (hanya layar peserta yang menayangkan).
    // Fungsi ini hanya dipertahankan sebagai no-op untuk konsistensi pemanggilan.
    function renderMediaOverlay() {
        // Operator's own page tidak butuh overlay media; semua tayangan
        // hanya muncul di window peserta via BroadcastChannel.
    }

    function mediaThumbHtml(it) {
        if (it.kind === 'image' || it.kind === 'url') {
            return `<img src="${it.src}" alt="">
                    <span class="media-thumb-badge">${it.kind === 'url' ? 'URL' : 'IMG'}</span>`;
        }
        if (it.kind === 'video') {
            return `<div class="media-thumb-placeholder">🎬</div>
                    <span class="media-thumb-badge">VIDEO</span>`;
        }
        if (it.kind === 'video-url') {
            return `<div class="media-thumb-placeholder">📹</div>
                    <span class="media-thumb-badge">VID URL</span>`;
        }
        if (it.kind === 'youtube') {
            return `<img src="https://i.ytimg.com/vi/${it.src}/hqdefault.jpg" alt="" onerror="this.style.display='none';this.parentElement.insertAdjacentHTML('afterbegin','<div class=&quot;media-thumb-placeholder youtube&quot;>▶</div>')">
                    <span class="media-thumb-badge">YOUTUBE</span>`;
        }
        return `<div class="media-thumb-placeholder">?</div>`;
    }

    function mediaPopoverThumbHtml(it) {
        if (it.kind === 'image' || it.kind === 'url') {
            return `<img src="${it.src}" alt="">`;
        }
        if (it.kind === 'youtube') {
            return `<img src="https://i.ytimg.com/vi/${it.src}/default.jpg" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'▶',style:'width:48px;height:32px;background:#c01818;color:#fff;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;'}))">`;
        }
        return `<span style="width:48px;height:32px;background:#333;color:#ffd76b;display:inline-flex;align-items:center;justify-content:center;border-radius:4px;font-size:18px;">${it.kind === 'video' ? '🎬' : '📹'}</span>`;
    }

    function renderMediaGrid() {
        const grid = $('mediaGrid');
        if (!grid) return;
        if (mediaStore.items.length === 0) {
            grid.innerHTML = '<p class="media-empty">Belum ada media. Upload gambar/video atau tambah dari URL untuk mulai.</p>';
            renderStorageInfo();
            return;
        }
        grid.innerHTML = '';
        mediaStore.items.forEach(it => {
            const isActive = it.id === mediaStore.activeId;
            const card = document.createElement('div');
            card.className = 'media-item' + (isActive ? ' on-air' : '');
            card.innerHTML = `
                <div class="media-thumb">${mediaThumbHtml(it)}</div>
                <div class="media-meta">
                    <input class="media-title" data-id="${it.id}" value="${escapeHtml(it.title)}" maxlength="60">
                    <div class="media-buttons">
                        ${isActive
                            ? `<button class="btn btn-stop" data-action="stop">■ Stop</button>`
                            : `<button class="btn btn-play" data-id="${it.id}" data-action="play">▶ Tayang</button>`
                        }
                        <button class="btn btn-trash btn-danger" data-id="${it.id}" data-action="delete" title="Hapus">🗑</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        grid.querySelectorAll('[data-action="play"]').forEach(b => {
            b.addEventListener('click', () => showMedia(b.dataset.id));
        });
        grid.querySelectorAll('[data-action="stop"]').forEach(b => {
            b.addEventListener('click', hideMedia);
        });
        grid.querySelectorAll('[data-action="delete"]').forEach(b => {
            b.addEventListener('click', () => {
                if (confirm('Hapus media ini?')) deleteMedia(b.dataset.id);
            });
        });
        grid.querySelectorAll('.media-title').forEach(inp => {
            inp.addEventListener('change', () => renameMedia(inp.dataset.id, inp.value.trim() || 'Tanpa judul'));
        });
        renderStorageInfo();
    }

    function renderStorageInfo() {
        const info = $('mediaStorageInfo');
        if (!info) return;
        const total = totalMediaSize();
        const approxBytes = Math.ceil(total * 0.75);
        info.textContent = `${mediaStore.items.length} item · ${formatBytes(approxBytes)}`;
        info.style.color = approxBytes > 4 * 1024 * 1024 ? '#ff8a8a' : '';
    }

    function renderMediaPopoverList() {
        const list = $('mediaPopoverList');
        if (!list) return;
        const items = mediaStore.items.slice(-6).reverse();
        if (items.length === 0) {
            list.innerHTML = '<div class="media-popover-empty">Belum ada media. Buka Media Library untuk menambahkan.</div>';
        } else {
            list.innerHTML = '';
            items.forEach(it => {
                const row = document.createElement('div');
                row.className = 'media-popover-item' + (it.id === mediaStore.activeId ? ' on-air' : '');
                const kindLabel = it.kind === 'image' ? '' :
                                  it.kind === 'url' ? 'URL' :
                                  it.kind === 'video' ? 'VIDEO' :
                                  it.kind === 'video-url' ? 'VID URL' :
                                  it.kind === 'youtube' ? 'YT' : '';
                row.innerHTML = `
                    ${mediaPopoverThumbHtml(it)}
                    <span class="name">${escapeHtml(it.title)}${kindLabel ? `<span class="badge-kind">${kindLabel}</span>` : ''}</span>
                `;
                row.addEventListener('click', () => {
                    if (it.id === mediaStore.activeId) hideMedia();
                    else showMedia(it.id);
                });
                list.appendChild(row);
            });
        }
        const stopBtn = $('btnMediaStop');
        if (stopBtn) stopBtn.hidden = !mediaStore.activeId;
    }

    function renderQuickMediaBtn() {
        const btn = $('btnQuickMedia');
        if (!btn) return;
        btn.classList.toggle('on-air', !!mediaStore.activeId);
        btn.title = mediaStore.activeId ? 'ON AIR — klik untuk berhenti' : 'Tayangkan Media';
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }

    function openMediaLib() {
        renderMediaGrid();
        showPage('page-media');
    }

    /* ===== Event Wiring ===== */
    function wireEvents() {
        els.btnDraw.addEventListener('click', drawAuto);
        els.btnUndo.addEventListener('click', undo);
        els.btnReset.addEventListener('click', () => showModal('modalReset'));
        els.btnManual.addEventListener('click', () => {
            const total = totalNumbers();
            $('manualInput').value = '';
            $('manualInput').max = total;
            $('manualMaxLabel').textContent = total;
            $('manualError').textContent = '';
            showModal('modalManual');
            setTimeout(() => $('manualInput').focus(), 50);
        });

        $('btnManualCancel').addEventListener('click', () => hideModal('modalManual'));
        $('btnManualConfirm').addEventListener('click', () => {
            const err = drawManual($('manualInput').value);
            if (err) {
                $('manualError').textContent = err;
            } else {
                hideModal('modalManual');
            }
        });
        $('manualInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') $('btnManualConfirm').click();
        });

        $('btnResetCancel').addEventListener('click', () => hideModal('modalReset'));
        $('btnResetConfirm').addEventListener('click', () => {
            resetSession();
            hideModal('modalReset');
        });

        els.board.addEventListener('click', (e) => {
            const ball = e.target.closest('.ball');
            if (!ball || ball.classList.contains('drawn')) return;
            const n = Number(ball.dataset.number);
            if (!Number.isInteger(n)) return;
            openPickModal(n);
        });

        $('btnPickCancel').addEventListener('click', () => {
            pendingPick = null;
            hideModal('modalPick');
        });
        $('btnPickConfirm').addEventListener('click', confirmPick);

        document.querySelectorAll('.swatch').forEach(s => {
            s.addEventListener('click', () => switchColor(s.dataset.color));
        });

        els.gridSelect.addEventListener('change', () => {
            const val = els.gridSelect.value;
            if (val === 'custom') {
                $('gridCols').value = state.grid.cols;
                $('gridRows').value = state.grid.rows;
                $('gridError').textContent = '';
                updateGridPreviewLabel();
                showModal('modalGrid');
                setTimeout(() => $('gridCols').focus(), 50);
            } else {
                const [c, r] = val.split('x').map(Number);
                applyGrid(c, r);
            }
        });

        ['gridCols', 'gridRows'].forEach(id => {
            $(id).addEventListener('input', updateGridPreviewLabel);
        });

        $('btnGridCancel').addEventListener('click', () => {
            hideModal('modalGrid');
            syncGridSelect();
        });
        $('btnGridConfirm').addEventListener('click', () => {
            const err = applyGrid($('gridCols').value, $('gridRows').value);
            if (err) {
                $('gridError').textContent = err;
            } else {
                hideModal('modalGrid');
            }
        });
        ['gridCols', 'gridRows'].forEach(id => {
            $(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') $('btnGridConfirm').click();
            });
        });

        $('btnOpenPeserta').addEventListener('click', () => {
            const url = window.location.pathname + '#peserta';
            const w = window.open(url, 'kim-peserta', 'width=1280,height=800');
            if (w) w.focus();
        });

        const drawer = document.querySelector('.panel-left');
        const backdrop = $('drawerBackdrop');
        const hamburger = $('btnHamburger');

        function openDrawer() {
            drawer.classList.add('open');
            backdrop.classList.add('active');
            hamburger.classList.add('open');
        }
        function closeDrawer() {
            drawer.classList.remove('open');
            backdrop.classList.remove('active');
            hamburger.classList.remove('open');
        }
        function toggleDrawer() {
            if (drawer.classList.contains('open')) closeDrawer();
            else openDrawer();
        }

        hamburger.addEventListener('click', toggleDrawer);
        backdrop.addEventListener('click', closeDrawer);

        $('btnQuickDraw').addEventListener('click', () => els.btnDraw.click());
        $('btnQuickManual').addEventListener('click', () => els.btnManual.click());
        $('btnQuickUndo').addEventListener('click', () => els.btnUndo.click());

        document.querySelectorAll('.swatch').forEach(s => {
            s.addEventListener('click', closeDrawer);
        });
        [els.btnDraw, els.btnManual, els.btnUndo, els.btnReset, els.btnGenerator, $('btnOpenPeserta'), $('btnSettings')].forEach(b => {
            b?.addEventListener('click', () => {
                if (window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches) {
                    closeDrawer();
                }
            });
        });

        els.btnGenerator.addEventListener('click', () => showPage('page-generator'));
        $('btnBackToGame').addEventListener('click', () => showPage('page-game'));

        $('btnSettings').addEventListener('click', openSettings);
        $('btnQuickSettings').addEventListener('click', openSettings);

        // Media Library
        $('btnMediaLib').addEventListener('click', openMediaLib);
        $('btnOpenMedia').addEventListener('click', () => {
            closeMediaPopover();
            openMediaLib();
        });
        $('btnBackFromMedia').addEventListener('click', () => showPage('page-game'));

        $('mediaFile').addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            for (const f of files) {
                try {
                    await addMediaImage(f);
                } catch (err) {
                    alert(typeof err === 'string' ? err : 'Gagal menambah file: ' + f.name);
                }
            }
            e.target.value = '';
            renderMediaGrid();
            renderMediaPopoverList();
        });

        $('mediaVideoFile').addEventListener('change', async (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) {
                try {
                    await addMediaVideo(file);
                    renderMediaGrid();
                    renderMediaPopoverList();
                } catch (err) {
                    alert(err.message || 'Gagal menambah video.');
                }
            }
            e.target.value = '';
        });

        $('btnMediaYoutube').addEventListener('click', () => {
            $('mediaVideoUrlInput').value = '';
            $('mediaVideoUrlTitle').value = '';
            $('mediaVideoUrlError').textContent = '';
            showModal('modalMediaVideoUrl');
            setTimeout(() => $('mediaVideoUrlInput').focus(), 50);
        });
        $('btnMediaVideoUrlCancel').addEventListener('click', () => hideModal('modalMediaVideoUrl'));
        $('btnMediaVideoUrlConfirm').addEventListener('click', () => {
            try {
                addMediaVideoUrl($('mediaVideoUrlInput').value.trim(), $('mediaVideoUrlTitle').value.trim());
                hideModal('modalMediaVideoUrl');
                renderMediaGrid();
                renderMediaPopoverList();
            } catch (err) {
                $('mediaVideoUrlError').textContent = err.message;
            }
        });
        $('mediaVideoUrlInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') $('btnMediaVideoUrlConfirm').click();
        });

        $('btnMediaUrl').addEventListener('click', () => {
            $('mediaUrlInput').value = '';
            $('mediaUrlTitle').value = '';
            $('mediaUrlError').textContent = '';
            showModal('modalMediaUrl');
            setTimeout(() => $('mediaUrlInput').focus(), 50);
        });
        $('btnMediaUrlCancel').addEventListener('click', () => hideModal('modalMediaUrl'));
        $('btnMediaUrlConfirm').addEventListener('click', () => {
            try {
                addMediaUrl($('mediaUrlInput').value.trim(), $('mediaUrlTitle').value.trim());
                hideModal('modalMediaUrl');
                renderMediaGrid();
                renderMediaPopoverList();
            } catch (err) {
                $('mediaUrlError').textContent = err.message;
            }
        });
        $('mediaUrlInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') $('btnMediaUrlConfirm').click();
        });

        // Quick media popover
        function openMediaPopover() {
            renderMediaPopoverList();
            $('mediaPopover').hidden = false;
        }
        function closeMediaPopover() {
            $('mediaPopover').hidden = true;
        }
        $('btnQuickMedia').addEventListener('click', (e) => {
            e.stopPropagation();
            const pop = $('mediaPopover');
            if (pop.hidden) openMediaPopover(); else closeMediaPopover();
        });
        $('btnMediaPopoverClose').addEventListener('click', closeMediaPopover);
        $('btnMediaStop').addEventListener('click', () => {
            hideMedia();
            closeMediaPopover();
        });
        document.addEventListener('click', (e) => {
            const pop = $('mediaPopover');
            if (!pop || pop.hidden) return;
            if (!pop.contains(e.target) && e.target.id !== 'btnQuickMedia' && !$('btnQuickMedia').contains(e.target)) {
                closeMediaPopover();
            }
        });
        $('btnBackFromSettings').addEventListener('click', cancelSettings);
        $('btnSettingsSave').addEventListener('click', saveSettings);
        $('btnSettingsReset').addEventListener('click', resetSettings);

        document.querySelectorAll('.theme-preset').forEach(p => {
            p.addEventListener('click', () => applyPreset(p.dataset.preset));
        });

        ['colorBg', 'colorGold', 'colorBall'].forEach(id => {
            $(id).addEventListener('input', () => {
                draftSettings[id === 'colorBg' ? 'colorBg' : id === 'colorGold' ? 'colorGold' : 'colorBall'] = $(id).value;
                draftSettings.preset = 'custom';
                document.querySelectorAll('.theme-preset').forEach(p => p.classList.remove('active'));
                previewDraft();
            });
        });

        ['settingEventName', 'settingEventTagline', 'settingFooterMsg'].forEach(id => {
            $(id).addEventListener('input', () => {
                const key = id === 'settingEventName' ? 'eventName'
                          : id === 'settingEventTagline' ? 'eventTagline'
                          : 'footerMsg';
                draftSettings[key] = $(id).value;
                previewDraft();
            });
        });

        document.querySelectorAll('input[name="boardOrder"]').forEach(r => {
            r.addEventListener('change', () => {
                if (!draftSettings) return;
                draftSettings.boardOrder = r.value === 'column' ? 'column' : 'row';
            });
        });

        // Showcase pustaka
        $('showcaseEnabled').addEventListener('change', () => {
            if (!draftSettings) return;
            if (!draftSettings.showcase) draftSettings.showcase = { enabled: false, items: [] };
            draftSettings.showcase.enabled = $('showcaseEnabled').checked;
        });
        $('showcaseUploadFile').addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            files.forEach(handleShowcaseUpload);
            e.target.value = '';
        });
        $('btnShowcaseAddUrl').addEventListener('click', openShowcaseUrlModal);
        $('btnShowcaseUrlCancel').addEventListener('click', () => hideModal('modalShowcaseUrl'));
        $('btnShowcaseUrlConfirm').addEventListener('click', confirmShowcaseUrl);
        $('showcaseUrlInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') confirmShowcaseUrl();
        });

        $('logoFile').addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleLogoUpload(e.target.files[0]);
                e.target.value = '';
            }
        });
        $('btnLogoReset').addEventListener('click', () => {
            draftSettings.logo = null;
            loadSettingsFormFromDraft();
            previewDraft();
        });
        $('btnGenerate').addEventListener('click', generateKupons);
        $('btnPrint').addEventListener('click', () => window.print());

        $('btnFullscreen').addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen?.();
            } else {
                document.exitFullscreen?.();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (document.querySelector('.modal.active')) {
                if (e.key === 'Escape') {
                    pendingPick = null;
                    document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
                } else if (e.key === 'Enter' && $('modalPick').classList.contains('active')) {
                    confirmPick();
                }
                return;
            }
            if ($('page-game').classList.contains('active')) {
                if (e.code === 'Space') {
                    e.preventDefault();
                    drawAuto();
                } else if (e.key.toLowerCase() === 'm') {
                    els.btnManual.click();
                } else if (e.key.toLowerCase() === 'u') {
                    undo();
                }
            }
        });
    }

    let pesertaHideTimer = null;
    function showMediaError(msg) {
        const errEl = $('pesertaMediaError');
        if (!errEl) return;
        errEl.textContent = msg;
        errEl.hidden = false;
    }
    function hideMediaError() {
        const errEl = $('pesertaMediaError');
        if (errEl) {
            errEl.hidden = true;
            errEl.textContent = '';
        }
    }
    function pesertaShowMedia(media) {
        const overlay = $('pesertaMediaOverlay');
        const img = $('pesertaMediaImg');
        const vid = $('pesertaMediaVideo');
        const iframe = $('pesertaMediaIframe');
        if (!overlay) return;
        if (pesertaHideTimer) {
            clearTimeout(pesertaHideTimer);
            pesertaHideTimer = null;
        }

        hideMediaError();
        // Reset semua media element dulu
        if (img) { img.removeAttribute('src'); img.hidden = true; img.onerror = null; }
        if (vid) { vid.pause(); vid.removeAttribute('src'); vid.load(); vid.hidden = true; vid.onerror = null; }
        if (iframe) { iframe.removeAttribute('src'); iframe.hidden = true; }

        if (media.kind === 'image' || media.kind === 'url') {
            if (img) {
                img.onerror = () => {
                    showMediaError(media.kind === 'url'
                        ? 'Gambar tidak bisa dimuat. URL mungkin invalid atau server memblokir akses lintas-origin.'
                        : 'Gagal memuat gambar.');
                    img.hidden = true;
                };
                img.src = media.src;
                img.hidden = false;
            }
        } else if (media.kind === 'video' || media.kind === 'video-url') {
            if (vid) {
                vid.onerror = () => {
                    showMediaError(media.kind === 'video-url'
                        ? 'Video tidak bisa dimuat. Server mungkin memblokir akses cross-origin (CORS). Coba host video di tempat lain atau upload sebagai file lokal.'
                        : 'Gagal memuat video lokal.');
                };
                vid.src = media.src;
                vid.muted = true;
                vid.controls = false;
                vid.autoplay = true;
                vid.loop = false;
                vid.hidden = false;
                vid.play().catch(() => {});
            }
        } else if (media.kind === 'youtube') {
            if (iframe) {
                const id = media.src;
                if (window.location.protocol === 'file:') {
                    showMediaError(
                        'Embed YouTube tidak didukung saat aplikasi dibuka via file://. ' +
                        'Jalankan start.bat untuk membuka aplikasi via http://localhost:8080, ' +
                        'lalu coba lagi.'
                    );
                    return;
                }
                const origin = encodeURIComponent(window.location.origin);
                iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1&origin=${origin}`;
                iframe.hidden = false;
            }
        }

        overlay.hidden = false;
        overlay.classList.remove('hiding');
    }

    function pesertaHideMedia() {
        const overlay = $('pesertaMediaOverlay');
        const img = $('pesertaMediaImg');
        const vid = $('pesertaMediaVideo');
        const iframe = $('pesertaMediaIframe');
        if (!overlay) return;
        hideMediaError();
        overlay.classList.add('hiding');
        // Pause video segera (jangan tunggu fade) agar suara langsung berhenti
        if (vid) {
            try { vid.pause(); } catch (e) {}
        }
        if (iframe) {
            iframe.removeAttribute('src');
        }
        if (pesertaHideTimer) clearTimeout(pesertaHideTimer);
        pesertaHideTimer = setTimeout(() => {
            overlay.hidden = true;
            overlay.classList.remove('hiding');
            if (img) { img.removeAttribute('src'); img.hidden = true; }
            if (vid) { vid.removeAttribute('src'); vid.load(); vid.hidden = true; }
            if (iframe) { iframe.hidden = true; }
            pesertaHideTimer = null;
            if (isPesertaView) renderPeserta(null);
        }, 300);
    }

    function applyRemoteState(remote, justDrawn) {
        if (!remote) return;
        state.activeColor = remote.activeColor || state.activeColor;
        let gridChanged = false;
        if (remote.grid && remote.grid.cols && remote.grid.rows) {
            if (remote.grid.cols !== state.grid.cols || remote.grid.rows !== state.grid.rows) {
                gridChanged = true;
            }
            state.grid = { cols: remote.grid.cols, rows: remote.grid.rows };
        }
        if (remote.sessions) {
            COLORS.forEach(c => {
                if (remote.sessions[c]) state.sessions[c] = remote.sessions[c];
            });
        }
        let orderChanged = false;
        if (remote.settings) {
            const oldOrder = state.settings.boardOrder || 'row';
            state.settings = { ...DEFAULT_SETTINGS, ...remote.settings };
            const newOrder = state.settings.boardOrder || 'row';
            if (oldOrder !== newOrder) orderChanged = true;
            applySettings();
        }
        if (isPesertaView) {
            if (gridChanged || orderChanged) {
                buildPesertaBoard();
            }
            renderPeserta(justDrawn);
        } else {
            buildBoard();
            syncGridSelect();
            renderAll(null, false);
        }
    }

    function initPeserta() {
        document.body.classList.add('peserta-mode');
        showPage('page-peserta');
        loadState();
        applySettings();
        buildPesertaBoard();
        renderPeserta(null);

        window.addEventListener('resize', updatePesertaBoardSize);
        if (typeof ResizeObserver !== 'undefined') {
            const pb = $('pesertaBoard');
            if (pb) new ResizeObserver(updatePesertaBoardSize).observe(pb);
        }

        if (channel) {
            channel.addEventListener('message', (e) => {
                const msg = e.data;
                if (!msg) return;
                if (msg.type === 'state') {
                    applyRemoteState(msg.state, msg.justDrawn);
                } else if (msg.type === 'media-show' && msg.media) {
                    pesertaShowMedia(msg.media);
                } else if (msg.type === 'media-hide') {
                    pesertaHideMedia();
                }
            });
            try { channel.postMessage({ type: 'peserta-ready' }); } catch (e) {}
        }
        window.addEventListener('storage', (e) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                try {
                    const remote = JSON.parse(e.newValue);
                    applyRemoteState(remote, null);
                } catch (err) {}
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.fullscreenElement) {
                document.exitFullscreen?.();
            } else if (e.key.toLowerCase() === 'f') {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen?.();
                } else {
                    document.exitFullscreen?.();
                }
            }
        });
    }

    function init() {
        if (isPesertaView) {
            initPeserta();
            return;
        }
        els.board = $('board');
        els.currentNumber = $('currentNumber');
        els.bigBall = $('bigBall');
        els.historyList = $('historyList');
        els.counterDrawn = $('counterDrawn');
        els.counterTotal = $('counterTotal');
        els.headerNumberMini = $('headerNumberMini');
        els.headerNumber = $('headerNumber');
        els.activeColorLabel = $('activeColorLabel');
        els.activeColorBadge = $('activeColorBadge');
        els.btnDraw = $('btnDraw');
        els.btnUndo = $('btnUndo');
        els.btnReset = $('btnReset');
        els.btnManual = $('btnManual');
        els.btnGenerator = $('btnGenerator');
        els.genFormat = $('genFormat');
        els.genCount = $('genCount');
        els.genPreview = $('genPreview');
        els.gridSelect = $('gridSelect');

        loadState();
        loadMedia();
        applySettings();
        buildBoard();
        wireEvents();
        syncGridSelect();

        if (channel) {
            channel.addEventListener('message', async (e) => {
                if (e.data && e.data.type === 'peserta-ready') {
                    broadcast({ type: 'state', state, justDrawn: null });
                    const active = mediaStore.items.find(x => x.id === mediaStore.activeId);
                    if (active) {
                        let src = active.src;
                        if (active.kind === 'video') {
                            const blob = await idbGet(active.id);
                            if (blob) src = await blobToDataUrl(blob);
                        }
                        broadcast({ type: 'media-show', media: { id: active.id, kind: active.kind, src, mime: active.mime, title: active.title } });
                    }
                }
            });
        }
        renderAll(null, false);

        window.addEventListener('resize', updateBoardSize);
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(updateBoardSize).observe(els.board);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
