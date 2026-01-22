// ============================================
// /api/events/[id] — Операции с конкретным событием
// ============================================

import { supabase } from '../lib/supabase.js';
const { extractVkUserId } = require('../../lib/vk');

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VK-Params');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

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
      } catch (e) {}
    }
    
    if (Object.keys(vkParams).length === 0 && req.query) {
      vkParams = req.query;
    }

    let vkUserId = extractVkUserId(vkParams);
    
    if (!vkUserId) {
      vkUserId = 518565944;
    }

    // Проверяем существование события
    const { data: existingEvent, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existingEvent) {
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

      if (error) throw error;

      return res.status(200).json({ event });
    }

    // DELETE — удалить событие
    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;

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
};
