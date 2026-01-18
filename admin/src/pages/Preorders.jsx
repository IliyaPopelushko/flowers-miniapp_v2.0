import React, { useState, useEffect } from 'react';
import { api } from '../api';

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold'
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px'
  },
  tab: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '500',
    background: '#f0f0f0',
    color: '#666'
  },
  tabActive: {
    background: '#e91e63',
    color: '#fff'
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600'
  },
  badge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: '500'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px'
  },
  field: {
    fontSize: '14px'
  },
  fieldLabel: {
    color: '#999',
    marginBottom: '4px'
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #eee'
  },
  btn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999'
  }
};

const statusColors = {
  new: { background: '#e3f2fd', color: '#1976d2' },
  confirmed: { background: '#fff3e0', color: '#f57c00' },
  completed: { background: '#e8f5e9', color: '#388e3c' },
  cancelled: { background: '#ffebee', color: '#d32f2f' }
};

const statusLabels = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  completed: 'Выполнен',
  cancelled: 'Отменён'
};

function Preorders() {
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('new');

  useEffect(() => {
    loadPreorders();
  }, [filter]);

  const loadPreorders = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await api.getPreorders(params);
      setPreorders(data.preorders || []);
    } catch (e) {
      console.error('Failed to load preorders:', e);
    }
    setLoading(false);
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await api.updatePreorderStatus(id, newStatus);
      loadPreorders();
    } catch (e) {
      alert('Ошибка: ' + e.message);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>🛒 Предзаказы</h1>
        <span style={{ color: '#666' }}>Найдено: {preorders.length}</span>
      </div>

      <div style={styles.tabs}>
        {[
          { key: 'new', label: '🆕 Новые' },
          { key: 'confirmed', label: '✅ Подтверждённые' },
          { key: 'completed', label: '📦 Выполненные' },
          { key: 'cancelled', label: '❌ Отменённые' },
          { key: 'all', label: 'Все' }
        ].map(tab => (
          <button
            key={tab.key}
            style={{...styles.tab, ...(filter === tab.key ? styles.tabActive : {})}}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.empty}>Загрузка...</div>
      ) : preorders.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
          <p>Предзаказов не найдено</p>
        </div>
      ) : (
        preorders.map(order => (
          <div key={order.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <div style={styles.cardTitle}>
                  {order.bouquet_name}
                </div>
                <a 
                  href={`https://vk.com/id${order.vk_user_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0077ff', fontSize: '14px' }}
                >
                  {order.user_name || `id${order.vk_user_id}`}
                </a>
              </div>
              <span style={{...styles.badge, ...statusColors[order.status]}}>
                {statusLabels[order.status]}
              </span>
            </div>

            <div style={styles.grid}>
              <div style={styles.field}>
                <div style={styles.fieldLabel}>💰 Цена</div>
                <div>{order.bouquet_price} ₽</div>
              </div>
              <div style={styles.field}>
                <div style={styles.fieldLabel}>📅 Дата события</div>
                <div>{formatDate(order.event_date)}</div>
              </div>
              <div style={styles.field}>
                <div style={styles.fieldLabel}>📦 Тип</div>
                <div>{order.delivery_type === 'delivery' ? '🚗 Доставка' : '🏪 Самовывоз'}</div>
              </div>
              <div style={styles.field}>
                <div style={styles.fieldLabel}>👤 Получатель</div>
                <div>{order.recipient_name}</div>
              </div>
              {order.delivery_type === 'delivery' && (
                <>
                  <div style={styles.field}>
                    <div style={styles.fieldLabel}>📍 Адрес</div>
                    <div>{order.delivery_address}</div>
                  </div>
                  <div style={styles.field}>
                    <div style={styles.fieldLabel}>🕐 Время</div>
                    <div>{order.delivery_time}</div>
                  </div>
                  <div style={styles.field}>
                    <div style={styles.fieldLabel}>📞 Телефон</div>
                    <div>{order.recipient_phone}</div>
                  </div>
                </>
              )}
            </div>

            <div style={styles.actions}>
              {order.status === 'new' && (
                <>
                  <button 
                    style={{...styles.btn, background: '#4caf50', color: '#fff'}}
                    onClick={() => updateStatus(order.id, 'confirmed')}
                  >
                    ✅ Подтвердить
                  </button>
                  <button 
                    style={{...styles.btn, background: '#f44336', color: '#fff'}}
                    onClick={() => updateStatus(order.id, 'cancelled')}
                  >
                    ❌ Отменить
                  </button>
                </>
              )}
              {order.status === 'confirmed' && (
                <button 
                  style={{...styles.btn, background: '#2196f3', color: '#fff'}}
                  onClick={() => updateStatus(order.id, 'completed')}
                >
                  📦 Выполнен
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Preorders;
