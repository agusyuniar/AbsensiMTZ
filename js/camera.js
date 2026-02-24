/**
 * Camera module — Selfie capture via MediaDevices API.
 */
const Camera = (() => {
    let stream = null;
    let videoElement = null;

    /**
     * Start camera and attach to a video element.
     */
    async function start(videoEl) {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 640 }
                },
                audio: false
            });
            videoEl.srcObject = stream;
            videoEl.play();
            videoElement = videoEl;
            return true;
        } catch (err) {
            console.error('Camera error:', err);
            throw new Error('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.');
        }
    }

    /**
     * Capture current frame as base64 JPEG.
     */
    function capture() {
        if (!videoElement) throw new Error('Kamera belum aktif');

        const canvas = document.createElement('canvas');
        const size = 480;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Center crop
        const vw = videoElement.videoWidth;
        const vh = videoElement.videoHeight;
        const cropSize = Math.min(vw, vh);
        const sx = (vw - cropSize) / 2;
        const sy = (vh - cropSize) / 2;

        ctx.drawImage(videoElement, sx, sy, cropSize, cropSize, 0, 0, size, size);

        return canvas.toDataURL('image/jpeg', 0.7);
    }

    /**
     * Stop camera stream.
     */
    function stop() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (videoElement) {
            videoElement.srcObject = null;
            videoElement = null;
        }
    }

    return { start, capture, stop };
})();
