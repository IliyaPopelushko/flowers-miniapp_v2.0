import { useState, useEffect } from 'react';
import { api } from '../api';

const STATUS_CONFIG = {
  new: { 
    label: '🆕 Новый', 
    color: '#2196F3',
    bg: '#e3f2fd',
    next: ['confirmed', 'cancelled']
  },
  confirmed: { 
    label: '✅ Подтверждён', 
    color: '#4CAF50',
    bg: '#e8f5e9',
    next: ['completed', 'cancelled']
  },
  completed: { 
    label: '🎉 Выполнен', 
    color: '#9E9E9E',
    bg: '#f5f5f5',
    next: []
  },
  cancelled: { 
    label: '❌ Отменён', 
    color: '#f44336',
    bg: '#ffebee',
    next: []
  }
};

const STATUS_ACTIONS = {
  confirmed: { label: '✅ Подтвердить', color: '#4CAF50' },
  completed: { label: '🎉 Выполнен', color: '#FF9800' },
  cancelled: { label: '❌ Отменить', color: '#f44336' }
};

export default function Preorders() {
  const [preorders, setPreorders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active'); // active, all, completed

  useEffect(() => {
    loadPreorders();
  }, [filter]);

  async function loadPreorders() {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      if (filter === 'active') {
        params.status = 'new,confirmed';
      } else if (filter === 'completed') {
        params.status = 'completed,cancelled';
      }
      
      const data = await api.getPreorders(params);
      setPreorders(data.preorders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(preorderId, newStatus) {
    try {
      await api.updatePreorderStatus(preorderId, newStatus);
      // Обновляем локально
      setPreorders(prev => 
        prev.map(p => 
          p.id === preorderId ? { ...p, status: newStatus } : p
        )
      );
    } catch (err) {
      alert('Ошибка: ' + err.message);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  }

  function formatDeliveryDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long'
    });
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>📦 Предзаказы</h1>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>📦 Предзаказы</h1>

      {error && <div style={styles.error}>❌ {error}</div>}

      {/* Фильтры */}
      <div style={styles.filters}>
        <button 
          style={{
            ...styles.filterBtn,
            ...(filter === 'active' ? styles.filterBtnActive : {})
          }}
          onClick={() => setFilter('active')}
        >
          🔔 Активные
        </button>
        <button 
          style={{
            ...styles.filterBtn,
            ...(filter === 'all' ? styles.filterBtnActive : {})
          }}
          onClick={() => setFilter('all')}
        >
          📋 Все
        </button>
        <button 
          style={{
            ...styles.filterBtn,
            ...(filter === 'completed' ? styles.filterBtnActive : {})
          }}
          onClick={() => setFilter('completed')}
        >
          ✅ Завершённые
        </button>
      </div>

      {/* Статистика */}
      <div style={styles.stats}>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>
            {preorders.filter(p => p.status === 'new').length}
          </span>
          <span style={styles.statLabel}>Новых</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>
            {preorders.filter(p => p.status === 'confirmed').length}
          </span>
          <span style={styles.statLabel}>Подтверждённых</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statNumber}>
            {preorders.reduce((sum, p) => 
              ['new', 'confirmed'].includes(p.status) ? sum + (p.bouquet_price || 0) : sum
            , 0)}₽
          </span>
          <span style={styles.statLabel}>Сумма активных</span>
        </div>
      </div>

      {/* Список предзаказов */}
      {preorders.length === 0 ? (
        <div style={styles.empty}>
          <p>📭 Нет предзаказов</p>
        </div>
      ) : (
        <div style={styles.list}>
          {preorders.map(preorder => (
            <PreorderCard 
              key={preorder.id} 
              preorder={preorder}
              onStatusChange={handleStatusChange}
              formatDate={formatDate}
              formatDeliveryDate={formatDeliveryDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PreorderCard({ preorder, onStatusChange, formatDate, formatDeliveryDate }) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = STATUS_CONFIG[preorder.status] || STATUS_CONFIG.new;
  const nextStatuses = statusConfig.next || [];

  return (
    <div style={{
      ...styles.card,
      borderLeft: `4px solid ${statusConfig.color}`
    }}>
      {/* Заголовок */}
      <div style={styles.cardHeader} onClick={() => setExpanded(!expanded)}>
        <div style={styles.cardMain}>
          <div style={styles.cardTitle}>
            💐 {preorder.bouquet_name}
          </div>
          <div style={styles.cardSubtitle}>
            👤 {preorder.recipient_name} • 📅 {formatDeliveryDate(preorder.delivery_date)}
          </div>
        </div>
        <div style={styles.cardRight}>
          <div style={{
            ...styles.statusBadge,
            background: statusConfig.bg,
            color: statusConfig.color
          }}>
            {statusConfig.label}
          </div>
          <div style={styles.cardPrice}>{preorder.bouquet_price}₽</div>
        </div>
        <div style={styles.expandIcon}>{expanded ? '▲' : '▼'}</div>
      </div>

      {/* Развёрнутое содержимое */}
      {expanded && (
        <div style={styles.cardBody}>
          <div style={styles.cardInfo}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Клиент:</span>
              <a 
                href={`https://vk.com/id${preorder.vk_user_id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.link}
              >
                vk.com/id{preorder.vk_user_id}
              </a>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Тип:</span>
              <span>{preorder.delivery_type === 'self_pickup' ? '🏪 Самовывоз' : '🚗 Доставка'}</span>
            </div>
            {preorder.delivery_type === 'delivery' && (
              <>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Адрес:</span>
                  <span>{preorder.delivery_address || '—'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Время:</span>
                  <span>{preorder.delivery_time || '—'}</span>
                </div>
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Телефон:</span>
                  <span>{preorder.recipient_phone || '—'}</span>
                </div>
              </>
            )}
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Создан:</span>
              <span>{formatDate(preorder.created_at)}</span>
            </div>
          </div>

          {/* Кнопки действий */}
          {nextStatuses.length > 0 && (
            <div style={styles.actions}>
              {nextStatuses.map(status => (
                <button
                  key={status}
                  style={{
                    ...styles.actionBtn,
                    background: STATUS_ACTIONS[status].color
                  }}
                  onClick={() => onStatusChange(preorder.id, status)}
                >
                  {STATUS_ACTIONS[status].label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto'
  },
  error: {
    background: '#ffe0e0',
    color: '#c00',
    padding: '10px 15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  filters: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px'
  },
  filterBtn: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px'
  },
  filterBtnActive: {
    background: '#e91e63',
    color: 'white',
    border: '1px solid #e91e63'
  },
  stats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '25px',
    flexWrap: 'wrap'
  },
  statItem: {
    background: '#f8f9fa',
    padding: '15px 25px',
    borderRadius: '10px',
    textAlign: 'center'
  },
  statNumber: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#e91e63'
  },
  statLabel: {
    fontSize: '13px',
    color: '#666'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#999'
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px 20px',
    cursor: 'pointer',
    gap: '15px'
  },
  cardMain: {
    flex: 1
  },
  cardTitle: {
    fontWeight: 'bold',
    fontSize: '16px',
    marginBottom: '5px'
  },
  cardSubtitle: {
    fontSize: '14px',
    color: '#666'
  },
  cardRight: {
    textAlign: 'right'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '5px 10px',
    borderRadius: '15px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '5px'
  },
  cardPrice: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  expandIcon: {
    color: '#999',
    fontSize: '12px'
  },
  cardBody: {
    padding: '0 20px 20px',
    borderTop: '1px solid #eee'
  },
  cardInfo: {
    padding: '15px 0'
  },
  infoRow: {
    display: 'flex',
    padding: '8px 0',
    borderBottom: '1px solid #f5f5f5'
  },
  infoLabel: {
    width: '100px',
    color: '#999',
    fontSize: '14px'
  },
  link: {
    color: '#2196F3',
    textDecoration: 'none'
  },
  actions: {
    display: 'flex',
    gap: '10px',
    paddingTop: '15px',
    borderTop: '1px solid #eee',
    marginTop: '10px'
  },
  actionBtn: {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '14px'
  }
};
