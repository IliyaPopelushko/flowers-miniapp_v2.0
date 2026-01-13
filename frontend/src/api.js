// ============================================
// API для работы с бэкендом
// ============================================

import vkBridge from '@vkontakte/vk-bridge'

// URL вашего API на Vercel
const API_URL = import.meta.env.VITE_API_URL || 'https://flowers-miniapp-v2-0.vercel.app/api'

// Получаем параметры запуска VK
let launchParams = null

export async function initApi() {
  try {
    // Получаем параметры запуска из URL
    const searchParams = new URLSearchParams(window.location.search)
    launchParams = Object.fromEntries(searchParams.entries())
    
    console.log('Launch params:', launchParams)
    return launchParams
  } catch (error) {
    console.error('Init API error:', error)
    return null
  }
}

// Получаем данные пользователя VK
export async function getVkUser() {
  try {
    const user = await vkBridge.send('VKWebAppGetUserInfo')
    return user
  } catch (error) {
    console.error('Get VK user error:', error)
    return null
  }
}

// Базовая функция запроса
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  }
  
  // Передаём параметры VK в заголовке
  if (launchParams) {
    headers['X-VK-Params'] = JSON.stringify(launchParams)
  }

  const options = {
    method,
    headers,
  }

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body)
  }

  // Добавляем параметры VK в URL для GET запросов
  let url = `${API_URL}${endpoint}`
  if (method === 'GET' && launchParams) {
    const params = new URLSearchParams(launchParams)
    url += `?${params.toString()}`
  }

  const response = await fetch(url, options)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }

  return data
}

// ============================================
// API методы
// ============================================

// Получить/создать пользователя
export async function getUser() {
  return apiRequest('/user', 'GET')
}

export async function saveUser(userData) {
  return apiRequest('/user', 'POST', userData)
}

// События
export async function getEvents() {
  return apiRequest('/events', 'GET')
}

export async function createEvent(eventData) {
  return apiRequest('/events', 'POST', eventData)
}

export async function updateEvent(id, eventData) {
  return apiRequest(`/events/${id}`, 'PUT', eventData)
}

export async function deleteEvent(id) {
  return apiRequest(`/events/${id}`, 'DELETE')
}

// Проверка разрешения на сообщения
export async function checkMessagesAllowed() {
  try {
    const result = await vkBridge.send('VKWebAppAllowMessagesFromGroup', {
      group_id: 136756716
    })
    return result.result
  } catch (error) {
    console.error('Check messages error:', error)
    return false
  }
}
