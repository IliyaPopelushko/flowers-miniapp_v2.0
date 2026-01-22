// pages/api/events/[id].js
import { supabase } from '../../../lib/supabase';
import { getVkUserFromParams } from '../../../lib/vk';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VK-Params');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { id } = req.query;

    // Получаем VK ID из подписи (самый надёжный способ в Mini Apps)
    const vkUser = getVkUserFromParams(req.headers['x-vk-params'] || req.query);
    if (!vkUser) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const vk_user_id = vkUser.vk_user_id;

    if (req.method === 'GET') {
      // Получить все события пользователя
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('vk_user_id', vk_user_id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      // Создать событие
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('vk_user_id', vk_user_id);

      if (existing.length >= 10) {
        return res.status(400).json({ error: 'Лимит 10 событий' });
      }

      const { data, error } = await supabase
        .from('events')
        .insert({
          vk_user_id,
          user_name: vkUser.first_name + ' ' + vkUser.last_name,
          ...body,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

      const { data, error } = await supabase
        .from('events')
        .update(body)
        .eq('id', id)
        .eq('vk_user_id', vk_user_id)
        .select()
        .single();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)
        .eq('vk_user_id', vk_user_id);

      if (error) throw error;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('API /events/[id] error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: err.message 
    });
  }
}

// УБЕДИСЬ, что у тебя есть файл lib/vk.js с таким содержимым:
