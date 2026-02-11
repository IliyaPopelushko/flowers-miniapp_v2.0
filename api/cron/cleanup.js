// ============================================
// POST /api/cron/cleanup
// Очистка старых данных
// ============================================

import { supabase } from '../../lib/supabase.js';

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key';

export default async function handler(req, res) {
  console.log('🧹 Starting cleanup job...');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    console.error('❌ Invalid authorization');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const results = {
      archivedPreorders: 0,
      cleanedUserStates: 0
    };

    // 1. Архивируем предзаказы старше 3 месяцев (выполненные/отменённые)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const { data: archivedData, error: archiveError } = await supabase
      .from('preorders')
      .update({ archived: true })
      .in('status', ['completed', 'cancelled'])
      .eq('archived', false)
      .lt('updated_at', threeMonthsAgo.toISOString())
      .select('id');

    if (archiveError) {
      console.error('Archive error:', archiveError);
    } else {
      results.archivedPreorders = archivedData?.length || 0;
      console.log(`📦 Archived ${results.archivedPreorders} old preorders`);
    }

    // 2. Удаляем user_states старше 24 часов
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: deletedStates, error: statesError } = await supabase
      .from('user_states')
      .delete()
      .lt('updated_at', oneDayAgo.toISOString())
      .select('vk_user_id');

    if (statesError) {
      console.error('User states cleanup error:', statesError);
    } else {
      results.cleanedUserStates = deletedStates?.length || 0;
      console.log(`🗑️ Cleaned ${results.cleanedUserStates} old user states`);
    }

    console.log('✅ Cleanup completed:', results);

    return res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
}
