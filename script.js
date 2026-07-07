const STORAGE_KEY = 'penabung_pro_state_v1';
const THEME_KEY = 'penabung_theme_v1';
const MOTIVATIONS = [
  'Sedikit yang disimpan hari ini, bisa jadi kebebasan besar nanti.',
  'Target besar selalu dimulai dari angka kecil yang konsisten.',
  'Tabungan yang rapi membuat keputusan keuangan lebih tenang.',
  'Disiplin kecil setiap hari jauh lebih kuat daripada niat besar sesaat.',
  'Progress yang lambat tetap progress. Yang penting terus bergerak.'
];

const state = {
  profile: { name: 'Pengguna Penabung', accent: '#4F46E5' },
  savings: [],
  withdrawals: [],
  targets: [],
  navHistory: ['home'],
  historySort: 'newest',
  historyFilter: 'all',
  currentPage: 'home',
  currentModal: null,
};

const els = {};
const moneyFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

function qs(id) { return document.getElementById(id); }
function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }
function uid(prefix = 'id') { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`; }
function todayString() { return new Date().toISOString().slice(0, 10); }
function fmtMoney(value) { return moneyFormat.format(Number(value || 0)); }
function parseNumber(value) { return Number(String(value).replace(/[^0-9.-]/g, '')); }
function escapeText(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
function startOfMonth(date = new Date()) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function sameMonth(dateStr, date = new Date()) {
  const d = new Date(dateStr);
  return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth();
}
function monthIndex(dateStr) {
  const d = new Date(dateStr);
  return d.getMonth();
}
function weekdayIndex(dateStr) {
  return new Date(dateStr).getDay();
}

function defaultState() {
  const now = todayString();
  return {
    profile: { name: 'Pengguna Penabung', accent: '#4F46E5' },
    savings: [
      { id: uid('tx'), type: 'save', amount: 250000, category: 'Gaji', note: 'Setoran awal', date: now },
      { id: uid('tx'), type: 'save', amount: 50000, category: 'Harian', note: 'Sisa belanja', date: now },
    ],
    withdrawals: [
      { id: uid('tx'), type: 'withdraw', amount: 25000, reason: 'Personal', note: 'Biaya darurat', date: now },
    ],
    targets: [
      { id: uid('tg'), name: 'Laptop baru', amount: 1000000, saved: 275000, deadline: nextMonthDate(1) },
      { id: uid('tg'), name: 'Dana liburan', amount: 2500000, saved: 600000, deadline: nextMonthDate(4) },
    ],
  };
}

function nextMonthDate(offsetMonths) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  d.setDate(15);
  return d.toISOString().slice(0, 10);
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return Object.assign(state, defaultState());
    const parsed = JSON.parse(raw);
    return Object.assign(state, defaultState(), parsed, {
      profile: Object.assign({ name: 'Pengguna Penabung', accent: '#4F46E5' }, parsed.profile || {}),
      savings: Array.isArray(parsed.savings) ? parsed.savings : [],
      withdrawals: Array.isArray(parsed.withdrawals) ? parsed.withdrawals : [],
      targets: Array.isArray(parsed.targets) ? parsed.targets : [],
    });
  } catch {
    return Object.assign(state, defaultState());
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    profile: state.profile,
    savings: state.savings,
    withdrawals: state.withdrawals,
    targets: state.targets,
  }));
  localStorage.setItem(THEME_KEY, document.documentElement.getAttribute('data-theme') || 'light');
}

function showToast(title, message = '', type = 'info') {
  const container = els.toastContainer;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.style.borderLeft = `4px solid ${type === 'success' ? 'var(--accent)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'}`;
  toast.innerHTML = `<strong>${escapeText(title)}</strong><div>${escapeText(message)}</div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(-8px)'; }, 2500);
  setTimeout(() => toast.remove(), 2900);
}

function renderIcon(name) {
  const icons = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5 10.75V20h14v-9.25"></path><path d="M9.5 20v-6h5v6"></path></svg>',
    target: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="4"></circle><path d="M12 2v3"></path><path d="M22 12h-3"></path><path d="M12 22v-3"></path><path d="M2 12h3"></path></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14"></path><path d="M5 12h14"></path></svg>',
    minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"></path></svg>',
    history: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v5h5"></path><path d="M12 7v6l4 2"></path></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16v-4"></path><path d="M12 16V8"></path><path d="M16 16v-6"></path></svg>',
    user: '<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="8" r="4"></circle></svg>',
    theme: '<svg viewBox="0 0 24 24"><path d="M21 12.5A8.5 8.5 0 1 1 11.5 3a6.5 6.5 0 0 0 9.5 9.5Z"></path></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="m6 6 12 12"></path><path d="m18 6-12 12"></path></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"></path></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M6 6l1 14h10l1-14"></path><path d="M10 11v5"></path><path d="M14 11v5"></path></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"></path></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 16v-5"></path><path d="M12 8h.01"></path></svg>',
  };
  return icons[name] || icons.info;
}

