import { supabase } from '../../lib/supabase.js';
import { extractVkUserId } from '../../lib/vk.js';

export default async function handler(req, res) {
  // Логирование для отладки
  console.log(`Incoming ${req.method} request to events/[id]`);

  // ==========================================
  // 1. НАСТРОЙКА CORS (Обязательно для всех методов)
  // ==========================================
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-VK-Params, vk-params');

  // Обработка Preflight запроса (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ==========================================
  // 2. ОСНОВНАЯ ЛОГИКА
  // ==========================================
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // --- Проверка авторизации (VK Params) ---
    let vkParams = {};
    
    // Пытаемся достать параметры из заголовка (приходят от frontend)
    if (req.headers['x-vk-params']) {
      try {
        vkParams = JSON.parse(req.headers['x-vk-params']);
      } catch (e) {
        console.warn('Failed to parse X-VK-Params', e);
      }
    }
    
    // Если в заголовках нет, пробуем query (обычно там их нет для PUT/DELETE, но на всякий случай)
    if (Object.keys(vkParams).length === 0 && req.query) {
      // Фильтруем query, чтобы оставить только vk_ параметры
      Object.keys(req.query).forEach(key => {
        if (key.startsWith('vk_')) {
          vkParams[key] = req.query[key];
        }
      });
    }

    let vkUserId = extractVkUserId(vkParams);
    
    // TODO: В продакшене убрать хардкод, если extractVkUserId вернет null
    // Сейчас для тестов, если не передалось, оставляем твой ID или null
    if (!vkUserId && process.env.NODE_ENV === 'development') {
       // vkUserId = ...; 
    }

    console.log(`Action on event ${id} by user ${vkUserId}`);

    // --- Проверка существования события ---
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingEvent) {
      console.error('Event not found or error:', fetchError);
      return res.status(404).json({ error: 'Event not found' });
    }

    // --- GET: Получить событие ---
    if (req.method === 'GET') {
      return res.status(200).json({ event: existingEvent });
    }

    // --- PUT: Обновить событие ---
    if (req.method === 'PUT') {
      // Важно: парсим body, если он пришел строкой (бывает в Vercel)
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }

      const {
        event_type,
        custom_event_name,
        event_day,
        event_month,
        event_year,
        recipient_name,
        comment,
        notifications_enabled
      } = body;

      const updateData = { updated_at: new Date().toISOString() };
      
      if (event_type !== undefined) updateData.event_type = event_type;
      if (custom_event_name !== undefined) updateData.custom_event_name = custom_event_name;
      if (event_day !== undefined) updateData.event_day = parseInt(event_day);
      if (event_month !== undefined) updateData.event_month = parseInt(event_month);
      if (event_year !== undefined) updateData.event_year = event_year ? parseInt(event_year) : null;
      if (recipient_name !== undefined) updateData.recipient_name = recipient_name.trim();
      if (comment !== undefined) updateData.comment = comment;
      if (notifications_enabled !== undefined) updateData.notifications_enabled = notifications_enabled;

      const { data: event, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update Error:', error);
        throw error;
      }

      return res.status(200).json({ event });
    }

    // --- DELETE: Удалить событие ---
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete Error:', error);
        throw error;
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Event [id] API critical error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
