// ============================================
// POST /api/vk-callback — VK Callback API
// ============================================

import { supabase } from '../lib/supabase.js';
import { sendMessage, isAdmin } from '../lib/vk.js';

const VK_GROUP_ID = process.env.VK_GROUP_ID || '136756716';
const VK_CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE;
const ADMIN_IDS = [518565944, 123456789];

// Букеты
const BOUQUETS = {
  economy: { id: 'economy', name: 'Нежность', price: 1500 },
  medium: { id: 'medium', name: 'Элегантность', price: 2500 },
  premium: { id: 'premium', name: 'Роскошь', price: 4000 }
};

// Состояния диалогов пользователей
const userStates = {};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, group_id, object } = req.body;

    if (String(group_id) !== String(VK_GROUP_ID)) {
      return res.status(400).send('Wrong group');
    }

    switch (type) {
      case 'confirmation':
        return res.status(200).send(VK_CONFIRMATION_CODE);

      case 'message_new':
        await handleNewMessage(object.message);
        return res.status(200).send('ok');

      case 'message_allow':
        await handleMessageAllow(object.user_id);
        return res.status(200).send('ok');

      case 'message_deny':
        await handleMessageDeny(object.user_id);
        return res.status(200).send('ok');

      default:
        return res.status(200).send('ok');
    }

  } catch (error) {
    console.error('VK Callback error:', error);
    return res.status(200).send('ok');
  }
}

async function handleNewMessage(message) {
  const userId = message.from_id;
  const text = message.text?.toLowerCase().trim();
  const payload = message.payload ? JSON.parse(message.payload) : null;

  console.log(`📩 Message from ${userId}: ${text || '[payload]'}`);

  // Обработка payload от кнопок
  if (payload) {
    await handlePayload(userId, payload, message);
    return;
  }

  // Проверяем состояние диалога
  const state = userStates[userId];
  if (state) {
    await handleDialogState(userId, text, message);
    return;
  }

  // Текстовые команды
  if (text === 'начать' || text === 'start' || text === 'привет') {
    await sendWelcomeMessage(userId);
    return;
  }

  if (text === 'помощь' || text === 'help') {
    await sendHelpMessage(userId);
    return;
  }

  // Новая команда - показать события для заказа
  if (text === 'заказ' || text === 'заказать' || text === 'мои события' || text === 'события') {
    await showEventsForOrder(userId);
    return;
  }

  // Выбор события по номеру (например: "1", "2", "3")
  if (/^[1-9]$/.test(text)) {
    await handleEventNumberSelection(userId, parseInt(text));
    return;
  }

  await sendDefaultMessage(userId);
}

async function handlePayload(userId, payload, message) {
  const { action, bouquet_id, event_id } = payload;

  switch (action) {
    case 'select_bouquet':
      await handleBouquetSelection(userId, bouquet_id, event_id);
      break;

    case 'delivery_self':
      await handleSelfPickup(userId);
      break;

    case 'delivery_delivery':
      await handleDeliveryStart(userId);
      break;

    case 'confirm_preorder':
      await confirmPreorder(userId);
      break;

    case 'cancel_preorder':
      await cancelPreorder(userId);
      break;

    case 'remind_later':
      await sendMessage(userId, '👌 Хорошо, напомню позже!');
      break;

    default:
      console.log('Unknown payload action:', action);
  }
}

// Обработка выбора букета
async function handleBouquetSelection(userId, bouquetId, eventId) {
  const bouquet = BOUQUETS[bouquetId];
  if (!bouquet) {
    await sendMessage(userId, 'Букет не найден. Попробуйте ещё раз.');
    return;
  }

  // Получаем событие
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (!event) {
    await sendMessage(userId, 'Событие не найдено. Попробуйте ещё раз.');
    return;
  }

  // Сохраняем состояние
  userStates[userId] = {
    step: 'select_delivery',
    bouquet: bouquet,
    event: event,
    preorder: {
      bouquet_id: bouquetId,
      bouquet_name: bouquet.name,
      bouquet_price: bouquet.price,
      event_id: eventId
    }
  };

  const message = `Отличный выбор! 💐

Букет: ${bouquet.name}
Цена: ${bouquet.price}₽

Как хотите получить заказ?`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'text',
            label: '🏪 Самовывоз',
            payload: JSON.stringify({ action: 'delivery_self' })
          },
          color: 'positive'
        }
      ],
      [
        {
          action: {
            type: 'text',
            label: '🚗 Доставка',
            payload: JSON.stringify({ action: 'delivery_delivery' })
          },
          color: 'primary'
        }
      ],
      [
        {
          action: {
            type: 'text',
            label: '❌ Отмена',
            payload: JSON.stringify({ action: 'cancel_preorder' })
          },
          color: 'secondary'
        }
      ]
    ]
  };

  await sendMessage(userId, message, keyboard);
}