function injectIcons() {
  qsa('[data-icon]').forEach((el) => {
    el.innerHTML = renderIcon(el.getAttribute('data-icon'));
  });
}

function setTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  const label = mode === 'dark' ? 'Tema gelap' : 'Tema terang';
  els.themeLabel.textContent = label;
  localStorage.setItem(THEME_KEY, mode);
  updateThemeButtons();
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  setTheme(current === 'light' ? 'dark' : 'light');
  showToast('Tema diperbarui', `Berpindah ke ${document.documentElement.getAttribute('data-theme')} mode.`, 'success');
}

function updateThemeButtons() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const iconName = current === 'light' ? 'theme' : 'theme';
  qsa('#themeToggleBtn .icon, #themeBtnInProfile .icon').forEach((iconEl) => {
    iconEl.innerHTML = renderIcon(iconName);
  });
}

function getBalance() {
  const totalSave = state.savings.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const totalWithdraw = state.withdrawals.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  return Math.max(totalSave - totalWithdraw, 0);
}

function getTotalSavings() {
  return state.savings.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
}

function getTotalWithdrawals() {
  return state.withdrawals.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
}

function getActiveTarget() {
  const targets = [...state.targets];
  if (!targets.length) return null;
  return targets.sort((a, b) => progressOf(b) - progressOf(a))[0];
}

function progressOf(target) {
  if (!target || !target.amount) return 0;
  return clamp((Number(target.saved || 0) / Number(target.amount || 1)) * 100, 0, 100);
}

