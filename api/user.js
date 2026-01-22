import { supabase } from '../lib/supabase.js';
import { extractVkUserId } from '../lib/vk.js';

export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, vk-params');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { vk_user_id, user_name } = req.body;

      if (!vk_user_id) {
        return res.status(400).json({ error: 'vk_user_id is required' });
      }

      // Проверяем, есть ли пользователь (или обновляем имя)
      const { data, error } = await supabase
        .from('events') // Мы храним ID пользователей прямо в events, но для проверки можно сделать простой select
        .select('vk_user_id')
        .eq('vk_user_id', vk_user_id)
        .limit(1);
        
      // В твоей архитектуре MVP нет отдельной таблицы users, так что просто возвращаем успех
      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('User API Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
