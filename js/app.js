// =============================================
// AL SAYYAH Mini Market - Main App Logic
// =============================================

// --- State ---
const state = {
  admin: null,
  categories: [],
  items: [],
  exchangeRate: 90000,
  currentCategory: null,
  scannerStream: null,
  scanning: false,
  editingItem: null
};

// --- Utilities ---
const $ = id => document.getElementById(id);
const fmt = {
  usd: v => `$${parseFloat(v).toFixed(2)}`,
  lb: v => `${parseInt(v).toLocaleString()} LL`
};

function showToast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  setTimeout(() => t.className = 'toast', 2800);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  // Update bottom nav
  const navMap = { 'home': 0, 'scanner-screen': 1, 'admin-login': 2, 'admin-dashboard': 2 };
  document.querySelectorAll('.nav-item').forEach((n, i) => {
    n.classList.toggle('active', i === (navMap[id] ?? -1));
  });
}

// --- Splash ---
async function initSplash() {
  const statusEl = document.querySelector('.splash-status');
  statusEl.textContent = 'Checking connection...';
  try {
    await DB.getCategories();
    statusEl.textContent = 'Connected ✓';
    state.exchangeRate = await DB.getExchangeRate();
  } catch (e) {
    statusEl.textContent = 'Offline mode';
  }
  setTimeout(() => {
    showScreen('home');
    initHome();
  }, 500);
}

// --- Home Screen ---
async function initHome() {
  renderCategories();
  loadItems();
  updateRateBar();
}

async function renderCategories() {
  const wrap = $('categories-row');
  wrap.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
  try {
    state.categories = await DB.getCategories();
    wrap.innerHTML = '';
    // "All" chip
    const allChip = createCategoryChip({ id: null, name: 'All', icon: '🏪' }, state.currentCategory === null);
    wrap.appendChild(allChip);
    state.categories.forEach(cat => {
      wrap.appendChild(createCategoryChip(cat, state.currentCategory === cat.id));
    });
  } catch (e) {
    wrap.innerHTML = '<div class="loading-spinner">Could not load categories</div>';
  }
}

function createCategoryChip(cat, active) {
  const div = document.createElement('div');
  div.className = `category-chip${active ? ' active' : ''}`;
  div.innerHTML = `
    <div class="category-icon-wrap">${cat.icon || '🛒'}</div>
    <span class="category-label">${cat.name}</span>
  `;
  div.onclick = () => {
    state.currentCategory = cat.id;
    document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
    div.classList.add('active');
    loadItems();
  };
  return div;
}

async function loadItems(search = '') {
  const grid = $('items-grid');
  grid.innerHTML = `<div class="loading-spinner" style="grid-column:1/-1"><div class="spinner"></div> Loading...</div>`;
  try {
    const items = await DB.getItems(state.currentCategory, search);
    state.items = items;
    grid.innerHTML = '';
    if (!items.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <span class="empty-icon">📦</span>
        <h3>No items found</h3>
        <p>Try a different category or search</p>
      </div>`;
      return;
    }
    items.forEach(item => grid.appendChild(createItemCard(item)));
  } catch (e) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <span class="empty-icon">⚠️</span>
      <h3>Could not load items</h3>
      <p>Check your connection and try again</p>
    </div>`;
  }
}

function getCategoryIcon(catId) {
  const cat = state.categories.find(c => c.id === catId);
  return cat?.icon || '🛒';
}

function createItemCard(item) {
  const card = document.createElement('div');
  card.className = 'item-card';
  const icon = getCategoryIcon(item.category_id);
  card.innerHTML = `
    <div class="item-card-img">${icon}</div>
    <div class="item-card-body">
      <div class="item-card-name">${item.item_name}</div>
      <div class="item-card-price">
        ${fmt.usd(item.price_usd)}
        <span>${fmt.lb(item.price_lb)}</span>
      </div>
    </div>
  `;
  return card;
}

async function updateRateBar() {
  try {
    state.exchangeRate = await DB.getExchangeRate();
    $('rate-bar').textContent = `Exchange Rate: 1 USD = ${parseInt(state.exchangeRate).toLocaleString()} LBP`;
  } catch (e) {}
}

// Search
$('search-input').addEventListener('input', e => {
  loadItems(e.target.value);
});

// --- Barcode Scanner ---
async function startScanner() {
  showScreen('scanner-screen');
  hideResult();
  $('manual-barcode').value = '';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    state.scannerStream = stream;
    const video = $('scanner-video');
    video.srcObject = stream;
    await video.play();
    startBarcodeDetection(video);
  } catch (e) {
    showToast('Camera not available. Use manual entry below.', 'error');
  }
}

function stopScanner() {
  if (state.scannerStream) {
    state.scannerStream.getTracks().forEach(t => t.stop());
    state.scannerStream = null;
  }
  state.scanning = false;
}

