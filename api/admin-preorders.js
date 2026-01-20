import jwt from 'jsonwebtoken';
import { supabase } from '../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware для проверки админа
async function checkAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Проверяем роль (при входе по паролю ставится role: 'admin')
    if (decoded.role === 'admin') {
      return decoded;
    }
    
    // Или проверяем vk_id в списке админов
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_vk_ids')
      .single();

    if (settings?.value?.includes(decoded.vk_id)) {
      return decoded;
    }

    return null;
  } catch {
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

  const admin = await checkAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Не авторизован' });
  }

  try {
    // GET — список предзаказов
    if (req.method === 'GET') {
      const { status } = req.query;

      let query = supabase
        .from('preorders')
        .select(`
          *,
          events (
            event_type,
            event_date,
            recipient_name,
            user_name
          )
        `)
        .order('created_at', { ascending: false });

      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: preorders, error } = await query;

      if (error) {
        console.error('Preorders fetch error:', error);
        return res.status(500).json({ error: 'Ошибка загрузки предзаказов' });
      }

      // Преобразуем данные для фронта
      const formattedPreorders = preorders.map(p => ({
        ...p,
        event_type: p.events?.event_type,
        event_date: p.events?.event_date,
        recipient_name: p.recipient_name || p.events?.recipient_name,
        user_name: p.events?.user_name
      }));

      return res.status(200).json({ preorders: formattedPreorders });
    }

    // PATCH — обновление статуса
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
