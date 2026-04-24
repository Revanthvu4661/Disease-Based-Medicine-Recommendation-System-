// ===== PATIENT DASHBOARD =====
if (!requireAuth('patient')) { /* redirected */ }

const user = getUser();
let allDiseases = [];
let currentResult = null;
let currentRecordSaved = false;
let cachedRecords = [];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  if (user) document.getElementById('navUserName').textContent = `👤 ${user.name}`;
  await loadDiseaseList();
  loadHealthSummary();
  loadReminders();
  loadDoctorsForDropdown();
});

// ===== SECTION NAVIGATION =====
function showSection(name, el) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.remove('hidden');
  if (el) el.classList.add('active');
  if (name === 'history') loadHistory();
  if (name === 'dashboard') loadHealthSummary();
}

// ===== HEALTH SUMMARY =====
async function loadHealthSummary() {
  try {
    const records = await api.get('/records/mine');
    cachedRecords = records;

    const total = records.length;
    const pending = records.filter(r => !r.reviewed).length;
    const reviewed = records.filter(r => r.reviewed).length;
    const severe = records.filter(r => r.severity === 'severe').length;

    animateNum('sumTotal', total);
    animateNum('sumPending', pending);
    animateNum('sumReviewed', reviewed);
    animateNum('sumSevere', severe);

    renderRecentSearches(records.slice(0, 5));
    renderActiveMeds(records.slice(0, 4));
  } catch (err) {
    console.error('Health summary error:', err);
    ['sumTotal','sumPending','sumReviewed','sumSevere'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
  }
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  let current = 0;
  const step = Math.max(1, Math.floor(target / 20));
  const interval = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(interval);
  }, 40);
}

function renderRecentSearches(records) {
  const el = document.getElementById('recentSearches');
  if (!records.length) {
    el.innerHTML = `<div class="no-data"><i class="fas fa-search"></i><p>No searches yet. Search a disease to get started.</p></div>`;
    return;
  }
  el.innerHTML = records.map(r => `
    <div class="recent-item">
      <div class="recent-item-left">
        <div class="recent-disease">${r.disease}</div>
        <div class="recent-date"><i class="fas fa-clock"></i> ${new Date(r.date).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'})}</div>
      </div>
      <span class="severity-badge severity-${r.severity}">${r.severity}</span>
    </div>
  `).join('');
}

function renderActiveMeds(records) {
  const el = document.getElementById('activeMeds');
  const meds = [];
  records.forEach(r => {
    r.medicines?.slice(0, 2).forEach(m => {
      if (!meds.find(x => x.name === m.name)) {
        meds.push({ ...m, disease: r.disease });
      }
    });
  });

  if (!meds.length) {
    el.innerHTML = `<div class="no-data"><i class="fas fa-pills"></i><p>No medication records yet.</p></div>`;
    return;
  }

  el.innerHTML = meds.slice(0, 6).map(m => `
    <div class="med-item">
      <div class="med-dot"></div>
      <div>
        <div class="med-name">${m.name}</div>
        <div class="med-detail">${m.frequency || 'As needed'} &mdash; <span style="color:var(--primary)">${m.disease}</span></div>
      </div>
    </div>
  `).join('');
}

// ===== REMINDERS (localStorage) =====
function loadReminders() {
  const reminders = JSON.parse(localStorage.getItem('medirec_reminders') || '[]');
  renderReminders(reminders);
}

function renderReminders(reminders) {
  const el = document.getElementById('remindersArea');
  if (!reminders.length) {
    el.innerHTML = `<div class="no-data" style="padding:12px 0;"><i class="fas fa-bell-slash" style="font-size:1.4rem;"></i><p>No reminders set. Click "Add Reminder" to create one.</p></div>`;
    return;
  }
  el.innerHTML = reminders.map((r, i) => `
    <div class="reminder-item">
      <div class="reminder-icon"><i class="fas fa-bell"></i></div>
      <div class="reminder-info">
        <div class="reminder-text">${r.text}</div>
        <div class="reminder-time"><i class="fas fa-clock"></i> ${formatTime(r.time)}</div>
      </div>
      <button class="reminder-delete" onclick="deleteReminder(${i})" title="Delete"><i class="fas fa-times"></i></button>
    </div>
  `).join('');
}

function formatTime(t) {
  if (!t || t === 'No time set') return 'No time set';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function openAddReminder() {
  document.getElementById('reminderModal').classList.remove('hidden');
  document.getElementById('reminderText').value = '';
  document.getElementById('reminderTime').value = '';
  document.getElementById('reminderText').focus();
}

function closeReminderModal() {
  document.getElementById('reminderModal').classList.add('hidden');
}

function saveReminder() {
  const text = document.getElementById('reminderText').value.trim();
  const time = document.getElementById('reminderTime').value;
  if (!text) { showToast('Please enter a reminder description', 'error'); return; }

  const reminders = JSON.parse(localStorage.getItem('medirec_reminders') || '[]');
  reminders.push({ text, time: time || 'No time set' });
  localStorage.setItem('medirec_reminders', JSON.stringify(reminders));
  renderReminders(reminders);
  closeReminderModal();
  showToast('✅ Reminder saved!', 'success');
}

function deleteReminder(idx) {
  const reminders = JSON.parse(localStorage.getItem('medirec_reminders') || '[]');
  reminders.splice(idx, 1);
  localStorage.setItem('medirec_reminders', JSON.stringify(reminders));
  renderReminders(reminders);
}

// ===== DISEASE AUTOCOMPLETE =====
async function loadDiseaseList() {
  try {
    allDiseases = await api.get('/medical/all');
    setupAutocomplete();
  } catch (e) { console.log('Could not load disease list'); }
}

function setupAutocomplete() {
  const input = document.getElementById('diseaseInput');
  const suggestions = document.getElementById('searchSuggestions');

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    if (!q || q.length < 2) { suggestions.classList.remove('show'); return; }

    const matches = allDiseases.filter(d =>
      d.disease.toLowerCase().includes(q) ||
      (d.keywords && d.keywords.some(k => k.toLowerCase().includes(q)))
    ).slice(0, 7);

    if (!matches.length) { suggestions.classList.remove('show'); return; }

    suggestions.innerHTML = matches.map(d => `
      <div class="suggestion-item" onclick="selectSuggestion('${d.disease.replace(/'/g, "\\'")}')">
        <i class="fas fa-chevron-right"></i> ${d.disease}
        <span class="severity-badge severity-${d.severity}" style="margin-left:auto;font-size:0.62rem;padding:2px 8px;">${d.severity}</span>
      </div>
    `).join('');
    suggestions.classList.add('show');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-input-wrap')) suggestions.classList.remove('show');
  });
}