async function startBarcodeDetection(video) {
  if (!('BarcodeDetector' in window)) {
    showToast('Auto-scan not supported. Use manual barcode entry.', '');
    return;
  }
  const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'] });
  state.scanning = true;
  const scan = async () => {
    if (!state.scanning) return;
    try {
      const codes = await detector.detect(video);
      if (codes.length > 0) {
        const barcode = codes[0].rawValue;
        await handleBarcodeScan(barcode);
        return;
      }
    } catch (e) {}
    if (state.scanning) requestAnimationFrame(scan);
  };
  requestAnimationFrame(scan);
}

async function handleBarcodeScan(barcode) {
  state.scanning = false;
  try {
    const item = await DB.getItemByBarcode(barcode);
    if (item) {
      showScanResult(item);
    } else {
      showScanNotFound(barcode);
    }
  } catch (e) {
    showToast('Error looking up barcode', 'error');
    state.scanning = true;
  }
}

function showScanResult(item) {
  const r = $('scan-result');
  r.innerHTML = `
    <div class="modal-handle"></div>
    <div class="scanner-result-name">${item.item_name}</div>
    <div class="scanner-result-barcode">Barcode: ${item.barcode}</div>
    <div class="scanner-price-row">
      <div class="scanner-price-box">
        <div class="label">USD</div>
        <div class="amount">${fmt.usd(item.price_usd)}</div>
      </div>
      <div class="scanner-price-box">
        <div class="label">Lebanese Pound</div>
        <div class="amount" style="font-size:18px">${fmt.lb(item.price_lb)}</div>
      </div>
    </div>
    <button class="btn-primary" onclick="resumeScan()">📷 Scan Another</button>
  `;
  r.classList.add('show');
}

function showScanNotFound(barcode) {
  const r = $('scan-result');
  r.innerHTML = `
    <div class="modal-handle"></div>
    <div class="scanner-not-found">❌ Product Not Found</div>
    <div class="scanner-result-barcode" style="text-align:center;margin-top:6px">Barcode: ${barcode}</div>
    <button class="btn-primary" onclick="resumeScan()" style="margin-top:20px">📷 Try Again</button>
  `;
  r.classList.add('show');
}

function hideResult() {
  $('scan-result').classList.remove('show');
}

function resumeScan() {
  hideResult();
  state.scanning = true;
  const video = $('scanner-video');
  if (video.srcObject) startBarcodeDetection(video);
}

function closeScannerScreen() {
  stopScanner();
  hideResult();
  showScreen('home');
}

// Manual barcode
$('manual-barcode-btn').addEventListener('click', async () => {
  const val = $('manual-barcode').value.trim();
  if (!val) return;
  await handleBarcodeScan(val);
});
$('manual-barcode').addEventListener('keydown', async e => {
  if (e.key === 'Enter') {
    const val = e.target.value.trim();
    if (val) await handleBarcodeScan(val);
  }
});

// --- Admin Login ---
$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const username = $('admin-username').value.trim();
  const password = $('admin-password').value;
  const btn = $('login-btn');
  const err = $('login-error');

  btn.disabled = true;
  btn.textContent = 'Logging in...';
  err.classList.remove('show');

  try {
    const admin = await DB.adminLogin(username, password);
    if (admin) {
      state.admin = admin;
      sessionStorage.setItem('admin', JSON.stringify(admin));
      showScreen('admin-dashboard');
      initAdminDashboard();
    } else {
      err.textContent = 'Invalid username or password';
      err.classList.add('show');
    }
  } catch (e2) {
    err.textContent = 'Connection error. Please try again.';
    err.classList.add('show');
  }
  btn.disabled = false;
  btn.textContent = 'Login';
});

// --- Admin Dashboard ---
async function initAdminDashboard() {
  // Load stats
  try {
    const [iCount, cCount] = await Promise.all([DB.getItemCount(), DB.getCategoryCount()]);
    $('stat-products').textContent = iCount.toLocaleString();
    $('stat-categories').textContent = cCount.toLocaleString();
  } catch (e) {}

  // Recent items
  try {
    const recent = await DB.getRecentItems(4);
    const ul = $('recent-updates');
    ul.innerHTML = '';
    if (!recent.length) {
      ul.innerHTML = '<div class="loading-spinner">No recent items</div>';
    } else {
      recent.forEach(item => {
        const d = document.createElement('div');
        d.className = 'recent-update-item';
        const time = new Date(item.created_at);
        const timeAgo = getTimeAgo(time);
        d.innerHTML = `
          <div class="update-dot"></div>
          <div>
            <div class="update-text">${item.item_name}</div>
            <div class="update-time">${timeAgo} • ${fmt.usd(item.price_usd)}</div>
          </div>
        `;
        ul.appendChild(d);
      });
    }
  } catch (e) {}

  // Exchange rate
  try {
    const rate = await DB.getExchangeRate();
    $('admin-rate-input').value = rate;
  } catch (e) {}
}

