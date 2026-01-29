// ============================================
// POST /api/vk-callback — VK Callback API
// ============================================

import { supabase } from '../lib/supabase.js';
import { sendMessage, isAdmin } from '../lib/vk.js';

const VK_GROUP_ID = process.env.VK_GROUP_ID || '136756716';
const VK_CONFIRMATION_CODE = process.env.VK_CONFIRMATION_CODE;
const ADMIN_IDS = [518565944, 123456789];

// Названия типов событий
const EVENT_TYPE_NAMES = {
  birthday: 'День рождения',
  anniversary: 'Юбилей',
  wedding_anniversary: 'Годовщина свадьбы',
  valentines: 'День святого Валентина',
  womens_day: '8 марта',
  mothers_day: 'День матери',
  other: 'Событие'
};

// Дефолтные букеты (если в settings ничего нет)
const DEFAULT_BOUQUETS = {
  economy: { id: 'economy', name: 'Букет эконом', price: 1500 },
  medium: { id: 'medium', name: 'Букет средний', price: 2500 },
  premium: { id: 'premium', name: 'Букет премиум', price: 4000 }
};

// ============================================
// Получение букетов из настроек
async function getBouquets() {
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (!settings) {
      return DEFAULT_BOUQUETS;
    }

    const groupId = process.env.VK_GROUP_ID || '229962076';

    return {
      economy: {
        id: settings.bouquet_economy_vk_id || 'economy',
        name: settings.bouquet_economy_name || DEFAULT_BOUQUETS.economy.name,
        price: settings.bouquet_economy_price || DEFAULT_BOUQUETS.economy.price,
        photo: settings.bouquet_economy_photo || null,
        link: settings.bouquet_economy_vk_id 
          ? `https://vk.com/market-${groupId}?w=product-${groupId}_${settings.bouquet_economy_vk_id}`
          : null
      },
      medium: {
        id: settings.bouquet_medium_vk_id || 'medium',
        name: settings.bouquet_medium_name || DEFAULT_BOUQUETS.medium.name,
        price: settings.bouquet_medium_price || DEFAULT_BOUQUETS.medium.price,
        photo: settings.bouquet_medium_photo || null,
        link: settings.bouquet_medium_vk_id 
          ? `https://vk.com/market-${groupId}?w=product-${groupId}_${settings.bouquet_medium_vk_id}`
          : null
      },
      premium: {
        id: settings.bouquet_premium_vk_id || 'premium',
        name: settings.bouquet_premium_name || DEFAULT_BOUQUETS.premium.name,
        price: settings.bouquet_premium_price || DEFAULT_BOUQUETS.premium.price,
        photo: settings.bouquet_premium_photo || null,
        link: settings.bouquet_premium_vk_id 
          ? `https://vk.com/market-${groupId}?w=product-${groupId}_${settings.bouquet_premium_vk_id}`
          : null
      }
    };
  } catch (error) {
    console.error('Error loading bouquets:', error);
    return DEFAULT_BOUQUETS;
  }
}

// ============================================
// Функции для работы с состоянием в БД
// ============================================

async function getUserState(userId) {
  const { data } = await supabase
    .from('user_states')
    .select('state_data')
    .eq('vk_user_id', userId)
    .single();
  
  return data?.state_data || null;
}

async function setUserState(userId, stateData) {
  await supabase
    .from('user_states')
    .upsert({
      vk_user_id: userId,
      state_data: stateData,
      updated_at: new Date().toISOString()
    });
}

async function clearUserState(userId) {
  await supabase
    .from('user_states')
    .delete()
    .eq('vk_user_id', userId);
}

