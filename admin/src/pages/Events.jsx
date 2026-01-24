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
  filters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  input: {
    padding: '10px 14px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px'
  },
  table: {
    width: '100%',
    background: '#fff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    background: '#f8f9fa',
    fontWeight: '600',
    fontSize: '14px',
    color: '#666'
  },
  td: {
    padding: '14px 16px',
    borderTop: '1px solid #eee',
    fontSize: '14px'
  },
  link: {
    color: '#0077ff',
    textDecoration: 'none'
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#999'
  }
};

const statusColors = {
  active: { background: '#e3f2fd', color: '#1976d2' },
  reminded_7d: { background: '#fff3e0', color: '#f57c00' },
  reminded_3d: { background: '#fff8e1', color: '#ffa000' },
  reminded_1d: { background: '#ffebee', color: '#d32f2f' },
  preordered: { background: '#e8f5e9', color: '#388e3c' },
  completed: { background: '#f5f5f5', color: '#757575' }
};

const statusLabels = {
  active: 'Активно',
  reminded_7d: 'Напомнили (7д)',
  reminded_3d: 'Напомнили (3д)',
  reminded_1d: 'Напомнили (1д)',
  preordered: 'Предзаказ',
  completed: 'Завершено'
};

const eventTypeLabels = {
  birthday: 'День рождения',
  anniversary: 'Юбилей',
  wedding_anniversary: 'Годовщина',
  valentine: '14 февраля',
  march8: '8 марта',
  mothers_day: 'День матери',
  other: 'Другое'
};

// ✅ Названия месяцев для отображения
const monthNames = [
  '', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const data = await api.getEvents(params);
      setEvents(data.events || []);
    } catch (e) {
      console.error('Failed to load events:', e);
    }
    setLoading(false);
  };

  const handleFilter = () => {
    loadEvents();
  };

  // ✅ Исправленная функция форматирования даты
  const formatEventDate = (day, month) => {
    if (!day || !month) return '—';
    return `${day} ${monthNames[month] || month}`;
  };

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>📅 События клиентов</h1>
        <span style={{ color: '#666' }}>Всего: {events.length}</span>
      </div>

      <div style={styles.filters}>
        <input
          type="text"
          placeholder="🔍 Поиск по имени..."
          style={{...styles.input, width: '250px'}}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleFilter()}
        />
        <input
          type="date"
          style={styles.input}
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <span style={{ alignSelf: 'center' }}>—</span>
        <input
          type="date"
          style={styles.input}
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
        <button
          onClick={handleFilter}
          style={{...styles.input, background: '#e91e63', color: '#fff', border: 'none', cursor: 'pointer'}}
        >
          Применить
        </button>
      </div>

      {loading ? (
        <div style={styles.empty}>Загрузка...</div>
      ) : events.length === 0 ? (
        <div style={styles.empty}>
          <p style={{ fontSize: '48px', marginBottom: '16px' }}>📭</p>
          <p>События не найдены</p>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Клиент</th>
              <th style={styles.th}>Событие</th>
              <th style={styles.th}>Дата</th>
              <th style={styles.th}>Получатель</th>
              <th style={styles.th}>Статус</th>
              <th style={styles.th}>Комментарий</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td style={styles.td}>
                  <a
                    href={`https://vk.com/id${event.vk_user_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    {event.user_name || `id${event.vk_user_id}`}
                  </a>
                </td>
                <td style={styles.td}>
                  {eventTypeLabels[event.event_type] || event.event_type}
                  {event.custom_event_name && ` (${event.custom_event_name})`}
                </td>
                {/* ✅ Исправленный вызов с двумя параметрами */}
                <td style={styles.td}>{formatEventDate(event.event_day, event.event_month)}</td>
                <td style={styles.td}>{event.recipient_name}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    ...statusColors[event.status] || statusColors.active
                  }}>
                    {statusLabels[event.status] || event.status}
                  </span>
                </td>
                <td style={styles.td}>{event.comment || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Events;