function getTimeAgo(date) {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function adminLogout() {
  state.admin = null;
  sessionStorage.removeItem('admin');
  showScreen('admin-login');
}

// --- Admin: Manage Items ---
async function openManageItems() {
  const overlay = $('items-modal');
  overlay.classList.add('show');
  const list = $('admin-items-list');
  list.innerHTML = `<div class="loading-spinner"><div class="spinner"></div> Loading items...</div>`;

  try {
    const items = await DB.getItems();
    const cats = state.categories.length ? state.categories : await DB.getCategories();
    state.categories = cats;
    list.innerHTML = '';
    if (!items.length) {
      list.innerHTML = `<div class="empty-state"><span class="empty-icon">📦</span><h3>No items yet</h3></div>`;
    } else {
      items.forEach(item => list.appendChild(createAdminItemRow(item)));
    }
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><h3>Failed to load</h3></div>';
  }
}

function createAdminItemRow(item) {
  const row = document.createElement('div');
  row.className = 'admin-item-row';
  const icon = getCategoryIcon(item.category_id);
  row.innerHTML = `
    <div class="admin-item-icon">${icon}</div>
    <div class="admin-item-info">
      <div class="admin-item-name">${item.item_name}</div>
      <div class="admin-item-barcode">${item.barcode}</div>
    </div>
    <div class="admin-item-price">
      ${fmt.usd(item.price_usd)}
      <span>${fmt.lb(item.price_lb)}</span>
    </div>
    <div class="action-btns">
      <button class="btn-edit" onclick="editItem(${item.id}, '${item.item_name.replace(/'/g,"\\'")}', '${item.barcode}', ${item.price_usd}, ${item.price_lb}, ${item.category_id || 'null'})">✏️</button>
      <button class="btn-delete" onclick="deleteItem(${item.id}, this)">🗑️</button>
    </div>
  `;
  return row;
}

async function deleteItem(id, btn) {
  if (!confirm('Delete this item?')) return;
  btn.disabled = true;
  try {
    await DB.deleteItem(id);
    btn.closest('.admin-item-row').remove();
    showToast('Item deleted', 'success');
    refreshStats();
  } catch (e) {
    showToast('Failed to delete', 'error');
    btn.disabled = false;
  }
}

function editItem(id, name, barcode, priceUsd, priceLb, catId) {
  state.editingItem = { id, name, barcode, price_usd: priceUsd, price_lb: priceLb, category_id: catId };
  openAddItemModal(true);
}

// --- Admin: Add/Edit Item Modal ---
function openAddItemModal(editing = false) {
  const overlay = $('add-item-modal');
  overlay.classList.add('show');
  $('add-item-title').textContent = editing ? 'Edit Item' : 'Add New Item';

  // Populate category select
  const catSel = $('item-category');
  catSel.innerHTML = '<option value="">-- No Category --</option>';
  state.categories.forEach(c => {
    catSel.innerHTML += `<option value="${c.id}" ${state.editingItem?.category_id == c.id ? 'selected' : ''}>${c.icon} ${c.name}</option>`;
  });

  if (editing && state.editingItem) {
    $('item-name').value = state.editingItem.name;
    $('item-barcode').value = state.editingItem.barcode;
    $('item-price-usd').value = state.editingItem.price_usd;
    $('item-price-lb').value = state.editingItem.price_lb;
  } else {
    $('item-name').value = '';
    $('item-barcode').value = '';
    $('item-price-usd').value = '';
    $('item-price-lb').value = '';
  }

  // Auto-calculate LBP from USD
  $('item-price-usd').oninput = () => {
    const usd = parseFloat($('item-price-usd').value);
    if (!isNaN(usd)) $('item-price-lb').value = Math.round(usd * state.exchangeRate);
  };
}

$('add-item-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('save-item-btn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  const item = {
    item_name: $('item-name').value.trim(),
    barcode: $('item-barcode').value.trim(),
    price_usd: parseFloat($('item-price-usd').value),
    price_lb: parseInt($('item-price-lb').value),
    category_id: $('item-category').value || null
  };

  try {
    if (state.editingItem) {
      await DB.updateItem(state.editingItem.id, item);
      showToast('Item updated!', 'success');
    } else {
      await DB.addItem(item);
      showToast('Item added!', 'success');
    }
    closeModal('add-item-modal');
    state.editingItem = null;
    if (document.getElementById('items-modal').classList.contains('show')) {
      openManageItems();
    }
    refreshStats();
  } catch (err) {
    showToast(err.message || 'Failed to save item', 'error');
  }
  btn.disabled = false;
  btn.textContent = 'Save Item';
});