function getAllTransactions() {
  const savings = state.savings.map((tx) => ({ ...tx, type: 'save', sortValue: 1 }));
  const withdrawals = state.withdrawals.map((tx) => ({ ...tx, type: 'withdraw', sortValue: -1 }));
  return [...savings, ...withdrawals].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function monthSummary() {
  const now = new Date();
  const income = state.savings.filter((tx) => sameMonth(tx.date, now)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const withdraw = state.withdrawals.filter((tx) => sameMonth(tx.date, now)).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const count = getAllTransactions().filter((tx) => sameMonth(tx.date, now)).length;
  return { income, withdraw, count, delta: income - withdraw };
}

function validateSaveForm() {
  const amount = parseNumber(els.saveAmount.value);
  const category = els.saveCategory.value.trim();
  const note = els.saveNote.value.trim();
  const date = els.saveDate.value;
  let valid = true;
  clearErrors(['saveAmount', 'saveCategory', 'saveNote', 'saveDate']);
  if (!amount || amount < 1000) {
    setError('saveAmount', 'Nominal minimal Rp1.000.'); valid = false;
  }
  if (!category) { setError('saveCategory', 'Kategori wajib dipilih.'); valid = false; }
  if (note.length > 120) { setError('saveNote', 'Catatan maksimal 120 karakter.'); valid = false; }
  if (!date) { setError('saveDate', 'Tanggal wajib diisi.'); valid = false; }
  return valid ? { amount, category, note, date } : null;
}

function validateWithdrawForm() {
  const amount = parseNumber(els.withdrawAmount.value);
  const reason = els.withdrawReason.value.trim();
  const confirmText = els.withdrawConfirm.value.trim().toLowerCase();
  let valid = true;
  clearErrors(['withdrawAmount', 'withdrawReason', 'withdrawConfirm']);
  if (!amount || amount < 1000) { setError('withdrawAmount', 'Nominal minimal Rp1.000.'); valid = false; }
  if (amount > getBalance()) { setError('withdrawAmount', 'Nominal melebihi saldo tersedia.'); valid = false; }
  if (!reason) { setError('withdrawReason', 'Alasan wajib dipilih.'); valid = false; }
  if (!confirmText.includes('setuju')) { setError('withdrawConfirm', 'Tuliskan kalimat konfirmasi dengan kata “setuju”.'); valid = false; }
  return valid ? { amount, reason, confirmText: els.withdrawConfirm.value.trim() } : null;
}

function setError(fieldId, message) {
  const err = document.querySelector(`[data-error-for="${fieldId}"]`);
  if (err) err.textContent = message;
}

function clearErrors(fieldIds = []) {
  fieldIds.forEach((id) => setError(id, ''));
}

function renderHome() {
  const balance = getBalance();
  const totalSavings = getTotalSavings();
  const activeTarget = getActiveTarget();
  const targetProgress = activeTarget ? progressOf(activeTarget) : 0;
  const summary = monthSummary();

  els.mainBalance.textContent = fmtMoney(balance);
  els.totalSavings.textContent = fmtMoney(totalSavings);
  els.activeTargetName.textContent = activeTarget ? activeTarget.name : 'Belum ada target';
  els.activeTargetPercent.textContent = `${Math.round(targetProgress)}%`;
  els.mainProgressValue.textContent = `${Math.round(targetProgress)}%`;
  els.progressCopy.textContent = activeTarget
    ? `Target ${activeTarget.name} terus bergerak. Sisa ${fmtMoney(Math.max(activeTarget.amount - activeTarget.saved, 0))}.`
    : 'Tambah target agar progres tabungan bisa dipantau otomatis.';
  els.monthIncome.textContent = fmtMoney(summary.income);
  els.monthWithdraw.textContent = fmtMoney(summary.withdraw);
  els.monthTxCount.textContent = String(summary.count);
  els.monthlyDeltaChip.textContent = `${summary.delta >= 0 ? '+' : '-'}${fmtMoney(Math.abs(summary.delta)).replace('Rp', '').trim()}`;
  els.motivationText.textContent = MOTIVATIONS[new Date().getDate() % MOTIVATIONS.length];

  const ring = els.mainProgressRing;
  const circumference = 2 * Math.PI * 48;
  const offset = circumference - (circumference * targetProgress) / 100;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${offset}`;

  const recent = getAllTransactions().slice(0, 4);
  els.recentTransactions.innerHTML = recent.length ? recent.map(renderTransactionItem).join('') : emptyState('Belum ada transaksi', 'Setor dana pertama untuk mulai terlihat progresnya.');
  bindTransactionActions(els.recentTransactions);
  renderHomeChart();
}

function renderTransactionItem(tx) {
  const amountClass = tx.type === 'save' ? 'positive' : 'negative';
  const sign = tx.type === 'save' ? '+' : '-';
  const label = tx.type === 'save' ? (tx.category || 'Setor') : (tx.reason || 'Tarik');
  const note = tx.note || (tx.type === 'save' ? 'Tidak ada catatan' : 'Tidak ada catatan');
  return `
    <div class="transaction-item large glassish" data-tx-id="${tx.id}">
      <div class="transaction-info">
        <div class="transaction-title">${escapeText(label)}</div>
        <div class="transaction-sub">${escapeText(note)}</div>
        <div class="transaction-date">${escapeText(formatDate(tx.date))}</div>
      </div>
      <div class="transaction-amount ${amountClass}">${sign}${escapeText(fmtMoney(tx.amount))}</div>
    </div>
  `;
}

function emptyState(title, subtitle) {
  return `
    <div class="transaction-item">
      <div class="transaction-info">
        <div class="transaction-title">${escapeText(title)}</div>
        <div class="transaction-sub">${escapeText(subtitle)}</div>
      </div>
      <span class="chip">Siap dipakai</span>
    </div>
  `;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return dateFormat.format(new Date(dateStr));
}

function renderTargets() {
  if (!state.targets.length) {
    els.targetList.innerHTML = emptyState('Belum ada target', 'Tambahkan target agar progres bisa dihitung otomatis.');
    return;
  }
  els.targetList.innerHTML = state.targets
    .map((target) => {
      const progress = progressOf(target);
      const remaining = Math.max(Number(target.amount) - Number(target.saved || 0), 0);
      return `
        <div class="target-item glassish" data-target-id="${target.id}">
          <div class="target-info">
            <div class="target-title">${escapeText(target.name)}</div>
            <div class="target-sub">${escapeText(fmtMoney(target.saved || 0))} / ${escapeText(fmtMoney(target.amount))}</div>
            <div class="target-sub">Sisa ${escapeText(fmtMoney(remaining))} · Tenggat ${escapeText(formatDate(target.deadline))}</div>
          </div>
          <div class="target-meta">
            <span class="chip success">${Math.round(progress)}%</span>
            <div class="target-actions">
              <button class="icon-btn ripple" data-action="edit-target" data-id="${target.id}" aria-label="Edit target"><span class="icon" data-icon="edit"></span></button>
              <button class="icon-btn ripple" data-action="delete-target" data-id="${target.id}" aria-label="Hapus target"><span class="icon" data-icon="trash"></span></button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  injectIcons();
}

function renderHistory() {
  let items = getAllTransactions();
  const query = els.historySearch.value.trim().toLowerCase();
  if (state.historyFilter !== 'all') items = items.filter((tx) => tx.type === state.historyFilter);
  if (query) {
    items = items.filter((tx) => {
      const blob = [tx.category, tx.reason, tx.note, tx.amount, tx.date, tx.type].join(' ').toLowerCase();
      return blob.includes(query);
    });
  }
  items.sort((a, b) => state.historySort === 'newest' ? new Date(b.date) - new Date(a.date) : new Date(a.date) - new Date(b.date));
  els.historyCountChip.textContent = `${items.length} item`;
  els.historyList.innerHTML = items.length ? items.map(renderTransactionItem).join('') : emptyState('Tidak ada hasil', 'Coba ubah pencarian atau filter.');
  bindTransactionActions(els.historyList);
}

function renderStatistics() {
  const balance = getBalance();
  const totalSavings = getTotalSavings();
  const totalWithdraw = getTotalWithdrawals();
  const goalTotal = state.targets.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const savedTowardGoals = state.targets.reduce((sum, t) => sum + Number(t.saved || 0), 0);
  const achievement = goalTotal ? clamp((savedTowardGoals / goalTotal) * 100, 0, 100) : 0;
  const txCount = getAllTransactions().length;

  els.statIncome.textContent = fmtMoney(totalSavings);
  els.statWithdraw.textContent = fmtMoney(totalWithdraw);
  els.statAchieve.textContent = `${Math.round(achievement)}%`;
  els.statTx.textContent = String(txCount);

  renderWeeklyChart();
  renderMonthlyChart();
}

function renderProfile() {
  els.profileNameTitle.textContent = state.profile.name || 'Pengguna Penabung';
  els.profileAvatar.textContent = (state.profile.name || 'P').trim().slice(0, 1).toUpperCase();
  els.profileAvatar.style.background = `linear-gradient(135deg, ${state.profile.accent || '#4F46E5'}, color-mix(in srgb, ${state.profile.accent || '#4F46E5'} 72%, white 28%))`;
  document.documentElement.style.setProperty('--primary', state.profile.accent || '#4F46E5');
  document.documentElement.style.setProperty('--secondary', mixAccent(state.profile.accent || '#4F46E5'));
  document.documentElement.style.setProperty('--accent', '#22C55E');
  updateThemeButtons();
}

function mixAccent(hex) {
  const base = hex.replace('#', '');
  if (base.length !== 6) return '#6366F1';
  const r = parseInt(base.slice(0, 2), 16);
  const g = parseInt(base.slice(2, 4), 16);
  const b = parseInt(base.slice(4, 6), 16);
  const mix = (n) => Math.min(255, Math.round(n + (255 - n) * 0.18));
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function renderAll() {
  renderHome();
  renderTargets();
  renderHistory();
  renderStatistics();
  renderProfile();
  saveState();
  renderWithdrawChip();
}

function renderWithdrawChip() {
  const balance = getBalance();
  els.withdrawLimitChip.textContent = balance > 0 ? `Saldo ${fmtMoney(balance)}` : 'Saldo kosong';
}

function renderWeeklyChart() {
  drawChart(els.weeklyChart, buildWeekData(), { type: 'bar', color: 'var(--primary)' });
}

function renderHomeChart() {
  drawChart(els.homeChart, buildWeekData(), { type: 'line', color: 'var(--primary)' });
}

function renderMonthlyChart() {
  drawChart(els.monthlyChart, buildMonthData(), { type: 'line', color: 'var(--secondary)' });
}

function buildWeekData() {
  const days = Array.from({ length: 7 }, (_, i) => ({ label: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][i], value: 0 }));
  getAllTransactions().forEach((tx) => {
    const idx = weekdayIndex(tx.date);
    if (tx.type === 'save') days[idx].value += Number(tx.amount || 0);
  });
  return days;
}

function buildMonthData() {
  const months = Array.from({ length: 12 }, (_, i) => ({ label: ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][i], value: 0 }));
  getAllTransactions().forEach((tx) => { if (tx.type === 'save') months[monthIndex(tx.date)].value += Number(tx.amount || 0); });
  return months;
}

function drawChart(canvas, data, { type = 'line' } = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(320, Math.round(rect.width * dpr));
  const h = Math.max(220, Math.round((rect.height || 240) * dpr));
  canvas.width = w;
  canvas.height = h;
  ctx.scale(dpr, dpr);
  const width = rect.width || 320;
  const height = rect.height || 240;
  const padding = 28;
  const chartH = height - padding * 2;
  const chartW = width - padding * 2;
  const max = Math.max(...data.map((d) => d.value), 1);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  ctx.globalAlpha = 0.7;
  ctx.font = '12px Inter, sans-serif';

  for (let i = 0; i < 4; i++) {
    const y = padding + (chartH / 3) * i;
    ctx.strokeStyle = 'rgba(148,163,184,0.12)';
    ctx.beginPath(); ctx.moveTo(padding, y); ctx.lineTo(width - padding, y); ctx.stroke();
  }

  if (type === 'bar') {
    const barW = chartW / data.length;
    data.forEach((item, idx) => {
      const barHeight = (item.value / max) * (chartH - 12);
      const x = padding + idx * barW + 8;
      const y = height - padding - barHeight;
      const grad = ctx.createLinearGradient(0, y, 0, height - padding);
      grad.addColorStop(0, 'rgba(79,70,229,0.96)');
      grad.addColorStop(1, 'rgba(99,102,241,0.45)');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, barW - 16, barHeight, 14);
      ctx.fill();
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
      ctx.fillText(item.label, x + 2, height - 8);
    });
  } else {
    ctx.strokeStyle = 'rgba(79,70,229,0.24)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    data.forEach((item, idx) => {
      const x = padding + (chartW / (data.length - 1 || 1)) * idx;
      const y = height - padding - (item.value / max) * (chartH - 8);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, padding, 0, height - padding);
    grad.addColorStop(0, 'rgba(79,70,229,0.96)');
    grad.addColorStop(1, 'rgba(79,70,229,0.05)');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(79,70,229,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.forEach((item, idx) => {
      const x = padding + (chartW / (data.length - 1 || 1)) * idx;
      const y = height - padding - (item.value / max) * (chartH - 8);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    ctx.fillStyle = 'rgba(79,70,229,0.16)';
    ctx.beginPath();
    data.forEach((item, idx) => {
      const x = padding + (chartW / (data.length - 1 || 1)) * idx;
      const y = height - padding - (item.value / max) * (chartH - 8);
      if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + chartW, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    ctx.fill();

    data.forEach((item, idx) => {
      const x = padding + (chartW / (data.length - 1 || 1)) * idx;
      const y = height - padding - (item.value / max) * (chartH - 8);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(79,70,229,0.95)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
      ctx.fillText(item.label, x - 12, height - 8);
    });
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function switchPage(page, direction = 'forward') {
  state.currentPage = page;
  qsa('.page').forEach((el) => el.classList.remove('active'));
  const target = qs(`page-${page}`);
  if (!target) return;
  target.classList.add('active');
  target.setAttribute('data-anim', direction === 'back' ? 'slide-right' : 'slide-left');
  setTimeout(() => target.removeAttribute('data-anim'), 260);
  qsa('.nav-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.nav === page));
  els.topbarTitle.textContent = titleForPage(page);
  if (page === 'history') renderHistory();
  if (page === 'statistics') renderStatistics();
  if (page === 'profile') renderProfile();
  if (page === 'home') renderHome();
  renderWithdrawChip();
}

function titleForPage(page) {
  const map = { home: 'Home', target: 'Target', add: 'Tambah Tabungan', withdraw: 'Tarik Tabungan', history: 'Riwayat', statistics: 'Statistik', profile: 'Profil' };
  return map[page] || 'Penabung';
}

function openModal({ title, eyebrow = 'Dialog', content, onClose } = {}) {
  state.currentModal = { onClose };
  els.modalEyebrow.textContent = eyebrow;
  els.modalTitle.textContent = title;
  els.modalBody.innerHTML = '';
  if (typeof content === 'string') els.modalBody.innerHTML = content;
  else if (content instanceof Node) els.modalBody.appendChild(content);
  els.overlay.classList.remove('hidden');
  els.modalRoot.classList.remove('hidden');
  els.modalRoot.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  if (state.currentModal?.onClose) state.currentModal.onClose();
  state.currentModal = null;
  els.overlay.classList.add('hidden');
  els.modalRoot.classList.add('hidden');
  els.modalRoot.setAttribute('aria-hidden', 'true');
}

function openBottomSheet(contentNode, onClose) {
  els.bottomSheetRoot.innerHTML = '';
  const sheet = document.createElement('div');
  sheet.className = 'bottom-sheet';
  sheet.appendChild(contentNode);
  els.bottomSheetRoot.appendChild(sheet);
  els.bottomSheetRoot.classList.remove('hidden');
  els.bottomSheetRoot.setAttribute('aria-hidden', 'false');
  els.overlay.classList.remove('hidden');
  state.currentModal = { onClose };
}

function closeBottomSheet() {
  if (state.currentModal?.onClose) state.currentModal.onClose();
  state.currentModal = null;
  els.bottomSheetRoot.classList.add('hidden');
  els.bottomSheetRoot.setAttribute('aria-hidden', 'true');
  els.overlay.classList.add('hidden');
  els.bottomSheetRoot.innerHTML = '';
}

function bindTransactionActions(root) {
  qsa('[data-tx-id]', root).forEach((item) => {
    item.addEventListener('click', () => {
      const tx = getAllTransactions().find((row) => row.id === item.dataset.txId);
      if (!tx) return;
      const template = qs('transactionDetailTemplate').content.cloneNode(true);
      template.getElementById('detailType').textContent = tx.type === 'save' ? 'Setor' : 'Tarik';
      template.getElementById('detailAmount').textContent = fmtMoney(tx.amount);
      template.getElementById('detailCategory').textContent = tx.type === 'save' ? (tx.category || '-') : (tx.reason || '-');
      template.getElementById('detailNote').textContent = tx.note || '-';
      template.getElementById('detailDate').textContent = formatDate(tx.date);
      openModal({ title: 'Detail Transaksi', eyebrow: 'Riwayat', content: template });
    });
  });
}

function openTargetForm(target = null) {
  const fragment = qs('targetFormTemplate').content.cloneNode(true);
  const form = fragment.querySelector('#targetForm');
  const saveBtn = fragment.getElementById('saveTargetBtn');
  const title = target ? 'Edit Target' : 'Tambah Target';
  const eyebrow = target ? 'Target' : 'Target Baru';

  fragment.getElementById('targetName').value = target?.name || '';
  fragment.getElementById('targetAmount').value = target?.amount || '';
  fragment.getElementById('targetSaved').value = target?.saved || 0;
  fragment.getElementById('targetDeadline').value = target?.deadline || nextMonthDate(1);
  saveBtn.textContent = target ? 'Simpan Perubahan' : 'Simpan Target';

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = fragment.getElementById('targetName').value.trim();
    const amount = parseNumber(fragment.getElementById('targetAmount').value);
    const saved = parseNumber(fragment.getElementById('targetSaved').value);
    const deadline = fragment.getElementById('targetDeadline').value;
    clearErrors(['targetName', 'targetAmount', 'targetSaved', 'targetDeadline']);
    let valid = true;
    if (!name || name.length < 3) { setError('targetName', 'Nama target minimal 3 karakter.'); valid = false; }
    if (!amount || amount < 10000) { setError('targetAmount', 'Nominal target minimal Rp10.000.'); valid = false; }
    if (saved < 0) { setError('targetSaved', 'Nilai terkumpul tidak boleh negatif.'); valid = false; }
    if (saved > amount) { setError('targetSaved', 'Terkumpul tidak boleh melebihi target.'); valid = false; }
    if (!deadline) { setError('targetDeadline', 'Tanggal tenggat wajib diisi.'); valid = false; }
    if (!valid) return;
    if (target) {
      Object.assign(target, { name, amount, saved, deadline });
      showToast('Target diperbarui', `${name} berhasil disimpan.`, 'success');
    } else {
      state.targets.unshift({ id: uid('tg'), name, amount, saved, deadline });
      showToast('Target ditambahkan', `${name} berhasil dibuat.`, 'success');
    }
    saveState(); renderAll(); closeModal();
  });

  fragment.getElementById('cancelTargetBtn').addEventListener('click', closeModal);
  openModal({ title, eyebrow, content: fragment });
}


function openQuickActionSheet() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="detail-grid" style="gap:12px;">
      <p class="muted" style="margin:0; line-height:1.7;">Pilih aksi cepat. Semua jalan ke halaman yang relevan dengan transisi halus.</p>
      <button class="primary-btn ripple" id="sheetSaveBtn">Tambah Tabungan</button>
      <button class="secondary-btn ripple" id="sheetWithdrawBtn">Tarik Tabungan</button>
      <button class="secondary-btn ripple" id="sheetTargetBtn">Tambah Target</button>
      <button class="text-btn ripple" id="sheetCloseBtn">Tutup</button>
    </div>
  `;
  openBottomSheet(content, null);
  setTimeout(() => {
    const saveBtn = qs('sheetSaveBtn');
    const withdrawBtn = qs('sheetWithdrawBtn');
    const targetBtn = qs('sheetTargetBtn');
    const closeBtn = qs('sheetCloseBtn');
    if (saveBtn) saveBtn.addEventListener('click', () => { closeBottomSheet(); switchPage('add'); });
    if (withdrawBtn) withdrawBtn.addEventListener('click', () => { closeBottomSheet(); switchPage('withdraw'); });
    if (targetBtn) targetBtn.addEventListener('click', () => { closeBottomSheet(); openTargetForm(); });
    if (closeBtn) closeBtn.addEventListener('click', closeBottomSheet);
  }, 0);
}

function openProfileForm() {
  const fragment = qs('profileFormTemplate').content.cloneNode(true);
  fragment.getElementById('profileNameInput').value = state.profile.name;
  fragment.getElementById('accentColorSelect').value = state.profile.accent || '#4F46E5';
  fragment.getElementById('cancelProfileBtn').addEventListener('click', closeModal);
  fragment.getElementById('profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = fragment.getElementById('profileNameInput').value.trim();
    const accent = fragment.getElementById('accentColorSelect').value;
    clearErrors(['profileNameInput']);
    if (!name || name.length < 3) { setError('profileNameInput', 'Nama minimal 3 karakter.'); return; }
    state.profile.name = name;
    state.profile.accent = accent;
    showToast('Profil tersimpan', 'Pengaturan profil diperbarui.', 'success');
    renderAll();
    closeModal();
  });
  openModal({ title: 'Edit Profil', eyebrow: 'Profil', content: fragment });
}

function deleteTarget(id) {
  const target = state.targets.find((t) => t.id === id);
  if (!target) return;
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="detail-grid">
      <p class="muted" style="margin:0 0 6px; line-height:1.7;">Target <strong>${escapeText(target.name)}</strong> akan dihapus. Aksi ini tidak bisa dibatalkan.</p>
      <div class="form-actions" style="justify-content:flex-end; margin-top:8px;">
        <button class="secondary-btn ripple" id="cancelDeleteTarget">Batal</button>
        <button class="danger-btn ripple" id="confirmDeleteTarget">Hapus</button>
      </div>
    </div>
  `;
  openModal({ title: 'Hapus Target', eyebrow: 'Konfirmasi', content });
  setTimeout(() => {
    const cancel = qs('cancelDeleteTarget');
    const confirm = qs('confirmDeleteTarget');
    if (cancel) cancel.addEventListener('click', closeModal);
    if (confirm) confirm.addEventListener('click', () => {
      state.targets = state.targets.filter((t) => t.id !== id);
      saveState(); renderAll(); closeModal(); showToast('Target dihapus', 'Target berhasil dihapus.', 'success');
    });
  }, 0);
}

function applyRippleToButtons() {
  qsa('.ripple').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.style.position = 'absolute';
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      ripple.style.width = ripple.style.height = '14px';
      ripple.style.borderRadius = '999px';
      ripple.style.background = 'rgba(255,255,255,0.35)';
      ripple.style.transform = 'translate(-50%, -50%) scale(0)';
      ripple.style.transition = 'transform .55s ease, opacity .55s ease';
      ripple.style.pointerEvents = 'none';
      btn.appendChild(ripple);
      requestAnimationFrame(() => ripple.style.transform = 'translate(-50%, -50%) scale(18)');
      setTimeout(() => { ripple.style.opacity = '0'; setTimeout(() => ripple.remove(), 650); }, 220);
    }, { passive: true });
  });
}

