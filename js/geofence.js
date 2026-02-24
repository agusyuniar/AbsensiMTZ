/**
 * Geofence module — GPS detection & Haversine distance calculation.
 */
const Geofence = (() => {
    let currentPosition = null;

    /**
     * Calculate distance between 2 points using Haversine formula.
     * Returns distance in meters.
     */
    function haversine(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const toRad = deg => (deg * Math.PI) / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    /**
     * Get current GPS position.
     * Returns a Promise that resolves with { lat, lng, accuracy }.
     */
    function getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation tidak didukung oleh browser ini'));
                return;
            }
            navigator.geolocation.getCurrentPosition(
                pos => {
                    currentPosition = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    };
                    resolve(currentPosition);
                },
                err => {
                    switch (err.code) {
                        case err.PERMISSION_DENIED:
                            reject(new Error('Akses lokasi ditolak. Silakan izinkan akses GPS.'));
                            break;
                        case err.POSITION_UNAVAILABLE:
                            reject(new Error('Informasi lokasi tidak tersedia.'));
                            break;
                        case err.TIMEOUT:
                            reject(new Error('Waktu permintaan lokasi habis.'));
                            break;
                        default:
                            reject(new Error('Gagal mendapatkan lokasi.'));
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 0
                }
            );
        });
    }

    /**
     * Validate position against a list of geofence locations.
     * Returns the matched location object or null.
     */
    function validatePosition(lat, lng, locations) {
        for (const loc of locations) {
            const distance = haversine(lat, lng, loc.latitude, loc.longitude);
            if (distance <= loc.radius_meter) {
                return {
                    location: loc,
                    distance: Math.round(distance),
                    isInside: true
                };
            }
        }
        // Find nearest
        let nearest = null;
        let nearestDist = Infinity;
        for (const loc of locations) {
            const distance = haversine(lat, lng, loc.latitude, loc.longitude);
            if (distance < nearestDist) {
                nearestDist = distance;
                nearest = loc;
            }
        }
        return {
            location: nearest,
            distance: Math.round(nearestDist),
            isInside: false
        };
    }

    /**
     * Get & validate in one step.
     */
    async function detectAndValidate(locations) {
        const pos = await getCurrentPosition();
        const result = validatePosition(pos.lat, pos.lng, locations);
        return {
            position: pos,
            ...result
        };
    }

    function getLastPosition() {
        return currentPosition;
    }

    return {
        haversine,
        getCurrentPosition,
        validatePosition,
        detectAndValidate,
        getLastPosition
    };
})();
