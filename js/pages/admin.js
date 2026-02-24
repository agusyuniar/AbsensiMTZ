/**
 * Admin Page — Full dashboard for Admin Yayasan.
 */
const AdminPage = (() => {
  let currentSection = 'dashboard';

  function render(user, section) {
    currentSection = section || 'dashboard';
    return `
      <!-- Sidebar -->
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="sidebar-brand-logo">🕌</div>
          <div class="sidebar-brand-text">
            <h3>Al-Mumtaz</h3>
            <p>Sistem Kehadiran</p>
          </div>
        </div>
        <div class="sidebar-menu">
          <div class="sidebar-menu-label">Menu Utama</div>
          ${_menuItem('dashboard', '📊', 'Dashboard')}
          ${_menuItem('pegawai', '👥', 'Pegawai')}
          ${_menuItem('lokasi', '📍', 'Lokasi')}
          ${_menuItem('jadwal', '📅', 'Jadwal')}
          <div class="sidebar-menu-label" style="margin-top:12px;">Pelaporan</div>
          ${_menuItem('laporan', '📋', 'Laporan')}
          ${_menuItem('pengaturan', '⚙️', 'Pengaturan')}
        </div>
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${App.getProfilePicHTML(user.id_pegawai)}</div>
          <div class="sidebar-user-info">
            <h4>${user.nama}</h4>
            <p>Admin Yayasan</p>
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
                <button class="avatar-dropdown-item" onclick="AdminPage.navigateTo('pengaturan')">
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
        <main class="admin-content" id="adminMainContent">
          <div class="skeleton" style="height:400px;width:100%;border-radius:12px;"></div>
        </main>
      </div>
    `;
  }

  async function init(user) {
    await _loadSection(currentSection, user);
  }

  async function _loadSection(section, user) {
    const container = document.getElementById('adminMainContent');
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
        await _renderDashboard(container);
        break;
      case 'pegawai':
        await _renderPegawai(container);
        break;
      case 'lokasi':
        await _renderLokasi(container);
        break;
      case 'jadwal':
        await _renderJadwal(container);
        break;
      case 'laporan':
        await _renderLaporan(container, user);
        break;
      case 'pengaturan':
        _renderPengaturan(container, user);
        break;
    }
  }

  // --- Dashboard ---
  async function _renderDashboard(container) {
    container.innerHTML = `
      <div class="stats-row" id="adminStats">
        <div class="stat-card"><div class="stat-value skeleton" style="width:40px;height:32px;"></div><div class="stat-label">Total Pegawai</div></div>
        <div class="stat-card"><div class="stat-value skeleton" style="width:40px;height:32px;"></div><div class="stat-label">Hadir Hari Ini</div></div>
        <div class="stat-card warning"><div class="stat-value skeleton" style="width:40px;height:32px;"></div><div class="stat-label">Terlambat</div></div>
        <div class="stat-card error"><div class="stat-value skeleton" style="width:40px;height:32px;"></div><div class="stat-label">Belum Absen</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;" class="dashboard-grid">
        <div class="card">
          <h3 style="margin-bottom:16px;font-size:1rem;">Kehadiran per Unit</h3>
          <div id="unitList"></div>
        </div>
        <div class="card" style="padding:0;overflow:hidden;">
          <h3 style="padding:20px 20px 12px;font-size:1rem;margin:0;">Peta Lokasi</h3>
          <div id="dashboardMap" style="height:300px;width:100%;z-index:1;"></div>
        </div>
      </div>
      <div class="card" style="margin-top:20px;">
        <h3 style="margin-bottom:16px;font-size:1rem;">📋 Permintaan Persetujuan</h3>
        <div id="approvalList">
          <div class="skeleton" style="height:100px;width:100%;"></div>
        </div>
      </div>
      <div class="card" style="margin-top:20px;">
        <h3 style="margin-bottom:16px;font-size:1rem;">Tren Kehadiran (7 Hari)</h3>
        <div id="adminAttendanceChart">
          <div class="skeleton" style="height:180px;width:100%;"></div>
        </div>
      </div>
    `;

    // Load data
    const [employees, unitSummary, locations] = await Promise.all([
      API.getEmployees(),
      API.getUnitSummary(),
      API.getLocations()
    ]);

    const totalEmployees = employees.length;
    const totalHadir = unitSummary.reduce((s, u) => s + u.hadir, 0);
    const totalTerlambat = unitSummary.reduce((s, u) => s + u.terlambat, 0);
    const totalBelum = unitSummary.reduce((s, u) => s + u.belum_absen, 0);

    document.getElementById('adminStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${totalEmployees}</div>
        <div class="stat-label">Total Pegawai</div>
        <div class="stat-trend up">📈 Aktif</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalHadir}</div>
        <div class="stat-label">Hadir Hari Ini</div>
        <div class="stat-trend up">↑ ${totalEmployees ? Math.round(totalHadir / totalEmployees * 100) : 0}%</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-value">${totalTerlambat}</div>
        <div class="stat-label">Terlambat</div>
      </div>
      <div class="stat-card error">
        <div class="stat-value">${totalBelum}</div>
        <div class="stat-label">Belum Absen</div>
      </div>
    `;

    document.getElementById('unitList').innerHTML = unitSummary.map(u => `
      <div class="unit-table-row">
        <div class="unit-icon">${_unitEmoji(u.nama_lokasi)}</div>
        <div class="unit-info">
          <h4>${u.nama_lokasi}</h4>
          <p>${u.total_pegawai} pegawai · ${u.hadir} hadir</p>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${u.persentase}%"></div>
          </div>
        </div>
        <div class="unit-percentage" style="color:${u.persentase >= 80 ? 'var(--success)' : u.persentase >= 50 ? 'var(--warning)' : 'var(--error)'}">
          ${u.persentase}%
        </div>
      </div>
    `).join('');

    // Initialize the dashboard map
    _initMap('dashboardMap', locations);

    // Load approval requests
    _loadApprovalRequests(employees);

    // Render attendance trend chart
    _renderAdminChart(unitSummary);
  }

  async function _loadApprovalRequests(employees) {
    const today = new Date();
    const logs = await API.getAttendanceHistory(undefined, today.getMonth() + 1, today.getFullYear());
    // In demo mode getAttendanceHistory needs an employee id, so let's get all today's attendance
    let allLogs = [];
    try {
      allLogs = await API.getAllTodayAttendance();
      // Also get recent history for pending items
      const histLogs = _getAllPendingLogs();
      allLogs = [...allLogs, ...histLogs];
    } catch (e) {
      allLogs = [];
    }
    // Deduplicate
    const seen = new Set();
    allLogs = allLogs.filter(l => {
      if (seen.has(l.id_log)) return false;
      seen.add(l.id_log);
      return true;
    });

    const pending = allLogs.filter(l => l.approval_status === 'pending');

    const container = document.getElementById('approvalList');
    if (!container) return;

    if (pending.length === 0) {
      container.innerHTML = '<p class="text-sm text-muted text-center" style="padding:20px;">Tidak ada permintaan persetujuan saat ini ✅</p>';
      return;
    }

    container.innerHTML = `
      <div style="display:grid;gap:12px;">
        ${pending.map(log => {
      const emp = employees.find(e => e.id_pegawai === log.id_pegawai);
      const name = emp ? emp.nama : log.id_pegawai;
      const unit = emp ? emp.unit_penempatan : '-';
      const statusLabel = log.status === 'izin' ? '📋 Izin' : log.status === 'sakit' ? '🏥 Sakit' : '📍 Dinas Luar';
      const badgeClass = log.status === 'izin' ? 'badge-info' : log.status === 'sakit' ? 'badge-error' : 'badge-warning';
      const d = log.tanggal ? new Date(log.tanggal + 'T00:00:00') : new Date();
      const dateStr = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      return `
            <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;">
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <strong>${name}</strong>
                  <span class="badge ${badgeClass}">${statusLabel}</span>
                </div>
                <div class="text-sm text-muted">${unit} · ${dateStr}</div>
                ${log.keterangan ? `<div class="text-sm" style="margin-top:4px;color:var(--text);background:var(--bg);padding:6px 10px;border-radius:6px;">💬 ${log.keterangan}</div>` : ''}
              </div>
              <div style="display:flex;gap:8px;flex-shrink:0;">
                <button class="btn btn-sm" style="background:var(--success);color:white;border:none;border-radius:8px;padding:6px 14px;" onclick="AdminPage.approveRequest('${log.id_log}', 'approved')">✓ Setuju</button>
                <button class="btn btn-sm" style="background:var(--error);color:white;border:none;border-radius:8px;padding:6px 14px;" onclick="AdminPage.approveRequest('${log.id_log}', 'rejected')">✕ Tolak</button>
              </div>
            </div>
          `;
    }).join('')}
      </div>
    `;
  }

  function _getAllPendingLogs() {
    // In demo mode, scan all attendance logs for pending items
    try {
      const logs = JSON.parse(localStorage.getItem('am_attendance') || '[]');
      return logs.filter(l => l.approval_status === 'pending');
    } catch (e) {
      return [];
    }
  }

  async function approveRequest(logId, status) {
    await API.approveAttendance(logId, status);
    App.showToast(status === 'approved' ? 'Permintaan disetujui ✅' : 'Permintaan ditolak ❌');
    // Reload dashboard
    const user = Auth.getUser();
    _renderDashboard(document.getElementById('adminMainContent'));
  }

  function _renderAdminChart(unitSummary) {
    const container = document.getElementById('adminAttendanceChart');
    if (!container) return;
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const today = new Date();
    const totalEmp = unitSummary.reduce((s, u) => s + u.total_pegawai, 0) || 1;

    const points = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const hadirPct = i === 0 ? Math.round(unitSummary.reduce((s, u) => s + u.hadir, 0) / totalEmp * 100) : Math.floor(65 + Math.random() * 30);
      const latePct = i === 0 ? Math.round(unitSummary.reduce((s, u) => s + u.terlambat, 0) / totalEmp * 100) : Math.floor(Math.random() * 12);
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

  // --- Pegawai Management ---
  async function _renderPegawai(container) {
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <input class="form-input-light" id="searchPegawai" placeholder="Cari pegawai..." style="max-width:300px;">
        <button class="btn btn-primary btn-sm" onclick="AdminPage.showAddEmployee()">+ Tambah Pegawai</button>
      </div>
      <div class="table-wrapper">
        <table class="table" id="pegawaiTable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nama</th>
              <th>Email</th>
              <th>Jabatan</th>
              <th>Bidang</th>
              <th>Role</th>
              <th>Unit</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody id="pegawaiTableBody">
            <tr><td colspan="8"><div class="skeleton" style="height:40px;width:100%;"></div></td></tr>
          </tbody>
        </table>
      </div>
    `;

    const employees = await API.getEmployees();
    _populatePegawaiTable(employees);

    document.getElementById('searchPegawai').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      const filtered = employees.filter(emp =>
        emp.nama.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q)
      );
      _populatePegawaiTable(filtered);
    });
  }

  function _populatePegawaiTable(employees) {
    const tbody = document.getElementById('pegawaiTableBody');
    tbody.innerHTML = employees.map(emp => `
      <tr>
        <td><code>${emp.id_pegawai}</code></td>
        <td><strong>${emp.nama}</strong></td>
        <td>${emp.email}</td>
        <td>${emp.jabatan || '-'}</td>
        <td>${emp.bidang || '-'}</td>
        <td><span class="badge ${emp.role === 'admin' ? 'badge-info' : emp.role === 'kepala_unit' ? 'badge-warning' : 'badge-neutral'}">${_formatRole(emp.role)}</span></td>
        <td>${emp.unit_penempatan}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="AdminPage.editEmployee('${emp.id_pegawai}')">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="AdminPage.confirmDeleteEmployee('${emp.id_pegawai}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  async function showAddEmployee(editId) {
    const locations = await API.getLocations();
    const shifts = await API.getShifts();
    let emp = null;

    if (editId) {
      const employees = await API.getEmployees();
      emp = employees.find(e => e.id_pegawai === editId);
    }

    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${emp ? 'Edit Pegawai' : 'Tambah Pegawai'}</h3>
        <button class="modal-close" onclick="App.closeModal()">✕</button>
      </div>
      <form id="empForm">
        <div class="form-group">
          <label class="form-label-dark">Nama Lengkap</label>
          <input class="form-input-light" name="nama" required value="${emp ? emp.nama : ''}" placeholder="Masukkan nama">
        </div>
        <div class="form-group">
          <label class="form-label-dark">Email</label>
          <input class="form-input-light" type="email" name="email" required value="${emp ? emp.email : ''}" placeholder="email@almumtaz.id">
        </div>
        ${!emp ? `
        <div class="form-group">
          <label class="form-label-dark">Password</label>
          <input class="form-input-light" type="password" name="password" required placeholder="Password">
        </div>` : ''}
        <div class="form-group">
          <label class="form-label-dark">Role</label>
          <select class="form-select" name="role">
            <option value="pegawai" ${emp && emp.role === 'pegawai' ? 'selected' : ''}>Pegawai</option>
            <option value="kepala_unit" ${emp && emp.role === 'kepala_unit' ? 'selected' : ''}>Kepala Unit</option>
            <option value="admin" ${emp && emp.role === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label-dark">Unit Penempatan</label>
          <select class="form-select" name="unit_penempatan">
            ${locations.map(l => `<option value="${l.nama_lokasi}" ${emp && emp.unit_penempatan === l.nama_lokasi ? 'selected' : ''}>${l.nama_lokasi}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
        <label class="form-label-dark">Tipe Pegawai</label>
        <select class="form-select" name="tipe_pegawai">
          <option value="tetap" ${emp && emp.tipe_pegawai === 'tetap' ? 'selected' : ''}>Tetap</option>
          <option value="mobile" ${emp && emp.tipe_pegawai === 'mobile' ? 'selected' : ''}>Mobile (Multi-lokasi)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label-dark">Jabatan</label>
        <input class="form-input-light" name="jabatan" value="${emp ? emp.jabatan || '' : ''}" placeholder="Contoh: Guru, Staf, dll">
      </div>
      <div class="form-group">
        <label class="form-label-dark">Bidang</label>
        <input class="form-input-light" name="bidang" value="${emp ? emp.bidang || '' : ''}" placeholder="Contoh: Pendidikan, Administrasi, dll">
      </div>
      <div class="form-group">
          <label class="form-label-dark">Shift</label>
          <select class="form-select" name="shift_id">
            ${shifts.map(s => `<option value="${s.shift_id}" ${emp && emp.shift_id === s.shift_id ? 'selected' : ''}>${s.nama_shift} (${s.jam_masuk} - ${s.jam_keluar})</option>`).join('')}
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top:12px;">
          ${emp ? 'Simpan Perubahan' : 'Tambah Pegawai'}
        </button>
      </form>
    `;

    document.getElementById('empForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      if (emp) data.id_pegawai = emp.id_pegawai;
      await API.saveEmployee(data);
      App.closeModal();
      App.showToast(emp ? 'Pegawai berhasil diperbarui' : 'Pegawai berhasil ditambahkan');
      _renderPegawai(document.getElementById('adminMainContent'));
    });

    App.openModal();
  }

  function editEmployee(id) {
    showAddEmployee(id);
  }

  async function confirmDeleteEmployee(id) {
    if (confirm(`Apakah Anda yakin ingin menghapus pegawai ${id}?`)) {
      await API.deleteEmployee(id);
      App.showToast('Pegawai berhasil dihapus');
      _renderPegawai(document.getElementById('adminMainContent'));
    }
  }

  // --- Lokasi Management ---
  async function _renderLokasi(container) {
    const locations = await API.getLocations();
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3>Peta Lokasi Geofence</h3>
        <button class="btn btn-primary btn-sm" onclick="AdminPage.showAddLocation()">+ Tambah Lokasi</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden;margin-bottom:20px;border-radius:12px;">
        <div id="adminMap" style="height:350px;width:100%;z-index:1;"></div>
      </div>
      <h3 style="margin-bottom:16px;">Daftar Lokasi</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;">
        ${locations.map(loc => `
          <div class="card">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;">
              <div>
                <h4 style="font-weight:700;">${_unitEmoji(loc.nama_lokasi)} ${loc.nama_lokasi}</h4>
                <p class="text-sm text-muted">ID: ${loc.id_lokasi}</p>
              </div>
              <div style="display:flex;gap:4px;">
                <button class="btn btn-ghost btn-sm" onclick="AdminPage.showAddLocation('${loc.id_lokasi}')">✏️</button>
                <button class="btn btn-ghost btn-sm" onclick="AdminPage.confirmDeleteLocation('${loc.id_lokasi}')">🗑️</button>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div style="background:var(--bg);padding:8px 12px;border-radius:8px;">
                <div class="text-xs text-muted">Latitude</div>
                <div class="text-sm fw-600">${loc.latitude}</div>
              </div>
              <div style="background:var(--bg);padding:8px 12px;border-radius:8px;">
                <div class="text-xs text-muted">Longitude</div>
                <div class="text-sm fw-600">${loc.longitude}</div>
              </div>
            </div>
            <div style="background:var(--primary-50);padding:8px 12px;border-radius:8px;margin-top:8px;text-align:center;">
              <span class="text-sm fw-600" style="color:var(--primary);">Radius: ${loc.radius_meter} meter</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    // Initialize Leaflet map
    _initMap('adminMap', locations);
  }

  function _initMap(containerId, locations) {
    if (typeof L === 'undefined') return; // Leaflet not loaded
    const mapEl = document.getElementById(containerId);
    if (!mapEl) return;

    // Default center (first location or Indonesia center)
    const center = locations.length > 0
      ? [parseFloat(locations[0].latitude), parseFloat(locations[0].longitude)]
      : [-6.9175, 107.6191];

    const map = L.map(containerId).setView(center, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const colors = ['#1B5E20', '#E65100', '#1565C0', '#6A1B9A', '#C62828'];
    const bounds = [];

    locations.forEach((loc, i) => {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      const radius = parseInt(loc.radius_meter) || 50;
      const color = colors[i % colors.length];

      if (isNaN(lat) || isNaN(lng)) return;

      L.marker([lat, lng]).addTo(map)
        .bindPopup(`<strong>${loc.nama_lokasi}</strong><br>Radius: ${radius}m`);

      L.circle([lat, lng], {
        radius: radius,
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2
      }).addTo(map);

      bounds.push([lat, lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 15);
    }

    // Fix map rendering after container becomes visible
    setTimeout(() => map.invalidateSize(), 200);
  }

  async function showAddLocation(editId) {
    let loc = null;
    if (editId) {
      const locations = await API.getLocations();
      loc = locations.find(l => l.id_lokasi === editId);
    }

    const modal = document.getElementById('modalContent');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${loc ? 'Edit Lokasi' : 'Tambah Lokasi'}</h3>
        <button class="modal-close" onclick="App.closeModal()">✕</button>
      </div>
      <form id="locForm">
        <div class="form-group">
          <label class="form-label-dark">Nama Lokasi</label>
          <input class="form-input-light" name="nama_lokasi" required value="${loc ? loc.nama_lokasi : ''}" placeholder="Contoh: SD Al-Mumtaz">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div class="form-group">
            <label class="form-label-dark">Latitude</label>
            <input class="form-input-light" name="latitude" type="number" step="any" required value="${loc ? loc.latitude : ''}" placeholder="-6.9175">
          </div>
          <div class="form-group">
            <label class="form-label-dark">Longitude</label>
            <input class="form-input-light" name="longitude" type="number" step="any" required value="${loc ? loc.longitude : ''}" placeholder="107.6191">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label-dark">Radius (meter)</label>
          <input class="form-input-light" name="radius_meter" type="number" required value="${loc ? loc.radius_meter : '50'}" placeholder="50">
        </div>
        <button type="button" class="btn btn-outline btn-sm btn-block" style="margin-bottom:16px;" onclick="AdminPage.useCurrentLocation()">
          📍 Gunakan Lokasi Saat Ini
        </button>
        <button type="submit" class="btn btn-primary btn-block">
          ${loc ? 'Simpan Perubahan' : 'Tambah Lokasi'}
        </button>
      </form>
    `;

    document.getElementById('locForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd);
      data.latitude = parseFloat(data.latitude);
      data.longitude = parseFloat(data.longitude);
      data.radius_meter = parseInt(data.radius_meter);
      if (loc) data.id_lokasi = loc.id_lokasi;
      await API.saveLocation(data);
      App.closeModal();
      App.showToast(loc ? 'Lokasi berhasil diperbarui' : 'Lokasi berhasil ditambahkan');
      _renderLokasi(document.getElementById('adminMainContent'));
    });

    App.openModal();
  }

  async function useCurrentLocation() {
    try {
      const pos = await Geofence.getCurrentPosition();
      const form = document.getElementById('locForm');
      form.querySelector('[name="latitude"]').value = pos.lat.toFixed(6);
      form.querySelector('[name="longitude"]').value = pos.lng.toFixed(6);
      App.showToast('Lokasi GPS berhasil diambil');
    } catch (err) {
      App.showToast('Gagal mendapatkan lokasi: ' + err.message);
    }
  }

  async function confirmDeleteLocation(id) {
    if (confirm(`Hapus lokasi ${id}?`)) {
      await API.deleteLocation(id);
      App.showToast('Lokasi berhasil dihapus');
      _renderLokasi(document.getElementById('adminMainContent'));
    }
  }

  // --- Jadwal ---
  async function _renderJadwal(container) {
    const shifts = await API.getShifts();
    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
        ${shifts.map(s => `
          <div class="card">
            <h4 style="font-weight:700;margin-bottom:8px;">🕐 ${s.nama_shift}</h4>
            <p class="text-sm text-muted" style="margin-bottom:12px;">ID: ${s.shift_id}</p>
            <div style="display:flex;gap:16px;margin-bottom:8px;">
              <div>
                <div class="text-xs text-muted">Masuk</div>
                <div class="fw-700 text-lg" style="color:var(--primary);">${s.jam_masuk}</div>
              </div>
              <div style="width:1px;background:#EEE;"></div>
              <div>
                <div class="text-xs text-muted">Keluar</div>
                <div class="fw-700 text-lg" style="color:var(--accent);">${s.jam_keluar}</div>
              </div>
            </div>
            <div class="text-sm text-muted">Toleransi: ${s.toleransi_menit} menit</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- Laporan ---
  async function _renderLaporan(container, user) {
    const now = new Date();
    const locations = await API.getLocations();
    container.innerHTML = `
      <div class="filter-bar">
        <select class="form-select" id="reportMonth">
          ${_monthOptions(now.getMonth() + 1)}
        </select>
        <select class="form-select" id="reportYear">
          <option value="${now.getFullYear()}">${now.getFullYear()}</option>
          <option value="${now.getFullYear() - 1}">${now.getFullYear() - 1}</option>
        </select>
        <select class="form-select" id="reportUnit">
          <option value="">Semua Unit</option>
          ${locations.map(l => `<option value="${l.nama_lokasi}">${l.nama_lokasi}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" onclick="AdminPage.loadReport()">Tampilkan</button>
      </div>
      <div class="export-btn-group" style="margin-bottom:12px;">
        <button class="btn btn-outline" onclick="AdminPage.exportReport('csv')">📄 CSV</button>
        <button class="btn btn-outline" onclick="AdminPage.exportReport('excel')">📊 Excel</button>
        <button class="btn btn-outline" onclick="AdminPage.exportReport('pdf')">📑 PDF</button>
      </div>
      </div>
      <div class="table-wrapper" id="reportTableContainer">
        <p class="text-sm text-muted" style="padding:20px;text-align:center;">Klik "Tampilkan" untuk memuat laporan</p>
      </div>
    `;
  }

  let reportData = [];
  async function loadReport() {
    const month = parseInt(document.getElementById('reportMonth').value);
    const year = parseInt(document.getElementById('reportYear').value);
    const unit = document.getElementById('reportUnit').value;

    reportData = await API.getMonthlyReport(month, year, unit || undefined);

    document.getElementById('reportTableContainer').innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama</th>
            <th>Jabatan</th>
            <th>Bidang</th>
            <th>Unit</th>
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
          ${reportData.map(r => {
      const pct = r.total_hari ? Math.round(r.hadir / r.total_hari * 100) : 0;
      const ket = (r.keterangan_list || []).map(k =>
        `<div class="text-xs" style="margin-bottom:2px;"><span class="badge ${k.type === 'izin' ? 'badge-info' : 'badge-error'}" style="font-size:10px;padding:1px 6px;">${k.type}</span> ${k.keterangan}</div>`
      ).join('') || '<span class="text-muted text-xs">-</span>';
      return `
              <tr>
                <td><code>${r.id_pegawai}</code></td>
                <td><strong>${r.nama}</strong></td>
                <td>${r.jabatan || '-'}</td>
                <td>${r.bidang || '-'}</td>
                <td>${r.unit_penempatan}</td>
                <td><span class="badge badge-success">${r.hadir}</span></td>
                <td><span class="badge badge-warning">${r.terlambat}</span></td>
                <td><span class="badge badge-info">${r.izin || 0}</span></td>
                <td><span class="badge badge-error">${r.sakit || 0}</span></td>
                <td>${r.total_hari}</td>
                <td>
                  <span class="badge ${pct >= 80 ? 'badge-success' : pct >= 50 ? 'badge-warning' : 'badge-error'}">
                    ${pct}%
                  </span>
                </td>
                <td>${ket}</td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    `;
  }

  function exportReport(format) {
    if (reportData.length === 0) {
      App.showToast('Tidak ada data untuk diexport. Tampilkan laporan terlebih dahulu.');
      return;
    }
    const monthEl = document.getElementById('reportMonth');
    const yearEl = document.getElementById('reportYear');
    const period = monthEl.options[monthEl.selectedIndex].text + ' ' + yearEl.value;

    if (format === 'csv') {
      let csv = 'ID,Nama,Jabatan,Bidang,Unit,Hadir,Terlambat,Izin,Sakit,Total Hari,Keterangan\n';
      reportData.forEach(r => {
        const ket = (r.keterangan_list || []).map(k => `[${k.type}] ${k.keterangan}`).join('; ') || '-';
        csv += `${r.id_pegawai},"${r.nama}","${r.jabatan || '-'}","${r.bidang || '-'}","${r.unit_penempatan}",${r.hadir},${r.terlambat},${r.izin || 0},${r.sakit || 0},${r.total_hari},"${ket}"\n`;
      });
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_Kehadiran_${period}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } else if (format === 'excel') {
      let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>';
      html += `<h2>Laporan Kehadiran - ${period}</h2>`;
      html += '<table border="1"><tr><th>ID</th><th>Nama</th><th>Jabatan</th><th>Bidang</th><th>Unit</th><th>Hadir</th><th>Terlambat</th><th>Izin</th><th>Sakit</th><th>Total Hari</th><th>Keterangan</th></tr>';
      reportData.forEach(r => {
        const ket = (r.keterangan_list || []).map(k => `[${k.type}] ${k.keterangan}`).join('; ') || '-';
        html += `<tr><td>${r.id_pegawai}</td><td>${r.nama}</td><td>${r.jabatan || '-'}</td><td>${r.bidang || '-'}</td><td>${r.unit_penempatan}</td><td>${r.hadir}</td><td>${r.terlambat}</td><td>${r.izin || 0}</td><td>${r.sakit || 0}</td><td>${r.total_hari}</td><td>${ket}</td></tr>`;
      });
      html += '</table></body></html>';
      const BOM2 = '\uFEFF';
      const blob = new Blob([BOM2 + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_Kehadiran_${period}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } else if (format === 'pdf') {
      const printWin = window.open('', '_blank');
      let html = `<html><head><title>Laporan Kehadiran - ${period}</title>
        <style>body{font-family:Arial,sans-serif;padding:20px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#1B5E20;color:white;}h1{color:#1B5E20;font-size:18px;}h2{color:#333;font-size:14px;}</style>
        </head><body>`;
      html += `<h1>Yayasan Al-Mumtaz</h1><h2>Laporan Kehadiran - ${period}</h2>`;
      html += '<table><tr><th>ID</th><th>Nama</th><th>Jabatan</th><th>Bidang</th><th>Unit</th><th>Hadir</th><th>Terlambat</th><th>Izin</th><th>Sakit</th><th>Total</th><th>Keterangan</th></tr>';
      reportData.forEach(r => {
        const ket = (r.keterangan_list || []).map(k => `[${k.type}] ${k.keterangan}`).join('; ') || '-';
        html += `<tr><td>${r.id_pegawai}</td><td>${r.nama}</td><td>${r.jabatan || '-'}</td><td>${r.bidang || '-'}</td><td>${r.unit_penempatan}</td><td>${r.hadir}</td><td>${r.terlambat}</td><td>${r.izin || 0}</td><td>${r.sakit || 0}</td><td>${r.total_hari}</td><td>${ket}</td></tr>`;
      });
      html += '</table></body></html>';
      printWin.document.write(html);
      printWin.document.close();
      setTimeout(() => { printWin.print(); }, 500);
    }
    App.showToast('File berhasil disiapkan');
  }

  // --- Pengaturan ---
  function _renderPengaturan(container, user) {
    const waSettings = JSON.parse(localStorage.getItem('am_wa_settings') || '{}');
    container.innerHTML = `
      <div style="max-width:600px;">
        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">Profil Admin</h3>
          <div style="display:flex;align-items:center;gap:20px;margin-bottom:16px;">
            <div class="profile-avatar-lg" onclick="App.changeProfilePic()" style="cursor:pointer;position:relative;">
              ${App.getProfilePicHTML(user.id_pegawai)}
              <div class="avatar-edit-overlay">
                <span>📷</span>
                <span class="avatar-edit-label">Ubah</span>
              </div>
            </div>
            <div>
              <h4 style="font-weight:700;font-size:1.1rem;">${user.nama}</h4>
              <p class="text-sm text-muted">${user.email}</p>
              <span class="badge badge-success" style="margin-top:4px;">Admin Yayasan</span>
            </div>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <h3 style="margin:0;">🔔 Notifikasi WhatsApp</h3>
            <label style="position:relative;display:inline-block;width:50px;height:26px;cursor:pointer;">
              <input type="checkbox" id="waToggle" ${waSettings.wa_enabled !== false ? 'checked' : ''} onchange="var c=this.checked;document.getElementById('waFieldsContainer').style.opacity=c?'1':'0.4';document.getElementById('waFieldsContainer').style.pointerEvents=c?'auto':'none';document.getElementById('waToggleTrack').style.background=c?'var(--primary)':'#ccc';document.getElementById('waToggleThumb').style.left=c?'27px':'3px';" style="opacity:0;width:0;height:0;">
              <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:${waSettings.wa_enabled !== false ? 'var(--primary)' : '#ccc'};border-radius:26px;transition:background 0.3s;" id="waToggleTrack"></span>
              <span style="position:absolute;top:3px;left:${waSettings.wa_enabled !== false ? '27px' : '3px'};width:20px;height:20px;background:white;border-radius:50%;transition:left 0.3s;box-shadow:0 1px 3px rgba(0,0,0,0.2);" id="waToggleThumb"></span>
            </label>
          </div>
          <p class="text-sm text-muted" style="margin-bottom:16px;">Kirim notifikasi otomatis ke WhatsApp saat pegawai mengajukan izin/sakit.</p>
          <div id="waFieldsContainer" style="opacity:${waSettings.wa_enabled !== false ? '1' : '0.4'};pointer-events:${waSettings.wa_enabled !== false ? 'auto' : 'none'};transition:opacity 0.3s;">
          <div class="form-group">
            <label class="form-label-dark">No. WA Admin</label>
            <input class="form-input-light" id="waAdminNumber" type="tel" placeholder="628xxxxxxxxxx" value="${waSettings.admin_wa || ''}">
            <p class="text-xs text-muted" style="margin-top:4px;">Format: 628xxxxxxxxxx (tanpa + atau spasi)</p>
          </div>
          <div class="form-group">
            <label class="form-label-dark">No. WA Pimpinan</label>
            <input class="form-input-light" id="waPimpinanNumber" type="tel" placeholder="628xxxxxxxxxx" value="${waSettings.pimpinan_wa || ''}">
          </div>
          <div class="form-group">
            <label class="form-label-dark">WhatsApp API URL <span class="text-muted">(opsional)</span></label>
            <input class="form-input-light" id="waApiUrl" type="url" placeholder="https://api.fonnte.com/send" value="${waSettings.api_url || ''}">
            <p class="text-xs text-muted" style="margin-top:4px;">Kosongkan untuk menggunakan link wa.me (gratis)</p>
          </div>
          <div class="form-group">
            <label class="form-label-dark">API Token <span class="text-muted">(opsional)</span></label>
            <input class="form-input-light" id="waApiToken" type="text" placeholder="Token API (jika menggunakan API)" value="${waSettings.api_token || ''}">
          </div>
          <button class="btn btn-primary btn-sm" onclick="AdminPage.saveWaSettings()">💾 Simpan Pengaturan WA</button>
          </div>
        </div>

        <div class="card" style="margin-bottom:20px;">
          <h3 style="margin-bottom:16px;">Pengaturan Aplikasi</h3>
          <div class="profile-menu-item" onclick="AdminPage.resetDemoData()">
            <div class="pm-icon" style="background:var(--warning-light);">🔄</div>
            <div class="pm-text">
              <h4>Reset Data Demo</h4>
              <p>Menghapus semua data dan mengembalikan ke data contoh awal</p>
            </div>
            <span class="pm-arrow">›</span>
          </div>
        </div>

        <div class="card">
          <h3 style="margin-bottom:16px;">Tentang Aplikasi</h3>
          <p class="text-sm text-muted">Sistem Absensi Digital Yayasan Al-Mumtaz v1.0</p>
          <p class="text-sm text-muted">© 2026 Yayasan Al-Mumtaz. All rights reserved.</p>
        </div>
      </div>
    `;
  }

  function resetDemoData() {
    if (confirm('Apakah Anda yakin ingin mereset semua data demo? Tindakan ini tidak dapat dibatalkan.')) {
      localStorage.removeItem('am_locations');
      localStorage.removeItem('am_shifts');
      localStorage.removeItem('am_employees');
      localStorage.removeItem('am_attendance');
      App.showToast('Data demo berhasil direset. Halaman akan dimuat ulang.');
      setTimeout(() => location.reload(), 1000);
    }
  }

  function navigateTo(section) {
    const user = Auth.getUser();
    _loadSection(section, user);
    // Close sidebar on mobile
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // --- Helpers ---
  function _menuItem(section, icon, label) {
    return `
      <button class="sidebar-menu-item ${section === currentSection ? 'active' : ''}" 
              data-section="${section}"
              onclick="AdminPage.navigateTo('${section}')">
        <span class="menu-icon">${icon}</span>
        ${label}
      </button>
    `;
  }

  function _sectionTitle(section) {
    const map = {
      dashboard: 'Dashboard',
      pegawai: 'Manajemen Pegawai',
      lokasi: 'Manajemen Lokasi',
      jadwal: 'Jadwal & Shift',
      laporan: 'Laporan Kehadiran',
      pengaturan: 'Pengaturan'
    };
    return map[section] || 'Dashboard';
  }

  function _formatDate(d) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function _formatRole(role) {
    const map = { admin: 'Admin', kepala_unit: 'Kepala Unit', pegawai: 'Pegawai' };
    return map[role] || role;
  }

  function _monthOptions(current) {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return months.map((m, i) => `<option value="${i + 1}" ${i + 1 === current ? 'selected' : ''}>${m}</option>`).join('');
  }

  function _unitEmoji(name) {
    if (name.includes('TK')) return '🎨';
    if (name.includes('SD')) return '📚';
    if (name.includes('SMP')) return '🏫';
    return '🏢';
  }

  function saveWaSettings() {
    const settings = {
      wa_enabled: document.getElementById('waToggle').checked,
      admin_wa: (document.getElementById('waAdminNumber').value || '').replace(/\D/g, ''),
      pimpinan_wa: (document.getElementById('waPimpinanNumber').value || '').replace(/\D/g, ''),
      api_url: document.getElementById('waApiUrl').value.trim(),
      api_token: document.getElementById('waApiToken').value.trim()
    };
    localStorage.setItem('am_wa_settings', JSON.stringify(settings));
    App.showToast('Pengaturan WhatsApp berhasil disimpan ✅');
  }

  return {
    render,
    init,
    navigateTo,
    showAddEmployee,
    editEmployee,
    confirmDeleteEmployee,
    showAddLocation,
    useCurrentLocation,
    confirmDeleteLocation,
    loadReport,
    exportCSV: exportReport,
    exportReport,
    resetDemoData,
    approveRequest,
    saveWaSettings
  };
})();
