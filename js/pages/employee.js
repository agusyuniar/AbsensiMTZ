/**
 * Employee Page — Beranda, Riwayat, and Profil views for pegawai role.
 */
const EmployeePage = (() => {
  function renderHome(user) {
    return `
      <div class="mobile-layout">
        <div class="mobile-header">
          <div class="header-row">
            <div>
              <div class="greeting">Assalamu'alaikum,</div>
              <div class="user-name">${user.nama}</div>
            </div>
            <div class="avatar-wrapper">
              <div class="avatar" onclick="App.toggleAvatarDropdown(event)">${App.getProfilePicHTML(user.id_pegawai)}</div>
              <div class="avatar-dropdown" id="avatarDropdown">
                <button class="avatar-dropdown-item" onclick="App.navigate('profile')">
                  <span class="dropdown-icon">👤</span> Profil
                </button>
                <div class="avatar-dropdown-divider"></div>
                <button class="avatar-dropdown-item logout" onclick="Auth.logout()">
                  <span class="dropdown-icon">🚪</span> Log Out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mobile-content">
          <div class="attendance-card" id="attendanceCard">
            <div class="status-text" id="statusText">Memuat status...</div>
            <div class="time-display" id="timeDisplay">--:--</div>
            <div class="date-display" id="dateDisplay">${_formatDate(new Date())}</div>
            <div id="absenBtnContainer">
              <div class="skeleton" style="width:180px;height:54px;margin:0 auto;border-radius:24px;"></div>
            </div>
            <div class="location-info" id="locationInfo">
              <span class="loc-icon">📍</span>
              <span>Mendeteksi lokasi...</span>
            </div>
          </div>

          <div class="section-header">
            <h3>Ringkasan Bulan Ini</h3>
          </div>
          <div class="summary-grid" id="monthSummary">
            <div class="summary-item hadir"><div class="sum-value skeleton" style="width:30px;height:24px;margin:0 auto;"></div><div class="sum-label">Hadir</div></div>
            <div class="summary-item terlambat"><div class="sum-value skeleton" style="width:30px;height:24px;margin:0 auto;"></div><div class="sum-label">Terlambat</div></div>
            <div class="summary-item izin"><div class="sum-value skeleton" style="width:30px;height:24px;margin:0 auto;"></div><div class="sum-label">Izin</div></div>
            <div class="summary-item tidak-hadir"><div class="sum-value skeleton" style="width:30px;height:24px;margin:0 auto;"></div><div class="sum-label">Sakit</div></div>
          </div>

          <div id="approvalStatusSection"></div>

          <div class="section-header">
            <h3>Riwayat Terakhir</h3>
            <button class="see-all" onclick="App.navigate('history')">Lihat Semua</button>
          </div>
          <div class="history-list" id="recentHistory">
            <div class="skeleton" style="height:70px;width:100%;"></div>
            <div class="skeleton" style="height:70px;width:100%;margin-top:8px;"></div>
          </div>
        </div>

        ${_bottomNav('home')}
      </div>
    `;
  }

  async function initHome(user) {
    // Load today's attendance
    const todayLog = await API.getTodayAttendance(user.id_pegawai);
    const card = document.getElementById('attendanceCard');
    const statusText = document.getElementById('statusText');
    const timeDisplay = document.getElementById('timeDisplay');
    const btnContainer = document.getElementById('absenBtnContainer');

    // Update time
    _startClock();

    if (todayLog && (todayLog.status === 'izin' || todayLog.status === 'sakit')) {
      // Izin or Sakit today
      card.classList.add('completed');
      const label = todayLog.status === 'izin' ? '📋 Izin' : '🏥 Sakit';
      statusText.textContent = `${label} Hari Ini`;
      btnContainer.innerHTML = `
        <div style="text-align:center;margin-top:8px;">
          <span class="badge ${todayLog.status === 'izin' ? 'badge-info' : 'badge-error'}" style="font-size:0.9rem;padding:6px 16px;">${todayLog.status === 'izin' ? 'Izin' : 'Sakit'}</span>
          ${todayLog.keterangan ? `<p class="text-sm text-muted" style="margin-top:8px;">"${todayLog.keterangan}"</p>` : ''}
        </div>
      `;
    } else if (todayLog && todayLog.jam_masuk && todayLog.jam_keluar) {
      // Already completed
      card.classList.add('completed');
      statusText.textContent = '✅ Absensi Hari Ini Lengkap';
      btnContainer.innerHTML = `
        <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;">
          <div><span class="text-sm text-muted">Masuk</span><div class="fw-600">${todayLog.jam_masuk.substring(0, 5)}</div></div>
          <div style="width:1px;background:#EEE;"></div>
          <div><span class="text-sm text-muted">Keluar</span><div class="fw-600">${todayLog.jam_keluar.substring(0, 5)}</div></div>
        </div>
      `;
    } else if (todayLog && todayLog.jam_masuk) {
      // Already clocked in
      statusText.textContent = `Sudah Absen Masuk: ${todayLog.jam_masuk.substring(0, 5)}`;
      btnContainer.innerHTML = `<button class="btn-absen keluar" onclick="App.startAbsenFlow('keluar')">Absen Keluar</button>`;
    } else {
      // Not yet clocked in — show all options
      statusText.textContent = 'Belum Absen Hari Ini';
      btnContainer.innerHTML = `
        <button class="btn-absen" onclick="App.startAbsenFlow('masuk')">Absen Masuk</button>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;">
          <button class="btn btn-outline btn-sm" onclick="App.startIzinSakitFlow('izin')" style="border-radius:20px;">📋 Izin</button>
          <button class="btn btn-outline btn-sm" onclick="App.startIzinSakitFlow('sakit')" style="border-radius:20px;">🏥 Sakit</button>
        </div>
      `;
    }

    // Detect location
    const locInfo = document.getElementById('locationInfo');
    try {
      const locations = await API.getLocations();
      const result = await Geofence.detectAndValidate(locations);
      if (result.isInside) {
        locInfo.innerHTML = `<span class="loc-icon">📍</span><span>${result.location.nama_lokasi} (${result.distance}m)</span>`;
        locInfo.className = 'location-info';
      } else {
        locInfo.innerHTML = `<span class="loc-icon">⚠️</span><span>Di luar jangkauan — terdekat: ${result.location.nama_lokasi} (${result.distance}m)</span>`;
        locInfo.className = 'location-info error';
      }
    } catch (err) {
      locInfo.innerHTML = `<span class="loc-icon">⚠️</span><span>${err.message}</span>`;
      locInfo.className = 'location-info error';
    }

    // Monthly summary
    const now = new Date();
    const history = await API.getAttendanceHistory(user.id_pegawai, now.getMonth() + 1, now.getFullYear());
    const hadir = history.filter(l => l.status === 'hadir').length;
    const terlambat = history.filter(l => l.status === 'terlambat').length;
    const izin = history.filter(l => l.status === 'izin').length;
    const sakit = history.filter(l => l.status === 'sakit').length;

    document.getElementById('monthSummary').innerHTML = `
      <div class="summary-item hadir"><div class="sum-value">${hadir}</div><div class="sum-label">Hadir</div></div>
      <div class="summary-item terlambat"><div class="sum-value">${terlambat}</div><div class="sum-label">Terlambat</div></div>
      <div class="summary-item izin"><div class="sum-value">${izin}</div><div class="sum-label">Izin</div></div>
      <div class="summary-item tidak-hadir"><div class="sum-value">${sakit}</div><div class="sum-label">Sakit</div></div>
    `;

    // Approval status section — show izin/sakit requests with status
    const izinSakitLogs = history.filter(l => l.status === 'izin' || l.status === 'sakit');
    const approvalSection = document.getElementById('approvalStatusSection');
    if (izinSakitLogs.length > 0) {
      approvalSection.innerHTML = `
        <div class="section-header" style="margin-top:16px;">
          <h3>Status Pengajuan</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${izinSakitLogs.map(l => {
        const statusMap = {
          pending: { label: '⏳ Menunggu', color: 'var(--warning)', bg: '#FFF8E1' },
          approved: { label: '✅ Disetujui', color: 'var(--success)', bg: '#E8F5E9' },
          rejected: { label: '❌ Ditolak', color: 'var(--error)', bg: '#FFEBEE' }
        };
        const s = statusMap[l.approval_status] || statusMap.pending;
        const typeLabel = l.status === 'izin' ? '📋 Izin' : '🏥 Sakit';
        const dateObj = new Date(l.tanggal + 'T00:00:00');
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        return `
              <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:${s.bg};border-radius:12px;border-left:4px solid ${s.color};">
                <div style="flex:1;">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="font-weight:600;">${typeLabel}</span>
                    <span class="text-xs text-muted">${dateStr}</span>
                  </div>
                  ${l.keterangan ? `<div class="text-sm text-muted" style="margin-bottom:4px;">"${l.keterangan}"</div>` : ''}
                </div>
                <div style="padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;color:${s.color};background:white;border:1px solid ${s.color};white-space:nowrap;">
                  ${s.label}
                </div>
              </div>
            `;
      }).join('')}
        </div>
      `;
    }

    // Recent history
    const recent = history.slice(0, 5);
    document.getElementById('recentHistory').innerHTML = recent.length > 0
      ? recent.map(l => _historyItem(l)).join('')
      : `<div class="empty-state"><div class="empty-icon">📋</div><h3>Belum ada riwayat</h3><p>Riwayat absensi akan muncul di sini</p></div>`;
  }

  function renderHistory(user) {
    const now = new Date();
    return `
      <div class="mobile-layout">
        <div class="mobile-header">
          <div class="header-row">
            <div>
              <div class="greeting">Riwayat Absensi</div>
              <div class="user-name">${user.nama}</div>
            </div>
            <div class="avatar-wrapper">
              <div class="avatar" onclick="App.toggleAvatarDropdown(event)">${App.getProfilePicHTML(user.id_pegawai)}</div>
              <div class="avatar-dropdown" id="avatarDropdown">
                <button class="avatar-dropdown-item" onclick="App.navigate('profile')">
                  <span class="dropdown-icon">👤</span> Profil
                </button>
                <div class="avatar-dropdown-divider"></div>
                <button class="avatar-dropdown-item logout" onclick="Auth.logout()">
                  <span class="dropdown-icon">🚪</span> Log Out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mobile-content">
          <div class="filter-bar">
            <select class="form-select" id="filterMonth" style="flex:1;">
              ${_monthOptions(now.getMonth() + 1)}
            </select>
            <select class="form-select" id="filterYear" style="flex:1;">
              <option value="${now.getFullYear()}">${now.getFullYear()}</option>
              <option value="${now.getFullYear() - 1}">${now.getFullYear() - 1}</option>
            </select>
          </div>

          <div class="history-list" id="historyList">
            <div class="skeleton" style="height:70px;width:100%;"></div>
            <div class="skeleton" style="height:70px;width:100%;margin-top:8px;"></div>
            <div class="skeleton" style="height:70px;width:100%;margin-top:8px;"></div>
          </div>
        </div>

        ${_bottomNav('history')}
      </div>
    `;
  }

  async function initHistory(user) {
    const monthSelect = document.getElementById('filterMonth');
    const yearSelect = document.getElementById('filterYear');

    async function loadHistory() {
      const listEl = document.getElementById('historyList');
      listEl.innerHTML = '<div class="skeleton" style="height:70px;width:100%;"></div>';

      const month = parseInt(monthSelect.value);
      const year = parseInt(yearSelect.value);
      const history = await API.getAttendanceHistory(user.id_pegawai, month, year);

      listEl.innerHTML = history.length > 0
        ? history.map(l => _historyItem(l)).join('')
        : `<div class="empty-state"><div class="empty-icon">📋</div><h3>Tidak ada data</h3><p>Tidak ada riwayat absensi untuk bulan ini</p></div>`;
    }

    monthSelect.addEventListener('change', loadHistory);
    yearSelect.addEventListener('change', loadHistory);
    await loadHistory();
  }

  function renderProfile(user) {
    return `
      <div class="mobile-layout">
        <div class="mobile-header">
          <div class="header-row">
            <div>
              <div class="greeting">Profil</div>
              <div class="user-name">${user.nama}</div>
            </div>
          </div>
        </div>

        <div class="mobile-content">
          <div class="profile-header">
            <div class="profile-avatar-lg" onclick="App.changeProfilePic()">
              ${App.getProfilePicHTML(user.id_pegawai)}
              <div class="avatar-edit-overlay">
                <span>📷</span>
                <span class="avatar-edit-label">Ubah</span>
              </div>
            </div>
            <h2 style="font-size:1.2rem;font-weight:700;">${user.nama}</h2>
            <p class="text-sm text-muted">${user.email}</p>
            <span class="badge badge-success" style="margin-top:8px;">${_formatRole(user.role)}</span>
          </div>

          <div style="margin-top:24px;">
            <div class="profile-menu-item">
              <div class="pm-icon">🏢</div>
              <div class="pm-text">
                <h4>Unit Penempatan</h4>
                <p>${user.unit_penempatan}</p>
              </div>
            </div>
            <div class="profile-menu-item">
              <div class="pm-icon">💼</div>
              <div class="pm-text">
                <h4>Jabatan</h4>
                <p>${user.jabatan || '-'}</p>
              </div>
            </div>
            <div class="profile-menu-item">
              <div class="pm-icon">📚</div>
              <div class="pm-text">
                <h4>Bidang</h4>
                <p>${user.bidang || '-'}</p>
              </div>
            </div>
            <div class="profile-menu-item">
              <div class="pm-icon">🕐</div>
              <div class="pm-text" id="shiftInfo">
                <h4>Shift</h4>
                <p>Memuat...</p>
              </div>
            </div>
            <div class="profile-menu-item">
              <div class="pm-icon">📊</div>
              <div class="pm-text">
                <h4>Tipe Pegawai</h4>
                <p>${user.tipe_pegawai === 'mobile' ? 'Mobile (Multi-lokasi)' : 'Tetap'}</p>
              </div>
            </div>
            <div class="profile-menu-item" onclick="Auth.logout()" style="cursor:pointer;">
              <div class="pm-icon" style="background:#FFCDD2;">🚪</div>
              <div class="pm-text">
                <h4 style="color:var(--error);">Keluar</h4>
                <p>Logout dari aplikasi</p>
              </div>
              <span class="pm-arrow">›</span>
            </div>
          </div>
        </div>

        ${_bottomNav('profile')}
      </div>
    `;
  }

  async function initProfile(user) {
    const shifts = await API.getShifts();
    const shift = shifts.find(s => s.shift_id === user.shift_id);
    if (shift) {
      document.getElementById('shiftInfo').innerHTML = `
        <h4>${shift.nama_shift}</h4>
        <p>${shift.jam_masuk} — ${shift.jam_keluar}</p>
      `;
    }
  }

  // --- Helpers ---

  function _bottomNav(active) {
    return `
      <nav class="bottom-nav">
        <button class="bottom-nav-item ${active === 'home' ? 'active' : ''}" onclick="App.navigate('home')">
          <span class="nav-icon">🏠</span>
          <span>Beranda</span>
        </button>
        <button class="bottom-nav-item ${active === 'history' ? 'active' : ''}" onclick="App.navigate('history')">
          <span class="nav-icon">📋</span>
          <span>Riwayat</span>
        </button>
        <button class="bottom-nav-item ${active === 'profile' ? 'active' : ''}" onclick="App.navigate('profile')">
          <span class="nav-icon">👤</span>
          <span>Profil</span>
        </button>
      </nav>
    `;
  }

  function _historyItem(log) {
    const d = new Date(log.tanggal + 'T00:00:00');
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = months[d.getMonth()];
    const statusBadge = log.status === 'hadir'
      ? '<span class="badge badge-success">Hadir</span>'
      : log.status === 'terlambat'
        ? '<span class="badge badge-warning">Terlambat</span>'
        : log.status === 'izin'
          ? '<span class="badge badge-info">Izin</span>'
          : log.status === 'sakit'
            ? '<span class="badge badge-error">Sakit</span>'
            : '<span class="badge badge-neutral">-</span>';

    const photos = [];
    if (log.foto_masuk) photos.push(`<img src="${log.foto_masuk}" class="photo-thumb" onclick="App.showPhotoLightbox('${log.foto_masuk}')" title="Foto Masuk">`);
    if (log.foto_keluar) photos.push(`<img src="${log.foto_keluar}" class="photo-thumb" onclick="App.showPhotoLightbox('${log.foto_keluar}')" title="Foto Keluar">`);
    const photoHTML = photos.length > 0 ? `<div style="display:flex;gap:4px;margin-top:4px;">${photos.join('')}</div>` : '';

    return `
      <div class="history-item">
        <div class="date-box">
          <span class="day">${day}</span>
          <span class="month">${month}</span>
        </div>
        <div class="history-info">
          <div class="history-time">${log.jam_masuk ? log.jam_masuk.substring(0, 5) : '--:--'} — ${log.jam_keluar ? log.jam_keluar.substring(0, 5) : '--:--'}</div>
          <div class="history-location">📍 ${log.lokasi_terdeteksi}</div>
          ${log.keterangan ? `<div class="text-sm text-muted" style="margin-top:2px;">💬 ${log.keterangan}</div>` : ''}
          ${photoHTML}
        </div>
        ${statusBadge}
      </div>
    `;
  }

  function _renderAttendanceChart(history) {
    const chartEl = document.getElementById('attendanceChart');
    if (!chartEl) return;

    // Group by last 7 days with data
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const last14 = history.slice(0, 14);
    const groups = {};
    last14.forEach(l => {
      const d = new Date(l.tanggal + 'T00:00:00');
      const key = l.tanggal;
      if (!groups[key]) groups[key] = { date: d, hadir: 0, terlambat: 0 };
      if (l.status === 'hadir') groups[key].hadir++;
      else if (l.status === 'terlambat') groups[key].terlambat++;
    });

    const sortedDays = Object.keys(groups).sort().slice(-7);
    if (sortedDays.length === 0) {
      chartEl.innerHTML = '<div class="empty-state" style="padding:20px;"><p class="text-sm text-muted">Belum ada data kehadiran</p></div>';
      return;
    }

    const bars = sortedDays.map(key => {
      const g = groups[key];
      const dayLabel = dayNames[g.date.getDay()];
      const isHadir = g.hadir > 0;
      const isTerlambat = g.terlambat > 0;
      const color = isTerlambat ? '#FF9800' : (isHadir ? '#4CAF50' : '#EF5350');
      const h = isHadir || isTerlambat ? 100 : 20;
      return `
        <div class="chart-vertical-bar-group">
          <div class="chart-vertical-bar" style="height:${h}%;background:${color};"></div>
          <div class="chart-vertical-label">${dayLabel}</div>
        </div>
      `;
    }).join('');

    chartEl.innerHTML = `
      <div class="chart-vertical">${bars}</div>
      <div class="chart-legend">
        <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#4CAF50;"></div>Hadir</div>
        <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#FF9800;"></div>Terlambat</div>
        <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#EF5350;"></div>Tidak Hadir</div>
      </div>
    `;
  }

  function _formatDate(d) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function _formatRole(role) {
    const map = { admin: 'Admin Yayasan', kepala_unit: 'Kepala Unit', pegawai: 'Pegawai' };
    return map[role] || role;
  }

  function _monthOptions(current) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months.map((m, i) => `<option value="${i + 1}" ${i + 1 === current ? 'selected' : ''}>${m}</option>`).join('');
  }

  let clockInterval = null;
  function _startClock() {
    if (clockInterval) clearInterval(clockInterval);
    function update() {
      const now = new Date();
      const el = document.getElementById('timeDisplay');
      if (el) {
        el.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      }
    }
    update();
    clockInterval = setInterval(update, 10000);
  }

  return {
    renderHome,
    initHome,
    renderHistory,
    initHistory,
    renderProfile,
    initProfile
  };
})();
