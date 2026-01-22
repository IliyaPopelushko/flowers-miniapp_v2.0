import { supabase } from '../lib/supabase.js';
import { extractVkUserId } from '../lib/vk.js';

export default async function handler(req, res) {
  // 1. Логируем начало запроса (появится в логах Vercel Function)
  console.log(`Incoming ${req.method} request to /api/events`);

  // Настройка CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-VK-Params');
    return res.status(200).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json'); // Явно указываем JSON

  try {
    // GET - Получить события
    if (req.method === 'GET') {
      const { vk_user_id } = req.query;
      console.log('GET Params:', req.query); // Лог

      if (!vk_user_id) {
        return res.status(400).json({ error: 'vk_user_id required' });
      }

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('vk_user_id', vk_user_id)
        .order('event_month', { ascending: true })
        .order('event_day', { ascending: true });

      if (error) {
        console.error('Supabase GET Error:', error); // Лог ошибки БД
        throw error;
      }

      return res.status(200).json(data);
    }

    // POST - Добавить событие
    if (req.method === 'POST') {
      let body = req.body;

      console.log('Raw Body:', body); // Лог тела запроса

      // Защита: если body пришел строкой (бывает при проблемах с заголовками)
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (e) {
          console.error('JSON Parse Error:', e);
          return res.status(400).json({ error: 'Invalid JSON body' });
        }
      }

      if (!body) {
        return res.status(400).json({ error: 'Body is empty' });
      }

      // Важный момент: убедимся, что отправляем массив, если insert ждет массив
      // Или объект, если insert ждет объект (v2 Supabase умеет и так, и так)
      const { data, error } = await supabase
        .from('events')
        .insert([body]) // Оборачиваем в массив, как у вас было
        .select();

      if (error) {
        console.error('Supabase INSERT Error:', error); // Важный лог!
        // Часто падает из-за RLS или несоответствия типов полей
        return res.status(500).json({ error: 'Database error', details: error.message });
      }

      return res.status(201).json(data[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('CRITICAL Events API Error:', error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
