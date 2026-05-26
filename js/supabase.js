// =============================================
// Supabase Configuration - AL SAYYAH Market
// =============================================
const SUPABASE_URL = 'https://qgkyjzvdavkbaueygoby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFna3lqenZkYXZrYmF1ZXlnb2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2MjYwNTEsImV4cCI6MjA5NTIwMjA1MX0.7ZDKyeDiKipGS5BGU4kI6deGbKx-1EWVV2WmSAiaN7o';
const API_URL = 'https://qgkyjzvdavkbaueygoby.supabase.co/rest/v1';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// =============================================
// Database API Functions
// =============================================
const DB = {
  // --- Categories ---
  async getCategories() {
    const res = await fetch(`${API_URL}/categories?order=id.asc`, { headers });
    if (!res.ok) throw new Error('Failed to fetch categories');
    return res.json();
  },

  async addCategory(name, icon = '🛒') {
    const res = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name, icon })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to add category');
    }
    return res.json();
  },

  async deleteCategory(id) {
    const res = await fetch(`${API_URL}/categories?id=eq.${id}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error('Failed to delete category');
    return true;
  },

  // --- Items ---
  async getItems(categoryId = null, search = '') {
    let url = `${API_URL}/items?order=item_name.asc`;
    if (categoryId) url += `&category_id=eq.${categoryId}`;
    if (search) url += `&item_name=ilike.*${encodeURIComponent(search)}*`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error('Failed to fetch items');
    return res.json();
  },

  async getItemByBarcode(barcode) {
    const res = await fetch(`${API_URL}/items?barcode=eq.${encodeURIComponent(barcode)}&limit=1`, { headers });
    if (!res.ok) throw new Error('Failed to fetch item');
    const data = await res.json();
    return data[0] || null;
  },

  async addItem(item) {
    const res = await fetch(`${API_URL}/items`, {
      method: 'POST',
      headers,
      body: JSON.stringify(item)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to add item');
    }
    return res.json();
  },

  async updateItem(id, updates) {
    const res = await fetch(`${API_URL}/items?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update item');
    return res.json();
  },

  async deleteItem(id) {
    const res = await fetch(`${API_URL}/items?id=eq.${id}`, {
      method: 'DELETE',
      headers
    });
    if (!res.ok) throw new Error('Failed to delete item');
    return true;
  },

  async getItemCount() {
    const res = await fetch(`${API_URL}/items?select=id`, {
      headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' }
    });
    return parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
  },

  async getCategoryCount() {
    const res = await fetch(`${API_URL}/categories?select=id`, {
      headers: { ...headers, 'Prefer': 'count=exact', 'Range': '0-0' }
    });
    return parseInt(res.headers.get('content-range')?.split('/')[1] || '0');
  },

  // --- Settings ---
  async getExchangeRate() {
    const res = await fetch(`${API_URL}/system_settings?key=eq.usd_to_lb_rate`, { headers });
    if (!res.ok) return 90000;
    const data = await res.json();
    return parseFloat(data[0]?.value || '90000');
  },

  async updateExchangeRate(rate) {
    const res = await fetch(`${API_URL}/system_settings?key=eq.usd_to_lb_rate`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ value: rate.toString(), updated_at: new Date().toISOString() })
    });
    if (!res.ok) throw new Error('Failed to update rate');
    return true;
  },

  // --- Admin Auth ---
  async adminLogin(username, password) {
    const res = await fetch(`${API_URL}/store_admins?username=eq.${encodeURIComponent(username)}&password_hash=eq.${encodeURIComponent(password)}&limit=1`, { headers });
    if (!res.ok) throw new Error('Auth failed');
    const data = await res.json();
    return data.length > 0 ? data[0] : null;
  },

  // --- Recent Updates (using items with created_at) ---
  async getRecentItems(limit = 5) {
    const res = await fetch(`${API_URL}/items?order=created_at.desc&limit=${limit}`, { headers });
    if (!res.ok) return [];
    return res.json();
  }
};

// Export
window.DB = DB;
