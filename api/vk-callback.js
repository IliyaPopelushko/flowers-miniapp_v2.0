// ============================================
// POST /api/vk-callback — VK Callback API
// Принимает события от VK (сообщения и т.д.)
// ============================================

const { supabase } = require('../lib/supabase');
const { sendMessage, isAdmin } = require('../lib/vk');

const VK_GROUP_ID = process.env.VK_GROUP_ID || '136756716';
const VK_CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE;

module.exports = async function handler(req, res) {
  // VK отправляет только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, group_id, object, secret } = req.body;

    // Проверяем group_id
    if (String(group_id) !== String(VK_GROUP_ID)) {
      console.error('Wrong group_id:', group_id);
      return res.status(400).send('Wrong group');
    }

    // Обработка типов событий
    switch (type) {
      // Подтверждение сервера для VK
      case 'confirmation':
        if (!VK_CONFIRMATION_CODE) {
          console.error('VK_CONFIRMATION_CODE not set');
          return res.status(500).send('Confirmation code not configured');
        }
        return res.status(200).send(VK_CONFIRMATION_CODE);

      // Новое сообщение
      case 'message_new':
        await handleNewMessage(object.message);
        return res.status(200).send('ok');

      // Разрешение на сообщения
      case 'message_allow':
        await handleMessageAllow(object.user_id);
        return res.status(200).send('ok');

      // Запрет сообщений
      case 'message_deny':
        await handleMessageDeny(object.user_id);
        return res.status(200).send('ok');

      default:
        // Для всех остальных событий просто отвечаем ok
        return res.status(200).send('ok');
    }

  } catch (error) {
    console.error('VK Callback error:', error);
    // VK требует ответ 'ok' даже при ошибке, иначе будет слать повторно
    return res.status(200).send('ok');
  }
};

/**
 * Обработка нового сообщения
 */
async function handleNewMessage(message) {
  const userId = message.from_id;
  const text = message.text?.toLowerCase().trim();
  const payload = message.payload ? JSON.parse(message.payload) : null;

  console.log(`📩 Новое сообщение от ${userId}: ${text}`);

  // Обработка payload от кнопок
  if (payload) {
    await handlePayload(userId, payload);
    return;
  }

  // Простые текстовые команды
  if (text === 'начать' || text === 'start' || text === 'привет') {
    await sendWelcomeMessage(userId);
    return;
  }

  if (text === 'помощь' || text === 'help') {
    await sendHelpMessage(userId);
    return;
  }

  // По умолчанию — приветствие
  await sendDefaultMessage(userId);
}

/**
 * Пользователь разрешил сообщения
 */
async function handleMessageAllow(userId) {
  console.log(`✅ Пользователь ${userId} разрешил сообщения`);
  
  await supabase
    .from('users')
    .update({ messages_allowed: true })
    .eq('vk_user_id', userId);
}

/**
 * Пользователь запретил сообщения
 */
async function handleMessageDeny(userId) {
  console.log(`❌ Пользователь ${userId} запретил сообщения`);
  
  await supabase
    .from('users')
    .update({ messages_allowed: false })
    .eq('vk_user_id', userId);
}

/**
 * Обработка payload от кнопок
 */
async function handlePayload(userId, payload) {
  const { action, bouquet_id, event_id } = payload;

  switch (action) {
    case 'select_bouquet':
      // TODO: Обработка выбора букета (Фаза MVP)
      await sendMessage(userId, '💐 Вы выбрали букет! Функция оформления предзаказа скоро будет доступна.');
      break;

    case 'remind_later':
      await sendMessage(userId, '👌 Хорошо, напомним позже!');
      break;

    default:
      console.log('Unknown payload action:', action);
  }
}

/**
 * Приветственное сообщение
 */
async function sendWelcomeMessage(userId) {
  const message = `Привет! 🌸

Я бот цветочного магазина "Цветы в лесопарке".

Я помогу тебе не забыть о важных датах и вовремя заказать цветы для близких!

Чтобы добавить памятные даты, открой наше мини-приложение в группе.

📍 Мы находимся: посёлок Лесопарк 30
🕐 Работаем: с 8:00 до 21:00
📞 Телефон: +7 912 797 1348`;

  await sendMessage(userId, message);
}

/**
 * Сообщение помощи
 */
async function sendHelpMessage(userId) {
  const message = `❓ Чем я могу помочь?

🌷 Добавить памятные даты — открой мини-приложение в нашей группе

🔔 Я буду напоминать тебе за 7, 3 и 1 день до события

💐 Можешь оформить предзаказ прямо в сообщениях

📍 Адрес: посёлок Лесопарк 30
🕐 Время работы: с 8:00 до 21:00
📞 Телефон: +7 912 797 1348`;

  await sendMessage(userId, message);
}

/**
 * Сообщение по умолчанию
 */
async function sendDefaultMessage(userId) {
  const message = `Привет! 👋

Напиши "помощь" чтобы узнать что я умею, или открой наше мини-приложение в группе, чтобы добавить памятные даты.

💐 Магазин "Цветы в лесопарке"`;

  await sendMessage(userId, message);
}
