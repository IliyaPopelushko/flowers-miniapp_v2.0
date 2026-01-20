import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET;

async function checkAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_vk_ids')
      .single();

    if (!settings?.value?.includes(decoded.vk_id)) {
      return null;
    }

    return decoded;
  } catch (error) {
    console.error('CheckAdmin error:', error.message);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const admin = await checkAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { search, dateFrom, dateTo, status } = req.query;

    let query = supabase
      .from('events')
      .select('*')
      .order('event_day', { ascending: true });  // ← Исправлено!

    if (search) {
      query = query.or(`user_name.ilike.%${search}%,recipient_name.ilike.%${search}%`);
    }

    if (dateFrom) {
      query = query.gte('event_day', dateFrom);  // ← Исправлено!
    }

    if (dateTo) {
      query = query.lte('event_day', dateTo);  // ← Исправлено!
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Events fetch error:', error);
      return res.status(500).json({ error: 'Ошибка загрузки событий' });
    }

    return res.status(200).json({ events: events || [] });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}