// --- Admin: Manage Categories ---
async function openManageCategories() {
  const overlay = $('categories-modal');
  overlay.classList.add('show');
  loadAdminCategories();
}

async function loadAdminCategories() {
  const list = $('admin-categories-list');
  list.innerHTML = `<div class="loading-spinner"><div class="spinner"></div></div>`;
  try {
    const cats = await DB.getCategories();
    state.categories = cats;
    list.innerHTML = '';
    cats.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'admin-item-row';
      row.innerHTML = `
        <div class="admin-item-icon">${cat.icon}</div>
        <div class="admin-item-info" style="flex:1">
          <div class="admin-item-name">${cat.name}</div>
        </div>
        <button class="btn-delete" onclick="deleteCategory(${cat.id}, this)">🗑️</button>
      `;
      list.appendChild(row);
    });
  } catch (e) {
    list.innerHTML = '<div class="empty-state"><span class="empty-icon">⚠️</span><h3>Failed to load</h3></div>';
  }
}

async function addCategory() {
  const name = $('new-cat-name').value.trim();
  const icon = $('new-cat-icon').value.trim() || '🛒';
  if (!name) { showToast('Enter a category name', 'error'); return; }

  const btn = $('add-cat-btn');
  btn.disabled = true;
  try {
    await DB.addCategory(name, icon);
    $('new-cat-name').value = '';
    $('new-cat-icon').value = '';
    showToast('Category added!', 'success');
    loadAdminCategories();
    renderCategories();
    refreshStats();
  } catch (err) {
    showToast(err.message || 'Failed to add category', 'error');
  }
  btn.disabled = false;
}

async function deleteCategory(id, btn) {
  if (!confirm('Delete this category? Items will be uncategorized.')) return;
  btn.disabled = true;
  try {
    await DB.deleteCategory(id);
    btn.closest('.admin-item-row').remove();
    showToast('Category deleted', 'success');
    renderCategories();
    refreshStats();
  } catch (e) {
    showToast('Failed to delete', 'error');
    btn.disabled = false;
  }
}

// --- Admin: Exchange Rate ---
async function saveExchangeRate() {
  const rate = parseFloat($('admin-rate-input').value);
  if (isNaN(rate) || rate <= 0) { showToast('Invalid rate', 'error'); return; }
  try {
    await DB.updateExchangeRate(rate);
    state.exchangeRate = rate;
    updateRateBar();
    showToast('Exchange rate updated!', 'success');
  } catch (e) {
    showToast('Failed to update rate', 'error');
  }
}

// --- Refresh Stats ---
async function refreshStats() {
  try {
    const [iCount, cCount] = await Promise.all([DB.getItemCount(), DB.getCategoryCount()]);
    $('stat-products').textContent = iCount.toLocaleString();
    $('stat-categories').textContent = cCount.toLocaleString();
  } catch (e) {}
}

// --- Modal Controls ---
function closeModal(id) {
  $(id).classList.remove('show');
  if (id === 'add-item-modal') { state.editingItem = null; }
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
});

// --- Bottom Navigation ---
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.screen;
    if (!target) return;
    if (target === 'scanner-screen') {
      startScanner();
    } else if (target === 'admin-login') {
      const savedAdmin = sessionStorage.getItem('admin');
      if (savedAdmin) {
        state.admin = JSON.parse(savedAdmin);
        showScreen('admin-dashboard');
        initAdminDashboard();
      } else {
        showScreen('admin-login');
      }
    } else if (target === 'home') {
      stopScanner();
      showScreen('home');
    }
  });
});

// --- Install PWA ---
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  $('install-btn').style.display = 'flex';
});

$('install-btn').addEventListener('click', async () => {
  if (!deferredPrompt) {
    showToast('Already installed or not supported', '');
    return;
  }
  deferredPrompt.prompt();
  const result = await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('install-btn').style.display = 'none';
  if (result.outcome === 'accepted') showToast('App installed!', 'success');
});

// --- Service Worker ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// --- Init ---
window.addEventListener('DOMContentLoaded', () => {
  showScreen('splash');
  initSplash();
});

// Expose functions for inline onclick
window.startScanner = startScanner;
window.closeScannerScreen = closeScannerScreen;
window.resumeScan = resumeScan;
window.adminLogout = adminLogout;
window.openManageItems = openManageItems;
window.openAddItemModal = openAddItemModal;
window.openManageCategories = openManageCategories;
window.addCategory = addCategory;
window.deleteCategory = deleteCategory;
window.deleteItem = deleteItem;
window.editItem = editItem;
window.saveExchangeRate = saveExchangeRate;
window.closeModal = closeModal;