// ============================================
// Основной обработчик
// ============================================

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

  // Получаем состояние из БД
  const state = await getUserState(userId);
  
  if (state) {
    await handleDialogState(userId, text, state);
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

  // Показать события для заказа
  if (text === 'заказ' || text === 'заказать' || text === 'мои события' || text === 'события') {
    await showEventsForOrder(userId);
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

// ============================================
// Показ событий и выбор по номеру
// ============================================

async function showEventsForOrder(userId) {
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('vk_user_id', userId)
    .in('status', ['active', 'reminded_7d', 'reminded_3d', 'reminded_1d', 'preordered'])
    .order('event_month', { ascending: true })
    .order('event_day', { ascending: true })
    .limit(10);

  if (!events || events.length === 0) {
    await sendMessage(userId, 'У тебя пока нет активных событий. Добавь их в мини-приложении! 🌸');
    return;
  }

  // Сохраняем состояние в БД
  await setUserState(userId, {
    step: 'select_event_by_number',
    events: events.map(e => ({
      id: e.id,
      event_type: e.event_type,
      custom_event_name: e.custom_event_name,
      recipient_name: e.recipient_name,
      event_day: e.event_day,
      event_month: e.event_month
    }))
  });

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

async function handleDialogState(userId, text, state) {
  console.log(`🔄 Dialog state for ${userId}: step=${state.step}`);

  switch (state.step) {
    case 'select_event_by_number':
      // Проверяем, что введён номер
      if (/^[1-9]$/.test(text)) {
        const eventIndex = parseInt(text) - 1;
        
        if (eventIndex < 0 || eventIndex >= state.events.length) {
          await sendMessage(userId, `Неверный номер. Введи число от 1 до ${state.events.length}`);
          return;
        }

        const event = state.events[eventIndex];
        await showBouquetSelection(userId, event);
      } else {
        await sendMessage(userId, '👆 Напиши номер события (1, 2, 3...)');
      }
      break;

    case 'enter_address':
      await setUserState(userId, {
        ...state,
        step: 'enter_phone',
        preorder: { ...state.preorder, delivery_address: text }
      });
      await sendMessage(userId, '📞 Введите контактный телефон:');
      break;

    case 'enter_phone':
      await setUserState(userId, {
        ...state,
        step: 'enter_time',
        preorder: { ...state.preorder, recipient_phone: text }
      });
      await sendMessage(userId, '🕐 Укажите желаемое время доставки (например: 14-16):');
      break;

    case 'enter_time':
      const updatedState = {
        ...state,
        step: 'confirm',
        preorder: { ...state.preorder, delivery_time: text }
      };
      await setUserState(userId, updatedState);
      await showDeliveryConfirmation(userId, updatedState);
      break;

    default:
      await clearUserState(userId);
      await sendDefaultMessage(userId);
  }
}

async function showBouquetSelection(userId, event) {
  // Получаем актуальные букеты из настроек
  const BOUQUETS = await getBouquets();
  
  const eventTypeName = event.event_type === 'other'
    ? event.custom_event_name
    : EVENT_TYPE_NAMES[event.event_type] || event.event_type;

  const dateStr = `${event.event_day}.${String(event.event_month).padStart(2, '0')}`;

  // Формируем текст с ссылками
  let message = `Выбери букет для "${eventTypeName}" — ${event.recipient_name} (${dateStr}):\n\n`;
  
  message += `💐 ${BOUQUETS.economy.name} — ${BOUQUETS.economy.price}₽`;
  if (BOUQUETS.economy.link) message += `\n   👀 ${BOUQUETS.economy.link}`;
  
  message += `\n\n💐 ${BOUQUETS.medium.name} — ${BOUQUETS.medium.price}₽`;
  if (BOUQUETS.medium.link) message += `\n   👀 ${BOUQUETS.medium.link}`;
  
  message += `\n\n💐 ${BOUQUETS.premium.name} — ${BOUQUETS.premium.price}₽`;
  if (BOUQUETS.premium.link) message += `\n   👀 ${BOUQUETS.premium.link}`;

  // Функция для обрезки названия (макс 40 символов с учётом цены)
  function makeButtonLabel(name, price) {
    const priceStr = ` — ${price}₽`;
    const maxNameLength = 40 - priceStr.length;
    const shortName = name.length > maxNameLength 
      ? name.substring(0, maxNameLength - 1) + '…' 
      : name;
    return shortName + priceStr;
  }

  const keyboard = {
    inline: true,
    buttons: [
      [
        {
          action: {
            type: 'text',
            label: makeButtonLabel(BOUQUETS.economy.name, BOUQUETS.economy.price),
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
            label: makeButtonLabel(BOUQUETS.medium.name, BOUQUETS.medium.price),
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
            label: makeButtonLabel(BOUQUETS.premium.name, BOUQUETS.premium.price),
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

  await clearUserState(userId);
  await sendMessage(userId, message, keyboard);
}

// ============================================
// Обработка выбора букета
// ============================================

async function handleBouquetSelection(userId, bouquetId, eventId) {
  // Получаем актуальные букеты из настроек
  const BOUQUETS = await getBouquets();
  
  const bouquet = BOUQUETS[bouquetId];
  if (!bouquet) {
    await sendMessage(userId, 'Букет не найден. Попробуйте ещё раз.');
    return;
  }

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
  await setUserState(userId, {
    step: 'select_delivery',
    bouquet: bouquet,
    event: {
      id: event.id,
      event_day: event.event_day,
      event_month: event.event_month,
      recipient_name: event.recipient_name,
      event_type: event.event_type,
      custom_event_name: event.custom_event_name
    },
    preorder: {
      bouquet_id: bouquetId,
      bouquet_name: bouquet.name,
      bouquet_price: bouquet.price,
      event_id: eventId
    }
  });

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

// ============================================
// Самовывоз
// ============================================

async function handleSelfPickup(userId) {
  const state = await getUserState(userId);
  if (!state) {
    await sendMessage(userId, 'Что-то пошло не так. Начните заново, напишите "заказ".');
    return;
  }

  const updatedState = {
    ...state,
    step: 'confirm',
    preorder: { ...state.preorder, delivery_type: 'self_pickup' }
  };
  await setUserState(userId, updatedState);

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

// ============================================
// Доставка
// ============================================

async function handleDeliveryStart(userId) {
  const state = await getUserState(userId);
  if (!state) {
    await sendMessage(userId, 'Что-то пошло не так. Начните заново, напишите "заказ".');
    return;
  }

  await setUserState(userId, {
    ...state,
    step: 'enter_address',
    preorder: { ...state.preorder, delivery_type: 'delivery' }
  });

  await sendMessage(userId, '📍 Введите адрес доставки:');
}

async function showDeliveryConfirmation(userId, state) {
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

// ============================================
// Подтверждение и отмена
// ============================================

async function confirmPreorder(userId) {
  const state = await getUserState(userId);
  if (!state || !state.preorder) {
    await sendMessage(userId, 'Что-то пошло не так. Начните заново, напишите "заказ".');
    return;
  }

  try {
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

    await supabase
      .from('events')
      .update({ status: 'preordered' })
      .eq('id', state.event.id);

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
    await notifyAdmins(preorder, state);
    await clearUserState(userId);

  } catch (error) {
    console.error('Error creating preorder:', error);
    await sendMessage(userId, '❌ Ошибка при создании предзаказа. Попробуйте позже или свяжитесь с нами напрямую.');
    await clearUserState(userId);
  }
}

async function cancelPreorder(userId) {
  await clearUserState(userId);
  await sendMessage(userId, '❌ Предзаказ отменён. Если передумаете — мы всегда рядом! 🌸');
}

// ============================================
// Уведомление админов
// ============================================

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

// ============================================
// Служебные функции
// ============================================

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