function initForms() {
  els.saveDate.value = todayString();
  els.saveForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = validateSaveForm();
    if (!data) return showToast('Periksa input', 'Masih ada data yang belum valid.', 'error');
    state.savings.unshift({ id: uid('tx'), type: 'save', amount: data.amount, category: data.category, note: data.note, date: data.date });
    saveState(); renderAll();
    els.saveForm.reset(); els.saveDate.value = todayString();
    showToast('Tabungan tersimpan', `Berhasil menambah ${fmtMoney(data.amount)}.`, 'success');
  });

  els.withdrawForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = validateWithdrawForm();
    if (!data) return showToast('Periksa input', 'Ada yang belum sesuai.', 'error');
    state.withdrawals.unshift({ id: uid('tx'), type: 'withdraw', amount: data.amount, reason: data.reason, note: data.confirmText, date: todayString() });
    saveState(); renderAll();
    els.withdrawForm.reset();
    showToast('Penarikan berhasil', `Saldo berkurang ${fmtMoney(data.amount)}.`, 'success');
  });
}

function initNavigation() {
  qsa('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.nav;
      if (page === 'add') {
        openQuickActionSheet();
        return;
      }
      if (page === 'withdraw') {
        switchPage('withdraw');
        return;
      }
      switchPage(page);
    });
  });

  document.addEventListener('click', (e) => {
    const filterBtn = e.target.closest('.filter-chip');
    if (filterBtn) {
      qsa('.filter-chip').forEach((chip) => chip.classList.remove('active'));
      filterBtn.classList.add('active');
      state.historyFilter = filterBtn.dataset.filter;
      renderHistory();
      return;
    }

    const targetAction = e.target.closest('[data-action]');
    if (targetAction?.dataset.action === 'edit-target') {
      const target = state.targets.find((t) => t.id === targetAction.dataset.id);
      if (target) openTargetForm(target);
    }
    if (targetAction?.dataset.action === 'delete-target') deleteTarget(targetAction.dataset.id);
  });
}