function selectSuggestion(name) {
  document.getElementById('diseaseInput').value = name;
  document.getElementById('searchSuggestions').classList.remove('show');
}

// ===== DISEASE SEARCH =====
async function searchDisease() {
  const query = document.getElementById('diseaseInput').value.trim();
  const age = parseInt(document.getElementById('patientAge').value) || null;
  const weight = parseFloat(document.getElementById('patientWeight').value) || null;
  const gender = document.getElementById('patientGender').value;

  if (!query) { showToast('Please enter a disease or symptom', 'error'); return; }

  document.getElementById('searchLoading').classList.remove('hidden');
  document.getElementById('resultsArea').innerHTML = '';

  try {
    const data = await api.get(`/medical/search?q=${encodeURIComponent(query)}`);

    if (!data.found) {
      document.getElementById('resultsArea').innerHTML = `
        <div class="doctor-warning">
          <i class="fas fa-search warn-icon"></i>
          <div class="warn-text">
            <h4>Disease Not Found</h4>
            <p>${data.message}</p>
            <p style="margin-top:8px;">Try: ${(data.suggestions || []).join(', ')}</p>
          </div>
        </div>`;
      return;
    }

    currentResult = { disease: data.results[0], age, weight, gender };
    currentRecordSaved = false;
    renderResults(data.results[0], age, weight, gender);
    await autoSaveRecord();
  } catch (err) {
    document.getElementById('resultsArea').innerHTML = `
      <div class="doctor-warning">
        <i class="fas fa-exclamation-triangle warn-icon"></i>
        <div class="warn-text"><h4>Error</h4><p>${err.message}</p></div>
      </div>`;
  } finally {
    document.getElementById('searchLoading').classList.add('hidden');
  }
}

