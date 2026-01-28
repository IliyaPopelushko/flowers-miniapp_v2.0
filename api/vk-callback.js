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
// ============================================

async function getBouquets() {
  try {
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .single();

    if (!settings) {
      return DEFAULT_BOUQUETS;
    }

    return {
      economy: {
        id: settings.bouquet_economy_vk_id || 'economy',
        name: settings.bouquet_economy_name || DEFAULT_BOUQUETS.economy.name,
        price: settings.bouquet_economy_price || DEFAULT_BOUQUETS.economy.price
      },
      medium: {
        id: settings.bouquet_medium_vk_id || 'medium',
        name: settings.bouquet_medium_name || DEFAULT_BOUQUETS.medium.name,
        price: settings.bouquet_medium_price || DEFAULT_BOUQUETS.medium.price
      },
      premium: {
        id: settings.bouquet_premium_vk_id || 'premium',
        name: settings.bouquet_premium_name || DEFAULT_BOUQUETS.premium.name,
        price: settings.bouquet_premium_price || DEFAULT_BOUQUETS.premium.price
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

  // Очищаем состояние после показа кнопок
  await clearUserState(userId);

  await sendMessage(userId, message, keyboard);
}

// ============================================
// Обработка выбора 