function initControls() {
  els.startAppBtn.addEventListener('click', () => {
    els.welcomeScreen.classList.add('hidden');
    els.mainApp.classList.remove('hidden');
    els.mainApp.setAttribute('aria-hidden', 'false');
    switchPage('home');
    showToast('Selamat datang', 'Aplikasi siap digunakan.', 'success');
  });
  els.themeToggleBtn.addEventListener('click', toggleTheme);
  els.themeBtnInProfile.addEventListener('click', toggleTheme);
  els.addTargetBtn.addEventListener('click', () => openTargetForm());
  els.editProfileBtn.addEventListener('click', openProfileForm);
  els.resetDataBtn.addEventListener('click', () => {
    const content = document.createElement('div');
    content.innerHTML = `
      <p class="muted" style="margin:0 0 16px; line-height:1.7;">Semua data local akan dihapus. Aksi ini tidak bisa dibatalkan.</p>
      <div class="form-actions">
        <button class="secondary-btn ripple" id="cancelResetBtn">Batal</button>
        <button class="danger-btn ripple" id="confirmResetBtn">Reset</button>
      </div>
    `;
    openModal({ title: 'Reset Data', eyebrow: 'Bahaya', content });
    setTimeout(() => {
      qs('cancelResetBtn').addEventListener('click', closeModal);
      qs('confirmResetBtn').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(THEME_KEY);
        Object.assign(state, defaultState());
        initThemeFromStorage();
        renderAll();
        closeModal();
        showToast('Data direset', 'Aplikasi dikembalikan ke kondisi awal.', 'success');
      });
    }, 0);
  });

  els.closeModalBtn.addEventListener('click', closeModal);
  els.overlay.addEventListener('click', () => {
    if (!els.modalRoot.classList.contains('hidden')) closeModal();
    if (!els.bottomSheetRoot.classList.contains('hidden')) closeBottomSheet();
  });

  els.sortHistoryBtn.addEventListener('click', () => {
    state.historySort = state.historySort === 'newest' ? 'oldest' : 'newest';
    showToast('Pengurutan riwayat', `Mode ${state.historySort === 'newest' ? 'terbaru dulu' : 'terlama dulu'}.`);
    renderHistory();
  });

  els.historySearch.addEventListener('input', renderHistory);

  window.addEventListener('resize', () => {
    if (state.currentPage === 'home') renderHomeChart();
    if (state.currentPage === 'statistics') renderStatistics();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!els.modalRoot.classList.contains('hidden')) closeModal();
      if (!els.bottomSheetRoot.classList.contains('hidden')) closeBottomSheet();
    }
  });
}

