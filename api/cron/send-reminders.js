// ============================================
// POST /api/cron/send-reminders
// Отправка напоминаний о событиях
// ============================================

import { supabase } from '../../lib/supabase.js';
import { sendMessage } from '../../lib/vk.js';

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';

// Названия типов событий
const EVENT_TYPE_NAMES = {
  birthday: 'день рождения',
  anniversary: 'юбилей',
  wedding_anniversary: 'годовщина свадьбы',
  valentines: 'День святого Валентина',
  womens_day: '8 марта',
  mothers_day: 'День матери',
  other: 'событие'
};

// Захардкоженные букеты
const BOUQUETS = {
  economy: {
    id: 'economy',
    name: 'Нежность',
    price: 1500,
    description: 'Компактный букет из сезонных цветов'
  },
  medium: {
    id: 'medium',
    name: 'Элегантность',
    price: 2500,
    description: 'Средний букет из роз и альстромерий'
  },
  premium: {
    id: 'premium',
    name: 'Роскошь',
    price: 4000,
    description: 'Большой букет из премиальных роз'
  }
};

export default async function handler(req, res) {
  console.log('🔔 Starting reminders job...');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('❌ Invalid authorization');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const magnitogorskOffset = 5 * 60;
    const localTime = new Date(now.getTime() + magnitogorskOffset * 60 * 1000);
    
    const today = {
      day: localTime.getUTCDate(),
      month: localTime.getUTCMonth() + 1
    };

    console.log(`📅 Today (Magnitogorsk): ${today.day}.${today.month}`);

    const dates = {
      in7days: addDays(localTime, 7),
      in3days: addDays(localTime, 3),
      in1day: addDays(localTime, 1)
    };

    console.log(`📅 Looking for: 7d=${dates.in7days.day}.${dates.in7days.month}, 3d=${dates.in3days.day}.${dates.in3days.month}, 1d=${dates.in1day.day}.${dates.in1day.month}`);

    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .single();

    // Получаем события БЕЗ join для надёжности
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .eq('notifications_enabled', true)
      .in('status', ['active', 'reminded_7d', 'reminded_3d']);

    if (error) throw error;

    console.log(`📋 Found ${events?.length || 0} events to check`);

    // Логируем все события
    for (const ev of events || []) {
      console.log(`📌 Event: id=${ev.id}, day=${ev.event_day}, month=${ev.event_month}, status=${ev.status}, vk_user_id=${ev.vk_user_id}`);
    }

    let sent = { day7: 0, day3: 0, day1: 0 };

    for (const event of events || []) {
      // Получаем пользователя отдельно
      const { data: user } = await supabase
        .from('users')
        .select('first_name, last_name, messages_allowed')
        .eq('vk_user_id', event.vk_user_id)
        .single();
      
      console.log(`👤 User for vk_id=${event.vk_user_id}: ${user ? `found, messages_allowed=${user.messages_allowed}` : 'NOT FOUND'}`);
      
      if (!user?.messages_allowed) {
        console.log(`⚠️ Skipping event ${event.id} - no user or messages not allowed`);
        continue;
      }
      
      // Добавляем данные пользователя к событию
      event.users = user;

      const eventDate = { day: event.event_day, month: event.event_month };
      
      console.log(`🔍 Checking: event date ${eventDate.day}.${eventDate.month}`);

      // Напоминание за 7 дней
      if (
        event.status === 'active' &&
        eventDate.day === dates.in7days.day &&
        eventDate.month === dates.in7days.month
      ) {
        console.log(`✅ Match 7 days! Sending reminder...`);
        await sendReminder7Days(event, settings);
        await updateEventStatus(event.id, 'reminded_7d');
        sent.day7++;
      }

      // Напоминание за 3 дня
      else if (
        event.status === 'reminded_7d' &&
        eventDate.day === dates.in3days.day &&
        eventDate.month === dates.in3days.month
      ) {
        console.log(`✅ Match 3 days! Sending reminder...`);
        await sendReminder3Days(event, settings);
        await updateEventStatus(event.id, 'reminded_3d');
        sent.day3++;
      }

      // Напоминание за 1 день
      else if (
        (event.status === 'reminded_3d' || event.status === 'reminded_7d') &&
        eventDate.day === dates.in1day.day &&
        eventDate.month === dates.in1day.month
      ) {
        console.log(`✅ Match 1 day! Sending reminder...`);
        await sendReminder1Day(event, settings);
        await updateEventStatus(event.id, 'reminded_1d');
        sent.day1++;
      } else {
        console.log(`❌ No match for event ${event.id}`);
      }
    }

    await handlePastEvents(today);

    console.log('✅ Reminders job completed:', sent);

    return res.status(200).json({
      success: true,
      sent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Reminders job failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}

function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return {
    day: result.getUTCDate(),
    month: result.getUTCMonth() + 1
  };
}

async function updateEventStatus(eventId, status) {
  const { error } = await supabase
    .from('events')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) {
    console.error(`Failed to update event ${eventId}:`, error);
  }
}

