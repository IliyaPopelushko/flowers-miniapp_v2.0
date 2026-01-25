const API_BASE = '/api/admin';

function getToken() {
  return localStorage.getItem('admin_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${endpoint}`, {
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

export const api = {
  // События
  getEvents: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/events?${query}`);
  },
  
  // Предзаказы
  getPreorders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/preorders?${query}`);
  },
  updatePreorderStatus: (id, status) => 
    request(`/preorders`, {
      method: 'PATCH',
      body: JSON.stringify({ id, status })
    }),
  
  // Настройки
  getSettings: () => request('/settings'),
  updateSettings: (data) => 
    request('/settings', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  // Товары VK
  getVkProducts: () => request('/settings?action=vk_products')
};
// Получить товары из ВК
export async function getProducts() {
  const response = await fetch(`${API_URL}/admin-products`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }
  
  return response.json();
}

// Получить настройки
export async function getSettings() {
  const response = await fetch(`${API_URL}/admin-settings`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  
  return response.json();
}

// Сохранить настройки
export async function updateSettings(settings) {
  const response = await fetch(`${API_URL}/admin-settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify(settings)
  });
  
  if (!response.ok) {
    throw new Error('Failed to update settings');
  }
  
  return response.json();
}
