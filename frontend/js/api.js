const API_BASE = 'http://localhost:3002/api';

// --- NEW: LocalStorage Mock Data for Demo ---
if (!localStorage.getItem('mandi_crops')) {
  localStorage.setItem('mandi_crops', JSON.stringify([]));
}
// --------------------------------------------

const api = {
  baseUrl: API_BASE,
  
  // Crops
  async getCrops(cropName = '') {
    let remoteCrops = [];
    try {
      const url = cropName ? `${API_BASE}/crops?crop_name=${encodeURIComponent(cropName)}` : `${API_BASE}/crops`;
      const res = await fetch(url).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => ({}));
        remoteCrops = json.data || [];
      }
    } catch (e) {}
    
    let localCrops = JSON.parse(localStorage.getItem('mandi_crops')) || [];
    if (cropName) {
      localCrops = localCrops.filter(c => c.crop_name.toLowerCase().includes(cropName.toLowerCase()));
    }

    const merged = new Map();
    localCrops.forEach(c => merged.set(c.id, c));
    remoteCrops.forEach(c => merged.set(c.id, c));

    const finalData = Array.from(merged.values()).filter(c => c.is_available);
    return { success: true, data: finalData };
  },

  async getCropsByFarmer(farmerId) {
    let remoteCrops = [];
    try {
      const res = await fetch(`${API_BASE}/crops/farmer/${farmerId}`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json().catch(() => ({}));
        remoteCrops = json.data || [];
      }
    } catch (e) {}
    
    const localCrops = (JSON.parse(localStorage.getItem('mandi_crops')) || [])
                        .filter(c => c.farmer_id === farmerId);

    const merged = new Map();
    localCrops.forEach(c => merged.set(c.id, c));
    remoteCrops.forEach(c => merged.set(c.id, c));

    return { success: true, data: Array.from(merged.values()) };
  },

  async addCrop(cropData) {
    // 1. Save to LocalStorage first
    const crops = JSON.parse(localStorage.getItem('mandi_crops')) || [];
    const newCrop = { 
        ...cropData, 
        id: 'local_' + Date.now(), 
        created_at: new Date().toISOString(),
        is_available: true 
    };
    crops.push(newCrop);
    localStorage.setItem('mandi_crops', JSON.stringify(crops));

    try {
      const res = await fetch(`${API_BASE}/crops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cropData)
      }).catch(() => null);
      
      if (res && res.ok) return await res.json().catch(() => ({ success: true, data: newCrop }));
    } catch (e) {}
    
    return { success: true, data: newCrop };
  },

  async updateCrop(id, data) {
    let crops = JSON.parse(localStorage.getItem('mandi_crops')) || [];
    const index = crops.findIndex(c => c.id === id);
    if (index !== -1) {
      crops[index] = { ...crops[index], ...data };
      localStorage.setItem('mandi_crops', JSON.stringify(crops));
    }

    try {
      const res = await fetch(`${API_BASE}/crops/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(() => null);
      if (res && res.ok) return await res.json().catch(() => ({ success: true }));
    } catch (e) {}
    
    return { success: true };
  },

  async deleteCrop(id) {
    let crops = JSON.parse(localStorage.getItem('mandi_crops')) || [];
    crops = crops.filter(c => c.id !== id);
    localStorage.setItem('mandi_crops', JSON.stringify(crops));

    try {
      const res = await fetch(`${API_BASE}/crops/${id}`, {
        method: 'DELETE'
      }).catch(() => null);
      if (res && res.ok) return await res.json().catch(() => ({ success: true }));
    } catch (e) {}
    
    return { success: true };
  },

  // Orders
  async getOrdersByFarmer(farmerId) {
    try {
      const res = await fetch(`${API_BASE}/orders/farmer/${farmerId}`).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: true, data: [] };
  },

  async getOrdersByRetailer(retailerId) {
    try {
      const res = await fetch(`${API_BASE}/orders/retailer/${retailerId}`).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: true, data: [] };
  },

  async getOrder(orderId) {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}`).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: false, error: 'Order not found' };
  },

  async placeOrder(orderData) {
    let crops = JSON.parse(localStorage.getItem('mandi_crops')) || [];
    const cropIndex = crops.findIndex(c => c.id === orderData.crop_id);
    if (cropIndex !== -1) {
        crops[cropIndex].quantity_kg -= orderData.quantity_kg;
        if (crops[cropIndex].quantity_kg <= 0) {
            crops[cropIndex].quantity_kg = 0;
            crops[cropIndex].is_available = false;
        }
        localStorage.setItem('mandi_crops', JSON.stringify(crops));
    }

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      }).catch(() => null);
      if (res && res.ok) return await res.json().catch(() => ({ success: true, data: { ...orderData, id: 'order_' + Date.now(), total_amount: orderData.quantity_kg * orderData.price_per_kg } }));
    } catch (e) {}
    
    return { success: true, data: { ...orderData, id: 'order_' + Date.now(), total_amount: orderData.quantity_kg * orderData.price_per_kg } };
  },

  async updateOrder(orderId, updates) {
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).catch(() => null);
      if (res && res.ok) return await res.json().catch(() => ({ success: false }));
    } catch (e) {}
    return { success: true };
  },

  async getPaymentDetails(orderId) {
    try {
      const res = await fetch(`${API_BASE}/payments/upi/${orderId}`).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: false, error: 'Payment service unavailable' };
  },

  async confirmPayment(orderId, transactionId) {
    try {
      const res = await fetch(`${API_BASE}/payments/confirm/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      }).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: true }; // Mock success for demo
  },

  async getPrediction(crop) {
    try {
      const res = await fetch(`${API_BASE}/ai/predict?crop=${encodeURIComponent(crop)}`).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: true, prediction: 25.5, trend: 'stable', forecast: [] }; // Mock
  },

  async getRescueListings() {
    try {
      const res = await fetch(`${API_BASE}/rescue`).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: true, data: [] };
  },

  async getRescueByFarmer(farmerId) {
    try {
      const res = await fetch(`${API_BASE}/rescue/farmer/${farmerId}`).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: true, data: [] };
  },

  async createRescueListing(data) {
    try {
      const res = await fetch(`${API_BASE}/rescue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: true, data: data };
  },

  async raithaMithraChat(message, lang = 'en') {
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, lang })
      }).catch(() => null);
      if (res && res.ok) return await res.json();
    } catch (e) {}
    return { success: true, reply: "I'm working in offline mode. How can I help you today?" };
  }
};

// Online/Offline detector
function setupConnectivityMonitor(onOnline, onOffline) {
  const banner = document.getElementById('offline-banner');

  function handleOnline() {
    if (banner) banner.classList.remove('show');
    document.body.classList.remove('offline-mode');
    if (onOnline) onOnline();
  }

  function handleOffline() {
    if (banner) banner.classList.add('show');
    document.body.classList.add('offline-mode');
    if (onOffline) onOffline();
  }

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  if (!navigator.onLine) handleOffline();
}

// Service Worker registration
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('[SW] Registered:', reg.scope);
        return reg;
      })
      .catch(err => console.error('[SW] Registration failed:', err));
  }
}

// Format helpers
function formatCurrency(amount) {
  return `₹${Number(amount).toFixed(2)}`;
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return 'just now';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs/24)}d ago`;
}

function showAlert(msg, type = 'error') {
  const existing = document.querySelector('.alert-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = `alert alert-${type} alert-toast`;
  el.style.cssText = 'position:fixed;top:16px;right:16px;left:16px;z-index:999;max-width:420px;margin:0 auto;';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function getStatusBadge(status) {
  return `<span class="badge badge-${status}">${status.replace('_', ' ')}</span>`;
}