function initThemeFromStorage() {
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
  setTheme(savedTheme === 'dark' ? 'dark' : 'light');
}

function initSplash() {
  const start = performance.now();
  const duration = 1800;
  const progressBar = els.splashProgressBar;
  const label = els.splashProgressLabel;
  const tick = (now) => {
    const p = clamp((now - start) / duration, 0, 1);
    progressBar.style.width = `${Math.round(p * 100)}%`;
    label.textContent = p < 0.4 ? 'Menyiapkan antarmuka…' : p < 0.75 ? 'Memuat komponen…' : 'Hampir selesai…';
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  setTimeout(() => {
    els.splashScreen.classList.add('hidden');
    els.welcomeScreen.classList.remove('hidden');
  }, 1900);
}

function syncProfileOnCssVar() {
  document.documentElement.style.setProperty('--primary', state.profile.accent || '#4F46E5');
  document.documentElement.style.setProperty('--secondary', mixAccent(state.profile.accent || '#4F46E5'));
}

function boot() {
  Object.assign(els, {
    appShell: qs('appShell'), splashScreen: qs('splashScreen'), welcomeScreen: qs('welcomeScreen'), mainApp: qs('mainApp'),
    splashProgressBar: qs('splashProgressBar'), splashProgressLabel: qs('splashProgressLabel'), startAppBtn: qs('startAppBtn'),
    themeToggleBtn: qs('themeToggleBtn'), themeBtnInProfile: qs('themeBtnInProfile'), topbarTitle: qs('topbarTitle'), greetingText: qs('greetingText'),
    mainBalance: qs('mainBalance'), totalSavings: qs('totalSavings'), activeTargetName: qs('activeTargetName'), activeTargetPercent: qs('activeTargetPercent'),
    mainProgressRing: qs('mainProgressRing'), mainProgressValue: qs('mainProgressValue'), progressCopy: qs('progressCopy'),
    monthlyDeltaChip: qs('monthlyDeltaChip'), monthIncome: qs('monthIncome'), monthWithdraw: qs('monthWithdraw'), monthTxCount: qs('monthTxCount'),
    motivationText: qs('motivationText'), recentTransactions: qs('recentTransactions'),
    saveForm: qs('saveForm'), saveAmount: qs('saveAmount'), saveCategory: qs('saveCategory'), saveNote: qs('saveNote'), saveDate: qs('saveDate'),
    withdrawForm: qs('withdrawForm'), withdrawAmount: qs('withdrawAmount'), withdrawReason: qs('withdrawReason'), withdrawConfirm: qs('withdrawConfirm'),
    withdrawLimitChip: qs('withdrawLimitChip'), targetList: qs('targetList'), addTargetBtn: qs('addTargetBtn'),
    historySearch: qs('historySearch'), sortHistoryBtn: qs('sortHistoryBtn'), historyList: qs('historyList'), historyCountChip: qs('historyCountChip'),
    statIncome: qs('statIncome'), statWithdraw: qs('statWithdraw'), statAchieve: qs('statAchieve'), statTx: qs('statTx'),
    homeChart: qs('homeChart'), weeklyChart: qs('weeklyChart'), monthlyChart: qs('monthlyChart'),
    profileAvatar: qs('profileAvatar'), profileNameTitle: qs('profileNameTitle'), themeLabel: qs('themeLabel'), editProfileBtn: qs('editProfileBtn'),
    resetDataBtn: qs('resetDataBtn'), toastContainer: qs('toastContainer'), overlay: qs('overlay'), modalRoot: qs('modalRoot'), modalTitle: qs('modalTitle'),
    modalEyebrow: qs('modalEyebrow'), modalBody: qs('modalBody'), closeModalBtn: qs('closeModalBtn'), bottomSheetRoot: qs('bottomSheetRoot'),
  });

  loadState();
  initThemeFromStorage();
  syncProfileOnCssVar();
  injectIcons();
  applyRippleToButtons();
  initForms();
  initNavigation();
  initControls();
  renderAll();
  switchPage('home');
  initSplash();
  const now = new Date();
  const hour = now.getHours();
  els.greetingText.textContent = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
  showToast('Data siap', 'LocalStorage terhubung dengan aman.', 'success');
}

document.addEventListener('DOMContentLoaded', boot);
