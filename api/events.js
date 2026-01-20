// ============================================
// /api/events — Управление событиями
// ============================================

import { supabase } from '../lib/supabase.js';
const { verifyVKSignature, extractVkUserId } = require('../lib/vk');

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-VK-Params',
};

module.exports = async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VK-Params');
    return res.status(200).end();
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // Получаем параметры VK
    let vkParams = {};
    
    // Из заголовка
    if (req.headers['x-vk-params']) {
      try {
        vkParams = JSON.parse(req.headers['x-vk-params']);
      } catch (e) {
        console.warn('Failed to parse X-VK-Params header');
      }
    }
    
    // Из query string (для GET запросов)
    if (Object.keys(vkParams).length === 0 && req.query) {
      vkParams = req.query;
    }

    console.log('VK Params:', vkParams);

    // Проверяем подпись (мягкая проверка)
    const signatureValid = verifyVKSignature(vkParams);
    console.log('Signature valid:', signatureValid);

    // Извлекаем user ID
    let vkUserId = extractVkUserId(vkParams);
    
    // Для разработки: если нет user ID, используем тестовый
    if (!vkUserId) {
      console.warn('⚠️ No vk_user_id, using test ID');
      vkUserId = 518565944; // Ваш VK ID для тестов
    }

    console.log('VK User ID:', vkUserId);

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

      console.log('Creating event:', req.body);

      // Валидация
      if (!event_type) {
        return res.status(400).json({ error: 'event_type is required' });
      }
      if (!event_day || !event_month) {
        return res.status(400).json({ error: 'event_day and event_month are required' });
      }
      if (!recipient_name || recipient_name.trim() === '') {
        return res.status(400).json({ error: 'recipient_name is required' });
      }

      // Проверяем/создаём пользователя
      let { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('vk_user_id', vkUserId)
        .single();

      if (!user) {
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({ vk_user_id: vkUserId })
          .select('id')
          .single();
        
        if (userError) {
          console.error('Error creating user:', userError);
          throw userError;
        }
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

      console.log('Event data:', eventData);

      const { data: event, error } = await supabase
        .from('events')
        .insert(eventData)
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
        if (error.message.includes('лимит') || error.message.includes('limit')) {
          return res.status(400).json({ 
            error: 'Достигнут лимит в 10 событий' 
          });
        }
        throw error;
      }

      console.log('Event created:', event);
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
