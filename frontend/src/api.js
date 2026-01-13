// ============================================
// API для работы с бэкендом
// ============================================

import vkBridge from '@vkontakte/vk-bridge'

// URL вашего API на Vercel
const API_URL = 'https://flowers-miniapp-v2-0.vercel.app/api'

// Получаем параметры запуска VK
let launchParams = null
let isVkEnvironment = false

export async function initApi() {
  try {
    // Проверяем, запущены ли мы внутри VK
    const searchParams = new URLSearchParams(window.location.search)
    launchParams = Object.fromEntries(searchParams.entries())
    
    // Если есть vk_user_id — мы внутри VK
    isVkEnvironment = !!launchParams.vk_user_id
    
    console.log('Launch params:', launchParams)
    console.log('Is VK environment:', isVkEnvironment)
    
    return launchParams
  } catch (error) {
    console.error('Init API error:', error)
    return null
  }
}

// Проверяем, работаем ли мы в VK
export function isInVk() {
  return isVkEnvironment
}

// Получаем данные пользователя VK
export async function getVkUser() {
  try {
    const user = await vkBridge.send('VKWebAppGetUserInfo')
    return user
  } catch (error) {
    console.warn('Get VK user error:', error)
    return null
  }
}

// Базовая функция запроса с таймаутом
async function apiRequest(endpoint, method = 'GET', body = null) {
  // Если мы не в VK — возвращаем мок-данные
  if (!isVkEnvironment) {
    console.log(`[MOCK] API request: ${method} ${endpoint}`)
    return getMockResponse(endpoint, method, body)
  }

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

  // Добавляем таймаут 10 секунд
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  options.signal = controller.signal

  try {
    const response = await fetch(url, options)
    clearTimeout(timeoutId)
    
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'API request failed')
    }

    return data
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new Error('Превышено время ожидания ответа от сервера')
    }
    throw error
  }
}

// Мок-ответы для тестирования вне VK
function getMockResponse(endpoint, method, body) {
  // GET /user
  if (endpoint === '/user' && method === 'GET') {
    return { user: null, isNewUser: true }
  }
  
  // POST /user
  if (endpoint === '/user' && method === 'POST') {
    return { user: { id: 'mock-1', ...body } }
  }
  
  // GET /events
  if (endpoint === '/events' && method === 'GET') {
    return { 
      events: [
        {
          id: 'demo-1',
          event_type: 'birthday',
          event_day: 15,
          event_month: 6,
          recipient_name: 'Мама',
          notifications_enabled: true,
          comment: 'Не забыть про торт!'
        },
        {
          id: 'demo-2',
          event_type: 'wedding_anniversary',
          event_day: 20,
          event_month: 8,
          recipient_name: 'Родители',
          notifications_enabled: true,
          comment: ''
        }
      ],
      count: 2 
    }
  }
  
  // POST /events
  if (endpoint === '/events' && method === 'POST') {
    return { 
      event: { 
        id: 'new-' + Date.now(), 
        ...body 
      } 
    }
  }
  
  // PUT /events/:id
  if (endpoint.startsWith('/events/') && method === 'PUT') {
    return { event: { id: endpoint.split('/')[2], ...body } }
  }
  
  // DELETE /events/:id
  if (endpoint.startsWith('/events/') && method === 'DELETE') {
    return { success: true }
  }
  
  return {}
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
  if (!isVkEnvironment) {
    console.log('[MOCK] Messages allowed: true')
    return true
  }
  
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
