// ===== DOCTOR DASHBOARD =====
if (!requireAuth('doctor')) { /* redirected */ }

const user = getUser();
let allRecords = [];
let currentRecordId = null;
let currentPage = 1;
let totalPages = 1;
let totalRecords = 0;
const recordsPerPage = 10;

document.addEventListener('DOMContentLoaded', () => {
  if (user) {
    const spec = user.specialization ? ` • ${user.specialization}` : '';
    document.getElementById('navUserName').textContent = `Dr. ${user.name}${spec}`;
  }
  loadStats();
  loadAllRecords();
  loadPendingRecords();
  loadSevereRecords();
  loadReviewedRecords();
  loadDeletedRecords();
});

// ===== SECTION NAVIGATION =====
function showSection(name, el) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  if (el) el.classList.add('active');

  // Refresh on navigate
  if (name === 'reviewed') loadReviewedRecords();
  if (name === 'deleted') loadDeletedRecords();
}

// ===== STATS =====
async function loadStats() {
  try {
    const stats = await api.get('/records/stats');
    document.getElementById('statTotalNum').textContent = stats.total;
    document.getElementById('statReviewedNum').textContent = stats.reviewed;
    document.getElementById('statPendingNum').textContent = stats.pending;
    document.getElementById('statSevereNum').textContent = stats.severe;
    document.getElementById('pendingBadge').textContent = stats.pending;
    document.getElementById('reviewedBadge').textContent = stats.reviewed;
    document.getElementById('deletedBadge').textContent = stats.deleted || 0;

    // Disease bars
    if (stats.byDisease && stats.byDisease.length) {
      const max = stats.byDisease[0].count;
      document.getElementById('diseaseChart').innerHTML = stats.byDisease.map(d => `
        <div class="disease-bar-row">
          <div class="disease-bar-label" title="${d._id}">${d._id}</div>
          <div class="disease-bar-track">
            <div class="disease-bar-fill" style="width:${(d.count / max * 100)}%"></div>
          </div>
          <div class="disease-bar-count">${d.count}</div>
        </div>
      `).join('');
    } else {
      document.getElementById('diseaseChart').innerHTML = `<div class="no-data"><i class="fas fa-chart-bar"></i><p>No data yet</p></div>`;
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ===== ALL RECORDS =====
async function loadAllRecords(page = 1) {
  document.getElementById('patientsLoading').classList.remove('hidden');
  document.getElementById('patientsTableWrap').style.display = 'none';
  try {
    const result = await api.get(`/records?page=${page}&limit=${recordsPerPage}`);
    allRecords = result.records || [];
    currentPage = result.page || 1;
    totalPages = result.pages || 1;
    totalRecords = result.total || 0;
    renderTable(allRecords);
    updatePagination();
  } catch (err) {
    allRecords = [];
    document.getElementById('patientsTableBody').innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);">Failed to load records: ${err.message}</td></tr>`;
    document.getElementById('noPatientsData').classList.add('hidden');
  } finally {
    document.getElementById('patientsLoading').classList.add('hidden');
    document.getElementById('patientsTableWrap').style.display = '';
  }
}

function updatePagination() {
  const paginationDiv = document.getElementById('paginationControls');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');

  if (totalPages > 1) {
    paginationDiv.style.display = 'flex';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  } else {
    paginationDiv.style.display = 'none';
  }
}

function renderTable(records) {
  const tbody = document.getElementById('patientsTableBody');
  const noData = document.getElementById('noPatientsData');

  if (!records.length) {
    tbody.innerHTML = '';
    noData.classList.remove('hidden');
    return;
  }

  noData.classList.add('hidden');
  tbody.innerHTML = records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>
        <div style="font-weight:600;">${r.patientName}</div>
        ${r.patientEmail ? `<div style="font-size:0.78rem;color:var(--text-muted);">${r.patientEmail}</div>` : ''}
      </td>
      <td><span style="color:var(--primary);font-weight:600;">${r.disease}</span></td>
      <td>${r.age || '—'}</td>
      <td><span class="severity-badge severity-${r.severity}">${r.severity}</span></td>
      <td style="font-size:0.82rem;color:var(--text-muted);">${new Date(r.date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</td>
      <td><span class="status-pill status-${r.reviewed ? 'reviewed' : 'pending'}">
        <i class="fas fa-${r.reviewed ? 'check' : 'clock'}"></i> ${r.reviewed ? 'Reviewed' : 'Pending'}
      </span></td>
      <td>
        <div class="table-actions">
          <button class="icon-btn view" onclick="openModal('${r._id}')" title="View Details"><i class="fas fa-eye"></i></button>
          ${!r.reviewed ? `<button class="icon-btn review" onclick="quickReview('${r._id}')" title="Mark Reviewed"><i class="fas fa-check"></i></button>` : ''}
          <button class="icon-btn delete" onclick="confirmDelete('${r._id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ===== FILTER =====
function filterRecords() {
  const search = document.getElementById('patientSearch').value.toLowerCase();
  const disease = document.getElementById('diseaseFilter').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;

  const filtered = allRecords.filter(r => {
    const name = (r.patientName || '').toLowerCase();
    const dis = (r.disease || '').toLowerCase();
    const matchSearch = !search || name.includes(search) || dis.includes(search);
    const matchDisease = !disease || dis.includes(disease);
    const matchStatus = !status || (status === 'reviewed' ? r.reviewed : !r.reviewed);
    return matchSearch && matchDisease && matchStatus;
  });

  renderTable(filtered);
}

// ===== PENDING & SEVERE =====
async function loadPendingRecords() {
  try {
    const records = await api.get('/records?reviewed=false');
    renderCardGrid('pendingArea', records, false);
  } catch (err) { console.error(err); }
}

async function loadSevereRecords() {
  try {
    const all = await api.get('/records');
    const severe = all.filter(r => r.severity === 'severe');
    renderCardGrid('severeArea', severe, false);
  } catch (err) { console.error(err); }
}

// ===== REVIEWED RECORDS =====
async function loadReviewedRecords() {
  const el = document.getElementById('reviewedArea');
  el.innerHTML = `<div class="loading-wrap"><div class="dna-loader"><div class="strand"></div><div class="strand"></div><div class="strand"></div></div><p>Loading reviewed records...</p></div>`;
  try {
    const records = await api.get('/records?reviewed=true');
    renderCardGrid('reviewedArea', records, false);
  } catch (err) {
    el.innerHTML = `<div class="no-data"><i class="fas fa-exclamation-circle"></i><p>Error: ${err.message}</p></div>`;
  }
}

// ===== DELETED RECORDS =====
async function loadDeletedRecords() {
  const el = document.getElementById('deletedArea');
  el.innerHTML = `<div class="loading-wrap"><div class="dna-loader"><div class="strand"></div><div class="strand"></div><div class="strand"></div></div><p>Loading deleted records...</p></div>`;
  try {
    const records = await api.get('/records/deleted');
    renderCardGrid('deletedArea', records, true);
    document.getElementById('deletedBadge').textContent = records.length;
  } catch (err) {
    el.innerHTML = `<div class="no-data"><i class="fas fa-exclamation-circle"></i><p>Error: ${err.message}</p></div>`;
  }
}

// ===== CARD GRID RENDERER =====
function renderCardGrid(containerId, records, isDeletedView) {
  const el = document.getElementById(containerId);
  if (!records.length) {
    el.innerHTML = `<div class="no-data"><i class="fas fa-check-circle"></i><p>No records in this category</p></div>`;
    return;
  }
  el.innerHTML = records.map(r => `
    <div class="record-card ${isDeletedView ? 'record-card-deleted' : ''}" ${!isDeletedView ? `onclick="openModal('${r._id}')"` : ''}>
      <div class="record-card-top">
        <div>
          <div class="record-patient-name"><i class="fas fa-user-injured" style="color:var(--primary);margin-right:6px;"></i>${r.patientName}</div>
          <div class="record-disease">${r.disease}</div>
        </div>
        <span class="severity-badge severity-${r.severity}">${r.severity}</span>
      </div>
      <div class="record-meta">
        ${r.age ? `<span class="meta-tag"><i class="fas fa-user"></i> ${r.age} yrs</span>` : ''}
        ${r.gender ? `<span class="meta-tag"><i class="fas fa-venus-mars"></i> ${r.gender}</span>` : ''}
        <span class="meta-tag"><i class="fas fa-calendar"></i> ${new Date(r.date).toLocaleDateString('en-IN', {day:'numeric',month:'short'})}</span>
        ${isDeletedView
          ? `<span class="meta-tag" style="color:var(--danger);"><i class="fas fa-trash"></i> Deleted ${r.deletedAt ? new Date(r.deletedAt).toLocaleDateString('en-IN', {day:'numeric',month:'short'}) : ''}</span>`
          : `<span class="status-pill status-${r.reviewed ? 'reviewed' : 'pending'}" style="margin-left:auto;">
               <i class="fas fa-${r.reviewed ? 'check' : 'clock'}"></i> ${r.reviewed ? 'Reviewed' : 'Pending'}
             </span>`
        }
      </div>
      ${isDeletedView ? `
      <div class="deleted-card-actions">
        <button class="btn-restore" onclick="restoreRecord('${r._id}')">
          <i class="fas fa-undo"></i> Restore
        </button>
        <button class="btn-perm-delete" onclick="confirmPermanentDelete('${r._id}')">
          <i class="fas fa-times-circle"></i> Delete Forever
        </button>
      </div>` : ''}
    </div>
  `).join('');
}

// ===== MODAL =====
async function openModal(id) {
  currentRecordId = id;
  document.getElementById('patientModal').classList.remove('hidden');
  document.getElementById('modalBody').innerHTML = `<div class="loading-wrap"><div class="dna-loader"><div class="strand"></div><div class="strand"></div><div class="strand"></div></div><p>Loading...</p></div>`;

  try {
    const r = await api.get(`/records/${id}`);
    document.getElementById('modalPatientName').innerHTML = `<i class="fas fa-user-injured"></i> ${r.patientName}`;

    const reviewed = r.reviewed;
    document.getElementById('markReviewedBtn').style.display = reviewed ? 'none' : '';

    document.getElementById('modalBody').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">Disease</div><div class="detail-item-value" style="color:var(--primary);">${r.disease}</div></div>
        <div class="detail-item"><div class="detail-item-label">Severity</div><div class="detail-item-value"><span class="severity-badge severity-${r.severity}">${r.severity}</span></div></div>
        <div class="detail-item"><div class="detail-item-label">Age</div><div class="detail-item-value">${r.age || '—'}</div></div>
        <div class="detail-item"><div class="detail-item-label">Gender</div><div class="detail-item-value">${r.gender || '—'}</div></div>
        <div class="detail-item"><div class="detail-item-label">Weight</div><div class="detail-item-value">${r.weight ? r.weight + ' kg' : '—'}</div></div>
        <div class="detail-item"><div class="detail-item-label">Date</div><div class="detail-item-value">${new Date(r.date).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</div></div>
      </div>

      ${r.description ? `
      <div class="detail-section" style="margin-top:16px;">
        <h4><i class="fas fa-info-circle"></i> Description</h4>
        <div class="detail-value">${r.description}</div>
      </div>` : ''}

      ${r.medicines && r.medicines.length ? `
      <div class="detail-section" style="margin-top:16px;">
        <h4><i class="fas fa-pills"></i> Medicines Recommended</h4>
        <ul class="medicine-list-simple">
          ${r.medicines.map(m => `<li><i class="fas fa-capsules"></i> <strong>${m.name}</strong> — ${m.dosage} | ${m.frequency}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${r.precautions && r.precautions.length ? `
      <div class="detail-section" style="margin-top:16px;">
        <h4><i class="fas fa-shield-alt"></i> Precautions</h4>
        <ul class="medicine-list-simple">
          ${r.precautions.map(p => `<li><i class="fas fa-check-circle"></i> ${p}</li>`).join('')}
        </ul>
      </div>` : ''}

      ${reviewed ? `
      <div style="margin-top:16px;padding:12px 16px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:10px;">
        <div style="color:var(--success);font-weight:600;font-size:0.9rem;"><i class="fas fa-check-circle"></i> Reviewed on ${new Date(r.reviewedAt).toLocaleDateString('en-IN')}</div>
        ${r.notes ? `<div style="color:var(--text-muted);font-size:0.85rem;margin-top:6px;">${r.notes}</div>` : ''}
      </div>` : ''}
    `;
  } catch (err) {
    document.getElementById('modalBody').innerHTML = `<div class="no-data"><i class="fas fa-exclamation-circle"></i><p>Error: ${err.message}</p></div>`;
  }
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
  currentRecordId = null;
}

async function markReviewed() {
  if (!currentRecordId) return;
  const notes = document.getElementById('doctorNotes').value;
  try {
    await api.patch(`/records/${currentRecordId}/review`, { notes });
    closeModal('patientModal');
    loadStats();
    loadAllRecords();
    loadPendingRecords();
    loadReviewedRecords();
    showToast('✅ Case marked as reviewed', 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

async function quickReview(id) {
  try {
    await api.patch(`/records/${id}/review`, {});
    loadStats();
    loadAllRecords();
    loadPendingRecords();
    loadReviewedRecords();
    showToast('✅ Marked as reviewed', 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

function confirmDelete(id) {
  currentRecordId = id;
  if (confirm('Move this record to Deleted? You can restore it later.')) {
    deleteRecord();
  }
}

async function deleteRecord() {
  if (!currentRecordId) return;
  try {
    await api.delete(`/records/${currentRecordId}`);
    closeModal('patientModal');
    loadStats();
    loadAllRecords();
    loadPendingRecords();
    loadSevereRecords();
    loadDeletedRecords();
    showToast('🗑️ Record moved to Deleted', 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ===== RESTORE =====
async function restoreRecord(id) {
  if (!confirm('Restore this record back to active?')) return;
  try {
    await api.patch(`/records/${id}/restore`, {});
    loadStats();
    loadAllRecords();
    loadDeletedRecords();
    showToast('✅ Record restored successfully', 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ===== PERMANENT DELETE =====
function confirmPermanentDelete(id) {
  currentRecordId = id;
  if (confirm('⚠️ Permanently delete this record? This CANNOT be undone.')) {
    permanentDelete(id);
  }
}

async function permanentDelete(id) {
  try {
    await api.delete(`/records/${id}/permanent`);
    loadStats();
    loadDeletedRecords();
    showToast('🗑️ Record permanently deleted', 'success');
  } catch (err) {
    showToast('❌ ' + err.message, 'error');
  }
}

// ===== TOAST =====
function showToast(message, type) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed; bottom: 30px; right: 24px; z-index: 9999;
    background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
    color: white; padding: 12px 20px; border-radius: 10px;
    font-size: 0.9rem; font-weight: 600; font-family: var(--font);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Close modal on overlay click
document.getElementById('patientModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal('patientModal');
});

// ===== NOTIFICATIONS =====
let notifInterval = null;

function toggleNotifPanel() {
  const panel = document.getElementById('notifPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    loadNotifications();
  }
}

async function loadNotifications() {
  try {
    const notifications = await api.get('/notifications');
    const list = document.getElementById('notifList');

    if (!notifications || notifications.length === 0) {
      list.innerHTML = '<div class="notif-list-empty"><i class="fas fa-bell-slash"></i> No notifications</div>';
      return;
    }

    list.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n._id}')">
        <div class="notif-icon">
          <i class="fas ${n.type.includes('appointment') ? 'fa-calendar' : 'fa-clipboard'}"></i>
        </div>
        <div class="notif-content">
          <div class="notif-title">${n.title}</div>
          <div class="notif-message">${n.message}</div>
          <div class="notif-time">${new Date(n.createdAt).toLocaleDateString()} ${new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Error loading notifications:', err.message);
  }
}

async function loadUnreadCount() {
  try {
    const data = await api.get('/notifications/unread');
    const badge = document.getElementById('notifBadge');
    if (data.unread > 0) {
      badge.textContent = data.unread;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (err) {
    console.error('Error loading unread count:', err.message);
  }
}

async function markNotifRead(notifId) {
  try {
    await api.patch(`/notifications/${notifId}/read`, {});
    loadNotifications();
    loadUnreadCount();
  } catch (err) {
    console.error('Error marking notification as read:', err.message);
  }
}

async function markAllRead() {
  try {
    await api.patch('/notifications/read/all', {});
    loadNotifications();
    loadUnreadCount();
  } catch (err) {
    console.error('Error marking all as read:', err.message);
  }
}

// Close notif panel on click outside
document.addEventListener('click', (e) => {
  const panel = document.getElementById('notifPanel');
  const btn = document.querySelector('.notif-btn');
  if (panel && !panel.contains(e.target) && !btn.contains(e.target)) {
    panel.classList.add('hidden');
  }
});

// Initialize WebSocket and notifications
let socket = null;
document.addEventListener('DOMContentLoaded', () => {
  loadUnreadCount();
  initializeSocket();
});

function initializeSocket() {
  socket = io();
  const user = getUser();
  if (user) {
    socket.emit('register', user._id);
  }
  socket.on('notification', (data) => {
    loadUnreadCount();
    loadNotifications();
    showToast(data.title, 'info');
  });
}

// ===== ANALYTICS =====
let charts = {};

async function loadAnalytics() {
  try {
    const stats = await api.get('/records/stats');
    renderSeverityChart(stats.bySeverity);
    renderMonthlyChart(stats.monthlyTrend);
    renderDiseaseChart(stats.byDisease);
  } catch (err) {
    console.error('Analytics error:', err);
    showToast('Error loading analytics', 'error');
  }
}

function renderSeverityChart(bySeverity) {
  const ctx = document.getElementById('severityChart');
  if (charts.severity) charts.severity.destroy();
  charts.severity = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(bySeverity),
      datasets: [{
        data: Object.values(bySeverity),
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#0ea5e9'],
        borderColor: 'var(--bg-surface)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function renderMonthlyChart(monthlyTrend) {
  const ctx = document.getElementById('monthlyChart');
  if (charts.monthly) charts.monthly.destroy();
  charts.monthly = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: monthlyTrend.map(m => m._id),
      datasets: [{
        label: 'Records',
        data: monthlyTrend.map(m => m.count),
        backgroundColor: 'var(--primary)',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderDiseaseChart(byDisease) {
  const ctx = document.getElementById('diseaseChart');
  if (charts.disease) charts.disease.destroy();
  charts.disease = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: byDisease.map(d => d._id).slice(0, 10),
      datasets: [{
        label: 'Count',
        data: byDisease.map(d => d.count).slice(0, 10),
        backgroundColor: 'var(--secondary)',
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true } }
    }
  });
}

// ===== CSV EXPORT =====
function exportRecordsCSV() {
  if (!allRecords || allRecords.length === 0) {
    showToast('No records to export', 'error');
    return;
  }

  const headers = ['Record ID', 'Patient Name', 'Disease', 'Severity', 'Symptoms', 'Date', 'Reviewed'];
  const rows = allRecords.map(r => [
    r._id,
    r.patientName,
    r.disease,
    r.severity,
    (r.symptoms || []).join('; '),
    new Date(r.date).toLocaleDateString(),
    r.reviewed ? 'Yes' : 'No'
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `medical_records_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  showToast('CSV exported successfully', 'success');
}
