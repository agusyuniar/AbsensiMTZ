/**
 * API module — Handles all communication with Google Apps Script backend.
 * In demo mode, uses local mock data stored in localStorage.
 */
const API = (() => {
    // Set this to your Google Apps Script Web App URL after deployment
    const GAS_URL = '';
    const DEMO_MODE = true; // Set to false when GAS_URL is configured

    // --- Demo Data ---
    const DEMO_LOCATIONS = [
        { id_lokasi: 'LOK-01', nama_lokasi: 'Kantor Yayasan', latitude: -6.9175, longitude: 107.6191, radius_meter: 100 },
        { id_lokasi: 'LOK-02', nama_lokasi: 'TK Al-Mumtaz', latitude: -6.9220, longitude: 107.6150, radius_meter: 75 },
        { id_lokasi: 'LOK-03', nama_lokasi: 'SD Al-Mumtaz', latitude: -6.9300, longitude: 107.6200, radius_meter: 75 },
        { id_lokasi: 'LOK-04', nama_lokasi: 'SMP Al-Mumtaz', latitude: -6.9350, longitude: 107.6250, radius_meter: 75 }
    ];

    const DEMO_SHIFTS = [
        { shift_id: 'SHIFT-01', nama_shift: 'Reguler Staf', jam_masuk: '08:00', jam_keluar: '16:00', toleransi_menit: 15 },
        { shift_id: 'SHIFT-02', nama_shift: 'Guru Pagi', jam_masuk: '07:00', jam_keluar: '14:00', toleransi_menit: 15 },
        { shift_id: 'SHIFT-03', nama_shift: 'Guru Siang', jam_masuk: '12:00', jam_keluar: '17:00', toleransi_menit: 10 }
    ];

    const DEMO_EMPLOYEES = [
        { id_pegawai: 'PGW-001', nama: 'Ahmad Fauzi', email: 'admin@almumtaz.id', password: 'admin123', role: 'admin', unit_penempatan: 'Kantor Yayasan', tipe_pegawai: 'tetap', shift_id: 'SHIFT-01', jabatan: 'Direktur', bidang: 'Manajemen' },
        { id_pegawai: 'PGW-002', nama: 'Siti Nurhaliza', email: 'siti@almumtaz.id', password: 'siti123', role: 'kepala_unit', unit_penempatan: 'SD Al-Mumtaz', tipe_pegawai: 'tetap', shift_id: 'SHIFT-02', jabatan: 'Kepala Sekolah', bidang: 'Pendidikan' },
        { id_pegawai: 'PGW-003', nama: 'Budi Santoso', email: 'budi@almumtaz.id', password: 'budi123', role: 'pegawai', unit_penempatan: 'Kantor Yayasan', tipe_pegawai: 'tetap', shift_id: 'SHIFT-01', jabatan: 'Staf Administrasi', bidang: 'Administrasi' },
        { id_pegawai: 'PGW-004', nama: 'Dewi Kartika', email: 'dewi@almumtaz.id', password: 'dewi123', role: 'pegawai', unit_penempatan: 'SD Al-Mumtaz', tipe_pegawai: 'tetap', shift_id: 'SHIFT-02', jabatan: 'Guru Kelas', bidang: 'Pendidikan' },
        { id_pegawai: 'PGW-005', nama: 'Rizki Ramadhan', email: 'rizki@almumtaz.id', password: 'rizki123', role: 'pegawai', unit_penempatan: 'SMP Al-Mumtaz', tipe_pegawai: 'mobile', shift_id: 'SHIFT-02', jabatan: 'Guru BK', bidang: 'Bimbingan Konseling' },
        { id_pegawai: 'PGW-006', nama: 'Fatimah Zahra', email: 'fatimah@almumtaz.id', password: 'fatimah123', role: 'pegawai', unit_penempatan: 'TK Al-Mumtaz', tipe_pegawai: 'tetap', shift_id: 'SHIFT-02', jabatan: 'Guru TK', bidang: 'Pendidikan Anak Usia Dini' },
        { id_pegawai: 'PGW-007', nama: 'Hasan Abdullah', email: 'hasan@almumtaz.id', password: 'hasan123', role: 'kepala_unit', unit_penempatan: 'SMP Al-Mumtaz', tipe_pegawai: 'tetap', shift_id: 'SHIFT-02', jabatan: 'Kepala Sekolah', bidang: 'Pendidikan' },
        { id_pegawai: 'PGW-008', nama: 'Aisyah Putri', email: 'aisyah@almumtaz.id', password: 'aisyah123', role: 'pegawai', unit_penempatan: 'Kantor Yayasan', tipe_pegawai: 'tetap', shift_id: 'SHIFT-01', jabatan: 'Staf Keuangan', bidang: 'Keuangan' }
    ];

    function _initDemoData() {
        if (!localStorage.getItem('am_locations')) {
            localStorage.setItem('am_locations', JSON.stringify(DEMO_LOCATIONS));
        }
        if (!localStorage.getItem('am_shifts')) {
            localStorage.setItem('am_shifts', JSON.stringify(DEMO_SHIFTS));
        }
        if (!localStorage.getItem('am_employees')) {
            localStorage.setItem('am_employees', JSON.stringify(DEMO_EMPLOYEES));
        }
        if (!localStorage.getItem('am_attendance')) {
            // Generate some historical data for the last 20 days
            const logs = [];
            const today = new Date();
            DEMO_EMPLOYEES.forEach(emp => {
                for (let i = 1; i <= 20; i++) {
                    const d = new Date(today);
                    d.setDate(d.getDate() - i);
                    if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends

                    const shift = DEMO_SHIFTS.find(s => s.shift_id === emp.shift_id);
                    const isLate = Math.random() < 0.15;
                    const isAbsent = Math.random() < 0.05;

                    if (isAbsent) continue;

                    const [hm, mm] = shift.jam_masuk.split(':').map(Number);
                    const [hk, mk] = shift.jam_keluar.split(':').map(Number);
                    const lateMin = isLate ? Math.floor(Math.random() * 30) + 5 : Math.floor(Math.random() * 10) - 5;

                    const jamMasuk = `${String(hm).padStart(2, '0')}:${String(Math.max(0, mm + lateMin)).padStart(2, '0')}:00`;
                    const jamKeluar = `${String(hk).padStart(2, '0')}:${String(mk + Math.floor(Math.random() * 15)).padStart(2, '0')}:00`;

                    const dateStr = d.toISOString().split('T')[0];
                    const loc = DEMO_LOCATIONS.find(l => l.nama_lokasi === emp.unit_penempatan) || DEMO_LOCATIONS[0];

                    logs.push({
                        id_log: `LOG-${dateStr.replace(/-/g, '')}-${emp.id_pegawai}`,
                        id_pegawai: emp.id_pegawai,
                        tanggal: dateStr,
                        jam_masuk: jamMasuk,
                        jam_keluar: jamKeluar,
                        lokasi_terdeteksi: loc.nama_lokasi,
                        lat_absen: loc.latitude + (Math.random() - 0.5) * 0.001,
                        lng_absen: loc.longitude + (Math.random() - 0.5) * 0.001,
                        foto_masuk: '',
                        foto_keluar: '',
                        status: isLate ? 'terlambat' : 'hadir',
                        approval_status: 'approved'
                    });
                }
            });
            localStorage.setItem('am_attendance', JSON.stringify(logs));
        }
    }

    function _getLocalData(key) {
        return JSON.parse(localStorage.getItem(key) || '[]');
    }

    function _setLocalData(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    }

    // --- Public API Methods ---
    async function login(email, password) {
        if (DEMO_MODE) {
            _initDemoData();
            const employees = _getLocalData('am_employees');
            const user = employees.find(e => e.email === email && e.password === password);
            if (user) {
                return { success: true, user: { ...user, password: undefined } };
            }
            return { success: false, message: 'Email atau password salah' };
        }
        // Real API call — use GET with params to avoid GAS redirect losing POST body
        try {
            const res = await fetch(`${GAS_URL}?action=login&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, {
                method: 'GET',
                redirect: 'follow'
            });
            return await res.json();
        } catch (err) {
            console.error('Login API error:', err);
            return { success: false, message: 'Gagal terhubung ke server. Periksa koneksi internet.' };
        }
    }

    async function getLocations() {
        if (DEMO_MODE) return _getLocalData('am_locations');
        const res = await fetch(`${GAS_URL}?action=getLocations`);
        return res.json();
    }

    async function getShifts() {
        if (DEMO_MODE) return _getLocalData('am_shifts');
        const res = await fetch(`${GAS_URL}?action=getShifts`);
        return res.json();
    }

    async function getEmployees() {
        if (DEMO_MODE) return _getLocalData('am_employees').map(e => ({ ...e, password: undefined }));
        const res = await fetch(`${GAS_URL}?action=getEmployees`);
        return res.json();
    }

    async function getEmployeesByUnit(unit) {
        if (DEMO_MODE) {
            return _getLocalData('am_employees')
                .filter(e => e.unit_penempatan === unit)
                .map(e => ({ ...e, password: undefined }));
        }
        const res = await fetch(`${GAS_URL}?action=getEmployeesByUnit&unit=${encodeURIComponent(unit)}`);
        return res.json();
    }

    async function submitAttendance(data) {
        if (DEMO_MODE) {
            const logs = _getLocalData('am_attendance');
            const today = new Date().toISOString().split('T')[0];
            const existing = logs.find(l => l.id_pegawai === data.id_pegawai && l.tanggal === today);

            if (data.type === 'masuk') {
                if (existing && existing.jam_masuk) {
                    return { success: false, message: 'Anda sudah absen masuk hari ini' };
                }
                const shift = _getLocalData('am_shifts').find(s => s.shift_id === data.shift_id);
                const now = new Date();
                const jamStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

                let status = 'hadir';
                if (shift) {
                    const [sh, sm] = shift.jam_masuk.split(':').map(Number);
                    const shiftTime = sh * 60 + sm + shift.toleransi_menit;
                    const nowTime = now.getHours() * 60 + now.getMinutes();
                    if (nowTime > shiftTime) status = 'terlambat';
                }

                const logId = `LOG-${today.replace(/-/g, '')}-${data.id_pegawai}`;
                let fotoRef = '';
                if (data.foto) {
                    const photoKey = `attendance_${logId}_masuk`;
                    await PhotoStore.save(photoKey, data.foto);
                    fotoRef = `idb:${photoKey}`;
                }
                const log = {
                    id_log: logId,
                    id_pegawai: data.id_pegawai,
                    tanggal: today,
                    jam_masuk: jamStr,
                    jam_keluar: '',
                    lokasi_terdeteksi: data.lokasi || 'Tidak Diketahui',
                    lat_absen: data.lat || 0,
                    lng_absen: data.lng || 0,
                    foto_masuk: fotoRef,
                    foto_keluar: '',
                    status: status,
                    keterangan: '',
                    approval_status: data.dinas_luar ? 'pending' : 'approved',
                    device_info: data.device_info || ''
                };
                logs.push(log);
                _setLocalData('am_attendance', logs);
                return { success: true, data: log };
            } else {
                // Absen keluar
                if (!existing || !existing.jam_masuk) {
                    return { success: false, message: 'Anda belum absen masuk hari ini' };
                }
                if (existing.jam_keluar) {
                    return { success: false, message: 'Anda sudah absen keluar hari ini' };
                }
                const now = new Date();
                existing.jam_keluar = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
                if (data.foto) {
                    const photoKey = `attendance_${existing.id_log}_keluar`;
                    await PhotoStore.save(photoKey, data.foto);
                    existing.foto_keluar = `idb:${photoKey}`;
                }
                _setLocalData('am_attendance', logs);
                return { success: true, data: existing };
            }
        }
        try {
            const res = await fetch(`${GAS_URL}?action=submitAttendance`, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (err) {
            console.error('submitAttendance error:', err);
            return { success: false, message: 'Gagal terhubung ke server' };
        }
    }

    async function getAttendanceHistory(employeeId, month, year) {
        if (DEMO_MODE) {
            const logs = _getLocalData('am_attendance');
            return logs.filter(l => {
                if (l.id_pegawai !== employeeId) return false;
                if (month !== undefined && year !== undefined) {
                    const [y, m] = l.tanggal.split('-');
                    return parseInt(y) === year && parseInt(m) === month;
                }
                return true;
            }).sort((a, b) => b.tanggal.localeCompare(a.tanggal));
        }
        const res = await fetch(`${GAS_URL}?action=getHistory&id=${employeeId}&month=${month}&year=${year}`);
        return res.json();
    }

    async function getTodayAttendance(employeeId) {
        if (DEMO_MODE) {
            const logs = _getLocalData('am_attendance');
            const today = new Date().toISOString().split('T')[0];
            return logs.find(l => l.id_pegawai === employeeId && l.tanggal === today) || null;
        }
        const res = await fetch(`${GAS_URL}?action=getTodayAttendance&id=${employeeId}`);
        return res.json();
    }

    async function getAllTodayAttendance() {
        if (DEMO_MODE) {
            const logs = _getLocalData('am_attendance');
            const today = new Date().toISOString().split('T')[0];
            return logs.filter(l => l.tanggal === today);
        }
        const res = await fetch(`${GAS_URL}?action=getAllTodayAttendance`);
        return res.json();
    }

    async function getUnitTodayAttendance(unit) {
        if (DEMO_MODE) {
            const employees = _getLocalData('am_employees').filter(e => e.unit_penempatan === unit);
            const logs = _getLocalData('am_attendance');
            const today = new Date().toISOString().split('T')[0];
            return employees.map(emp => {
                const log = logs.find(l => l.id_pegawai === emp.id_pegawai && l.tanggal === today);
                return { ...emp, password: undefined, attendance: log || null };
            });
        }
        const res = await fetch(`${GAS_URL}?action=getUnitTodayAttendance&unit=${encodeURIComponent(unit)}`);
        return res.json();
    }

    async function getMonthlyReport(month, year, unit) {
        if (DEMO_MODE) {
            const employees = _getLocalData('am_employees')
                .filter(e => !unit || e.unit_penempatan === unit)
                .map(e => ({ ...e, password: undefined }));
            const logs = _getLocalData('am_attendance');

            return employees.map(emp => {
                const empLogs = logs.filter(l => {
                    if (l.id_pegawai !== emp.id_pegawai) return false;
                    const [y, m] = l.tanggal.split('-');
                    return parseInt(y) === year && parseInt(m) === month;
                });
                // Collect keterangan entries for izin/sakit
                const keteranganList = empLogs
                    .filter(l => (l.status === 'izin' || l.status === 'sakit') && l.keterangan)
                    .map(l => ({ type: l.status, keterangan: l.keterangan, tanggal: l.tanggal }));
                return {
                    ...emp,
                    hadir: empLogs.filter(l => l.status === 'hadir').length,
                    terlambat: empLogs.filter(l => l.status === 'terlambat').length,
                    izin: empLogs.filter(l => l.status === 'izin').length,
                    sakit: empLogs.filter(l => l.status === 'sakit').length,
                    tidak_hadir: 0,
                    total_hari: empLogs.length,
                    keterangan_list: keteranganList
                };
            });
        }
        try {
            const res = await fetch(`${GAS_URL}?action=getMonthlyReport&month=${month}&year=${year}&unit=${encodeURIComponent(unit || '')}`);
            return await res.json();
        } catch (err) {
            console.error('getMonthlyReport error:', err);
            return [];
        }
    }

    async function getUnitSummary() {
        if (DEMO_MODE) {
            const locations = _getLocalData('am_locations');
            const employees = _getLocalData('am_employees');
            const logs = _getLocalData('am_attendance');
            const today = new Date().toISOString().split('T')[0];

            return locations.map(loc => {
                const unitEmployees = employees.filter(e => e.unit_penempatan === loc.nama_lokasi);
                const todayLogs = logs.filter(l => l.tanggal === today && unitEmployees.some(e => e.id_pegawai === l.id_pegawai));
                return {
                    ...loc,
                    total_pegawai: unitEmployees.length,
                    hadir: todayLogs.length,
                    terlambat: todayLogs.filter(l => l.status === 'terlambat').length,
                    belum_absen: unitEmployees.length - todayLogs.length,
                    persentase: unitEmployees.length ? Math.round((todayLogs.length / unitEmployees.length) * 100) : 0
                };
            });
        }
        const res = await fetch(`${GAS_URL}?action=getUnitSummary`);
        return res.json();
    }

    async function saveEmployee(empData) {
        if (DEMO_MODE) {
            const employees = _getLocalData('am_employees');
            const idx = employees.findIndex(e => e.id_pegawai === empData.id_pegawai);
            if (idx >= 0) {
                employees[idx] = { ...employees[idx], ...empData };
            } else {
                empData.id_pegawai = 'PGW-' + String(employees.length + 1).padStart(3, '0');
                employees.push(empData);
            }
            _setLocalData('am_employees', employees);
            return { success: true, data: empData };
        }
        const res = await fetch(`${GAS_URL}?action=saveEmployee`, {
            method: 'POST',
            body: JSON.stringify(empData)
        });
        return res.json();
    }

    async function deleteEmployee(id) {
        if (DEMO_MODE) {
            let employees = _getLocalData('am_employees');
            employees = employees.filter(e => e.id_pegawai !== id);
            _setLocalData('am_employees', employees);
            return { success: true };
        }
        const res = await fetch(`${GAS_URL}?action=deleteEmployee&id=${id}`, { method: 'POST' });
        return res.json();
    }

    async function saveLocation(locData) {
        if (DEMO_MODE) {
            const locations = _getLocalData('am_locations');
            const idx = locations.findIndex(l => l.id_lokasi === locData.id_lokasi);
            if (idx >= 0) {
                locations[idx] = { ...locations[idx], ...locData };
            } else {
                locData.id_lokasi = 'LOK-' + String(locations.length + 1).padStart(2, '0');
                locations.push(locData);
            }
            _setLocalData('am_locations', locations);
            return { success: true, data: locData };
        }
        const res = await fetch(`${GAS_URL}?action=saveLocation`, {
            method: 'POST',
            body: JSON.stringify(locData)
        });
        return res.json();
    }

    async function deleteLocation(id) {
        if (DEMO_MODE) {
            let locations = _getLocalData('am_locations');
            locations = locations.filter(l => l.id_lokasi !== id);
            _setLocalData('am_locations', locations);
            return { success: true };
        }
        const res = await fetch(`${GAS_URL}?action=deleteLocation&id=${id}`, { method: 'POST' });
        return res.json();
    }

    async function approveAttendance(logId, status) {
        if (DEMO_MODE) {
            const logs = _getLocalData('am_attendance');
            const log = logs.find(l => l.id_log === logId);
            if (log) {
                log.approval_status = status;
                _setLocalData('am_attendance', logs);
            }
            return { success: true };
        }
        const res = await fetch(`${GAS_URL}?action=approveAttendance`, {
            method: 'POST',
            body: JSON.stringify({ id_log: logId, status })
        });
        return res.json();
    }

    // --- Profile Picture ---
    function getProfilePicture(employeeId) {
        // Sync check: return cached value or empty
        // The actual photo is loaded async by PhotoStore
        if (getProfilePicture._cache && getProfilePicture._cache[employeeId]) {
            return getProfilePicture._cache[employeeId];
        }
        // Fallback: check old localStorage (for migration)
        const oldPics = JSON.parse(localStorage.getItem('am_profile_pics') || '{}');
        if (oldPics[employeeId]) return oldPics[employeeId];
        return '';
    }

    // Async loader for profile picture
    async function loadProfilePicture(employeeId) {
        const data = await PhotoStore.load(`profile_${employeeId}`);
        if (data) {
            if (!getProfilePicture._cache) getProfilePicture._cache = {};
            getProfilePicture._cache[employeeId] = data;
        }
        return data;
    }

    async function saveProfilePicture(employeeId, base64Data) {
        // Save to IndexedDB
        await PhotoStore.save(`profile_${employeeId}`, base64Data);
        // Update sync cache
        if (!getProfilePicture._cache) getProfilePicture._cache = {};
        getProfilePicture._cache[employeeId] = base64Data;
        // Also update session so avatar reflects immediately
        const sessionData = sessionStorage.getItem('am_user');
        if (sessionData) {
            const user = JSON.parse(sessionData);
            if (user.id_pegawai === employeeId) {
                user.profile_pic = base64Data;
                sessionStorage.setItem('am_user', JSON.stringify(user));
            }
        }
        return { success: true };
    }

    async function submitIzinSakit(data) {
        if (DEMO_MODE) {
            const logs = _getLocalData('am_attendance');
            const today = new Date().toISOString().split('T')[0];
            const existing = logs.find(l => l.id_pegawai === data.id_pegawai && l.tanggal === today);

            if (existing) {
                return { success: false, message: 'Anda sudah memiliki catatan absensi untuk hari ini' };
            }

            const log = {
                id_log: `LOG-${today.replace(/-/g, '')}-${data.id_pegawai}`,
                id_pegawai: data.id_pegawai,
                tanggal: today,
                jam_masuk: '',
                jam_keluar: '',
                lokasi_terdeteksi: '-',
                lat_absen: 0,
                lng_absen: 0,
                foto_masuk: '',
                foto_keluar: '',
                status: data.type, // 'izin' or 'sakit'
                keterangan: data.keterangan || '',
                approval_status: 'pending',
                device_info: data.device_info || ''
            };
            logs.push(log);
            _setLocalData('am_attendance', logs);
            return { success: true, data: log };
        }
        try {
            const res = await fetch(`${GAS_URL}?action=submitIzinSakit`, {
                method: 'POST',
                redirect: 'follow',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (err) {
            console.error('submitIzinSakit error:', err);
            return { success: false, message: 'Gagal terhubung ke server' };
        }
    }

    return {
        login,
        getLocations,
        getShifts,
        getEmployees,
        getEmployeesByUnit,
        submitAttendance,
        submitIzinSakit,
        getAttendanceHistory,
        getTodayAttendance,
        getAllTodayAttendance,
        getUnitTodayAttendance,
        getMonthlyReport,
        getUnitSummary,
        saveEmployee,
        deleteEmployee,
        saveLocation,
        deleteLocation,
        approveAttendance,
        getProfilePicture,
        loadProfilePicture,
        saveProfilePicture
    };
})();
