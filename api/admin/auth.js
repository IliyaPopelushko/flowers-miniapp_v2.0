import jwt from 'jsonwebtoken';
import { supabase } from '../../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    const token = authHeader.split(' ')[1];
    
    // Проверяем JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Проверяем, что пользователь всё ещё админ
    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'admin_vk_ids')
      .single();

    const adminIds = settings?.value || [];
    
    if (!adminIds.includes(decoded.vk_id)) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    return res.status(200).json({
      admin: {
        vk_id: decoded.vk_id,
        name: decoded.name,
        photo: decoded.photo
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Недействительный токен' });
    }
    console.error('Auth error:', error);
    return res.status(500).json({ error: 'Ошибка сервера' });
  }
}
