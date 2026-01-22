import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  console.log(`Incoming ${req.method} request to /api/events`);

  // ✅ CORS для всех запросов (включая OPTIONS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-VK-Params, vk-params');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    // GET - Получить события
    if (req.method === 'GET') {
      const { vk_user_id } = req.query;
      console.log('GET Params:', req.query);

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
        console.error('Supabase GET Error:', error);
        throw error;
      }

      return res.status(200).json(data);
    }

    // POST - Добавить событие
    if (req.method === 'POST') {
      let body = req.body;

      console.log('Raw Body:', body);

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

      const { data, error } = await supabase
        .from('events')
        .insert([body])
        .select();

      if (error) {
        console.error('Supabase INSERT Error:', error);
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
