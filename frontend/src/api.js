// ============================================
// API для работы с бэкендом
// ============================================

import vkBridge from '@vkontakte/vk-bridge'

// URL вашего API на Vercel
const API_URL = 'https://flowers-miniapp-v2-0.vercel.app/api'

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

// Базовая функция запроса
async function apiRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  }
  
  // Передаём VK параметры в заголовке
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

  try {
    console.log(`API Request: ${method} ${url}`)
    const response = await fetch(url, options)
    
    const data = await response.json()

    if (!response.ok) {
      console.error('API Error:', data)
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    console.log('API Success:', data)
    return data
  } catch (error) {
    console.error('Fetch failed:', error)
    throw new Error(error.message || 'Ошибка сети')
  }
}

// ============================================
// API методы
// ============================================

export async function getUser() {
  return apiRequest('/user', 'GET')
}

export async function saveUser(userData) {
  return apiRequest('/user', 'POST', userData)
}

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
