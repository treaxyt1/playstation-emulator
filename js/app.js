/**
 * ePSXemu - Main Application Logic
 * Integrates LibraryDB with the real-time Emulator UI
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize Library Database
    try {
        await window.libraryDB.init();
        showLibrary();
    } catch (err) {
        console.error("DB Init Failed:", err);
    }

    const emuFrame = document.getElementById('emu-frame');
    const romList = document.getElementById('rom-list');
    const emptyState = document.getElementById('library-empty');
    const addBtn = document.getElementById('add-rom-btn');
    const fileInput = document.getElementById('rom-upload-input');
    const dropZone = document.getElementById('drop-zone');
    const dropOverlay = document.getElementById('drop-overlay');

    // 2. Library Rendering
    async function showLibrary() {
        const games = await window.libraryDB.getAllMetadata();

        if (games.length === 0) {
            emptyState.style.display = 'block';
            romList.innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';
        romList.innerHTML = '';

        // Sort by last played or added date
        games.sort((a, b) => new Date(b.addedDate) - new Date(a.addedDate));

        games.forEach(game => {
            const card = document.createElement('div');
            card.className = 'game-card-mini';
            card.innerHTML = `
                <div style="background:rgba(255,255,255,0.05); border-radius:6px; display:grid; place-items:center;">💿</div>
                <div style="overflow:hidden;">
                    <div style="font-size:0.85rem; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${game.name}</div>
                    <div style="font-size:0.65rem; color:var(--text-muted)">${formatSize(game.size)}</div>
                </div>
                <button class="delete-btn" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">✕</button>
            `;

            // Click to Play
            card.onclick = (e) => {
                if (e.target.className === 'delete-btn') return;
                launchGame(game.id);
                document.querySelectorAll('.game-card-mini').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
            };

            // Delete action
            card.querySelector('.delete-btn').onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Delete ${game.name} from your local library?`)) {
                    await window.libraryDB.deleteGame(game.id);
                    showLibrary();
                }
            };

            romList.appendChild(card);
        });
    }

    function formatSize(bytes) {
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    // 3. Launching Logic
    async function launchGame(id) {
        const status = document.getElementById('status-display');
        status.innerText = "LOADING DISK IMAGE...";

        try {
            const data = await window.libraryDB.getROMData(id);
            const metadata = (await window.libraryDB.getAllMetadata()).find(m => m.id === id);

            // Update last played
            await window.libraryDB.updateLastPlayed(id);

            // We need to pass the file blob to the emulator.
            // Since browsers block passing Blobs directly across frames easily without Blob URLs
            const blob = new Blob([data], { type: 'application/octet-stream' });
            const file = new File([blob], metadata.name, { type: 'application/octet-stream' });

            // Bridge to emulator frame
            if (emuFrame.contentWindow && emuFrame.contentWindow.readFile) {
                // The emulator's readFile expects an array of File objects
                emuFrame.contentWindow.readFile([file]);
                status.innerText = "RUNNING: " + metadata.name;
            } else {
                // If not ready, wait a bit
                emuFrame.src = "PlayStationMenu.htm";
                setTimeout(() => {
                    emuFrame.contentWindow.readFile([file]);
                    status.innerText = "RUNNING: " + metadata.name;
                }, 1000);
            }
        } catch (err) {
            console.error("Launch Error:", err);
            status.innerText = "ERROR LOADING GAME";
        }
    }

    // 4. File Upload Handling
    addBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        if (e.target.files.length > 0) {
            await processFiles(e.target.files);
        }
    };

    async function processFiles(files) {
        const status = document.getElementById('status-display');
        status.innerText = "INSTALLING GAMES...";

        for (const file of files) {
            if (file.name.toLowerCase().endsWith('.bin')) {
                await window.libraryDB.saveROM(file);
            } else {
                alert(`Unsupported format: ${file.name}. Only .bin is currently supported.`);
            }
        }

        status.innerText = "SYSTEM READY";
        showLibrary();
    }

    // 5. Drag & Drop
    dropZone.ondragover = (e) => {
        e.preventDefault();
        dropOverlay.style.display = 'grid';
    };

    dropZone.ondragleave = () => {
        dropOverlay.style.display = 'none';
    };

    dropZone.ondrop = async (e) => {
        e.preventDefault();
        dropOverlay.style.display = 'none';
        if (e.dataTransfer.files.length > 0) {
            await processFiles(e.dataTransfer.files);
        }
    };

    // 6. UI Controls Bridge
    document.getElementById('emu-fs').onclick = () => {
        const wrapper = document.getElementById('drop-zone');
        if (wrapper.requestFullscreen) wrapper.requestFullscreen();
        else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
    };

    document.getElementById('emu-reset').onclick = () => {
        if (emuFrame.contentWindow && emuFrame.contentWindow.reloadGame) {
            emuFrame.contentWindow.reloadGame();
        }
    };

    document.getElementById('emu-sound').onclick = () => {
        if (emuFrame.contentWindow && emuFrame.contentWindow.toggleSound) {
            emuFrame.contentWindow.toggleSound();
        }
    };

    // 7. Help Modal Logic
    const helpBtn = document.getElementById('emu-info');
    const helpModal = document.getElementById('help-modal-overlay');
    const closeHelp = document.getElementById('close-help');

    if (helpBtn && helpModal && closeHelp) {
        helpBtn.onclick = () => helpModal.classList.add('active');
        closeHelp.onclick = () => helpModal.classList.remove('active');

        // Close on clicking outside
        helpModal.onclick = (e) => {
            if (e.target === helpModal) helpModal.classList.remove('active');
        };
    }
});