// Напоминание за 7 дней С КНОПКАМИ
async function sendReminder7Days(event, settings) {
  const eventTypeName = event.event_type === 'other'
    ? event.custom_event_name
    : EVENT_TYPE_NAMES[event.event_type];

  const userName = event.users?.first_name || 'друг';

  const message = `Привет, ${userName}! 🌸

Через неделю ${eventTypeName} у ${event.recipient_name}!

Подобрали для тебя букеты:

💐 ${BOUQUETS.economy.name} — ${BOUQUETS.economy.price}₽
${BOUQUETS.economy.description}

💐 ${BOUQUETS.medium.name} — ${BOUQUETS.medium.price}₽
${BOUQUETS.medium.description}

💐 ${BOUQUETS.premium.name} — ${BOUQUETS.premium.price}₽
${BOUQUETS.premium.description}

Выбери букет и оформи предзаказ! 👇`;

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
      ],
      [
        {
          action: {
            type: 'text',
            label: '⏰ Напомнить позже',
            payload: JSON.stringify({ action: 'remind_later' })
          },
          color: 'secondary'
        }
      ]
    ]
  };

  const result = await sendMessage(event.vk_user_id, message, keyboard);
  console.log(`📤 Sent 7-day reminder to ${event.vk_user_id}:`, result.success ? 'OK' : result.error);
}

// Напоминание за 3 дня
async function sendReminder3Days(event, settings) {
  const eventTypeName = event.event_type === 'other'
    ? event.custom_event_name
    : EVENT_TYPE_NAMES[event.event_type];

  const userName = event.users?.first_name || 'друг';

  const message = `${userName}, уже через 3 дня ${eventTypeName} у ${event.recipient_name}! 🌷

Ещё не выбрал букет? Успей оформить предзаказ!

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

  const result = await sendMessage(event.vk_user_id, message, keyboard);
  console.log(`📤 Sent 3-day reminder to ${event.vk_user_id}:`, result.success ? 'OK' : result.error);
}

// Напоминание за 1 день
async function sendReminder1Day(event, settings) {
  const eventTypeName = event.event_type === 'other'
    ? event.custom_event_name
    : EVENT_TYPE_NAMES[event.event_type];

  const userName = event.users?.first_name || 'друг';

  // Проверяем, есть ли предзаказ
  const { data: preorder } = await supabase
    .from('preorders')
    .select('*')
    .eq('event_id', event.id)
    .eq('status', 'new')
    .single();

  let message;
  
  if (preorder) {
    message = `${userName}, напоминаем! 🌺

Завтра ${eventTypeName} у ${event.recipient_name}.

Твой букет «${preorder.bouquet_name}» готов!

📍 Адрес: ${settings?.shop_address || 'посёлок Лесопарк 30'}
🕐 Время работы: ${settings?.shop_hours || 'с 8:00 до 21:00'}

Ждём тебя! 💐`;
  } else {
    message = `${userName}, завтра ${eventTypeName} у ${event.recipient_name}! 🌸

Ещё можно успеть заказать букет!

📍 ${settings?.shop_address || 'посёлок Лесопарк 30'}
🕐 ${settings?.shop_hours || 'с 8:00 до 21:00'}
📞 ${settings?.shop_phone || '+7 912 797 1348'}`;
  }

  const result = await sendMessage(event.vk_user_id, message);
  console.log(`📤 Sent 1-day reminder to ${event.vk_user_id}:`, result.success ? 'OK' : result.error);
}

async function handlePastEvents(today) {
  const { data: pastEvents } = await supabase
    .from('events')
    .select('*')
    .in('status', ['reminded_1d', 'reminded_3d', 'reminded_7d', 'active']);

  for (const event of pastEvents || []) {
    const eventDate = new Date(2024, event.event_month - 1, event.event_day);
    const todayDate = new Date(2024, today.month - 1, today.day);

    if (eventDate < todayDate) {
      await supabase
        .from('events')
        .update({
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      console.log(`🔄 Reset event ${event.id} for next year`);
    }
  }
}
