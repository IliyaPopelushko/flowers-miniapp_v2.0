import { supabase } from '../lib/supabase.js';
import { extractVkUserId } from '../lib/vk.js';

export default async function handler(req, res) {
  // Настройка CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VK-Params');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const vk_user_id = req.query.vk_user_id || extractVkUserId(req.query);

    if (!vk_user_id) {
      return res.status(400).json({ error: 'vk_user_id is missing' });
    }

    // Логика получения или создания пользователя
    const { data, error } = await supabase
      .from('users') // Проверьте, как называется таблица: users или клиенты
      .select('*')
      .eq('vk_user_id', vk_user_id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 - не найдено

    return res.status(200).json(data || { new_user: true });

  } catch (error) {
    console.error('User API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