// Самовывоз
async function handleSelfPickup(userId) {
  const state = userStates[userId];
  if (!state) {
    await sendMessage(userId, 'Что-то пошло не так. Начните заново.');
    return;
  }

  state.preorder.delivery_type = 'self_pickup';
  state.step = 'confirm';

  const eventDate = `${state.event.event_day}.${String(state.event.event_month).padStart(2, '0')}`;

  const message = `Подтвердите предзаказ:

💐 Букет: ${state.bouquet.name}
💰 Цена: ${state.bouquet.price}₽
📅 Дата: ${eventDate}
🏪 Самовывоз

📍 Адрес: посёлок Лесопарк 30
🕐 Время работы: с 8:00 до 21:00`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'text',
            label: '✅ Подтвердить',
            payload: JSON.stringify({ action: 'confirm_preorder' })
          },
          color: 'positive'
        }
      ],
      [
        {
          action: {
            type: 'text',
            label: '❌ Отмена',
            payload: JSON.stringify({ action: 'cancel_preorder' })
          },
          color: 'secondary'
        }
      ]
    ]
  };

  await sendMessage(userId, message, keyboard);
}

// Начало оформления доставки
async function handleDeliveryStart(userId) {
  const state = userStates[userId];
  if (!state) {
    await sendMessage(userId, 'Что-то пошло не так. Начните заново.');
    return;
  }

  state.preorder.delivery_type = 'delivery';
  state.step = 'enter_address';

  await sendMessage(userId, '📍 Введите адрес доставки:');
}

// Обработка диалога
async function handleDialogState(userId, text, message) {
  const state = userStates[userId];

  switch (state.step) {
    case 'enter_address':
      state.preorder.delivery_address = text;
      state.step = 'enter_phone';
      await sendMessage(userId, '📞 Введите контактный телефон:');
      break;

    case 'enter_phone':
      state.preorder.recipient_phone = text;
      state.step = 'enter_time';
      await sendMessage(userId, '🕐 Укажите желаемое время доставки (например: 14-16):');
      break;

    case 'enter_time':
      state.preorder.delivery_time = text;
      state.step = 'confirm';
      await showDeliveryConfirmation(userId);
      break;

    default:
      delete userStates[userId];
      await sendDefaultMessage(userId);
  }
}

// Показать подтверждение доставки
async function showDeliveryConfirmation(userId) {
  const state = userStates[userId];
  const eventDate = `${state.event.event_day}.${String(state.event.event_month).padStart(2, '0')}`;

  const message = `Подтвердите предзаказ:

💐 Букет: ${state.bouquet.name}
💰 Цена: ${state.bouquet.price}₽ + доставка
📅 Дата: ${eventDate}
🚗 Доставка

📍 Адрес: ${state.preorder.delivery_address}
📞 Телефон: ${state.preorder.recipient_phone}
🕐 Время: ${state.preorder.delivery_time}`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'text',
            label: '✅ Подтвердить',
            payload: JSON.stringify({ action: 'confirm_preorder' })
          },
          color: 'positive'
        }
      ],
      [
        {
          action: {
            type: 'text',
            label: '❌ Отмена',
            payload: JSON.stringify({ action: 'cancel_preorder' })
          },
          color: 'secondary'
        }
      ]
    ]
  };

  await sendMessage(userId, message, keyboard);
}

