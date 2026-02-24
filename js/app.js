/**
 * App — Main SPA router, state management, and attendance flow controller.
 */
const App = (() => {
    let currentPage = 'home';
    let user = null;

    function init() {
        if (!Auth.requireAuth()) return;
        user = Auth.getUser();

        // Pre-request GPS and camera permissions once at login (non-blocking)
        _preRequestPermissions();

        navigate(window.location.hash.replace('#', '') || 'home');
    }

    /** Request GPS + camera permissions upfront and cache the result */
    async function _preRequestPermissions() {
        // Only for employee/kepala_unit roles who use attendance features
        if (user.role === 'admin') return;

        // Already cached as granted? Skip.
        const cached = JSON.parse(localStorage.getItem('am_permissions') || '{}');
        if (cached.geo === 'granted' && cached.cam === 'granted') return;

        try {
            // Request geolocation
            if (cached.geo !== 'granted') {
                try {
                    await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            () => resolve(),
                            (err) => reject(err),
                            { timeout: 8000 }
                        );
                    });
                    cached.geo = 'granted';
                } catch (e) {
                    cached.geo = 'denied';
                }
            }

            // Request camera
            if (cached.cam !== 'granted') {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                    stream.getTracks().forEach(t => t.stop());
                    cached.cam = 'granted';
                } catch (e) {
                    cached.cam = 'denied';
                }
            }

            localStorage.setItem('am_permissions', JSON.stringify(cached));
        } catch (e) {
            // Silently fail
        }
    }

    /** Get cached permission state without re-prompting */
    function getPermissionState() {
        return JSON.parse(localStorage.getItem('am_permissions') || '{}');
    }

    /** Detect device info for attendance logs */
    function _getDeviceInfo() {
        const ua = navigator.userAgent;
        let device = 'Desktop';
        let os = 'Unknown';

        // Device type
        if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) device = 'Mobile';
        else if (/Tablet|iPad/i.test(ua)) device = 'Tablet';

        // OS
        if (/Android/i.test(ua)) os = 'Android';
        else if (/iPhone|iPad|iPod|Mac OS/i.test(ua)) os = /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : 'macOS';
        else if (/Windows/i.test(ua)) os = 'Windows';
        else if (/Linux/i.test(ua)) os = 'Linux';
        else if (/CrOS/i.test(ua)) os = 'ChromeOS';

        // Browser
        let browser = 'Unknown';
        if (/Edg\//i.test(ua)) browser = 'Edge';
        else if (/Chrome/i.test(ua)) browser = 'Chrome';
        else if (/Firefox/i.test(ua)) browser = 'Firefox';
        else if (/Safari/i.test(ua)) browser = 'Safari';
        else if (/Opera|OPR/i.test(ua)) browser = 'Opera';

        return `${device} · ${os} · ${browser}`;
    }

    function navigate(page) {
        currentPage = page;
        window.location.hash = page;
        const app = document.getElementById('app');

        switch (user.role) {
            case 'admin':
                _renderAdmin(app, page);
                break;
            case 'kepala_unit':
                _renderUnitHead(app, page);
                break;
            default:
                _renderEmployee(app, page);
        }
    }

    async function _renderEmployee(app, page) {
        switch (page) {
            case 'home':
                app.innerHTML = EmployeePage.renderHome(user);
                await EmployeePage.initHome(user);
                break;
            case 'history':
                app.innerHTML = EmployeePage.renderHistory(user);
                await EmployeePage.initHistory(user);
                break;
            case 'profile':
                app.innerHTML = EmployeePage.renderProfile(user);
                await EmployeePage.initProfile(user);
                break;
            default:
                navigate('home');
        }
    }

    async function _renderUnitHead(app, page) {
        // Unit Head uses internal section navigation like admin
        const section = page === 'home' ? 'dashboard' : page;
        app.innerHTML = UnitHeadPage.render(user, section);
        await UnitHeadPage.init(user);
    }

    async function _renderAdmin(app, page) {
        // Admin uses internal section navigation
        const section = page === 'home' ? 'dashboard' : page;
        app.innerHTML = AdminPage.render(user, section);
        await AdminPage.init(user);
    }

    // --- Attendance Flow ---
    async function startAbsenFlow(type) {
        const flow = document.getElementById('absenFlow');
        const body = document.getElementById('absenFlowBody');
        const title = document.getElementById('absenFlowTitle');

        title.textContent = type === 'masuk' ? 'Absen Masuk' : 'Absen Keluar';
        flow.classList.add('active');

        // Step 1: GPS Detection
        body.innerHTML = `
      <div class="steps">
        <div class="step active"><div class="step-circle">1</div></div>
        <div class="step-line"></div>
        <div class="step"><div class="step-circle">2</div></div>
        <div class="step-line"></div>
        <div class="step"><div class="step-circle">3</div></div>
        <div class="step-line"></div>
        <div class="step"><div class="step-circle">4</div></div>
      </div>
      <div style="font-size:64px;margin-bottom:16px;">📍</div>
      <h3 style="margin-bottom:8px;">Mendeteksi Lokasi...</h3>
      <p class="text-sm text-muted">Memastikan Anda berada di area yang valid</p>
      <div class="spinner" style="width:32px;height:32px;border:3px solid #EEE;border-top-color:var(--primary);border-radius:50%;animation:spin 0.8s linear infinite;margin:24px auto;"></div>
    `;

        let locationResult = null;
        let isDinasLuar = false;

        try {
            const locations = await API.getLocations();
            locationResult = await Geofence.detectAndValidate(locations);

            if (locationResult.isInside) {
                body.innerHTML = `
          <div class="steps">
            <div class="step done"><div class="step-circle">✓</div></div>
            <div class="step-line"></div>
            <div class="step active"><div class="step-circle">2</div></div>
            <div class="step-line"></div>
            <div class="step"><div class="step-circle">3</div></div>
            <div class="step-line"></div>
            <div class="step"><div class="step-circle">4</div></div>
          </div>
          <div style="font-size:48px;margin-bottom:12px;">✅</div>
          <h3 style="margin-bottom:4px;">Lokasi Tervalidasi</h3>
          <p class="text-sm" style="color:var(--success);font-weight:600;margin-bottom:4px;">${locationResult.location.nama_lokasi}</p>
          <p class="text-sm text-muted" style="margin-bottom:24px;">Jarak: ${locationResult.distance}m dari titik pusat</p>
          <button class="btn btn-primary" onclick="App._absenStep2('${type}')">Lanjutkan ke Foto →</button>
        `;
            } else {
                // Outside geofence — all employees can attend with warning
                isDinasLuar = true;
                body.innerHTML = `
            <div class="steps">
              <div class="step done"><div class="step-circle">✓</div></div>
              <div class="step-line"></div>
              <div class="step active"><div class="step-circle">2</div></div>
              <div class="step-line"></div>
              <div class="step"><div class="step-circle">3</div></div>
              <div class="step-line"></div>
              <div class="step"><div class="step-circle">4</div></div>
            </div>
            <div style="font-size:48px;margin-bottom:12px;">⚠️</div>
            <h3 style="margin-bottom:4px;color:var(--warning);">Di Luar Lokasi Penempatan</h3>
            <p class="text-sm text-muted" style="margin-bottom:4px;">Anda berada di luar jangkauan geofence kantor</p>
            <p class="text-sm text-muted" style="margin-bottom:16px;">Terdekat: ${locationResult.location.nama_lokasi} (${locationResult.distance}m)</p>
            <div style="background:var(--warning-light);padding:12px 16px;border-radius:var(--radius-md);margin-bottom:20px;">
              <p class="text-sm" style="color:var(--warning);"><strong>⚠️ Peringatan:</strong> Absensi di luar lokasi kantor akan dicatat dan memerlukan persetujuan atasan.</p>
            </div>
            <button class="btn btn-accent" onclick="App._absenStep2('${type}', true)">Lanjutkan Absensi →</button>
            <button class="btn btn-outline" style="margin-top:8px;" onclick="App.closeAbsenFlow()">Batal</button>
          `;
            }
        } catch (err) {
            body.innerHTML = `
        <div style="font-size:48px;margin-bottom:12px;">❌</div>
        <h3 style="margin-bottom:8px;color:var(--error);">Gagal Mendapatkan Lokasi</h3>
        <p class="text-sm text-muted" style="margin-bottom:24px;">${err.message}</p>
        <button class="btn btn-outline" onclick="App.closeAbsenFlow()">Tutup</button>
      `;
        }

        // Store flow state
        window._absenFlowState = { type, locationResult, isDinasLuar };
    }

    async function _absenStep2(type, dinasLuar) {
        const body = document.getElementById('absenFlowBody');
        window._absenFlowState.isDinasLuar = !!dinasLuar;

        body.innerHTML = `
      <div class="steps">
        <div class="step done"><div class="step-circle">✓</div></div>
        <div class="step-line"></div>
        <div class="step done"><div class="step-circle">✓</div></div>
        <div class="step-line"></div>
        <div class="step active"><div class="step-circle">3</div></div>
        <div class="step-line"></div>
        <div class="step"><div class="step-circle">4</div></div>
      </div>
      <h3 style="margin-bottom:8px;">Ambil Foto Selfie</h3>
      <p class="text-sm text-muted" style="margin-bottom:16px;">Pastikan wajah terlihat jelas</p>
      <div class="camera-container">
        <video id="cameraVideo" autoplay playsinline muted></video>
        <div class="capture-hint">Posisikan wajah di tengah</div>
      </div>
      <button class="btn btn-primary btn-lg" id="captureBtn" onclick="App._capturePhoto()">📸 Ambil Foto</button>
    `;

        try {
            await Camera.start(document.getElementById('cameraVideo'));
        } catch (err) {
            body.innerHTML += `
        <p style="color:var(--error);margin-top:16px;font-size:0.85rem;">${err.message}</p>
        <button class="btn btn-outline" style="margin-top:12px;" onclick="App._skipPhoto('${type}')">Lewati Foto →</button>
      `;
        }
    }

    function _capturePhoto() {
        try {
            const photo = Camera.capture();
            Camera.stop();
            window._absenFlowState.photo = photo;
            _absenStep3();
        } catch (err) {
            showToast('Gagal mengambil foto: ' + err.message);
        }
    }

    function _skipPhoto(type) {
        Camera.stop();
        window._absenFlowState.photo = '';
        _absenStep3();
    }

    function _absenStep3() {
        const body = document.getElementById('absenFlowBody');
        const state = window._absenFlowState;
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        body.innerHTML = `
      <div class="steps">
        <div class="step done"><div class="step-circle">✓</div></div>
        <div class="step-line"></div>
        <div class="step done"><div class="step-circle">✓</div></div>
        <div class="step-line"></div>
        <div class="step done"><div class="step-circle">✓</div></div>
        <div class="step-line"></div>
        <div class="step active"><div class="step-circle">4</div></div>
      </div>
      <h3 style="margin-bottom:20px;">Konfirmasi Absensi</h3>
      
      <div class="card" style="text-align:left;max-width:360px;width:100%;margin-bottom:20px;">
        ${state.photo ? `<img src="${state.photo}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 12px;display:block;">` : ''}
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;">
          <span class="text-sm text-muted">Tipe</span>
          <span class="text-sm fw-600">${state.type === 'masuk' ? 'Absen Masuk' : 'Absen Keluar'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;">
          <span class="text-sm text-muted">Waktu</span>
          <span class="text-sm fw-600">${timeStr}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F0F0F0;">
          <span class="text-sm text-muted">Lokasi</span>
          <span class="text-sm fw-600">${state.locationResult?.location?.nama_lokasi || 'N/A'}</span>
        </div>
        ${state.isDinasLuar ? `
        <div style="display:flex;justify-content:space-between;padding:8px 0;">
          <span class="text-sm text-muted">Status</span>
          <span class="badge badge-warning">Dinas Luar</span>
        </div>` : ''}
      </div>

      <button class="btn btn-primary btn-lg" onclick="App._submitAbsen()" id="submitAbsenBtn">
        ✓ Kirim Absensi
      </button>
    `;
    }

    async function _submitAbsen() {
        const btn = document.getElementById('submitAbsenBtn');
        btn.innerHTML = '<span class="spinner"></span> Mengirim...';
        btn.disabled = true;

        const state = window._absenFlowState;
        try {
            const result = await API.submitAttendance({
                id_pegawai: user.id_pegawai,
                type: state.type,
                lokasi: state.locationResult?.location?.nama_lokasi || '',
                lat: state.locationResult?.position?.lat || 0,
                lng: state.locationResult?.position?.lng || 0,
                foto: state.photo || '',
                shift_id: user.shift_id,
                dinas_luar: state.isDinasLuar,
                device_info: _getDeviceInfo()
            });

            if (result.success) {
                _absenSuccess(result.data);
            } else {
                showToast(result.message || 'Gagal mengirim absensi');
                btn.innerHTML = '✓ Kirim Absensi';
                btn.disabled = false;
            }
        } catch (err) {
            showToast('Error: ' + err.message);
            btn.innerHTML = '✓ Kirim Absensi';
            btn.disabled = false;
        }
    }

    function _absenSuccess(data) {
        const body = document.getElementById('absenFlowBody');
        body.innerHTML = `
      <div class="success-check">✅</div>
      <h3 style="margin-bottom:8px;color:var(--success);">Absensi Berhasil!</h3>
      <p class="text-sm text-muted" style="margin-bottom:4px;">Data berhasil disimpan</p>
      ${data.status === 'terlambat' ? '<p class="text-sm" style="color:var(--warning);margin-bottom:20px;">⚠️ Anda tercatat terlambat</p>' : '<p style="margin-bottom:20px;"></p>'}
      <button class="btn btn-primary" onclick="App.closeAbsenFlow(); App.navigate('home');">Kembali ke Beranda</button>
    `;
    }

    function closeAbsenFlow() {
        Camera.stop();
        document.getElementById('absenFlow').classList.remove('active');
        window._absenFlowState = null;
    }

    // --- Modal ---
    function openModal() {
        document.getElementById('modalOverlay').classList.add('active');
    }

    function closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }

    // --- Sidebar toggle ---
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }

    // --- Avatar Dropdown ---
    function toggleAvatarDropdown(e) {
        e.stopPropagation();
        const dropdown = document.getElementById('avatarDropdown');
        if (dropdown) {
            dropdown.classList.toggle('open');
        }
    }

    function _closeAvatarDropdown() {
        const dropdown = document.getElementById('avatarDropdown');
        if (dropdown) dropdown.classList.remove('open');
    }

    // --- Profile Picture Helpers ---
    function getProfilePicHTML(userId, size) {
        const pic = API.getProfilePicture(userId);
        if (pic) {
            return `<img src="${pic}" alt="Profile">`;
        }
        return '👤';
    }

    function changeProfilePic() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
                showToast('Ukuran file terlalu besar (maks 5MB)');
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                // Resize image to save space
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const maxSize = 200;
                    let w = img.width, h = img.height;
                    if (w > h) { h = maxSize * h / w; w = maxSize; }
                    else { w = maxSize * w / h; h = maxSize; }
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    const base64 = canvas.toDataURL('image/jpeg', 0.8);
                    API.saveProfilePicture(user.id_pegawai, base64);
                    user = Auth.getUser(); // refresh user
                    showToast('Foto profil berhasil diperbarui');
                    navigate(currentPage); // re-render page
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        };
        input.click();
    }

    // --- Photo Lightbox ---
    function showPhotoLightbox(src) {
        let lb = document.getElementById('photoLightbox');
        if (!lb) {
            lb = document.createElement('div');
            lb.id = 'photoLightbox';
            lb.className = 'photo-lightbox';
            lb.innerHTML = `
                <button class="photo-lightbox-close" onclick="App.closePhotoLightbox()">✕</button>
                <img src="" id="lightboxImg" alt="Foto Absensi">
            `;
            lb.addEventListener('click', (e) => {
                if (e.target === lb) closePhotoLightbox();
            });
            document.body.appendChild(lb);
        }
        document.getElementById('lightboxImg').src = src;
        lb.classList.add('active');
    }

    function closePhotoLightbox() {
        const lb = document.getElementById('photoLightbox');
        if (lb) lb.classList.remove('active');
    }

    // --- Toast ---
    // --- Izin / Sakit Flow ---
    async function startIzinSakitFlow(defaultType) {
        // Guard: check if already submitted izin/sakit or attendance today
        const todayLog = await API.getTodayAttendance(user.id_pegawai);
        if (todayLog && (todayLog.status === 'izin' || todayLog.status === 'sakit')) {
            showToast(`Anda sudah mengajukan ${todayLog.status} hari ini. Pengajuan hanya dapat dilakukan 1 kali per hari.`);
            return;
        }
        if (todayLog && todayLog.jam_masuk) {
            showToast('Anda sudah melakukan absensi hari ini. Tidak dapat mengajukan izin/sakit.');
            return;
        }

        const modal = document.getElementById('modalContent');
        const isIzin = defaultType === 'izin';
        const isSakit = defaultType === 'sakit';
        const typeLabel = isSakit ? 'Sakit' : 'Izin';
        const typeIcon = isSakit ? '🏥' : '📋';
        const typeDesc = isSakit ? 'Tidak dapat hadir karena sakit' : 'Keperluan pribadi / urusan lainnya';

        // If a specific type is provided, show a clean single-type form
        // If no type, show the picker (fallback)
        const typeSection = (defaultType === 'izin' || defaultType === 'sakit')
            ? `
            <input type="hidden" name="izinType" id="typeSelected" value="${defaultType}">
            <div style="display:flex;align-items:center;gap:12px;padding:16px;background:var(--bg);border-radius:12px;margin-bottom:16px;">
              <span style="font-size:2rem;">${typeIcon}</span>
              <div>
                <div style="font-weight:700;font-size:1.1rem;">${typeLabel}</div>
                <div class="text-sm text-muted">${typeDesc}</div>
              </div>
            </div>
          `
            : `
            <div style="margin-bottom:16px;">
              <label class="form-label">Jenis</label>
              <div style="display:flex;gap:12px;">
                <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border-radius:10px;border:2px solid var(--primary);cursor:pointer;" id="labelIzin" onclick="document.getElementById('typeIzin').checked=true;document.getElementById('labelIzin').style.borderColor='var(--primary)';document.getElementById('labelSakit').style.borderColor='#E0E0E0';document.querySelector('.modal-header h3').textContent='Pengajuan Izin';">
                  <input type="radio" name="izinType" id="typeIzin" value="izin" checked>
                  <span style="font-size:1.5rem;">📋</span>
                  <div>
                    <div style="font-weight:600;">Izin</div>
                    <div class="text-sm text-muted">Keperluan pribadi</div>
                  </div>
                </label>
                <label style="flex:1;display:flex;align-items:center;gap:8px;padding:12px;border-radius:10px;border:2px solid #E0E0E0;cursor:pointer;" id="labelSakit" onclick="document.getElementById('typeSakit').checked=true;document.getElementById('labelSakit').style.borderColor='var(--primary)';document.getElementById('labelIzin').style.borderColor='#E0E0E0';document.querySelector('.modal-header h3').textContent='Pengajuan Sakit';">
                  <input type="radio" name="izinType" id="typeSakit" value="sakit">
                  <span style="font-size:1.5rem;">🏥</span>
                  <div>
                    <div style="font-weight:600;">Sakit</div>
                    <div class="text-sm text-muted">Tidak dapat hadir</div>
                  </div>
                </label>
              </div>
            </div>
          `;

        modal.innerHTML = `
          <div class="modal-header">
            <h3>Pengajuan ${typeLabel}</h3>
            <button class="modal-close" onclick="App.closeModal()">✕</button>
          </div>
          <div style="padding:20px;">
            ${typeSection}
            <div style="margin-bottom:16px;">
              <label class="form-label">Keterangan <span class="text-muted">(opsional)</span></label>
              <textarea id="izinKeterangan" class="form-input" style="min-height:80px;resize:vertical;" placeholder="${isSakit ? 'Contoh: demam, flu, konsultasi dokter, dll.' : 'Contoh: acara keluarga, urusan penting, dll.'}"></textarea>
            </div>
            <button class="btn btn-primary btn-block" id="submitIzinBtn" onclick="App._submitIzinSakit()">
              Kirim Pengajuan
            </button>
          </div>
        `;
        openModal();
    }

    async function _submitIzinSakit() {
        const btn = document.getElementById('submitIzinBtn');
        btn.innerHTML = '<span class="spinner"></span> Mengirim...';
        btn.disabled = true;

        // Support both hidden input and radio input
        const hiddenInput = document.getElementById('typeSelected');
        const type = hiddenInput ? hiddenInput.value : document.querySelector('input[name="izinType"]:checked').value;
        const keterangan = document.getElementById('izinKeterangan').value.trim();

        try {
            const result = await API.submitIzinSakit({
                id_pegawai: user.id_pegawai,
                type: type,
                keterangan: keterangan,
                device_info: _getDeviceInfo()
            });

            if (result.success) {
                closeModal();
                showToast(`Pengajuan ${type === 'sakit' ? 'sakit' : 'izin'} berhasil dikirim ✅`);
                // Trigger WhatsApp notification to admin & pimpinan
                _sendWaNotification(type, keterangan);
                navigate('home');
            } else {
                showToast(result.message || 'Gagal mengirim pengajuan');
                btn.innerHTML = 'Kirim Pengajuan';
                btn.disabled = false;
            }
        } catch (err) {
            showToast('Error: ' + err.message);
            btn.innerHTML = 'Kirim Pengajuan';
            btn.disabled = false;
        }
    }

    /** Send WhatsApp notification automatically via API */
    function _sendWaNotification(type, keterangan) {
        try {
            const waSettings = JSON.parse(localStorage.getItem('am_wa_settings') || '{}');
            if (waSettings.wa_enabled === false) return; // Toggle is off
            const numbers = [waSettings.admin_wa, waSettings.pimpinan_wa].filter(n => n && n.length >= 10);
            if (numbers.length === 0) return; // No numbers configured

            // API token is required for automatic sending
            if (!waSettings.api_token) {
                console.warn('WA notification skipped: API token not configured');
                return;
            }

            // Default to Fonnte API if no custom URL set
            const apiUrl = waSettings.api_url || 'https://api.fonnte.com/send';

            const now = new Date();
            const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const typeLabel = type === 'sakit' ? 'Sakit' : 'Izin';

            const message = `📋 *Notifikasi Absensi Al-Mumtaz*\n\n` +
                `Pegawai *${user.nama}* (${user.id_pegawai}) mengajukan *${typeLabel}* pada:\n` +
                `📅 ${dateStr}\n` +
                `🕐 ${timeStr}\n` +
                `🏢 Unit: ${user.unit_penempatan}\n` +
                (keterangan ? `📝 Keterangan: _${keterangan}_\n` : '') +
                `\nStatus: ⏳ Menunggu Persetujuan`;

            // Send to all configured numbers automatically
            const sendPromises = numbers.map(num =>
                fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Authorization': waSettings.api_token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ target: num, message: message })
                }).then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.json();
                })
            );

            Promise.allSettled(sendPromises).then(results => {
                const sent = results.filter(r => r.status === 'fulfilled').length;
                const failed = results.filter(r => r.status === 'rejected').length;
                if (sent > 0) {
                    showToast(`📱 Notifikasi WA terkirim ke ${sent} nomor`);
                }
                if (failed > 0) {
                    console.warn(`WA notification: ${failed} gagal terkirim`);
                }
            });
        } catch (e) {
            console.warn('WA notification error:', e);
        }
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // --- Event listeners ---
    document.addEventListener('DOMContentLoaded', init);

    document.getElementById('absenFlowClose').addEventListener('click', closeAbsenFlow);

    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalOverlay')) closeModal();
    });

    document.getElementById('sidebarOverlay').addEventListener('click', () => {
        toggleSidebar();
    });

    // Close avatar dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.avatar-wrapper')) {
            _closeAvatarDropdown();
        }
    });

    window.addEventListener('hashchange', () => {
        const page = window.location.hash.replace('#', '') || 'home';
        if (page !== currentPage) navigate(page);
    });

    return {
        navigate,
        startAbsenFlow,
        startIzinSakitFlow,
        _absenStep2,
        _capturePhoto,
        _skipPhoto,
        _submitAbsen,
        _submitIzinSakit,
        closeAbsenFlow,
        openModal,
        closeModal,
        toggleSidebar,
        toggleAvatarDropdown,
        getProfilePicHTML,
        changeProfilePic,
        showPhotoLightbox,
        closePhotoLightbox,
        showToast,
        getPermissionState,
        init
    };
})();
