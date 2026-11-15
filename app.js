const STORAGE_KEYS = {
  users: 'steadycare-users',
  timesheets: 'steadycare-timesheets',
};

const state = {
  currentUser: null,
  currentSection: 'dashboard',
  editingId: null,
  currentWeek: null,
};

const defaultUsers = [
  { id: 'admin-1', username: 'admin', password: 'admin123', role: 'admin', name: 'Admin User' },
  { id: 'staff-1', username: 'staff1', password: 'staff123', role: 'staff', name: 'Emma Jones' },
  { id: 'staff-2', username: 'staff2', password: 'staff123', role: 'staff', name: 'Daniel Smith' },
  { id: 'staff-3', username: 'staff3', password: 'staff123', role: 'staff', name: 'Nia Patel' },
];

const defaultTimesheets = [
  makeTimeLog({
    id: 'shift-1',
    userId: 'staff-1',
    date: getIsoDate(daysFromNow(-1)),
    start: '08:00',
    end: '17:00',
    breakMinutes: 30,
    shiftType: 'Day',
    status: 'approved',
    notes: 'Client support visit and care plan check.',
  }),
  makeTimeLog({
    id: 'shift-2',
    userId: 'staff-2',
    date: getIsoDate(daysFromNow(-2)),
    start: '18:00',
    end: '22:30',
    breakMinutes: 15,
    shiftType: 'Night',
    status: 'submitted',
    notes: 'Night support and medication check.',
  }),
  makeTimeLog({
    id: 'shift-3',
    userId: 'staff-3',
    date: getIsoDate(daysFromNow(-5)),
    start: '09:30',
    end: '15:30',
    breakMinutes: 20,
    shiftType: 'Day',
    status: 'worked',
    notes: 'Home care support session.',
  }),
  makeTimeLog({
    id: 'shift-4',
    userId: 'staff-1',
    date: getIsoDate(daysFromNow(-7)),
    start: '20:00',
    end: '23:00',
    breakMinutes: 15,
    shiftType: 'Night',
    status: 'approved',
    notes: 'Overnight check-in coverage.',
  }),
];

function getStoredUsers() {
  const raw = localStorage.getItem(STORAGE_KEYS.users);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(defaultUsers));
    return [...defaultUsers];
  }
  return JSON.parse(raw);
}

function getStoredTimesheets() {
  const raw = localStorage.getItem(STORAGE_KEYS.timesheets);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.timesheets, JSON.stringify(defaultTimesheets));
    return [...defaultTimesheets];
  }
  return JSON.parse(raw);
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(users));
}

function saveTimesheets(timesheets) {
  localStorage.setItem(STORAGE_KEYS.timesheets, JSON.stringify(timesheets));
}

function setupDefaults() {
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    saveUsers(defaultUsers);
  }
  if (!localStorage.getItem(STORAGE_KEYS.timesheets)) {
    saveTimesheets(defaultTimesheets);
  }
}

function getUserByCredentials(username, password) {
  const users = getStoredUsers();
  return users.find((user) => user.username === username && user.password === password) || null;
}

function getUserById(id) {
  return getStoredUsers().find((user) => user.id === id) || null;
}

function getVisibleTimesheets() {
  const timesheets = getStoredTimesheets();
  if (state.currentUser?.role === 'admin') {
    return [...timesheets].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return timesheets.filter((record) => record.userId === state.currentUser.id).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function calculateHours(start, end, breakMinutes = 0) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);
  const startMs = startHour * 60 * 60 * 1000 + startMinute * 60 * 1000;
  const endMs = endHour * 60 * 60 * 1000 + endMinute * 60 * 1000;
  const difference = Math.max(0, endMs - startMs);
  const breakMs = Number(breakMinutes) * 60 * 1000;
  return Math.max(0, (difference - breakMs) / (1000 * 60 * 60));
}

function formatHours(hours) {
  return `${hours.toFixed(2)}h`;
}

function formatStatus(status) {
  return status || 'open';
}