// Подтверждение предзаказа
async function confirmPreorder(userId) {
  const state = userStates[userId];
  if (!state || !state.preorder) {
    await sendMessage(userId, 'Что-то пошло не так. Начните заново.');
    return;
  }

  try {
    // Сохраняем предзаказ в БД
    const preorderData = {
      vk_user_id: userId,
      event_id: state.event.id,
      bouquet_vk_id: state.preorder.bouquet_id,
      bouquet_name: state.preorder.bouquet_name,
      bouquet_price: state.preorder.bouquet_price,
      final_price: state.preorder.bouquet_price,
      delivery_type: state.preorder.delivery_type,
      delivery_address: state.preorder.delivery_address || null,
      delivery_time: state.preorder.delivery_time || null,
      recipient_phone: state.preorder.recipient_phone || null,
      recipient_name: state.event.recipient_name,
      delivery_date: `2025-${String(state.event.event_month).padStart(2, '0')}-${String(state.event.event_day).padStart(2, '0')}`,
      status: 'new'
    };

    const { data: preorder, error } = await supabase
      .from('preorders')
      .insert(preorderData)
      .select()
      .single();

    if (error) throw error;

    // Обновляем статус события
    await supabase
      .from('events')
      .update({ status: 'preordered' })
      .eq('id', state.event.id);

    // Отправляем подтверждение клиенту
    const eventDate = `${state.event.event_day}.${String(state.event.event_month).padStart(2, '0')}`;
    
    let confirmMessage = `✅ Предзаказ оформлен!

💐 Букет: ${state.bouquet.name}
💰 Цена: ${state.bouquet.price}₽
📅 Дата: ${eventDate}
`;

    if (state.preorder.delivery_type === 'self_pickup') {
      confirmMessage += `🏪 Самовывоз

📍 Адрес: посёлок Лесопарк 30
🕐 Время работы: с 8:00 до 21:00

Напомним тебе за день до события!`;
    } else {
      confirmMessage += `🚗 Доставка

📍 Адрес: ${state.preorder.delivery_address}
📞 Телефон: ${state.preorder.recipient_phone}
🕐 Время: ${state.preorder.delivery_time}

Администратор свяжется с тобой для подтверждения!`;
    }

    await sendMessage(userId, confirmMessage);

    // Уведомляем админов
    await notifyAdmins(preorder, state);

    // Очищаем состояние
    delete userStates[userId];

  } catch (error) {
    console.error('Error creating preorder:', error);
    await sendMessage(userId, '❌ Ошибка при создании предзаказа. Попробуйте позже или свяжитесь с нами напрямую.');
    delete userStates[userId];
  }
}

// Отмена предзаказа
async function cancelPreorder(userId) {
  delete userStates[userId];
  await sendMessage(userId, '❌ Предзаказ отменён. Если передумаете — мы всегда рядом! 🌸');
}

// Уведомление админов
async function notifyAdmins(preorder, state) {
  const eventDate = `${state.event.event_day}.${String(state.event.event_month).padStart(2, '0')}`;
  
  let adminMessage = `🔔 Новый предзаказ!

👤 Клиент: vk.com/id${preorder.vk_user_id}
📅 Событие: ${state.event.recipient_name} — ${eventDate}

💐 Букет: ${preorder.bouquet_name}
💰 Цена: ${preorder.bouquet_price}₽

`;

  if (preorder.delivery_type === 'self_pickup') {
    adminMessage += `🏪 Самовывоз`;
  } else {
    adminMessage += `🚗 Доставка
📍 Адрес: ${preorder.delivery_address}
📞 Телефон: ${preorder.recipient_phone}
🕐 Время: ${preorder.delivery_time}`;
  }

  for (const adminId of ADMIN_IDS) {
    await sendMessage(adminId, adminMessage);
    console.log(`📤 Notified admin ${adminId}`);
  }
}

// Показать события пользователя для заказа
async function showEventsForOrder(userId) {
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('vk_user_id', userId)
    .in('status', ['active', 'reminded_7d', 'reminded_3d', 'reminded_1d'])
    .order('event_month', { ascending: true })
    .order('event_day', { ascending: true })
    .limit(10);

  if (!events || events.length === 0) {
    await sendMessage(userId, 'У тебя пока нет активных событий. Добавь их в мини-приложении! 🌸');
    return;
  }

  // Сохраняем список событий для выбора по номеру
  userStates[userId] = {
    step: 'select_event_by_number',
    events: events
  };

  let message = '📋 Твои ближайшие события:\n\n';
  
  events.forEach((event, index) => {
    const eventTypeName = event.event_type === 'other'
      ? event.custom_event_name
      : EVENT_TYPE_NAMES[event.event_type] || event.event_type;
    
    const dateStr = `${event.event_day}.${String(event.event_month).padStart(2, '0')}`;
    message += `${index + 1}. ${eventTypeName} — ${event.recipient_name} (${dateStr})\n`;
  });

  message += '\n👆 Напиши номер события (1, 2, 3...) чтобы выбрать букет';

  await sendMessage(userId, message);
}

