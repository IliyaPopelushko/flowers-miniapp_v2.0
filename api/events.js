import { supabase } from '../lib/supabase.js'; // Обратите внимание: одна точка "../"
import { extractVkUserId } from '../lib/vk.js'; // Одна точка "../"

export default async function handler(req, res) {
  // Настройка CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VK-Params');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    // GET - Получить события пользователя
    if (req.method === 'GET') {
      const { vk_user_id } = req.query;

      if (!vk_user_id) {
        return res.status(400).json({ error: 'vk_user_id required' });
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('vk_user_id', vk_user_id)
        .order('event_month', { ascending: true })
        .order('event_day', { ascending: true });

      if (error) throw error;

      return res.status(200).json(data);
    }

    // POST - Добавить событие
    if (req.method === 'POST') {
      const body = req.body;
      
      const { data, error } = await supabase
        .from('events')
        .insert([body])
        .select();

      if (error) throw error;

      return res.status(201).json(data[0]);
    }

  } catch (error) {
    console.error('Events API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