function getWeekStart(date) {
  const current = new Date(date);
  const day = current.getDay();
  const diff = current.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(current.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekString(date) {
  const monday = getWeekStart(date);
  const oneJan = new Date(monday.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((monday - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
  return `${monday.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function makeTimeLog(data) {
  const start = data.start || '09:00';
  const end = data.end || '17:00';
  const breakMinutes = Number(data.breakMinutes || 0);
  const hours = Number(calculateHours(start, end, breakMinutes));
  const shiftType = data.shiftType || (new Date(`2024-01-01T${start}:00`).getHours() >= 18 ? 'Night' : 'Day');

  return {
    id: data.id || crypto.randomUUID(),
    userId: data.userId,
    date: data.date,
    start,
    end,
    breakMinutes,
    shiftType,
    status: data.status || 'open',
    notes: data.notes || '',
    hours,
    createdAt: new Date().toISOString(),
  };
}

function getWeekDataForUser(userId, weekString) {
  const records = getStoredTimesheets().filter((record) => record.userId === userId);
  const [year, week] = weekString.split('-W').map(Number);
  const start = getWeekStart(new Date(year, 0, 4));
  const monday = new Date(start);
  monday.setDate(start.getDate() + ((week - 1) * 7));

  const rangeStart = new Date(monday);
  const rangeEnd = new Date(monday);
  rangeEnd.setDate(monday.getDate() + 6);

  const relevant = records.filter((record) => {
    const recordDate = new Date(record.date + 'T12:00:00');
    return recordDate >= rangeStart && recordDate <= rangeEnd;
  });

  const dayHours = relevant.filter((record) => record.shiftType === 'Day').reduce((sum, record) => sum + Number(record.hours || 0), 0);
  const nightHours = relevant.filter((record) => record.shiftType === 'Night').reduce((sum, record) => sum + Number(record.hours || 0), 0);
  const totalHours = dayHours + nightHours;

  return {
    user: getUserById(userId),
    totalHours,
    dayHours,
    nightHours,
    shifts: relevant.length,
  };
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2400);
}

function setCurrentSection(section) {
  state.currentSection = section;
  document.querySelectorAll('.tab-btn').forEach((button) => {
    const isActive = button.dataset.section === section;
    button.classList.toggle('active', isActive);
  });

  document.querySelectorAll('.page-section').forEach((panel) => {
    panel.classList.toggle('active', panel.id === section);
  });
}

function renderDashboard() {
  const user = state.currentUser;
  const records = getVisibleTimesheets();
  const totalHours = records.reduce((sum, record) => sum + Number(record.hours || 0), 0);
  const approvedHours = records.filter((record) => record.status === 'approved').reduce((sum, record) => sum + Number(record.hours || 0), 0);
  const submittedHours = records.filter((record) => record.status === 'submitted').length;
  const totalShifts = records.length;

  document.getElementById('welcomeText').textContent = `${user.name}`;

  const cards = [
    { label: 'Total hours', value: formatHours(totalHours) },
    { label: 'Approved', value: formatHours(approvedHours) },
    { label: 'Submitted', value: String(submittedHours) },
    { label: 'Shifts', value: String(totalShifts) },
  ];

  const cardsHost = document.getElementById('dashboardCards');
  cardsHost.innerHTML = cards
    .map(
      (card) => `
        <article class="summary-card">
          <div class="label">${card.label}</div>
          <div class="value">${card.value}</div>
        </article>
      `
    )
    .join('');

  const recent = records.slice(0, 5);
  document.getElementById('recentLogs').innerHTML = recent.length
    ? recent
        .map((shift) => {
          const worker = getUserById(shift.userId)?.name || 'Unknown';
          return `
            <div class="list-row">
              <div>
                <strong>${user.role === 'admin' ? worker : user.name}</strong>
                <div class="muted">${shift.date} • ${shift.start}–${shift.end}</div>
              </div>
              <div>
                <span class="badge ${formatStatus(shift.status)}">${formatStatus(shift.status)}</span>
              </div>
            </div>
          `;
        })
        .join('')
    : '<div class="muted">No time logs yet.</div>';
}

function renderWorkerOptions() {
  const select = document.getElementById('sheetWorker');
  const users = getStoredUsers().filter((user) => user.role === 'staff');
  const currentUser = state.currentUser;
  const selectedValue = state.editingId ? getStoredTimesheets().find((shift) => shift.id === state.editingId)?.userId : currentUser.role === 'admin' ? users[0]?.id : currentUser.id;

  select.innerHTML = users
    .map((user) => `<option value="${user.id}" ${selectedValue === user.id ? 'selected' : ''}>${user.name}</option>`)
    .join('');

  if (currentUser.role === 'staff') {
    select.value = currentUser.id;
    select.disabled = true;
  } else {
    select.disabled = false;
  }
}

function renderTimesheets() {
  const rowsHost = document.getElementById('timesheetTableBody');
  const records = getVisibleTimesheets();

  rowsHost.innerHTML = records.length
    ? records
        .map((shift) => {
          const user = getUserById(shift.userId);
          const hours = Number(shift.hours || calculateHours(shift.start, shift.end, shift.breakMinutes));
          const row = `
            <tr>
              <td>${user ? user.name : 'Unknown employee'}</td>
              <td>${shift.date}</td>
              <td>${shift.shiftType}</td>
              <td>${formatHours(hours)}</td>
              <td><span class="badge ${formatStatus(shift.status)}">${formatStatus(shift.status)}</span></td>
              <td>
                <div class="table-actions">
                  <button class="edit-btn" data-action="edit" data-id="${shift.id}" type="button">Edit</button>
                  ${state.currentUser.role === 'admin' ? `<button class="delete-btn" data-action="delete" data-id="${shift.id}" type="button">Delete</button>` : ''}
                </div>
              </td>
            </tr>
          `;
          return row;
        })
        .join('')
    : '<tr><td colspan="6">No time logs available.</td></tr>';

  renderWorkerOptions();
}

function renderWeeklyTracker() {
  const weekInput = document.getElementById('weekPicker');
  const trackerHost = document.getElementById('weeklyTracker');
  const currentUser = state.currentUser;
  const selectedWeek = state.currentWeek || getWeekString(new Date());
  state.currentWeek = selectedWeek;
  weekInput.value = selectedWeek;

  const userPool = currentUser.role === 'admin' ? getStoredUsers() : [currentUser];
  const rows = userPool
    .filter((user) => user.role === 'staff' || user.id === currentUser.id)
    .map((user) => {
      const data = getWeekDataForUser(user.id, selectedWeek);
      return `
        <article class="tracker-row">
          <div class="tracker-meta">
            <strong>${user.name}</strong>
            <span class="badge ${data.totalHours > 0 ? 'worked' : 'open'}">${formatHours(data.totalHours)}</span>
          </div>
          <div class="tracker-stats">
            <div class="stat-pill"><strong>Day</strong><div>${formatHours(data.dayHours)}</div></div>
            <div class="stat-pill"><strong>Night</strong><div>${formatHours(data.nightHours)}</div></div>
            <div class="stat-pill"><strong>Total</strong><div>${formatHours(data.totalHours)}</div></div>
            <div class="stat-pill"><strong>Shifts</strong><div>${data.shifts}</div></div>
          </div>
        </article>
      `;
    })
    .join('');

  trackerHost.innerHTML = rows || '<div class="muted">No data</div>';
}

function renderUsers() {
  const users = getStoredUsers();
  const userList = document.getElementById('userList');
  userList.innerHTML = users
    .map(
      (user) => `
        <div class="user-card">
          <div>
            <strong>${user.name}</strong>
            <div class="muted">${user.username}</div>
          </div>
          <div class="user-action-group">
            <div class="user-role">${user.role}</div>
            <button class="delete-user-btn" data-action="delete-user" data-user-id="${user.id}" type="button">Delete</button>
          </div>
        </div>
      `
    )
    .join('');
}

function handleUserCreate(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const name = String(formData.get('name') || '').trim();
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const role = String(formData.get('role') || 'staff');

  if (!name || !username || !password) {
    showToast('Please fill in all user fields.');
    return;
  }

  const users = getStoredUsers();
  if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    showToast('That username is already in use.');
    return;
  }

  users.push({
    id: crypto.randomUUID(),
    username,
    password,
    role,
    name,
  });

  saveUsers(users);
  event.target.reset();
  renderUsers();
  renderWorkerOptions();
  showToast('User added successfully.');
}

function handleUserDelete(userId) {
  const users = getStoredUsers();
  const target = users.find((user) => user.id === userId);

  if (!target) {
    return;
  }

  if (target.role === 'admin' && users.filter((user) => user.role === 'admin').length <= 1) {
    showToast('At least one admin must remain.');
    return;
  }

  const remainingUsers = users.filter((user) => user.id !== userId);
  saveUsers(remainingUsers);
  saveTimesheets(getStoredTimesheets().filter((shift) => shift.userId !== userId));

  if (state.currentUser && state.currentUser.id === userId) {
    state.currentUser = null;
    document.getElementById('authView').classList.remove('hidden');
    document.getElementById('appView').classList.add('hidden');
    document.getElementById('loginForm').reset();
    showToast('User deleted and you have been signed out.');
    return;
  }

  renderUsers();
  renderWorkerOptions();
  renderDashboard();
  renderTimesheets();
  renderWeeklyTracker();
  showToast('User deleted.');
}

function resetTimeLogForm() {
  const form = document.getElementById('timesheetForm');
  form.reset();
  state.editingId = null;
  document.getElementById('timesheetFormTitle').textContent = 'Add time log';
  document.getElementById('cancelEditBtn').classList.add('hidden');
  document.getElementById('sheetDate').value = getIsoDate(new Date());
  document.getElementById('sheetBreak').value = 0;
  document.getElementById('sheetStatus').value = 'open';
  document.getElementById('sheetShiftType').value = 'Day';
  document.getElementById('sheetClockIn').value = '09:00';
  document.getElementById('sheetClockOut').value = '17:00';
  if (state.currentUser && state.currentUser.role === 'staff') {
    document.getElementById('sheetWorker').value = state.currentUser.id;
  }
}

function populateTimeLogForm(record) {
  const currentUser = state.currentUser;
  state.editingId = record.id;
  document.getElementById('timesheetFormTitle').textContent = 'Edit time log';
  document.getElementById('cancelEditBtn').classList.remove('hidden');
  document.getElementById('sheetDate').value = record.date;
  document.getElementById('sheetShiftType').value = record.shiftType || 'Day';
  document.getElementById('sheetClockIn').value = record.start;
  document.getElementById('sheetClockOut').value = record.end;
  document.getElementById('sheetBreak').value = record.breakMinutes || 0;
  document.getElementById('sheetNotes').value = record.notes || '';
  document.getElementById('sheetStatus').value = record.status || 'open';

  if (currentUser.role === 'admin') {
    document.getElementById('sheetWorker').value = record.userId;
  } else {
    document.getElementById('sheetWorker').value = currentUser.id;
  }
}

function handleTimeLogSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const timesheets = getStoredTimesheets();
  const payload = {
    date: formData.get('date'),
    userId: state.currentUser.role === 'admin' ? formData.get('userId') || state.currentUser.id : state.currentUser.id,
    start: formData.get('clockIn'),
    end: formData.get('clockOut'),
    breakMinutes: Number(formData.get('breakMinutes') || 0),
    shiftType: formData.get('shiftType') || 'Day',
    status: formData.get('status') || 'open',
    notes: formData.get('notes') || '',
  };

  if (!payload.date || !payload.start || !payload.end) {
    showToast('Please complete all required fields.');
    return;
  }

  if (payload.start >= payload.end) {
    showToast('Clock out time must be later than clock in time.');
    return;
  }

  if (state.editingId) {
    const index = timesheets.findIndex((record) => record.id === state.editingId);
    if (index >= 0) {
      const existing = timesheets[index];
      const updated = makeTimeLog({
        ...existing,
        ...payload,
        id: existing.id,
        hours: calculateHours(payload.start, payload.end, payload.breakMinutes),
      });
      timesheets[index] = updated;
      saveTimesheets(timesheets);
      showToast('Time log updated.');
    }
  } else {
    const newShift = makeTimeLog({ ...payload, id: crypto.randomUUID() });
    timesheets.push(newShift);
    saveTimesheets(timesheets);
    showToast('Time log created.');
  }

  resetTimeLogForm();
  renderDashboard();
  renderTimesheets();
  renderWeeklyTracker();
}

function handleTableActions(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const { action, id } = button.dataset;
  const timesheets = getStoredTimesheets();

  if (action === 'edit') {
    const record = timesheets.find((shift) => shift.id === id);
    if (record) populateTimeLogForm(record);
  }

  if (action === 'delete') {
    const filtered = timesheets.filter((shift) => shift.id !== id);
    saveTimesheets(filtered);
    showToast('Time log deleted.');
    renderDashboard();
    renderTimesheets();
    renderWeeklyTracker();
  }

  if (action === 'delete-user') {
    const userId = button.dataset.userId;
    if (userId) {
      handleUserDelete(userId);
    }
  }
}

function initNavigation() {
  document.querySelectorAll('.tab-btn').forEach((button) => {
    button.addEventListener('click', () => {
      setCurrentSection(button.dataset.section);
    });
  });
}

function initLogin() {
  const form = document.getElementById('loginForm');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const user = getUserByCredentials(username, password);

    if (!user) {
      showToast('Invalid username or password.');
      return;
    }

    state.currentUser = user;
    document.getElementById('authView').classList.add('hidden');
    document.getElementById('appView').classList.remove('hidden');
    document.getElementById('usersTab').style.display = user.role === 'admin' ? 'inline-flex' : 'none';
    document.querySelectorAll('.admin-only').forEach((element) => {
      element.style.display = user.role === 'admin' ? '' : 'none';
    });
    renderAll();
  });
}

function renderAll() {
  renderDashboard();
  renderTimesheets();
  renderWeeklyTracker();
  renderUsers();
  setCurrentSection(state.currentSection);
}

function initLogout() {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    state.currentUser = null;
    state.editingId = null;
    document.getElementById('authView').classList.remove('hidden');
    document.getElementById('appView').classList.add('hidden');
    document.getElementById('loginForm').reset();
  });
}

function initWeekControls() {
  document.getElementById('weekPrev').addEventListener('click', () => moveWeek(-1));
  document.getElementById('weekNext').addEventListener('click', () => moveWeek(1));
  document.getElementById('weekPicker').addEventListener('change', (event) => {
    state.currentWeek = event.target.value;
    renderWeeklyTracker();
  });
}

function moveWeek(offset) {
  const current = state.currentWeek ? new Date(`${state.currentWeek}-1T00:00:00`) : new Date();
  const adjusted = new Date(current);
  adjusted.setDate(adjusted.getDate() + offset * 7);
  state.currentWeek = getWeekString(adjusted);
  renderWeeklyTracker();
}

function initFormEvents() {
  document.getElementById('timesheetForm').addEventListener('submit', handleTimeLogSubmit);
  document.getElementById('cancelEditBtn').addEventListener('click', resetTimeLogForm);
  document.getElementById('timesheetTableBody').addEventListener('click', handleTableActions);
  document.getElementById('userForm').addEventListener('submit', handleUserCreate);
  document.getElementById('userList').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="delete-user"]');
    if (!button) return;
    const userId = button.dataset.userId;
    if (userId) {
      handleUserDelete(userId);
    }
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {
        // Ignore service worker registration errors; the app still works with localStorage when offline.
      });
    });
  }
}

function initialize() {
  setupDefaults();
  initNavigation();
  initLogin();
  initLogout();
  initWeekControls();
  initFormEvents();
  registerServiceWorker();
  resetTimeLogForm();
  setCurrentSection('dashboard');
}

initialize();
