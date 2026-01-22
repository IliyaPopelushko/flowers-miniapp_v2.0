import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  // CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-VK-Params, vk-params');  // ✅ Добавлен X-VK-Params

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { vk_user_id, user_name } = req.body;

      if (!vk_user_id) {
        return res.status(400).json({ error: 'vk_user_id is required' });
      }

      // Проверяем, есть ли пользователь
      const { data, error } = await supabase
        .from('events')
        .select('vk_user_id')
        .eq('vk_user_id', vk_user_id)
        .limit(1);
        
      return res.status(200).json({ success: true });

    } catch (error) {
      console.error('User API Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