// ===== RENDER RESULTS =====
function renderResults(d, age, weight, gender) {
  const isChild = age && age < 18;
  const category = isChild ? 'child' : 'adult';
  const html = [];

  if (d.emergencyAlert || d.severity === 'severe') {
    html.push(`
      <div class="emergency-alert">
        <div class="alert-icon"><i class="fas fa-ambulance"></i></div>
        <div class="alert-text">
          <h3>⚠️ Emergency Alert — Seek Immediate Medical Attention</h3>
          <p>This condition can be life-threatening. Please visit a hospital or call <strong>108</strong> immediately. Do not self-medicate.</p>
        </div>
      </div>`);
  }

  html.push(`
    <div class="disease-overview">
      <div class="disease-overview-header">
        <h3><i class="fas fa-virus"></i> ${d.disease}</h3>
        <span class="severity-badge severity-${d.severity}">${d.severity}</span>
      </div>
      <div class="disease-overview-body">
        <p class="disease-description">${d.description}</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${age ? `<div class="meta-tag"><i class="fas fa-user"></i> Age: ${age} yrs (${isChild ? 'Child' : 'Adult'})</div>` : ''}
          ${weight ? `<div class="meta-tag"><i class="fas fa-weight"></i> ${weight} kg</div>` : ''}
          ${gender ? `<div class="meta-tag"><i class="fas fa-venus-mars"></i> ${gender}</div>` : ''}
        </div>
      </div>
    </div>`);

  html.push(`
    <div class="result-section">
      <div class="result-section-header"><i class="fas fa-pills"></i> Recommended Medicines & Dosage</div>
      <div class="result-section-body">
        <div class="medicine-cards">
          ${d.medicines.map(m => {
            const dose = calculateDoseForMedicine(m, age, weight, category);
            return `
              <div class="medicine-card">
                <div>
                  <div class="medicine-name">${m.name}</div>
                  <span class="medicine-type">${m.type}</span>
                  <div class="medicine-info">
                    <div><strong>Adult dose:</strong> ${m.adultDose}</div>
                    ${isChild ? `<div><strong>Child dose:</strong> ${m.childDose}</div>` : ''}
                    <div><strong>Frequency:</strong> ${m.frequency}</div>
                    <div><strong>Duration:</strong> ${m.duration}</div>
                  </div>
                  ${m.warning ? `<div class="medicine-warning"><i class="fas fa-exclamation-triangle"></i> ${m.warning}</div>` : ''}
                </div>
                ${dose ? `
                <div class="medicine-dosage-badge">
                  <span class="dose-amount">${dose.amount}</span>
                  <span class="dose-label">${dose.label}</span>
                </div>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`);

  html.push(`
    <div class="result-section">
      <div class="result-section-header"><i class="fas fa-shield-alt"></i> Precautions & Care</div>
      <div class="result-section-body">
        <div class="precautions-list">
          ${d.precautions.map(p => `<div class="precaution-item"><i class="fas fa-check-circle"></i> ${p}</div>`).join('')}
        </div>
      </div>
    </div>`);

  html.push(`
    <div class="doctor-warning">
      <i class="fas fa-user-md warn-icon"></i>
      <div class="warn-text">
        <h4>When to See a Doctor</h4>
        <p>${d.whenToSeeDoctor}</p>
      </div>
    </div>`);

  if (d.dietAdvice) {
    html.push(`
      <div class="diet-card">
        <i class="fas fa-apple-alt"></i>
        <div><h4>Diet & Nutrition Advice</h4><p>${d.dietAdvice}</p></div>
      </div>`);
  }

  html.push(`
    <div class="save-record-btn">
      <button class="btn-primary" id="saveRecordBtn" onclick="saveRecord()">
        <i class="fas fa-save"></i> Save to My Records
      </button>
    </div>`);

  document.getElementById('resultsArea').innerHTML = html.join('');
}

// ===== DOSAGE =====
function calculateDoseForMedicine(medicine, age, weight, category) {
  if (!age && !weight) return null;
  if (!medicine.mgPerKg) return null;
  const w = weight || estimateWeight(age);
  if (!w) return null;
  const rawDose = medicine.mgPerKg * w;
  const maxDose = category === 'adult' ? (medicine.maxAdultDose ? parseFloat(medicine.maxAdultDose) : null) : null;
  const finalDose = maxDose ? Math.min(rawDose, maxDose) : rawDose;
  return { amount: `${Math.round(finalDose)} mg`, label: `per dose (${category})` };
}

function estimateWeight(age) {
  if (!age) return null;
  if (age < 1) return 7;
  if (age < 5) return 2 * age + 9;
  if (age < 14) return 4 * age - 3;
  return null;
}

// ===== AUTO-SAVE =====
async function autoSaveRecord() {
  if (!currentResult || currentRecordSaved) return;
  const { disease: d, age, weight, gender } = currentResult;
  try {
    await api.post('/records', {
      disease: d.disease, symptoms: d.symptoms, age, weight, gender,
      medicines: d.medicines.map(m => ({ name: m.name, dosage: m.adultDose, frequency: m.frequency, duration: m.duration })),
      precautions: d.precautions, description: d.description, severity: d.severity
    });
    currentRecordSaved = true;
    const btn = document.getElementById('saveRecordBtn');
    if (btn) { btn.innerHTML = '<i class="fas fa-check-circle"></i> Saved to History'; btn.disabled = true; btn.style.opacity = '0.7'; }
    showToast('✅ Record saved to your history!', 'success');
  } catch (err) { console.error('Auto-save failed:', err.message); }
}

// ===== MANUAL SAVE =====
async function saveRecord() {
  if (!currentResult) return;
  if (currentRecordSaved) { showToast('ℹ️ Already saved to your history!', 'success'); return; }
  const { disease: d, age, weight, gender } = currentResult;
  const btn = document.getElementById('saveRecordBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...'; }
  try {
    await api.post('/records', {
      disease: d.disease, symptoms: d.symptoms, age, weight, gender,
      medicines: d.medicines.map(m => ({ name: m.name, dosage: m.adultDose, frequency: m.frequency, duration: m.duration })),
      precautions: d.precautions, description: d.description, severity: d.severity
    });
    currentRecordSaved = true;
    if (btn) { btn.innerHTML = '<i class="fas fa-check-circle"></i> Saved to History'; btn.style.opacity = '0.7'; }
    showToast('✅ Record saved!', 'success');
  } catch (err) {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Save to My Records'; }
    showToast('❌ Failed to save: ' + err.message, 'error');
  }
}

// ===== HISTORY =====
async function loadHistory() {
  const area = document.getElementById('historyArea');
  document.getElementById('historyLoading').classList.remove('hidden');
  area.innerHTML = '';
  try {
    const records = await api.get('/records/mine');
    cachedRecords = records;
    if (!records.length) {
      area.innerHTML = `<div class="no-data"><i class="fas fa-folder-open"></i><p>No records yet. Search a disease to get started.</p></div>`;
      return;
    }
    area.innerHTML = records.map(r => `
      <div class="history-card" onclick="showHistoryDetail('${r._id}')">
        <div class="history-card-header">
          <div>
            <div class="history-disease">${r.disease}</div>
            <div class="history-date"><i class="fas fa-calendar"></i> ${new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
          <span class="severity-badge severity-${r.severity}">${r.severity}</span>
        </div>
        ${r.age ? `<div class="meta-tag" style="display:inline-flex;margin-bottom:8px;"><i class="fas fa-user"></i> Age: ${r.age}</div>` : ''}
        <div class="history-medicines">
          <i class="fas fa-pills" style="color:var(--primary);"></i>
          ${r.medicines.slice(0, 2).map(m => m.name).join(', ')}${r.medicines.length > 2 ? ` +${r.medicines.length - 2} more` : ''}
        </div>
        ${r.reviewed
          ? '<div class="status-pill status-reviewed" style="margin-top:10px;"><i class="fas fa-check"></i> Doctor Reviewed</div>'
          : '<div class="status-pill status-pending" style="margin-top:10px;"><i class="fas fa-clock"></i> Pending Review</div>'}
      </div>
    `).join('');
  } catch (err) {
    area.innerHTML = `<div class="no-data"><i class="fas fa-exclamation-circle"></i><p>Could not load history: ${err.message}</p></div>`;
  } finally {
    document.getElementById('historyLoading').classList.add('hidden');
  }
}

// ===== HISTORY FILTERS =====
let filteredHistory = [];
let selectedRecordId = null;

async function filterHistory() {
  const disease = document.getElementById('historyDiseaseFilter').value.toLowerCase();
  const severity = document.getElementById('historySeverityFilter').value.toLowerCase();
  const dateFrom = document.getElementById('historyDateFromFilter').value;
  const dateTo = document.getElementById('historyDateToFilter').value;

  try {
    const params = new URLSearchParams();
    if (disease) params.append('disease', disease);
    if (severity) params.append('severity', severity);
    if (dateFrom) params.append('dateFrom', dateFrom);
    if (dateTo) params.append('dateTo', dateTo);

    const records = await api.get(`/records/mine?${params}`);
    cachedRecords = records;
    filteredHistory = records;

    const area = document.getElementById('historyArea');
    if (!records.length) {
      area.innerHTML = `<div class="no-data" style="grid-column:1/-1;"><i class="fas fa-search"></i><p>No records match your filters</p></div>`;
      return;
    }

    area.innerHTML = records.map(r => `
      <div class="history-card" onclick="showHistoryDetail('${r._id}')">
        <div class="history-card-header">
          <div>
            <div class="history-disease">${r.disease}</div>
            <div class="history-date"><i class="fas fa-calendar"></i> ${new Date(r.date).toLocaleDateString()}</div>
          </div>
          <span class="severity-badge severity-${r.severity}">${r.severity}</span>
        </div>
        <div class="history-medicines">
          <i class="fas fa-pills"></i> ${r.medicines.slice(0, 2).map(m => m.name).join(', ')}${r.medicines.length > 2 ? ` +${r.medicines.length - 2}` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast('Error filtering history', 'error');
  }
}

async function showHistoryDetail(recordId) {
  try {
    const record = await api.get(`/records/${recordId}`);
    selectedRecordId = recordId;

    const title = document.getElementById('detailModalTitle');
    const body = document.getElementById('detailModalBody');

    title.textContent = record.disease;
    body.innerHTML = `
      <div style="display: grid; gap: 16px;">
        <div>
          <label style="font-size:0.78rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Severity</label>
          <div style="color:var(--text);margin-top:4px;"><span class="severity-badge severity-${record.severity}">${record.severity}</span></div>
        </div>
        <div>
          <label style="font-size:0.78rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Symptoms</label>
          <div style="color:var(--text);margin-top:4px;">${record.symptoms ? record.symptoms.join(', ') : 'Not specified'}</div>
        </div>
        <div>
          <label style="font-size:0.78rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Prescribed Medicines</label>
          <div style="margin-top:8px; display: flex; flex-direction: column; gap: 8px;">
            ${record.medicines.map(m => `<div style="background:var(--bg-input);padding:10px;border-radius:6px;font-size:0.9rem;"><strong>${m.name}</strong> - ${m.dosage}, ${m.frequency}</div>`).join('')}
          </div>
        </div>
        <div>
          <label style="font-size:0.78rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Precautions</label>
          <div style="color:var(--text);margin-top:4px;"><ul style="margin:0;padding-left:20px;">${record.precautions ? record.precautions.map(p => `<li>${p}</li>`).join('') : '<li>None specified</li>'}</ul></div>
        </div>
        <div>
          <label style="font-size:0.78rem;color:var(--text-muted);font-weight:600;text-transform:uppercase;">Date</label>
          <div style="color:var(--text);margin-top:4px;">${new Date(record.date).toLocaleDateString()}</div>
        </div>
      </div>
    `;
    openModal('historyDetailModal');
  } catch (err) {
    showToast('Error loading record details', 'error');
  }
}

async function deleteHistoryRecord() {
  if (!selectedRecordId) return;
  if (!confirm('Are you sure you want to delete this record?')) return;

  try {
    await api.delete(`/records/${selectedRecordId}`);
    closeModal('historyDetailModal');
    showToast('Record deleted successfully', 'success');
    loadHistory();
  } catch (err) {
    showToast('Error deleting record', 'error');
  }
}

// ===== APPOINTMENTS =====
async function loadDoctorsForDropdown() {
  try {
    const doctors = await api.get('/auth/doctors');
    const select = document.getElementById('appointmentDoctor');
    if (select) {
      select.innerHTML = '<option value="">Select a doctor...</option>' +
        doctors.map(d => `<option value="${d._id}">${d.name}${d.specialization ? ' - ' + d.specialization : ''}</option>`).join('');
    }
  } catch (err) {
    console.error('Error loading doctors:', err);
  }
}

async function loadDoctors() {
  try {
    const doctors = await api.get('/auth/doctors');
    const select = document.getElementById('appointmentDoctor');
    select.innerHTML = '<option value="">Select a doctor...</option>' +
      doctors.map(d => `<option value="${d._id}">${d.name}${d.specialization ? ' - ' + d.specialization : ''}</option>`).join('');
  } catch (err) {
    console.error('Error loading doctors:', err);
  }
}

async function loadAppointmentsPatient() {
  try {
    loadDoctors();
    const appointments = await api.get('/appointments');
    renderPatientAppointments(appointments);
  } catch (err) {
    console.error('Appointments error:', err);
  }
}

function renderPatientAppointments(appointments) {
  const area = document.getElementById('appointmentsArea');
  if (!appointments || appointments.length === 0) {
    area.innerHTML = '<div class="no-data" style="grid-column:1/-1;"><i class="fas fa-calendar-times"></i><p>No appointments yet</p></div>';
    return;
  }

  area.innerHTML = appointments.map(apt => `
    <div class="appointment-card">
      <div class="appointment-header">
        <div>
          <div class="appointment-patient">${apt.doctorName}</div>
          <span class="appointment-status ${apt.status.toLowerCase()}">${apt.status}</span>
        </div>
      </div>
      <div class="appointment-details">
        <div><i class="fas fa-stethoscope"></i> ${apt.reason || 'General'}</div>
        <div><i class="fas fa-calendar"></i> ${new Date(apt.requestedDate).toLocaleDateString()}</div>
        <div><i class="fas fa-clock"></i> ${apt.timeSlot || 'Not set'}</div>
      </div>
    </div>
  `).join('');
}

async function requestAppointment() {
  const doctorId = document.getElementById('appointmentDoctor').value;
  const date = document.getElementById('appointmentDate').value;
  const time = document.getElementById('appointmentTime').value;
  const reason = document.getElementById('appointmentReason').value;

  if (!doctorId || !date || !time) {
    showToast('Please fill all required fields', 'error');
    return;
  }

  try {
    await api.post('/appointments', {
      doctorId,
      requestedDate: new Date(date).toISOString(),
      timeSlot: time,
      reason
    });
    showToast('Appointment requested successfully', 'success');
    document.getElementById('appointmentDoctor').value = '';
    document.getElementById('appointmentDate').value = '';
    document.getElementById('appointmentTime').value = '';
    document.getElementById('appointmentReason').value = '';
    loadAppointmentsPatient();
  } catch (err) {
    showToast('Error requesting appointment', 'error');
  }
}

// ===== PROFILE =====
function openProfileModal() {
  const user = getUser();
  if (user) {
    document.getElementById('profileName').value = user.name || '';
    document.getElementById('profileAge').value = user.age || '';
    document.getElementById('profileGender').value = user.gender || '';
    document.getElementById('profileAllergies').value = (user.allergies || []).join(', ');
  }
  openModal('profileModal');
}

async function saveProfile() {
  const name = document.getElementById('profileName').value;
  const age = parseInt(document.getElementById('profileAge').value) || null;
  const gender = document.getElementById('profileGender').value;
  const allergies = document.getElementById('profileAllergies').value
    .split(',').map(a => a.trim()).filter(a => a);

  try {
    await api.patch('/auth/me', { name, age, gender, allergies });
    const user = getUser();
    user.name = name;
    user.age = age;
    user.gender = gender;
    user.allergies = allergies;
    localStorage.setItem('user', JSON.stringify(user));
    closeModal('profileModal');
    showToast('Profile updated successfully', 'success');
    document.getElementById('navUserName').textContent = name;
  } catch (err) {
    showToast('Error updating profile', 'error');
  }
}

// ===== EXPORT TO PDF =====
function exportToPDF() {
  const records = cachedRecords;
  const printWin = window.open('', '_blank');
  if (!printWin) { showToast('❌ Pop-ups blocked. Please allow pop-ups.', 'error'); return; }

  const total = records.length;
  const reviewed = records.filter(r => r.reviewed).length;
  const pending = records.filter(r => !r.reviewed).length;
  const severe = records.filter(r => r.severity === 'severe').length;

  const rows = records.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.disease}</strong></td>
      <td>${new Date(r.date).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</td>
      <td>${r.age || '—'}</td>
      <td><span class="badge ${r.severity}">${r.severity}</span></td>
      <td style="font-size:0.82rem;">${r.medicines?.slice(0, 2).map(m => m.name).join(', ') || '—'}</td>
      <td><span class="badge ${r.reviewed ? 'reviewed' : 'pending'}">${r.reviewed ? 'Reviewed' : 'Pending'}</span></td>
    </tr>`).join('');

  printWin.document.write(`<!DOCTYPE html>
<html><head><title>MediRec Health Report — ${user?.name || 'Patient'}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Segoe UI',Arial,sans-serif; color:#1e293b; background:white; padding:40px; font-size:14px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px solid #0ea5e9; padding-bottom:20px; margin-bottom:28px; }
  .logo { font-size:1.8rem; font-weight:800; color:#0ea5e9; }
  .logo small { display:block; font-size:0.75rem; color:#64748b; font-weight:400; margin-top:2px; }
  .patient-info { text-align:right; font-size:0.85rem; color:#64748b; line-height:1.7; }
  .patient-name { font-size:1rem; font-weight:700; color:#0f172a; }
  .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; }
  .stat { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px; text-align:center; }
  .stat-num { font-size:2rem; font-weight:800; color:#0ea5e9; line-height:1; }
  .stat-label { font-size:0.72rem; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; margin-top:4px; }
  h2 { font-size:1.1rem; color:#0f172a; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid #e2e8f0; display:flex; align-items:center; gap:8px; }
  table { width:100%; border-collapse:collapse; }
  th { background:#0ea5e9; color:white; padding:10px 12px; text-align:left; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px; }
  td { padding:11px 12px; border-bottom:1px solid #e2e8f0; vertical-align:middle; }
  tr:nth-child(even) td { background:#f8fafc; }
  .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; }
  .mild { background:#d1fae5; color:#065f46; }
  .moderate { background:#fef3c7; color:#92400e; }
  .severe { background:#fee2e2; color:#991b1b; }
  .reviewed { background:#d1fae5; color:#065f46; }
  .pending { background:#fef3c7; color:#92400e; }
  .footer { margin-top:32px; padding-top:14px; border-top:1px solid #e2e8f0; font-size:0.75rem; color:#94a3b8; text-align:center; line-height:1.6; }
</style></head>
<body>
  <div class="header">
    <div class="logo">💊 MediRec<small>Personal Health Report</small></div>
    <div class="patient-info">
      <div class="patient-name">${user?.name || 'Patient'}</div>
      <div>${user?.email || ''}</div>
      <div>Generated: ${new Date().toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><div class="stat-num">${total}</div><div class="stat-label">Total Records</div></div>
    <div class="stat"><div class="stat-num">${reviewed}</div><div class="stat-label">Doctor Reviewed</div></div>
    <div class="stat"><div class="stat-num">${pending}</div><div class="stat-label">Pending Review</div></div>
    <div class="stat"><div class="stat-num">${severe}</div><div class="stat-label">Severe Cases</div></div>
  </div>
  <h2>📋 Medical Records History</h2>
  ${records.length ? `
  <table>
    <thead><tr><th>#</th><th>Disease</th><th>Date</th><th>Age</th><th>Severity</th><th>Medicines</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>` : '<p style="color:#94a3b8;text-align:center;padding:20px;">No records found.</p>'}
  <div class="footer">
    ⚕️ This report is generated from MediRec for informational purposes only.<br>
    Always consult a qualified healthcare professional for medical decisions.
  </div>
</body></html>`);
  printWin.document.close();
  setTimeout(() => printWin.print(), 600);
}

// ===== AI DOCTOR CHAT =====
const symptomDB = {
  'fever': { severity: 'moderate', conditions: ['Influenza (Flu)', 'Dengue Fever', 'Malaria', 'Typhoid Fever', 'COVID-19'], advice: 'Monitor temperature every 4 hours. Paracetamol 500-1000mg helps bring down fever. Stay well hydrated with water and electrolytes. If fever exceeds 39.5°C or has lasted 3+ days, consult a doctor.' },
  'headache': { severity: 'mild', conditions: ['Migraine', 'Hypertension', 'Sinusitis', 'Common Cold', 'COVID-19'], advice: 'Rest in a quiet, dark room. Ibuprofen 400mg or Paracetamol 500mg can help. Ensure you are well hydrated. If it is the worst headache of your life or accompanied by stiff neck or vision changes, seek emergency care immediately.' },
  'cough': { severity: 'mild', conditions: ['Common Cold', 'Asthma', 'COVID-19', 'Tuberculosis', 'Influenza'], advice: 'Honey with warm water helps soothe cough. Dextromethorphan-based syrups for dry cough. Steam inhalation twice daily. If coughing blood or cough persists over 3 weeks, see a doctor.' },
  'chest pain': { severity: 'severe', conditions: ['Heart Attack', 'Angina', 'Asthma', 'GERD', 'Pneumonia'], advice: '🚨 IMPORTANT: Chest pain must be evaluated immediately. If there is tightening, pressure, or pain radiating to the arm or jaw, call 108 or go to the emergency room NOW. This could be cardiac-related.' },
  'shortness of breath': { severity: 'severe', conditions: ['Asthma', 'COVID-19', 'Heart Failure', 'COPD', 'Pneumonia'], advice: '🚨 Difficulty breathing is serious. Use your rescue inhaler if you have one. If oxygen saturation drops below 94%, lips or fingernails turn bluish, or it is getting worse — go to the emergency department immediately.' },
  'stomach pain': { severity: 'moderate', conditions: ['Gastroenteritis', 'Appendicitis', 'GERD', 'Kidney Stones', 'Irritable Bowel Syndrome'], advice: 'Avoid spicy food. Antacids (Gelusil/Digene) help if it is acidity. Localized severe pain in the lower right abdomen may indicate appendicitis — seek emergency care. ORS helps if diarrhea is present.' },
  'vomiting': { severity: 'moderate', conditions: ['Gastroenteritis', 'Food Poisoning', 'Migraine', 'Appendicitis'], advice: 'Take small sips of water/ORS to prevent dehydration. Ondansetron 4mg can help control vomiting. Avoid solid food until vomiting stops. If vomiting blood or unable to keep fluids down for 24 hours, see a doctor.' },
  'diarrhea': { severity: 'mild', conditions: ['Gastroenteritis', 'Food Poisoning', 'Typhoid', 'Irritable Bowel Syndrome'], advice: 'ORS (Oral Rehydration Solution) is critical to prevent dehydration. BRAT diet: Banana, Rice, Applesauce, Toast. Avoid dairy, caffeine, alcohol. See a doctor if blood in stool or lasting more than 3 days.' },
  'fatigue': { severity: 'mild', conditions: ['Iron Deficiency Anemia', 'Hypothyroidism', 'Type 2 Diabetes', 'COVID-19', 'Depression'], advice: 'Ensure 7-9 hours of quality sleep. Stay hydrated. Iron-rich foods (spinach, lentils, meat) can help if anemia. If fatigue is unexplained and persistent for weeks, blood tests are recommended.' },
  'joint pain': { severity: 'moderate', conditions: ['Rheumatoid Arthritis', 'Dengue Fever', 'Influenza (Flu)', 'Gout', 'Osteoarthritis'], advice: 'Hot or cold compress on affected joints. Ibuprofen 400mg helps with inflammation. Rest the joint. If multiple joints are swollen, warm, and stiff in the morning, a rheumatology evaluation is recommended.' },
  'rash': { severity: 'moderate', conditions: ['Chickenpox', 'Dengue Fever', 'Eczema', 'Allergic Reaction', 'Psoriasis'], advice: 'Avoid scratching. Calamine lotion helps relieve itch. Cetirizine 10mg for allergic rash. If rash is spreading rapidly, accompanied by high fever, or blistering — see a doctor promptly.' },
  'frequent urination': { severity: 'mild', conditions: ['Type 2 Diabetes', 'Urinary Tract Infection (UTI)', 'Kidney Issues', 'Prostate Problems'], advice: 'Track your fluid intake. Burning with urination suggests UTI — drink plenty of water and see a doctor for antibiotics. Frequent urination with excessive thirst may suggest diabetes — get a blood sugar test.' },
  'back pain': { severity: 'mild', conditions: ['Lower Back Pain', 'Kidney Stones', 'Spine Issues', 'Muscle Strain'], advice: 'Gentle movement and walking is better than bed rest for most back pain. Apply heat/ice for 15-20 mins. Ibuprofen 400mg with food for pain. Severe flank pain radiating to the groin may indicate kidney stones.' },
  'dizziness': { severity: 'moderate', conditions: ['Hypertension', 'Anemia', 'Dehydration', 'Inner Ear Issues', 'Hypoglycemia'], advice: 'Sit or lie down immediately. Check blood pressure if possible. Drink water. If recurring, check blood sugar and hemoglobin levels. See a doctor if dizziness is accompanied by vision changes, hearing loss, or falls.' },
  'burning urination': { severity: 'mild', conditions: ['Urinary Tract Infection (UTI)', 'Kidney Stones', 'Sexually Transmitted Infection'], advice: 'Increase water intake significantly. UTI is very likely — a urine culture test and antibiotics are needed. Avoid holding urine. Wipe front to back. AZO tablets provide symptom relief but are not a cure.' },
  'cold': { severity: 'mild', conditions: ['Common Cold', 'Influenza (Flu)', 'Sinusitis', 'COVID-19'], advice: 'Rest and hydrate well. Cetirizine for runny nose, Dextromethorphan for cough, Paracetamol for fever. Steam inhalation helps. Vitamin C supplementation may shorten duration.' },
  'nausea': { severity: 'mild', conditions: ['Gastroenteritis', 'Food Poisoning', 'Migraine', 'Acid Reflux'], advice: 'Small sips of ginger tea or plain water. Ondansetron 4mg is an effective antiemetic. Avoid solid food until nausea settles. If accompanied by severe abdominal pain or lasts more than 24 hours, see a doctor.' },
  'weight gain': { severity: 'mild', conditions: ['Hypothyroidism', 'Type 2 Diabetes', 'Polycystic Ovary Syndrome', 'Depression'], advice: 'Unexplained weight gain with fatigue and cold intolerance often suggests thyroid issues. A TSH blood test is recommended. Dietary changes and exercise are important. Consult a doctor if gaining more than 5kg without dietary changes.' },
  'insomnia': { severity: 'mild', conditions: ['Insomnia', 'Anxiety Disorder', 'Depression', 'Sleep Apnea'], advice: 'Maintain a consistent sleep schedule. Avoid screens 1 hour before bed. Limit caffeine after 2 PM. Melatonin 0.5-3mg can help. If insomnia is chronic (3+ months), cognitive behavioral therapy for insomnia (CBT-I) is very effective.' },
  'eye discharge': { severity: 'mild', conditions: ['Conjunctivitis (Pink Eye)', 'Blepharitis', 'Blocked Tear Duct'], advice: 'Clean eye gently with sterile water. Do not rub eyes. Antibiotic eye drops if thick/yellow discharge (bacterial). Avoid contact lenses during infection. Viral pink eye is contagious — do not share towels.' }
};

function analyzeSymptoms(message) {
  const lower = message.toLowerCase();
  const found = [];
  for (const [symptom, data] of Object.entries(symptomDB)) {
    const words = symptom.split(' ');
    if (words.every(w => lower.includes(w)) || lower.includes(symptom)) {
      if (!found.find(f => f.symptom === symptom)) {
        found.push({ symptom, ...data });
      }
    }
  }
  return found;
}

function generateAIResponse(message) {
  const lower = message.toLowerCase();
  const analyses = analyzeSymptoms(message);

  // Emergency check
  const hasSevere = analyses.some(a => a.severity === 'severe');
  if (hasSevere) {
    const sev = analyses.find(a => a.severity === 'severe');
    return `🚨 **PRIORITY ALERT**\n\n${sev.advice}\n\n**Possible conditions requiring urgent evaluation:** ${sev.conditions.join(', ')}\n\n**Emergency number:** 108 (India) | 999 (UK) | 911 (USA)\n\n*Please do not delay. Seek care immediately.*`;
  }

  if (!analyses.length) {
    const greetings = ['hello', 'hi', 'hey', 'good morning', 'good evening'];
    if (greetings.some(g => lower.includes(g))) {
      return `Hello! 👋 I'm here to help you understand your symptoms.\n\nYou can describe what you're feeling and I'll assess the possible conditions and give you guidance. For example:\n\n- *"I have fever and body aches"*\n- *"I have a burning sensation when urinating"*\n- *"I feel very tired and my joints are swollen"*\n\nWhat symptoms are you experiencing?`;
    }
    if (lower.includes('thank')) {
      return `You're welcome! 😊 Take care of yourself and don't hesitate to come back if you have more symptoms or questions. Remember — if anything feels urgent, always see a doctor in person. Stay healthy! 💚`;
    }
    return `I couldn't identify specific symptoms from your message. To help you better, please describe:\n\n🌡️ Do you have **fever** or chills?\n😮 Any **breathing difficulty** or chest pain?\n🤢 **Nausea**, vomiting, or stomach issues?\n😴 Are you feeling unusually **tired or weak**?\n💊 **How long** have you had these symptoms?\n\nThe more detail you give, the better I can guide you.`;
  }

  let response = `**MediRec AI Assessment:**\n\n`;

  analyses.slice(0, 3).forEach((a, i) => {
    response += `**${i + 1}. ${a.symptom.charAt(0).toUpperCase() + a.symptom.slice(1)} detected (${a.severity} concern)**\n`;
    response += `${a.advice}\n\n`;
    response += `📋 *Possible conditions:* ${a.conditions.slice(0, 3).join(', ')}\n\n`;
  });

  // Suggest disease to search
  const suggestSearch = analyses[0]?.conditions[0];
  if (suggestSearch) {
    const matchesDB = allDiseases.filter(d =>
      analyses.some(a => a.conditions.some(c => d.disease.toLowerCase().includes(c.split(' ')[0].toLowerCase())))
    ).slice(0, 2);

    if (matchesDB.length) {
      response += `💡 **Suggested searches in MediRec:**\n`;
      matchesDB.forEach(d => { response += `→ "${d.disease}" — detailed medicines & care\n`; });
      response += `\n`;
    }
  }

  response += `⚕️ *This is AI-generated guidance and not a medical diagnosis. Please consult a qualified doctor for proper evaluation and treatment.*`;
  return response;
}

function formatChatMsg(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/→ (.*)/g, '<span style="display:block;padding:2px 0;color:var(--primary);">→ $1</span>')
    .replace(/\n/g, '<br>');
}

