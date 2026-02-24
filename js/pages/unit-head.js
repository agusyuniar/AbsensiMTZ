/**
 * Unit Head Page — Full dashboard for Kepala Unit/Sekolah.
 * Uses same sidebar layout as Admin dashboard.
 */
const UnitHeadPage = (() => {
  let currentSection = 'dashboard';

  function render(user, section) {
    currentSection = section || 'dashboard';
    return `
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="sidebar-brand-logo">🏫</div>
          <div class="sidebar-brand-text">
            <h3>Al-Mumtaz</h3>
            <p>${user.unit_penempatan}</p>
          </div>
        </div>
        <div class="sidebar-menu">
          <div class="sidebar-menu-label">Menu Utama</div>
          ${_menuItem('dashboard', '📊', 'Dashboard')}
          ${_menuItem('pegawai', '👥', 'Pegawai')}
          ${_menuItem('absensi', '📸', 'Absensi Saya')}
          <div class="sidebar-menu-label" style="margin-top:12px;">Pelaporan</div>
          ${_menuItem('rekap', '📋', 'Rekap Kehadiran')}
          ${_menuItem('profil', '⚙️', 'Profil')}
        </div>
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${App.getProfilePicHTML(user.id_pegawai)}</div>
          <div class="sidebar-user-info">
            <h4>${user.nama}</h4>
            <p>Kepala Unit</p>
          </div>
          <button class="btn-ghost" onclick="Auth.logout()" style="padding:4px 8px;font-size:12px;" title="Logout">🚪</button>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="admin-layout">
        <header class="admin-header">
          <div style="display:flex;align-items:center;gap:12px;">
            <button class="menu-toggle" onclick="App.toggleSidebar()">☰</button>
            <div class="admin-header-title">
              <h2>${_sectionTitle(currentSection)}</h2>
              <p>${_formatDate(new Date())}</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px;">
            <span class="text-sm text-muted">Selamat Datang, ${user.nama}</span>
            <div class="avatar-wrapper">
              <div class="avatar" style="width:36px;height:36px;font-size:16px;background:var(--primary-50);color:var(--primary);border:2px solid var(--primary-light);" onclick="App.toggleAvatarDropdown(event)">${App.getProfilePicHTML(user.id_pegawai)}</div>
              <div class="avatar-dropdown" id="avatarDropdown">
                <button class="avatar-dropdown-item" onclick="UnitHeadPage.navigateTo('profil')">
                  <span class="dropdown-icon">👤</span> Profil
                </button>
                <div class="avatar-dropdown-divider"></div>
                <button class="avatar-dropdown-item logout" onclick="Auth.logout()">
                  <span class="dropdown-icon">🚪</span> Log Out
                </button>
              </div>
            </div>
          </div>
        </header>
        <main class="admin-content" id="unitMainContent">
          <div class="skeleton" style="height:400px;width:100%;border-radius:12px;"></div>
        </main>
      </div>
    `;
  }

  async function init(user) {
    await _loadSection(currentSection, user);
  }

  async function _loadSection(section, user) {
    const container = document.getElementById('unitMainContent');
    if (!container) return;
    currentSection = section;

    // Update active menu
    document.querySelectorAll('.sidebar-menu-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });

    // Update header
    const titleEl = document.querySelector('.admin-header-title h2');
    if (titleEl) titleEl.textContent = _sectionTitle(section);

    switch (section) {
      case 'dashboard':
        await _renderDashboard(container, user);
        break;
      case 'pegawai':
        await _renderPegawai(container, user);
        break;
      case 'absensi':
        _renderAbsensi(container, user);
        break;
      case 'rekap':
        await _renderRekap(container, user);
        break;
      case 'profil':
        _renderProfil(container, user);
        break;
    }
  }

  // ============================================================
  // DASHBOARD
  // ============================================================
  async function _renderDashboard(container, user) {
    container.innerHTML = `
      <div class="stats-row" id="unitStats">
        <div class="stat-card"><div class="stat-value skeleton" style="width:40px;height:32px;"></div><div class="stat-label">Total Pegawai</div></div>
        <div class="stat-card"><div class="stat-value skeleton" style="width:40px;height:32px;"></div><div class="stat-label">Hadir Hari Ini</div></div>
        <div class="stat-card warning"><div class="stat-value skeleton" style="width:40px;height:32px;"></div><div class="stat-label">Terlambat</div></div>
        <div class="stat-card error"><div class="stat-value skeleton" style="width:40px;height:32px;"></div><div class="stat-label">Belum Absen</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;" class="dashboard-grid">
        <div class="card">
          <h3 style="margin-bottom:16px;font-size:1rem;">Pegawai Hari Ini</h3>
          <div id="unitEmployeeList">
            <div class="skeleton" style="height:70px;width:100%;"></div>
          </div>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <h3 style="padding:20px 20px 12px;font-size:1rem;margin:0;">📍 Peta Lokasi Unit</h3>
          <div id="unitDashMap" style="height:300px;width:100%;z-index:1;"></div>
        </div>
      </div>
      <div class="card" style="margin-top:20px;">
        <h3 style="margin-bottom:16px;font-size:1rem;">📋 Permintaan Persetujuan</h3>
        <div id="unitApprovalList">
          <div class="skeleton" style="height:80px;width:100%;"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;" class="dashboard-grid">
        <div class="card">
          <h3 style="margin-bottom:16px;font-size:1rem;">Anomali</h3>
          <div id="anomalyList">
            <div class="skeleton" style="height:70px;width:100%;"></div>
          </div>
        </div>
        <div class="card">
          <h3 style="margin-bottom:16px;font-size:1rem;">Tren Kehadiran (7 Hari)</h3>
          <div id="weeklyChart">
            <div class="skeleton" style="height:180px;width:100%;"></div>
          </div>
        </div>
      </div>
    `;

    // Load data
    const [unitData, locations] = await Promise.all([
      API.getUnitTodayAttendance(user.unit_penempatan),
      API.getLocations()
    ]);
    const totalEmployees = unitData.length;
    const hadir = unitData.filter(e => e.attendance && e.attendance.jam_masuk).length;
    const terlambat = unitData.filter(e => e.attendance && e.attendance.status === 'terlambat').length;
    const belumAbsen = unitData.filter(e => !e.attendance || !e.attendance.jam_masuk).length;

    // Stats
    document.getElementById('unitStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${totalEmployees}</div>
        <div class="stat-label">Total Pegawai</div>
        <div class="stat-trend up">📈 Aktif</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${hadir}</div>
        <div class="stat-label">Hadir Hari Ini</div>
        <div class="stat-trend up">↑ ${totalEmployees ? Math.round(hadir / totalEmployees * 100) : 0}%</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${terlambat}</div>
        <div class="stat-label">Terlambat</div>
      </div>
      <div class="stat-card error">
        <div class="stat-value">${belumAbsen}</div>
        <div class="stat-label">Belum Absen</div>
      </div>
    `;

    // Employee list
    document.getElementById('unitEmployeeList').innerHTML = unitData.length > 0
      ? unitData.map(emp => {
        const att = emp.attendance;
        let statusBadge = '<span class="badge badge-neutral">Belum Absen</span>';
        let timeStr = '--:--';
        if (att && att.status === 'izin') {
          statusBadge = '<span class="badge badge-info">📋 Izin</span>';
        } else if (att && att.status === 'sakit') {
          statusBadge = '<span class="badge badge-error">🏥 Sakit</span>';
        } else if (att && att.jam_masuk) {
          timeStr = att.jam_masuk.substring(0, 5);
          statusBadge = att.status === 'terlambat'
            ? '<span class="badge badge-warning">Terlambat</span>'
            : '<span class="badge badge-success">Hadir</span>';
        }
        const hasPhoto = att && att.foto_masuk;
        const photoThumb = hasPhoto ? `<img src="${att.foto_masuk}" class="photo-thumb" onclick="event.stopPropagation();App.showPhotoLightbox('${att.foto_masuk}')" title="Foto Masuk">` : '';
        return `
          <div class="unit-table-row" style="cursor:pointer;" onclick="UnitHeadPage.showEmployeeDetail('${emp.id_pegawai}')">
            <div class="unit-icon">${App.getProfilePicHTML(emp.id_pegawai)}</div>
            <div class="unit-info">
              <h4>${emp.nama}</h4>
              <p>${emp.jabatan || emp.role} · Masuk: ${timeStr}</p>
            </div>
            <div style="display:flex;align-items:center;gap:6px;">
              ${photoThumb}
              ${statusBadge}
            </div>
          </div>
        `;
      }).join('')
      : '<p class="text-sm text-muted text-center" style="padding:16px;">Tidak ada pegawai dalam unit ini</p>';

    // Initialize map — filter locations for this unit
    const unitLocations = locations.filter(l => l.nama_lokasi === user.unit_penempatan);
    if (unitLocations.length === 0 && locations.length > 0) {
      // Fallback: show all locations if no exact match 
      _initUnitMap('unitDashMap', locations);
    } else {
      _initUnitMap('unitDashMap', unitLocations.length > 0 ? unitLocations : locations);
    }

    // Load approval requests
    _loadUnitApprovals(unitData);

    // Anomalies
    document.getElementById('anomalyList').innerHTML = unitData
      .filter(emp => {
        if (!emp.attendance || !emp.attendance.jam_masuk) return true;
        return emp.attendance.status === 'terlambat';
      }).length > 0
      ? unitData.filter(emp => {
        if (!emp.attendance || !emp.attendance.jam_masuk) return true;
        return emp.attendance.status === 'terlambat';
      }).map(emp => {
        const isLate = emp.attendance && emp.attendance.status === 'terlambat';
        return `
            <div class="unit-table-row">
              <div class="unit-icon">${isLate ? '⏰' : '❌'}</div>
              <div class="unit-info">
                <h4>${emp.nama}</h4>
                <p>${isLate ? `Terlambat — masuk jam ${emp.attendance.jam_masuk.substring(0, 5)}` : 'Belum melakukan absen hari ini'}</p>
              </div>
            </div>
          `;
      }).join('')
      : '<p class="text-sm text-muted text-center" style="padding:16px;">✅ Tidak ada anomali hari ini</p>';

    // Weekly chart (line graph)
    _renderWeeklyChart();
  }

  function _initUnitMap(containerId, locations) {
    if (typeof L === 'undefined') return;
    const mapEl = document.getElementById(containerId);
    if (!mapEl) return;

    const center = locations.length > 0
      ? [parseFloat(locations[0].latitude), parseFloat(locations[0].longitude)]
      : [-6.9175, 107.6191];

    const map = L.map(containerId).setView(center, 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OSM',
      maxZoom: 19
    }).addTo(map);

    const colors = ['#1B5E20', '#E65100', '#1565C0', '#6A1B9A'];
    locations.forEach((loc, i) => {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      const radius = parseInt(loc.radius_meter) || 50;
      if (isNaN(lat) || isNaN(lng)) return;

      L.marker([lat, lng]).addTo(map)
        .bindPopup(`<strong>${loc.nama_lokasi}</strong><br>Radius: ${radius}m`);
      L.circle([lat, lng], {
        radius, color: colors[i % colors.length],
        fillColor: colors[i % colors.length],
        fillOpacity: 0.15, weight: 2
      }).addTo(map);
    });

    setTimeout(() => map.invalidateSize(), 200);
  }

  function _loadUnitApprovals(unitData) {
    // Get pending items from unit employees
    let pending = [];
    try {
      const allLogs = JSON.parse(localStorage.getItem('am_attendance') || '[]');
      const unitEmpIds = unitData.map(e => e.id_pegawai);
      pending = allLogs.filter(l => unitEmpIds.includes(l.id_pegawai) && l.approval_status === 'pending');
    } catch (e) {
      pending = [];
    }

    const container = document.getElementById('unitApprovalList');
    if (!container) return;

    if (pending.length === 0) {
      container.innerHTML = '<p class="text-sm text-muted text-center" style="padding:20px;">Tidak ada permintaan persetujuan ✅</p>';
      return;
    }

    container.innerHTML = `
      <div style="display:grid;gap:12px;">
        ${pending.map(log => {
      const emp = unitData.find(e => e.id_pegawai === log.id_pegawai);
      const name = emp ? emp.nama : log.id_pegawai;
      const statusLabel = log.status === 'izin' ? '📋 Izin' : log.status === 'sakit' ? '🏥 Sakit' : '📍 Dinas Luar';
      const badgeClass = log.status === 'izin' ? 'badge-info' : log.status === 'sakit' ? 'badge-error' : 'badge-warning';
      const d = log.tanggal ? new Date(log.tanggal + 'T00:00:00') : new Date();
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      return `
            <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;">
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <strong>${name}</strong>
                  <span class="badge ${badgeClass}">${statusLabel}</span>
                </div>
                <div class="text-sm text-muted">${dateStr}</div>
                ${log.keterangan ? `<div class="text-sm" style="margin-top:4px;background:var(--bg);padding:6px 10px;border-radius:6px;">💬 ${log.keterangan}</div>` : ''}
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0;">
                <button class="btn btn-sm" style="background:var(--success);color:white;border:none;border-radius:8px;padding:6px 14px;" onclick="UnitHeadPage.approveRequest('${log.id_log}', 'approved')">✓ Setuju</button>
                <button class="btn btn-sm" style="background:var(--error);color:white;border:none;border-radius:8px;padding:6px 14px;" onclick="UnitHeadPage.approveRequest('${log.id_log}', 'rejected')">✕ Tolak</button>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  async function approveRequest(logId, status) {
    await API.approveAttendance(logId, status);
    App.showToast(status === 'approved' ? 'Permintaan disetujui ✅' : 'Permintaan ditolak ❌');
    const user = Auth.getUser();
    _renderDashboard(document.getElementById('unitHeadMainContent'), user);
  }

  // ============================================================
  // PEGAWAI
  // ============================================================
  async function _renderPegawai(container, user) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <input class="form-input-light" id="searchPegawai" placeholder="Cari pegawai..." style="max-width:300px;">
      </div>
      <div class="table-wrapper">
        <table class="table" id="pegawaiTable">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Jabatan</th>
              <th>Bidang</th>
              <th>Tipe</th>
              <th>Shift</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody id="pegawaiTableBody">
            <tr><td colspan="6"><div class="skeleton" style="height:40px;width:100%;"></div></td></tr>
          </tbody>
        </table>
      </div>
    `;

    const employees = await API.getEmployeesByUnit(user.unit_penempatan);
    const shifts = await API.getShifts();

    document.getElementById('pegawaiTableBody').innerHTML = employees.map(emp => {
      const shift = shifts.find(s => s.shift_id === emp.shift_id);
      return `
        <tr>
          <td>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--primary-50);">
                ${App.getProfilePicHTML(emp.id_pegawai)}
              </div>
              <div>
                <strong>${emp.nama}</strong>
                <div class="text-sm text-muted">${emp.email}</div>
              </div>
            </div>
          </td>
          <td>${emp.jabatan || '-'}</td>
          <td>${emp.bidang || '-'}</td>
          <td>${emp.tipe_pegawai === 'mobile' ? '<span class="badge badge-info">Mobile</span>' : '<span class="badge badge-neutral">Tetap</span>'}</td>
          <td>${shift ? shift.nama_shift : '-'}</td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="UnitHeadPage.showEmployeeDetail('${emp.id_pegawai}')" title="Lihat Detail">👁️</button>
          </td>
        </tr>
      `;
    }).join('');

    // Search filter
    document.getElementById('searchPegawai').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#pegawaiTableBody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  // ============================================================
  // ABSENSI SAYA (Self-attendance for Kepala Unit)
  // ============================================================
  function _renderAbsensi(container, user) {
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;" class="dashboard-grid">
        <div class="card" style="text-align:center;">
          <div style="font-size:3rem;margin-bottom:12px;">📥</div>
          <h3 style="font-size:1.1rem;margin-bottom:8px;">Absen Masuk</h3>
          <p class="text-sm text-muted" style="margin-bottom:16px;">Catat waktu masuk Anda hari ini</p>
          <button class="btn btn-primary btn-block" onclick="App.startAbsenFlow('masuk')">Absen Masuk Sekarang</button>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:3rem;margin-bottom:12px;">📤</div>
          <h3 style="font-size:1.1rem;margin-bottom:8px;">Absen Keluar</h3>
          <p class="text-sm text-muted" style="margin-bottom:16px;">Catat waktu keluar Anda hari ini</p>
          <button class="btn btn-accent btn-block" onclick="App.startAbsenFlow('keluar')">Absen Keluar Sekarang</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;" class="dashboard-grid">
        <div class="card" style="text-align:center;">
          <div style="font-size:3rem;margin-bottom:12px;">📋</div>
          <h3 style="font-size:1.1rem;margin-bottom:8px;">Izin</h3>
          <p class="text-sm text-muted" style="margin-bottom:16px;">Ajukan izin tidak hadir</p>
          <button class="btn btn-outline btn-block" onclick="App.startIzinSakitFlow('izin')">Ajukan Izin</button>
        </div>
        <div class="card" style="text-align:center;">
          <div style="font-size:3rem;margin-bottom:12px;">🏥</div>
          <h3 style="font-size:1.1rem;margin-bottom:8px;">Sakit</h3>
          <p class="text-sm text-muted" style="margin-bottom:16px;">Laporkan sakit hari ini</p>
          <button class="btn btn-outline btn-block" onclick="App.startIzinSakitFlow('sakit')">Laporkan Sakit</button>
        </div>
      </div>
      <div class="card" style="margin-top:20px;">
        <h3 style="margin-bottom:16px;font-size:1rem;">Riwayat Absensi Saya</h3>
        <div id="selfHistoryList">
          <div class="skeleton" style="height:200px;width:100%;"></div>
        </div>
      </div>
    `;

    // Load self history
    (async () => {
      const now = new Date();
      const history = await API.getAttendanceHistory(user.id_pegawai, now.getMonth() + 1, now.getFullYear());
      const recent = history.slice(0, 10);
      document.getElementById('selfHistoryList').innerHTML = recent.length > 0
        ? `<table class="table"><thead><tr><th>Tanggal</th><th>Masuk</th><th>Keluar</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>
          ${recent.map(l => {
          const d = new Date(l.tanggal + 'T00:00:00');
          const badgeClass = l.status === 'hadir' ? 'badge-success' : l.status === 'terlambat' ? 'badge-warning' : l.status === 'izin' ? 'badge-info' : l.status === 'sakit' ? 'badge-error' : 'badge-neutral';
          const label = l.status === 'izin' ? 'Izin' : l.status === 'sakit' ? 'Sakit' : l.status;
          return `<tr>
              <td>${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</td>
              <td>${l.jam_masuk ? l.jam_masuk.substring(0, 5) : '--:--'}</td>
              <td>${l.jam_keluar ? l.jam_keluar.substring(0, 5) : '--:--'}</td>
              <td><span class="badge ${badgeClass}">${label}</span></td>
              <td class="text-sm text-muted">${l.keterangan || '-'}</td>
            </tr>`;
        }).join('')}
          </tbody></table>`
        : '<p class="text-sm text-muted text-center" style="padding:20px;">Belum ada riwayat bulan ini</p>';
    })();
  }

  // ============================================================
  // REKAP
  // ============================================================
  async function _renderRekap(container, user) {
    const now = new Date();
    container.innerHTML = `
      <div class="filter-bar">
        <select class="form-select" id="recapMonth">
          ${_monthOptions(now.getMonth() + 1)}
        </select>
        <select class="form-select" id="recapYear">
          <option value="${now.getFullYear()}">${now.getFullYear()}</option>
          <option value="${now.getFullYear() - 1}">${now.getFullYear() - 1}</option>
        </select>
        <button class="btn btn-primary btn-sm" onclick="UnitHeadPage.loadRecap()">Tampilkan</button>
      </div>
      <div class="export-btn-group" style="margin-bottom:12px;">
        <button class="btn btn-outline" onclick="UnitHeadPage.exportRecap('csv')">📄 CSV</button>
        <button class="btn btn-outline" onclick="UnitHeadPage.exportRecap('excel')">📊 Excel</button>
        <button class="btn btn-outline" onclick="UnitHeadPage.exportRecap('pdf')">📑 PDF</button>
      </div>
      <div class="table-wrapper" id="recapTable">
        <div class="skeleton" style="height:200px;width:100%;"></div>
      </div>
    `;

    _currentUser = user;
    await loadRecap();
  }

  let _currentUser = null;
  let _lastRecapData = [];

  async function loadRecap() {
    const monthEl = document.getElementById('recapMonth');
    const yearEl = document.getElementById('recapYear');
    if (!monthEl || !yearEl) return;

    const month = parseInt(monthEl.value);
    const year = parseInt(yearEl.value);
    const unit = _currentUser ? _currentUser.unit_penempatan : undefined;
    const data = await API.getMonthlyReport(month, year, unit);
    _lastRecapData = data;

    document.getElementById('recapTable').innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Nama</th>
            <th>Jabatan</th>
            <th>Hadir</th>
            <th>Terlambat</th>
            <th>Izin</th>
            <th>Sakit</th>
            <th>Total</th>
            <th>%</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(r => {
      const pct = r.total_hari ? Math.round(r.hadir / r.total_hari * 100) : 0;
      const ket = (r.keterangan_list || []).map(k =>
        `<div class="text-xs" style="margin-bottom:2px;"><span class="badge ${k.type === 'izin' ? 'badge-info' : 'badge-error'}" style="font-size:10px;padding:1px 6px;">${k.type}</span> ${k.keterangan}</div>`
      ).join('') || '<span class="text-muted text-xs">-</span>';
      return `
              <tr>
                <td><strong>${r.nama}</strong></td>
                <td>${r.jabatan || '-'}</td>
                <td><span class="badge badge-success">${r.hadir}</span></td>
                <td><span class="badge badge-warning">${r.terlambat}</span></td>
                <td><span class="badge badge-info">${r.izin || 0}</span></td>
                <td><span class="badge badge-error">${r.sakit || 0}</span></td>
                <td>${r.total_hari}</td>
                <td><span class="badge ${pct >= 80 ? 'badge-success' : pct >= 50 ? 'badge-warning' : 'badge-error'}">${pct}%</span></td>
                <td>${ket}</td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    `;

    monthEl.addEventListener('change', loadRecap);
    yearEl.addEventListener('change', loadRecap);
  }

  // ============================================================
  // PROFIL
  // ============================================================
  function _renderProfil(container, user) {
    container.innerHTML = `
      <div style="max-width:600px;">
        <div class="card" style="text-align:center;margin-bottom:20px;">
          <div class="profile-avatar-lg" onclick="App.changeProfilePic()" style="margin:0 auto 16px;cursor:pointer;position:relative;">
            ${App.getProfilePicHTML(user.id_pegawai)}
            <div class="avatar-edit-overlay">
              <span>📷</span>
              <span class="avatar-edit-label">Ubah</span>
            </div>
          </div>
          <h3 style="font-size:1.2rem;font-weight:700;">${user.nama}</h3>
          <p class="text-sm text-muted">${user.email}</p>
          <span class="badge badge-success" style="margin-top:8px;">Kepala Unit</span>
        </div>
        <div class="card">
          <h3 style="font-size:1rem;margin-bottom:16px;">Informasi Pribadi</h3>
          <div style="display:grid;gap:12px;">
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F0F0;">
              <span class="text-sm text-muted">Jabatan</span>
              <span class="text-sm fw-600">${user.jabatan || '-'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F0F0;">
              <span class="text-sm text-muted">Bidang</span>
              <span class="text-sm fw-600">${user.bidang || '-'}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F0F0;">
              <span class="text-sm text-muted">Unit Penempatan</span>
              <span class="text-sm fw-600">${user.unit_penempatan}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F0F0;">
              <span class="text-sm text-muted">Tipe</span>
              <span class="text-sm fw-600">${user.tipe_pegawai === 'mobile' ? 'Mobile' : 'Tetap'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================
  // SVG LINE GRAPH
  // ============================================================
  function _renderWeeklyChart() {
    const container = document.getElementById('weeklyChart');
    if (!container) return;
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const today = new Date();

    const points = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const hadirPct = i === 0 ? 0 : Math.floor(70 + Math.random() * 25);
      const latePct = i === 0 ? 0 : Math.floor(Math.random() * 15);
      points.push({ day: dayName, hadir: hadirPct, late: latePct });
    }

    const w = 400, h = 160, padL = 35, padR = 10, padT = 15, padB = 30;
    const graphW = w - padL - padR;
    const graphH = h - padT - padB;
    const maxVal = 100;
    const stepX = graphW / (points.length - 1);

    const hadirPts = points.map((p, i) => `${padL + i * stepX},${padT + graphH - (p.hadir / maxVal * graphH)}`);
    const latePts = points.map((p, i) => `${padL + i * stepX},${padT + graphH - (p.late / maxVal * graphH)}`);

    const hadirArea = `${hadirPts[0].split(',')[0]},${padT + graphH} ${hadirPts.join(' ')} ${hadirPts[hadirPts.length - 1].split(',')[0]},${padT + graphH}`;
    const lateArea = `${latePts[0].split(',')[0]},${padT + graphH} ${latePts.join(' ')} ${latePts[latePts.length - 1].split(',')[0]},${padT + graphH}`;

    const gridLines = [0, 25, 50, 75, 100].map(v => {
      const y = padT + graphH - (v / maxVal * graphH);
      return `<line x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" class="line-graph-grid"/>
              <text x="${padL - 6}" y="${y + 4}" class="line-graph-value" text-anchor="end">${v}</text>`;
    }).join('');

    const labels = points.map((p, i) => {
      const x = padL + i * stepX;
      return `<text x="${x}" y="${h - 5}" class="line-graph-label">${p.day}</text>`;
    }).join('');

    const hadirDots = hadirPts.map((pt, i) => {
      const [x, y] = pt.split(',');
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#4CAF50" class="line-graph-dot"><title>Hadir: ${points[i].hadir}%</title></circle>`;
    }).join('');
    const lateDots = latePts.map((pt, i) => {
      const [x, y] = pt.split(',');
      return `<circle cx="${x}" cy="${y}" r="4.5" fill="#FF9800" class="line-graph-dot"><title>Terlambat: ${points[i].late}%</title></circle>`;
    }).join('');

    container.innerHTML = `
      <div class="line-graph-container">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
          ${gridLines}
          <polygon points="${hadirArea}" fill="#4CAF50" class="line-graph-area"/>
          <polygon points="${lateArea}" fill="#FF9800" class="line-graph-area"/>
          <polyline points="${hadirPts.join(' ')}" stroke="#4CAF50" class="line-graph-line"/>
          <polyline points="${latePts.join(' ')}" stroke="#FF9800" class="line-graph-line"/>
          ${hadirDots}
          ${lateDots}
          ${labels}
        </svg>
      </div>
      <div class="chart-legend">
        <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#4CAF50;"></div>Hadir (%)</div>
        <div class="chart-legend-item"><div class="chart-legend-dot" style="background:#FF9800;"></div>Terlambat (%)</div>
      </div>
    `;
  }

  // ============================================================
  // EMPLOYEE DETAIL MODAL
  // ============================================================
  async function showEmployeeDetail(empId) {
    const employees = await API.getEmployees();
    const emp = employees.find(e => e.id_pegawai === empId);
    if (!emp) return;

    const shifts = await API.getShifts();
    const shift = shifts.find(s => s.shift_id === emp.shift_id);
    const now = new Date();
    const history = await API.getAttendanceHistory(empId, now.getMonth() + 1, now.getFullYear());
    const hadir = history.filter(h => h.status === 'hadir').length;
    const terlambat = history.filter(h => h.status === 'terlambat').length;

    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>Detail Pegawai</h3>
        <button class="modal-close" onclick="App.closeModal()">✕</button>
      </div>
      <div style="text-align:center;margin-bottom:20px;">
        <div class="profile-avatar-lg" style="cursor:default;margin:0 auto 12px;">
          ${App.getProfilePicHTML(empId)}
        </div>
        <h3 style="font-size:1.1rem;font-weight:700;">${emp.nama}</h3>
        <p class="text-sm text-muted">${emp.email}</p>
        <span class="badge badge-success" style="margin-top:6px;">${_formatRole(emp.role)}</span>
      </div>
      <div style="display:grid;gap:12px;">
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F0F0;">
          <span class="text-sm text-muted">Jabatan</span>
          <span class="text-sm fw-600">${emp.jabatan || '-'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F0F0;">
          <span class="text-sm text-muted">Bidang</span>
          <span class="text-sm fw-600">${emp.bidang || '-'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F0F0;">
          <span class="text-sm text-muted">Unit</span>
          <span class="text-sm fw-600">${emp.unit_penempatan}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F0F0;">
          <span class="text-sm text-muted">Shift</span>
          <span class="text-sm fw-600">${shift ? shift.nama_shift + ' (' + shift.jam_masuk + '-' + shift.jam_keluar + ')' : '-'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0F0F0;">
          <span class="text-sm text-muted">Tipe</span>
          <span class="text-sm fw-600">${emp.tipe_pegawai === 'mobile' ? 'Mobile' : 'Tetap'}</span>
        </div>
      </div>
      <div style="margin-top:16px;">
        <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:10px;">Kehadiran Bulan Ini</h4>
        <div class="stats-row" style="grid-template-columns:repeat(3,1fr);">
          <div class="stat-card" style="padding:12px;text-align:center;">
            <div class="stat-value" style="font-size:1.4rem;">${hadir}</div>
            <div class="stat-label">Hadir</div>
          </div>
          <div class="stat-card warning" style="padding:12px;text-align:center;">
            <div class="stat-value" style="font-size:1.4rem;">${terlambat}</div>
            <div class="stat-label">Terlambat</div>
          </div>
          <div class="stat-card info" style="padding:12px;text-align:center;">
            <div class="stat-value" style="font-size:1.4rem;">${hadir + terlambat}</div>
            <div class="stat-label">Total</div>
          </div>
        </div>
      </div>
    `;
    App.openModal();
  }

  // ============================================================
  // EXPORT FUNCTIONS
  // ============================================================
  function exportRecap(format) {
    if (_lastRecapData.length === 0) {
      App.showToast('Tidak ada data untuk diekspor');
      return;
    }
    const month = document.getElementById('recapMonth');
    const year = document.getElementById('recapYear');
    const period = month.options[month.selectedIndex].text + ' ' + year.value;

    if (format === 'csv') {
      let csv = 'Nama,Jabatan,Bidang,Hadir,Terlambat,Izin,Sakit,Total Hari,Keterangan\n';
      _lastRecapData.forEach(r => {
        const ket = (r.keterangan_list || []).map(k => `[${k.type}] ${k.keterangan}`).join('; ') || '-';
        csv += `"${r.nama}","${r.jabatan || '-'}","${r.bidang || '-'}",${r.hadir},${r.terlambat},${r.izin || 0},${r.sakit || 0},${r.total_hari},"${ket}"\n`;
      });
      _downloadFile(csv, `Rekap_Kehadiran_${period}.csv`, 'text/csv');
    } else if (format === 'excel') {
      let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>';
      html += `<h2>Rekap Kehadiran - ${period}</h2>`;
      html += '<table border="1"><tr><th>Nama</th><th>Jabatan</th><th>Bidang</th><th>Hadir</th><th>Terlambat</th><th>Izin</th><th>Sakit</th><th>Total Hari</th><th>Keterangan</th></tr>';
      _lastRecapData.forEach(r => {
        const ket = (r.keterangan_list || []).map(k => `[${k.type}] ${k.keterangan}`).join('; ') || '-';
        html += `<tr><td>${r.nama}</td><td>${r.jabatan || '-'}</td><td>${r.bidang || '-'}</td><td>${r.hadir}</td><td>${r.terlambat}</td><td>${r.izin || 0}</td><td>${r.sakit || 0}</td><td>${r.total_hari}</td><td>${ket}</td></tr>`;
      });
      html += '</table></body></html>';
      _downloadFile(html, `Rekap_Kehadiran_${period}.xls`, 'application/vnd.ms-excel');
    } else if (format === 'pdf') {
      const printWin = window.open('', '_blank');
      let html = `<html><head><title>Rekap Kehadiran - ${period}</title>
        <style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#1B5E20;color:white;}h1{color:#1B5E20;font-size:18px;}h2{color:#333;font-size:14px;}</style>
        </head><body>`;
      html += `<h1>Yayasan Al-Mumtaz</h1><h2>Rekap Kehadiran - ${period}</h2>`;
      html += '<table><tr><th>Nama</th><th>Jabatan</th><th>Bidang</th><th>Hadir</th><th>Terlambat</th><th>Izin</th><th>Sakit</th><th>Total Hari</th><th>Keterangan</th></tr>';
      _lastRecapData.forEach(r => {
        const ket = (r.keterangan_list || []).map(k => `[${k.type}] ${k.keterangan}`).join('; ') || '-';
        html += `<tr><td>${r.nama}</td><td>${r.jabatan || '-'}</td><td>${r.bidang || '-'}</td><td>${r.hadir}</td><td>${r.terlambat}</td><td>${r.izin || 0}</td><td>${r.sakit || 0}</td><td>${r.total_hari}</td><td>${ket}</td></tr>`;
      });
      html += '</table></body></html>';
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => { printWin.print(); }, 500);
    }
  }

  function _downloadFile(content, filename, mimeType) {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: mimeType + ';charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    App.showToast('File berhasil diunduh');
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function navigateTo(section) {
    const user = Auth.getUser();
    _loadSection(section, user);
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  function _menuItem(section, icon, label) {
    return `
      <button class="sidebar-menu-item ${section === currentSection ? 'active' : ''}" 
              data-section="${section}"
              onclick="UnitHeadPage.navigateTo('${section}')">
        <span class="menu-icon">${icon}</span>
        ${label}
      </button>
    `;
  }

  function _sectionTitle(section) {
    const map = {
      dashboard: 'Dashboard',
      pegawai: 'Daftar Pegawai',
      absensi: 'Absensi Saya',
      rekap: 'Rekap Kehadiran',
      profil: 'Profil Saya'
    };
    return map[section] || 'Dashboard';
  }

  function _formatDate(d) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return d.toLocaleDateString('id-ID', options);
  }

  function _formatRole(role) {
    const map = { admin: 'Admin', kepala_unit: 'Kepala Unit', pegawai: 'Pegawai' };
    return map[role] || role;
  }

  function _monthOptions(current) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months.map((m, i) => `<option value="${i + 1}" ${i + 1 === current ? 'selected' : ''}>${m}</option>`).join('');
  }

  return {
    render,
    init,
    navigateTo,
    showEmployeeDetail,
    exportRecap,
    loadRecap,
    approveRequest
  };
})();
