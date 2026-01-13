// ============================================
// /api/events — Управление событиями
// GET  — получить все события пользователя
// POST — создать новое событие
// ============================================

const { supabase } = require('../lib/supabase');
const { verifyVKSignature, extractVkUserId } = require('../lib/vk');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Получаем параметры VK
    const vkParams = req.headers['x-vk-params'] 
      ? JSON.parse(req.headers['x-vk-params'])
      : req.query;

    const isDev = process.env.NODE_ENV === 'development';
    
    if (!isDev && !verifyVKSignature(vkParams)) {
      return res.status(401).json({ error: 'Invalid VK signature' });
    }

    const vkUserId = extractVkUserId(vkParams);
    
    if (!vkUserId) {
      return res.status(400).json({ error: 'Missing vk_user_id' });
    }

    // GET — получить события пользователя
    if (req.method === 'GET') {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('vk_user_id', vkUserId)
        .order('event_month', { ascending: true })
        .order('event_day', { ascending: true });

      if (error) throw error;

      return res.status(200).json({ 
        events: events || [],
        count: events?.length || 0
      });
    }

    // POST — создать событие
    if (req.method === 'POST') {
      const {
        event_type,
        custom_event_name,
        event_day,
        event_month,
        event_year,
        recipient_name,
        comment,
        notifications_enabled
      } = req.body;

      // Валидация обязательных полей
      if (!event_type) {
        return res.status(400).json({ error: 'event_type is required' });
      }
      if (!event_day || !event_month) {
        return res.status(400).json({ error: 'event_day and event_month are required' });
      }
      if (!recipient_name || recipient_name.trim() === '') {
        return res.status(400).json({ error: 'recipient_name is required' });
      }

      // Валидация дня и месяца
      if (event_day < 1 || event_day > 31) {
        return res.status(400).json({ error: 'Invalid event_day' });
      }
      if (event_month < 1 || event_month > 12) {
        return res.status(400).json({ error: 'Invalid event_month' });
      }

      // Если тип "other", нужно название
      if (event_type === 'other' && !custom_event_name) {
        return res.status(400).json({ error: 'custom_event_name is required for type "other"' });
      }

      // Получаем user_id из таблицы users
      let { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('vk_user_id', vkUserId)
        .single();

      // Если пользователя нет — создаём
      if (!user) {
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({ vk_user_id: vkUserId })
          .select('id')
          .single();
        
        if (userError) throw userError;
        user = newUser;
      }

      // Создаём событие
      const eventData = {
        user_id: user.id,
        vk_user_id: vkUserId,
        event_type,
        custom_event_name: custom_event_name || null,
        event_day: parseInt(event_day),
        event_month: parseInt(event_month),
        event_year: event_year ? parseInt(event_year) : null,
        recipient_name: recipient_name.trim(),
        comment: comment || null,
        notifications_enabled: notifications_enabled ?? true,
        status: 'active'
      };

      const { data: event, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        // Проверяем на ошибку лимита
        if (error.message.includes('лимит') || error.message.includes('limit')) {
          return res.status(400).json({ 
            error: 'Достигнут лимит в 10 событий. Удалите неактуальные события.' 
          });
        }
        throw error;
      }

      return res.status(201).json({ event });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Events API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
