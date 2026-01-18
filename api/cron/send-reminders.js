// ============================================
// POST /api/cron/send-reminders
// Отправка напоминаний о событиях
// Вызывается через GitHub Actions в 12:00 по Магнитогорску
// ============================================

const { supabase } = require('../../lib/supabase');
const { sendMessage } = require('../../lib/vk');

// Секретный ключ для защиты endpoint
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

module.exports = async function handler(req, res) {
  console.log('🔔 Starting reminders job...');

  // Проверяем метод
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверяем секретный ключ
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('❌ Invalid authorization');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Получаем текущую дату в часовом поясе Магнитогорска (UTC+5)
    const now = new Date();
    const magnitogorskOffset = 5 * 60; // минуты
    const localTime = new Date(now.getTime() + magnitogorskOffset * 60 * 1000);
    
    const today = {
      day: localTime.getUTCDate(),
      month: localTime.getUTCMonth() + 1
    };

    console.log(`📅 Today: ${today.day}.${today.month}`);

    // Вычисляем даты для напоминаний
    const dates = {
      in7days: addDays(localTime, 7),
      in3days: addDays(localTime, 3),
      in1day: addDays(localTime, 1)
    };

    console.log('📅 Checking dates:', {
      in7days: `${dates.in7days.day}.${dates.in7days.month}`,
      in3days: `${dates.in3days.day}.${dates.in3days.month}`,
      in1day: `${dates.in1day.day}.${dates.in1day.month}`
    });

    // Получаем настройки магазина
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .single();

    // Получаем все активные события с включёнными уведомлениями
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        users (
          first_name,
          last_name,
          messages_allowed
        )
      `)
      .eq('notifications_enabled', true)
      .in('status', ['active', 'reminded_7d', 'reminded_3d']);

    if (error) throw error;

    console.log(`📋 Found ${events?.length || 0} events to check`);

    let sent = {
      day7: 0,
      day3: 0,
      day1: 0
    };

    // Обрабатываем каждое событие
    for (const event of events || []) {
      // Проверяем, разрешены ли сообщения
      if (!event.users?.messages_allowed) {
        console.log(`⚠️ Messages not allowed for user ${event.vk_user_id}`);
        continue;
      }

      const eventDate = { day: event.event_day, month: event.event_month };

      // Напоминание за 7 дней
      if (
        event.status === 'active' &&
        eventDate.day === dates.in7days.day &&
        eventDate.month === dates.in7days.month
      ) {
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
        await sendReminder1Day(event, settings);
        await updateEventStatus(event.id, 'reminded_1d');
        sent.day1++;
      }
    }

    // Обрабатываем прошедшие события
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
};

// Вспомогательная функция: добавить дни к дате
function addDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return {
    day: result.getUTCDate(),
    month: result.getUTCMonth() + 1
  };
}

// Обновление статуса события
async function updateEventStatus(eventId, status) {
  const { error } = await supabase
    .from('events')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  if (error) {
    console.error(`Failed to update event ${eventId}:`, error);
  }
}

// Напоминание за 7 дней
async function sendReminder7Days(event, settings) {
  const eventTypeName = event.event_type === 'other'
    ? event.custom_event_name
    : EVENT_TYPE_NAMES[event.event_type];

  const userName = event.users?.first_name || 'друг';

  const message = `Привет, ${userName}! 🌸

Через неделю ${eventTypeName} у ${event.recipient_name}!

Не забудь подготовить подарок! 💐

Ждём тебя в нашем магазине:
📍 ${settings?.shop_address || 'посёлок Лесопарк 30'}
🕐 ${settings?.shop_hours || 'с 8:00 до 21:00'}
📞 ${settings?.shop_phone || '+7 912 797 1348'}`;

  const result = await sendMessage(event.vk_user_id, message);
  console.log(`📤 Sent 7-day reminder to ${event.vk_user_id}:`, result.success);
}

// Напоминание за 3 дня
async function sendReminder3Days(event, settings) {
  const eventTypeName = event.event_type === 'other'
    ? event.custom_event_name
    : EVENT_TYPE_NAMES[event.event_type];

  const userName = event.users?.first_name || 'друг';

  const message = `${userName}, уже через 3 дня ${eventTypeName} у ${event.recipient_name}! 🌷

Успей заказать красивый букет!

📍 ${settings?.shop_address || 'посёлок Лесопарк 30'}
🕐 ${settings?.shop_hours || 'с 8:00 до 21:00'}
📞 ${settings?.shop_phone || '+7 912 797 1348'}`;

  const result = await sendMessage(event.vk_user_id, message);
  console.log(`📤 Sent 3-day reminder to ${event.vk_user_id}:`, result.success);
}

// Напоминание за 1 день
async function sendReminder1Day(event, settings) {
  const eventTypeName = event.event_type === 'other'
    ? event.custom_event_name
    : EVENT_TYPE_NAMES[event.event_type];

  const userName = event.users?.first_name || 'друг';

  const message = `${userName}, завтра ${eventTypeName} у ${event.recipient_name}! 🌺

Ещё можно успеть заказать букет!

📍 ${settings?.shop_address || 'посёлок Лесопарк 30'}
🕐 ${settings?.shop_hours || 'с 8:00 до 21:00'}
📞 ${settings?.shop_phone || '+7 912 797 1348'}`;

  const result = await sendMessage(event.vk_user_id, message);
  console.log(`📤 Sent 1-day reminder to ${event.vk_user_id}:`, result.success);
}

// Обработка прошедших событий
async function handlePastEvents(today) {
  // Получаем события, которые уже прошли
  const { data: pastEvents } = await supabase
    .from('events')
    .select('*')
    .in('status', ['reminded_1d', 'reminded_3d', 'reminded_7d', 'active']);

  for (const event of pastEvents || []) {
    // Проверяем, прошла ли дата
    const eventDate = new Date(2024, event.event_month - 1, event.event_day);
    const todayDate = new Date(2024, today.month - 1, today.day);

    if (eventDate < todayDate) {
      // Переводим в completed и сбрасываем статус для следующего года
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
