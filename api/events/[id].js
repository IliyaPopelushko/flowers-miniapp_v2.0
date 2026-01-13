// ============================================
// /api/events/[id] — Операции с конкретным событием
// GET    — получить событие по ID
// PUT    — обновить событие
// DELETE — удалить событие
// ============================================

const { supabase } = require('../../lib/supabase');
const { verifyVKSignature, extractVkUserId } = require('../../lib/vk');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // ID события из URL
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

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

    // Проверяем, что событие принадлежит пользователю
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (existingEvent.vk_user_id !== vkUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // GET — получить событие
    if (req.method === 'GET') {
      return res.status(200).json({ event: existingEvent });
    }

    // PUT — обновить событие
    if (req.method === 'PUT') {
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

      // Собираем только переданные поля
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

      if (error) throw error;

      return res.status(200).json({ event });
    }

    // DELETE — удалить событие
    if (req.method === 'DELETE') {
      // Проверяем, есть ли связанный предзаказ
      const { data: preorder } = await supabase
        .from('preorders')
        .select('id, status')
        .eq('event_id', id)
        .single();

      // Если есть активный предзаказ — отменяем его
      if (preorder && ['new', 'confirmed'].includes(preorder.status)) {
        await supabase
          .from('preorders')
          .update({ status: 'cancelled' })
          .eq('id', preorder.id);
        
        // TODO: Уведомить админа об отмене
      }

      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return res.status(200).json({ 
        success: true,
        message: 'Event deleted',
        preorderCancelled: !!preorder
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Event [id] API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
