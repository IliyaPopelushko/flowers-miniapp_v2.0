// ============================================
// API клиент для админ-панели
// ============================================

// URL API на Vercel (замени на свой домен!)
const API_URL = 'https://flowers-miniapp-v2-0.vercel.app/api';

function getToken() {
  return localStorage.getItem('admin_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Ошибка сервера' }));
    throw new Error(error.error || 'Ошибка запроса');
  }
  
  return res.json();
}

// ============================================
// Объект api для совместимости с существующим кодом
// ============================================

export const api = {
  // События
  getEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin-events?${query}`);
  },
  
  // Предзаказы
  getPreorders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin-preorders?${query}`);
  },
  updatePreorderStatus: (id, status) => 
    request(`/admin-preorders`, {
      method: 'PATCH',
      body: JSON.stringify({ id, status })
    }),
  
  // Настройки
  getSettings: () => request('/admin-settings'),
  updateSettings: (data) => 
    request('/admin-settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  // Товары VK
  getVkProducts: () => request('/admin-products')
};

// ============================================
// Отдельные экспорты для новых компонентов
// ============================================

// Получить товары из ВК
export async function getProducts() {
  return request('/admin-products');
}

// Получить настройки
export async function getSettings() {
  return request('/admin-settings');
}

// Сохранить настройки
export async function updateSettings(settings) {
  return request('/admin-settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
}
