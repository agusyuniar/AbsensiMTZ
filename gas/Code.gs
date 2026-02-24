/**
 * Google Apps Script — Backend for Absensi Al-Mumtaz
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Spreadsheet
 * 2. Create 4 sheets: master_pegawai, lokasi_geofence, log_absensi, jadwal_shift
 * 3. Open Extensions → Apps Script
 * 4. Paste this code into Code.gs
 * 5. Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. Copy the Web App URL and paste it into js/api.js (GAS_URL variable)
 * 7. Set DEMO_MODE to false in js/api.js
 * 
 * SHEET HEADERS:
 * master_pegawai: id_pegawai | nama | email | password_hash | role | unit_penempatan | tipe_pegawai | shift_id | jabatan | bidang
 * lokasi_geofence: id_lokasi | nama_lokasi | latitude | longitude | radius_meter
 * log_absensi: id_log | id_pegawai | tanggal | jam_masuk | jam_keluar | lokasi_terdeteksi | lat_absen | lng_absen | foto_masuk | foto_keluar | status | keterangan | approval_status
 * jadwal_shift: shift_id | nama_shift | jam_masuk | jam_keluar | toleransi_menit
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      // ---- Auth ----
      case 'login':
        // Support both GET params and POST body for maximum compatibility
        let loginEmail, loginPassword;
        if (e.parameter.email && e.parameter.password) {
          loginEmail = e.parameter.email;
          loginPassword = e.parameter.password;
        } else if (e.postData && e.postData.contents) {
          const loginData = JSON.parse(e.postData.contents);
          loginEmail = loginData.email;
          loginPassword = loginData.password;
        }
        result = login(loginEmail, loginPassword);
        break;

      // ---- Reference Data ----
      case 'getLocations':
        result = getLocations();
        break;
      case 'getShifts':
        result = getShifts();
        break;
      case 'getEmployees':
        result = getEmployees();
        break;
      case 'getEmployeesByUnit':
        result = getEmployeesByUnit(e.parameter.unit);
        break;

      // ---- Attendance ----
      case 'submitAttendance':
        const attData = JSON.parse(e.postData.contents);
        result = submitAttendance(attData);
        break;
      case 'submitIzinSakit':
        const izinData = JSON.parse(e.postData.contents);
        result = submitIzinSakit(izinData);
        break;
      case 'getHistory':
        result = getHistory(e.parameter.id, parseInt(e.parameter.month), parseInt(e.parameter.year));
        break;
      case 'getTodayAttendance':
        result = getTodayAttendance(e.parameter.id);
        break;
      case 'getAllTodayAttendance':
        result = getAllTodayAttendance();
        break;
      case 'getUnitTodayAttendance':
        result = getUnitTodayAttendance(e.parameter.unit);
        break;

      // ---- Reports ----
      case 'getMonthlyReport':
        result = getMonthlyReport(parseInt(e.parameter.month), parseInt(e.parameter.year), e.parameter.unit);
        break;
      case 'getUnitSummary':
        result = getUnitSummary();
        break;

      // ---- Employee Management ----
      case 'saveEmployee':
        const empData = JSON.parse(e.postData.contents);
        result = saveEmployee(empData);
        break;
      case 'deleteEmployee':
        result = deleteEmployee(e.parameter.id);
        break;

      // ---- Location Management ----
      case 'saveLocation':
        const locData = JSON.parse(e.postData.contents);
        result = saveLocation(locData);
        break;
      case 'deleteLocation':
        result = deleteLocation(e.parameter.id);
        break;

      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message, stack: err.stack };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// HELPERS
// ============================================================
function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function appendRow(sheetName, rowData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => rowData[h] !== undefined ? rowData[h] : '');
  sheet.appendRow(row);
}

function updateRow(sheetName, idColumn, idValue, rowData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColumn);
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIdx]) == String(idValue)) {
      headers.forEach((h, j) => {
        if (rowData[h] !== undefined) {
          sheet.getRange(i + 1, j + 1).setValue(rowData[h]);
        }
      });
      return true;
    }
  }
  return false;
}

function deleteRow(sheetName, idColumn, idValue) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idIdx = headers.indexOf(idColumn);
  
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][idIdx]) == String(idValue)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

// ============================================================
// AUTH
// ============================================================
function login(email, password) {
  if (!email || !password) {
    return { success: false, message: 'Email dan password wajib diisi' };
  }
  const employees = getSheetData('master_pegawai');
  // Support both plain text password column and password_hash column
  const user = employees.find(e => {
    if (String(e.email).trim().toLowerCase() !== String(email).trim().toLowerCase()) return false;
    // Check password_hash column (original) or password column
    return String(e.password_hash || e.password || '').trim() === String(password).trim();
  });
  if (user) {
    const { password_hash, password: pw, ...safeUser } = user;
    return { success: true, user: safeUser };
  }
  return { success: false, message: 'Email atau password salah' };
}

// ============================================================
// REFERENCE DATA
// ============================================================
function getLocations() {
  return getSheetData('lokasi_geofence');
}

function getShifts() {
  return getSheetData('jadwal_shift');
}

function getEmployees() {
  return getSheetData('master_pegawai').map(e => {
    const { password_hash, password, ...safe } = e;
    return safe;
  });
}

function getEmployeesByUnit(unit) {
  return getEmployees().filter(e => e.unit_penempatan === unit);
}

// ============================================================
// ATTENDANCE
// ============================================================
function submitAttendance(data) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss');
  
  const logs = getSheetData('log_absensi');
  const existing = logs.find(l => String(l.id_pegawai) === String(data.id_pegawai) && String(l.tanggal) === today);
  
  if (data.type === 'masuk') {
    if (existing && existing.jam_masuk) {
      return { success: false, message: 'Sudah absen masuk hari ini' };
    }
    
    // Determine status based on shift
    let status = 'hadir';
    if (data.shift_id) {
      const shifts = getSheetData('jadwal_shift');
      const shift = shifts.find(s => String(s.shift_id) === String(data.shift_id));
      if (shift) {
        const [sh, sm] = String(shift.jam_masuk).split(':').map(Number);
        const tolerance = Number(shift.toleransi_menit) || 0;
        const shiftLimit = sh * 60 + sm + tolerance;
        const nowParts = now.split(':').map(Number);
        const nowMinutes = nowParts[0] * 60 + nowParts[1];
        if (nowMinutes > shiftLimit) status = 'terlambat';
      }
    }
    
    // Upload photo to Drive if provided
    let photoUrl = '';
    if (data.foto) {
      photoUrl = savePhotoToDrive(data.foto, data.id_pegawai + '_masuk_' + today);
    }
    
    const log = {
      id_log: 'LOG-' + today.replace(/-/g, '') + '-' + data.id_pegawai,
      id_pegawai: data.id_pegawai,
      tanggal: today,
      jam_masuk: now,
      jam_keluar: '',
      lokasi_terdeteksi: data.lokasi || '',
      lat_absen: data.lat || 0,
      lng_absen: data.lng || 0,
      foto_masuk: photoUrl,
      foto_keluar: '',
      status: status,
      keterangan: '',
      approval_status: data.dinas_luar ? 'pending' : 'approved'
    };
    
    appendRow('log_absensi', log);
    return { success: true, data: log };
  } else {
    if (!existing || !existing.jam_masuk) {
      return { success: false, message: 'Belum absen masuk hari ini' };
    }
    
    let photoUrl = '';
    if (data.foto) {
      photoUrl = savePhotoToDrive(data.foto, data.id_pegawai + '_keluar_' + today);
    }
    
    updateRow('log_absensi', 'id_log', existing.id_log, {
      jam_keluar: now,
      foto_keluar: photoUrl
    });
    
    existing.jam_keluar = now;
    return { success: true, data: existing };
  }
}

function submitIzinSakit(data) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  
  const logs = getSheetData('log_absensi');
  const existing = logs.find(l => String(l.id_pegawai) === String(data.id_pegawai) && String(l.tanggal) === today);
  
  if (existing) {
    return { success: false, message: 'Anda sudah memiliki catatan absensi untuk hari ini' };
  }
  
  const log = {
    id_log: 'LOG-' + today.replace(/-/g, '') + '-' + data.id_pegawai,
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
    approval_status: 'pending'
  };
  
  appendRow('log_absensi', log);
  return { success: true, data: log };
}

// ============================================================
// HISTORY & REPORTS
// ============================================================
function getHistory(employeeId, month, year) {
  return getSheetData('log_absensi').filter(l => {
    if (String(l.id_pegawai) !== String(employeeId)) return false;
    if (month && year) {
      const d = new Date(l.tanggal);
      return (d.getMonth() + 1) === month && d.getFullYear() === year;
    }
    return true;
  }).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)));
}

function getTodayAttendance(employeeId) {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const logs = getSheetData('log_absensi');
  return logs.find(l => String(l.id_pegawai) === String(employeeId) && String(l.tanggal) === today) || null;
}

function getAllTodayAttendance() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return getSheetData('log_absensi').filter(l => String(l.tanggal) === today);
}

function getUnitTodayAttendance(unit) {
  const employees = getEmployees().filter(e => e.unit_penempatan === unit);
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const logs = getSheetData('log_absensi').filter(l => String(l.tanggal) === today);
  
  return employees.map(emp => {
    const log = logs.find(l => String(l.id_pegawai) === String(emp.id_pegawai));
    return { ...emp, attendance: log || null };
  });
}

function getMonthlyReport(month, year, unit) {
  const employees = getEmployees().filter(e => !unit || e.unit_penempatan === unit);
  const logs = getSheetData('log_absensi');
  
  return employees.map(emp => {
    const empLogs = logs.filter(l => {
      if (String(l.id_pegawai) !== String(emp.id_pegawai)) return false;
      const d = new Date(l.tanggal);
      return (d.getMonth() + 1) === month && d.getFullYear() === year;
    });
    return {
      ...emp,
      hadir: empLogs.filter(l => l.status === 'hadir').length,
      terlambat: empLogs.filter(l => l.status === 'terlambat').length,
      izin: empLogs.filter(l => l.status === 'izin').length,
      sakit: empLogs.filter(l => l.status === 'sakit').length,
      tidak_hadir: 0,
      total_hari: empLogs.length
    };
  });
}

function getUnitSummary() {
  const locations = getSheetData('lokasi_geofence');
  const employees = getEmployees();
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  const logs = getSheetData('log_absensi').filter(l => String(l.tanggal) === today);
  
  return locations.map(loc => {
    const unitEmps = employees.filter(e => e.unit_penempatan === loc.nama_lokasi);
    const todayLogs = logs.filter(l => unitEmps.some(e => String(e.id_pegawai) === String(l.id_pegawai)));
    return {
      ...loc,
      total_pegawai: unitEmps.length,
      hadir: todayLogs.filter(l => l.status === 'hadir' || l.status === 'terlambat').length,
      terlambat: todayLogs.filter(l => l.status === 'terlambat').length,
      izin: todayLogs.filter(l => l.status === 'izin').length,
      sakit: todayLogs.filter(l => l.status === 'sakit').length,
      belum_absen: unitEmps.length - todayLogs.length,
      persentase: unitEmps.length ? Math.round(todayLogs.length / unitEmps.length * 100) : 0
    };
  });
}

// ============================================================
// EMPLOYEE MANAGEMENT
// ============================================================
function saveEmployee(data) {
  if (data.id_pegawai) {
    updateRow('master_pegawai', 'id_pegawai', data.id_pegawai, data);
  } else {
    const emps = getSheetData('master_pegawai');
    data.id_pegawai = 'PGW-' + String(emps.length + 1).padStart(3, '0');
    appendRow('master_pegawai', data);
  }
  return { success: true, data: data };
}

function deleteEmployee(id) {
  deleteRow('master_pegawai', 'id_pegawai', id);
  return { success: true };
}

// ============================================================
// LOCATION MANAGEMENT
// ============================================================
function saveLocation(data) {
  if (data.id_lokasi) {
    updateRow('lokasi_geofence', 'id_lokasi', data.id_lokasi, data);
  } else {
    const locs = getSheetData('lokasi_geofence');
    data.id_lokasi = 'LOK-' + String(locs.length + 1).padStart(2, '0');
    appendRow('lokasi_geofence', data);
  }
  return { success: true, data: data };
}

function deleteLocation(id) {
  deleteRow('lokasi_geofence', 'id_lokasi', id);
  return { success: true };
}

// ============================================================
// PHOTO UPLOAD
// ============================================================
function savePhotoToDrive(base64Data, fileName) {
  try {
    const data = base64Data.split(',')[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(data), 'image/jpeg', fileName + '.jpg');
    const folder = DriveApp.getFoldersByName('Absensi_Foto').hasNext()
      ? DriveApp.getFoldersByName('Absensi_Foto').next()
      : DriveApp.createFolder('Absensi_Foto');
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    Logger.log('Photo upload error: ' + err.message);
    return '';
  }
}
