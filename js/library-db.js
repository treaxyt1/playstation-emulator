/**
 * ePSXemu - IndexedDB ROM Manager
 * Handles persistent storage of large .bin files in the browser
 */

const DB_NAME = 'ePSXemu_Library';
const DB_VERSION = 1;
const STORE_ROMS = 'roms';
const STORE_METADATA = 'metadata';

class LibraryDB {
    constructor() {
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_ROMS)) {
                    db.createObjectStore(STORE_ROMS);
                }
                if (!db.objectStoreNames.contains(STORE_METADATA)) {
                    db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }

    async saveROM(file) {
        const id = crypto.randomUUID();
        const arrayBuffer = await file.arrayBuffer();

        // Save binary data
        const romTx = this.db.transaction(STORE_ROMS, 'readwrite');
        const romStore = romTx.objectStore(STORE_ROMS);
        await this._promisify(romStore.put(arrayBuffer, id));

        // Save metadata
        const meta = {
            id: id,
            name: file.name,
            size: file.size,
            addedDate: new Date().toISOString(),
            lastPlayed: null,
            format: 'bin'
        };
        const metaTx = this.db.transaction(STORE_METADATA, 'readwrite');
        const metaStore = metaTx.objectStore(STORE_METADATA);
        await this._promisify(metaStore.put(meta));

        return meta;
    }

    async getAllMetadata() {
        const tx = this.db.transaction(STORE_METADATA, 'readonly');
        const store = tx.objectStore(STORE_METADATA);
        return this._promisify(store.getAll());
    }

    async getROMData(id) {
        const tx = this.db.transaction(STORE_ROMS, 'readonly');
        const store = tx.objectStore(STORE_ROMS);
        return this._promisify(store.get(id));
    }

    async deleteGame(id) {
        const romTx = this.db.transaction(STORE_ROMS, 'readwrite');
        await this._promisify(romTx.objectStore(STORE_ROMS).delete(id));

        const metaTx = this.db.transaction(STORE_METADATA, 'readwrite');
        await this._promisify(metaTx.objectStore(STORE_METADATA).delete(id));
    }

    async updateLastPlayed(id) {
        const tx = this.db.transaction(STORE_METADATA, 'readwrite');
        const store = tx.objectStore(STORE_METADATA);
        const meta = await this._promisify(store.get(id));
        if (meta) {
            meta.lastPlayed = new Date().toISOString();
            await this._promisify(store.put(meta));
        }
    }

    _promisify(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

const libraryDB = new LibraryDB();
window.libraryDB = libraryDB; // Export to global for app.js
