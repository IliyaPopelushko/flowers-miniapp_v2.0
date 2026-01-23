import { supabase } from '../../lib/supabase.js';
import { extractVkUserId } from '../../lib/vk.js';

export default async function handler(req, res) {
  // ✅ CORS заголовки СРАЗУ для ВСЕХ запросов (включая OPTIONS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-VK-Params, vk-params');

  // Preflight запрос — сразу отвечаем 200
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Получаем параметры VK
    let vkParams = {};
    
    if (req.headers['x-vk-params']) {
      try {
        vkParams = JSON.parse(req.headers['x-vk-params']);
      } catch (e) {
        console.warn('Failed to parse X-VK-Params:', e);
      }
    }
    
    if (Object.keys(vkParams).length === 0 && req.query) {
      vkParams = req.query;
    }

    const vkUserId = extractVkUserId(vkParams);
    
    console.log(`[events/${id}] Method: ${req.method}, VK User: ${vkUserId}`);

    // Проверяем существование события
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingEvent) {
      console.log(`Event ${id} not found`);
      return res.status(404).json({ error: 'Event not found' });
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
        console.error('Update error:', error);
        throw error;
      }

      console.log(`Event ${id} updated`);
      return res.status(200).json({ event });
    }

    // DELETE — удалить событие
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      console.log(`Event ${id} deleted`);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Event [id] API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
