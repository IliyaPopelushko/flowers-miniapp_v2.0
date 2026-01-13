// ============================================
// УТИЛИТЫ ДЛЯ РАБОТЫ С VK API
// ============================================

const crypto = require('crypto');

/**
 * Проверяет подпись VK Mini App
 * Документация: https://dev.vk.com/mini-apps/development/launch-params-sign
 */
function verifyVKSignature(searchParams) {
  const VK_SECRET_KEY = process.env.VK_SECRET_KEY;
  
  if (!VK_SECRET_KEY) {
    console.error('❌ VK_SECRET_KEY не установлен');
    return false;
  }

  // Получаем параметры, начинающиеся с 'vk_'
  const vkParams = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (key.startsWith('vk_')) {
      vkParams[key] = value;
    }
  }

  // Получаем sign из параметров
  const sign = searchParams.sign;
  if (!sign) {
    console.error('❌ Отсутствует параметр sign');
    return false;
  }

  // Сортируем параметры и создаём строку
  const sortedKeys = Object.keys(vkParams).sort();
  const queryString = sortedKeys
    .map(key => `${key}=${encodeURIComponent(vkParams[key])}`)
    .join('&');

  // Вычисляем подпись
  const hmac = crypto.createHmac('sha256', VK_SECRET_KEY);
  hmac.update(queryString);
  const expectedSign = hmac.digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=$/, '');

  const isValid = expectedSign === sign;
  
  if (!isValid) {
    console.error('❌ Неверная подпись VK');
    console.error('Ожидалось:', expectedSign);
    console.error('Получено:', sign);
  }

  return isValid;
}

/**
 * Извлекает VK User ID из параметров запуска
 */
function extractVkUserId(searchParams) {
  return parseInt(searchParams.vk_user_id, 10) || null;
}

/**
 * Проверяет, является ли пользователь администратором
 */
function isAdmin(vkUserId) {
  const adminIds = [518565944, 123456789];
  return adminIds.includes(vkUserId);
}

/**
 * Отправляет сообщение пользователю в ЛС от имени группы
 */
async function sendMessage(userId, message, keyboard = null) {
  const VK_API_TOKEN = process.env.VK_API_TOKEN;
  
  if (!VK_API_TOKEN) {
    console.error('❌ VK_API_TOKEN не установлен');
    return { success: false, error: 'Token not configured' };
  }

  const params = new URLSearchParams({
    user_id: userId,
    message: message,
    random_id: Date.now(),
    access_token: VK_API_TOKEN,
    v: '5.131'
  });

  if (keyboard) {
    params.append('keyboard', JSON.stringify(keyboard));
  }

  try {
    const response = await fetch(
      `https://api.vk.com/method/messages.send?${params}`
    );
    const data = await response.json();

    if (data.error) {
      console.error('❌ Ошибка VK API:', data.error);
      return { success: false, error: data.error };
    }

    return { success: true, messageId: data.response };
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  verifyVKSignature,
  extractVkUserId,
  isAdmin,
  sendMessage
};
