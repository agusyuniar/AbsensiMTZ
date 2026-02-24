/**
 * PhotoStore — IndexedDB-based photo storage.
 * Stores photos as blobs in IndexedDB instead of base64 in localStorage.
 * This avoids localStorage quota issues and improves performance.
 */
const PhotoStore = (() => {
    const DB_NAME = 'am_photos';
    const DB_VERSION = 1;
    const STORE_NAME = 'photos';
    let _db = null;

    /** Open or create the IndexedDB database */
    function _openDB() {
        if (_db) return Promise.resolve(_db);
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            req.onsuccess = (e) => {
                _db = e.target.result;
                resolve(_db);
            };
            req.onerror = (e) => {
                console.warn('PhotoStore DB error:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    /**
     * Save a photo (base64 data URL or blob).
     * @param {string} id - Unique key, e.g. "profile_PGW-001" or "attendance_LOG-xxx_masuk"
     * @param {string} base64DataUrl - The data:image/jpeg;base64,... string
     */
    async function save(id, base64DataUrl) {
        try {
            const db = await _openDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).put({ id, data: base64DataUrl, ts: Date.now() });
                tx.oncomplete = () => resolve(true);
                tx.onerror = (e) => reject(e.target.error);
            });
        } catch (e) {
            console.warn('PhotoStore save error:', e);
            return false;
        }
    }

    /**
     * Load a photo by id.
     * @param {string} id - The unique key
     * @returns {Promise<string|null>} - base64 data URL or null
     */
    async function load(id) {
        try {
            const db = await _openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(id);
                req.onsuccess = () => resolve(req.result?.data || null);
                req.onerror = () => resolve(null);
            });
        } catch (e) {
            return null;
        }
    }

    /**
     * Delete a photo by id.
     */
    async function remove(id) {
        try {
            const db = await _openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(id);
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => resolve(false);
            });
        } catch (e) {
            return false;
        }
    }

    /**
     * Migrate existing base64 photos from localStorage to IndexedDB.
     * Call once after init.
     */
    async function migrateFromLocalStorage() {
        try {
            // Migrate profile pictures
            const pics = JSON.parse(localStorage.getItem('am_profile_pics') || '{}');
            const keys = Object.keys(pics);
            if (keys.length > 0) {
                for (const empId of keys) {
                    if (pics[empId]) {
                        await save(`profile_${empId}`, pics[empId]);
                    }
                }
                localStorage.removeItem('am_profile_pics');
                console.log(`PhotoStore: migrated ${keys.length} profile pics`);
            }

            // Migrate attendance photos from am_attendance logs
            const logs = JSON.parse(localStorage.getItem('am_attendance') || '[]');
            let migratedCount = 0;
            for (const log of logs) {
                if (log.foto_masuk && log.foto_masuk.startsWith('data:')) {
                    await save(`attendance_${log.id_log}_masuk`, log.foto_masuk);
                    log.foto_masuk = `idb:attendance_${log.id_log}_masuk`;
                    migratedCount++;
                }
                if (log.foto_keluar && log.foto_keluar.startsWith('data:')) {
                    await save(`attendance_${log.id_log}_keluar`, log.foto_keluar);
                    log.foto_keluar = `idb:attendance_${log.id_log}_keluar`;
                    migratedCount++;
                }
            }
            if (migratedCount > 0) {
                localStorage.setItem('am_attendance', JSON.stringify(logs));
                console.log(`PhotoStore: migrated ${migratedCount} attendance photos`);
            }
        } catch (e) {
            console.warn('PhotoStore migration error:', e);
        }
    }

    /**
     * Resolve a photo reference: if it's an idb: reference, load from IndexedDB.
     * Otherwise return the value as-is (base64 or URL).
     * @param {string} ref - The photo reference
     * @returns {Promise<string|null>}
     */
    async function resolve(ref) {
        if (!ref) return null;
        if (ref.startsWith('idb:')) {
            return await load(ref.substring(4));
        }
        return ref; // Already a data URL or regular URL
    }

    return { save, load, remove, resolve, migrateFromLocalStorage };
})();
