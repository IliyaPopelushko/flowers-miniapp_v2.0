import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET;

// Простая проверка — только валидность токена
function checkAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role === 'admin') {
      return decoded;
    }
    
    return null;
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const admin = checkAdmin(req);
    if (!admin) {
      return res.status(401).json({ error: 'Не авторизован' });
    }

    if (req.method === 'GET') {
      const { status } = req.query;

      let query = supabase
        .from('preorders')
        .select(`
          *,
          events (
            event_type,
            event_day,
            event_month,
            recipient_name
          )
        `)
        .eq('archived', false)
        .order('created_at', { ascending: false });

     if (status && status !== 'all') {
  const statuses = status.split(',').map(s => s.trim());
  query = query.in('status', statuses);
}

      const { data: preorders, error } = await query;

      if (error) {
        console.error('Preorders fetch error:', error);
        return res.status(500).json({ error: 'Ошибка загрузки предзаказов' });
      }

      const formattedPreorders = preorders.map(p => ({
        ...p,
        event_type: p.events?.event_type,
        event_day: p.events?.event_day,
        event_month: p.events?.event_month,
        recipient_name: p.recipient_name || p.events?.recipient_name
      }));

      return res.status(200).json({ preorders: formattedPreorders });
    }

    if (req.method === 'PATCH') {
      const { id, status } = req.body;

      if (!id || !status) {
        return res.status(400).json({ error: 'Необходимы id и status' });
      }

      const validStatuses = ['new', 'confirmed', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Недопустимый статус' });
      }

      const { data, error } = await supabase
        .from('preorders')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Preorder update error:', error);
        return res.status(500).json({ error: 'Ошибка обновления' });
      }

      return res.status(200).json({ preorder: data });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Preorders error:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}