function appendChatMsg(role, text) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role === 'ai' ? 'ai-msg' : 'user-msg'}`;

  if (role === 'ai') {
    div.innerHTML = `
      <div class="chat-avatar"><i class="fas fa-robot"></i></div>
      <div class="chat-bubble">${formatChatMsg(text)}</div>`;
  } else {
    div.innerHTML = `
      <div class="chat-bubble user-bubble">${text}</div>
      <div class="chat-avatar user-av"><i class="fas fa-user"></i></div>`;
  }

  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function appendTyping() {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'chat-msg ai-msg';
  div.id = 'typingIndicator';
  div.innerHTML = `
    <div class="chat-avatar"><i class="fas fa-robot"></i></div>
    <div class="chat-bubble typing-bubble">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
    </div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingIndicator');
  if (el) el.remove();
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  input.style.height = 'auto';
  document.getElementById('chatSendBtn').disabled = true;

  appendChatMsg('user', message);
  appendTyping();

  // Simulate AI thinking (feels more natural)
  await new Promise(r => setTimeout(r, 900 + Math.random() * 800));

  removeTyping();
  const response = generateAIResponse(message);
  appendChatMsg('ai', response);
  document.getElementById('chatSendBtn').disabled = false;
}

function sendQuick(text) {
  document.getElementById('chatInput').value = text;
  sendChatMessage();
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

// ===== DOSAGE CALCULATOR =====
function calculateDosage() {
  const medicine = document.getElementById('calcMedicine').value.trim();
  const mgPerKg = parseFloat(document.getElementById('calcMgPerKg').value);
  const weight = parseFloat(document.getElementById('calcWeight').value);
  const age = parseInt(document.getElementById('calcAge').value);
  const maxAdult = parseFloat(document.getElementById('calcMaxAdult').value);
  const freq = document.getElementById('calcFrequency').value;

  if (!weight || !mgPerKg) { showToast('Please enter at least weight and mg/kg values', 'error'); return; }

  const isChild = age && age < 18;
  const rawDose = mgPerKg * weight;
  const finalDose = maxAdult && !isChild ? Math.min(rawDose, maxAdult) : rawDose;
  const rounded = Math.round(finalDose * 10) / 10;
  const freqMap = { once: '1x daily', twice: '2x daily', thrice: '3x daily', four: '4x daily', every6: 'Every 6 hrs', every8: 'Every 8 hrs' };
  const freqCount = { once: 1, twice: 2, thrice: 3, four: 4, every6: 4, every8: 3 };
  const dailyDose = rounded * (freqCount[freq] || 1);

  const result = document.getElementById('calcResult');
  result.classList.remove('hidden');
  result.innerHTML = `
    <h3><i class="fas fa-calculator"></i> Dosage Result${medicine ? ' — ' + medicine : ''}</h3>
    <div class="calc-row"><span class="calc-label">Patient Category</span><span class="calc-value">${isChild ? '👶 Child' : '🧑 Adult'} (${age ? age + ' yrs' : 'N/A'})</span></div>
    <div class="calc-row"><span class="calc-label">Body Weight</span><span class="calc-value">${weight} kg</span></div>
    <div class="calc-row"><span class="calc-label">mg/kg Dose</span><span class="calc-value">${mgPerKg} mg/kg</span></div>
    <div class="calc-row"><span class="calc-label">Single Dose</span><span class="calc-value highlight">${rounded} mg</span></div>
    ${maxAdult && !isChild && rawDose > maxAdult ? `<div class="calc-row"><span class="calc-label">⚠️ Max Adult Dose Applied</span><span class="calc-value">${maxAdult} mg</span></div>` : ''}
    <div class="calc-row"><span class="calc-label">Frequency</span><span class="calc-value">${freqMap[freq]}</span></div>
    <div class="calc-row"><span class="calc-label">Total Daily Dose</span><span class="calc-value highlight">${Math.round(dailyDose * 10) / 10} mg/day</span></div>
    <div style="margin-top:14px;padding:10px 14px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:8px;font-size:0.8rem;color:var(--warning);">
      <i class="fas fa-exclamation-triangle"></i> This is an estimate only. Always consult a qualified healthcare professional.
    </div>`;
}

// ===== TOAST =====
function showToast(message, type) {
  const existing = document.querySelectorAll('.toast-msg');
  existing.forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.style.cssText = `
    position: fixed; bottom: 80px; right: 24px; z-index: 9999;
    background: ${type === 'success' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)'};
    color: white; padding: 13px 20px; border-radius: 12px;
    font-size: 0.88rem; font-weight: 600; font-family: var(--font);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    animation: slideInToast 0.3s ease;
    max-width: 340px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; toast.style.transition = 'all 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 3200);
}

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

// ===== CSV EXPORT =====
function exportHistoryCSV() {
  if (!patientHistory || patientHistory.length === 0) {
    showToast('No records to export', 'error');
    return;
  }

  const headers = ['Record ID', 'Disease', 'Severity', 'Symptoms', 'Date'];
  const rows = patientHistory.map(r => [
    r._id,
    r.disease,
    r.severity,
    (r.symptoms || []).join('; '),
    new Date(r.date).toLocaleDateString()
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `my_health_records_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  showToast('CSV exported successfully', 'success');
}