// Обработка выбора события по номеру
async function handleEventNumberSelection(userId, number) {
  const state = userStates[userId];
  
  if (!state || state.step !== 'select_event_by_number' || !state.events) {
    // Если нет сохранённого списка — показываем события
    await showEventsForOrder(userId);
    return;
  }

  const eventIndex = number - 1;
  if (eventIndex < 0 || eventIndex >= state.events.length) {
    await sendMessage(userId, `Неверный номер. Введи число от 1 до ${state.events.length}`);
    return;
  }

  const event = state.events[eventIndex];
  
  // Показываем выбор букета для этого события
  await showBouquetSelection(userId, event);
}

// Показать выбор букета для события
async function showBouquetSelection(userId, event) {
  const eventTypeName = event.event_type === 'other'
    ? event.custom_event_name
    : EVENT_TYPE_NAMES[event.event_type] || event.event_type;

  const dateStr = `${event.event_day}.${String(event.event_month).padStart(2, '0')}`;

  const message = `Выбери букет для "${eventTypeName}" — ${event.recipient_name} (${dateStr}):

💐 ${BOUQUETS.economy.name} — ${BOUQUETS.economy.price}₽
💐 ${BOUQUETS.medium.name} — ${BOUQUETS.medium.price}₽
💐 ${BOUQUETS.premium.name} — ${BOUQUETS.premium.price}₽`;

  const keyboard = {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'text',
            label: `${BOUQUETS.economy.name} — ${BOUQUETS.economy.price}₽`,
            payload: JSON.stringify({
              action: 'select_bouquet',
              bouquet_id: 'economy',
              event_id: event.id
            })
          },
          color: 'secondary'
        }
      ],
      [
        {
          action: {
            type: 'text',
            label: `${BOUQUETS.medium.name} — ${BOUQUETS.medium.price}₽`,
            payload: JSON.stringify({
              action: 'select_bouquet',
              bouquet_id: 'medium',
              event_id: event.id
            })
          },
          color: 'primary'
        }
      ],
      [
        {
          action: {
            type: 'text',
            label: `${BOUQUETS.premium.name} — ${BOUQUETS.premium.price}₽`,
            payload: JSON.stringify({
              action: 'select_bouquet',
              bouquet_id: 'premium',
              event_id: event.id
            })
          },
          color: 'positive'
        }
      ]
    ]
  };

  // Очищаем состояние выбора события
  delete userStates[userId];

  await sendMessage(userId, message, keyboard);
}

// Названия типов событий (добавь в начало файла если нет)
const EVENT_TYPE_NAMES = {
  birthday: 'День рождения',
  anniversary: 'Юбилей',
  wedding_anniversary: 'Годовщина свадьбы',
  valentines: 'День святого Валентина',
  womens_day: '8 марта',
  mothers_day: 'День матери',
  other: 'Событие'
};

async function handleMessageAllow(userId) {
  console.log(`✅ User ${userId} allowed messages`);
  await supabase
    .from('users')
    .update({ messages_allowed: true })
    .eq('vk_user_id', userId);
}

async function handleMessageDeny(userId) {
  console.log(`❌ User ${userId} denied messages`);
  await supabase
    .from('users')
    .update({ messages_allowed: false })
    .eq('vk_user_id', userId);
}

async function sendWelcomeMessage(userId) {
  const message = `Привет! 🌸

Я бот цветочного магазина "Цветы в лесопарке".

Я помогу не забыть о важных датах и вовремя заказать цветы!

📍 посёлок Лесопарк 30
🕐 с 8:00 до 21:00
📞 +7 912 797 1348`;

  await sendMessage(userId, message);
}

async function sendHelpMessage(userId) {
  const message = `❓ Чем помочь?

🌷 Добавить даты — открой мини-приложение в группе
🔔 Я напомню за 7, 3 и 1 день
💐 Напиши "заказ" чтобы выбрать букет

📍 посёлок Лесопарк 30
🕐 с 8:00 до 21:00
📞 +7 912 797 1348`;

  await sendMessage(userId, message);
}

async function sendDefaultMessage(userId) {
  await sendMessage(userId, 'Напиши "помощь" чтобы узнать что я умею 🌸');
}
