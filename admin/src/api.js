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
