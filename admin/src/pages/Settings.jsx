import { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Форма для букетов
  const [bouquets, setBouquets] = useState({
    economy: { vk_id: '', name: '', price: '' },
    medium: { vk_id: '', name: '', price: '' },
    premium: { vk_id: '', name: '', price: '' }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);

      const res = await getSettings();
      const s = res.settings || {};
      
      setSettings(s);
      
      // Заполняем форму текущими значениями
      setBouquets({
        economy: {
          vk_id: s.bouquet_economy_vk_id || '',
          name: s.bouquet_economy_name || '',
          price: s.bouquet_economy_price || ''
        },
        medium: {
          vk_id: s.bouquet_medium_vk_id || '',
          name: s.bouquet_medium_name || '',
          price: s.bouquet_medium_price || ''
        },
        premium: {
          vk_id: s.bouquet_premium_vk_id || '',
          name: s.bouquet_premium_name || '',
          price: s.bouquet_premium_price || ''
        }
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(category, field, value) {
    setBouquets(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const updates = {
        bouquet_economy_vk_id: bouquets.economy.vk_id || null,
        bouquet_economy_name: bouquets.economy.name || null,
        bouquet_economy_price: bouquets.economy.price ? Number(bouquets.economy.price) : null,
        
        bouquet_medium_vk_id: bouquets.medium.vk_id || null,
        bouquet_medium_name: bouquets.medium.name || null,
        bouquet_medium_price: bouquets.medium.price ? Number(bouquets.medium.price) : null,
        
        bouquet_premium_vk_id: bouquets.premium.vk_id || null,
        bouquet_premium_name: bouquets.premium.name || null,
        bouquet_premium_price: bouquets.premium.price ? Number(bouquets.premium.price) : null
      };

      await updateSettings(updates);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>⚙️ Настройки букетов</h1>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>⚙️ Настройки букетов</h1>
      
      <p style={styles.description}>
        Укажите 3 букета для напоминаний клиентам. Данные можно взять из раздела "Товары" вашей группы ВК.
      </p>

      {error && <div style={styles.error}>❌ {error}</div>}
      {success && <div style={styles.success}>✅ Настройки сохранены!</div>}

      <div style={styles.hint}>
        <strong>💡 Как узнать ID товара:</strong>
        <ol>
          <li>Откройте товар в группе ВК</li>
          <li>В адресной строке будет: <code>vk.com/market-123456_<strong>789</strong></code></li>
          <li>Число после подчёркивания (789) — это ID товара</li>
        </ol>
      </div>

      {/* Эконом букет */}
      <BouquetForm
        title="💰 Эконом (до 1500₽)"
        data={bouquets.economy}
        onChange={(field, value) => handleChange('economy', field, value)}
      />

      {/* Средний букет */}
      <BouquetForm
        title="💐 Средний (1500-3000₽)"
        data={bouquets.medium}
        onChange={(field, value) => handleChange('medium', field, value)}
      />

      {/* Премиум букет */}
      <BouquetForm
        title="👑 Премиум (от 3000₽)"
        data={bouquets.premium}
        onChange={(field, value) => handleChange('premium', field, value)}
      />

      {/* Предпросмотр */}
      <div style={styles.preview}>
        <h3>📋 Предпросмотр (как увидит клиент)</h3>
        <div style={styles.previewContent}>
          {bouquets.economy.name && (
            <div>💐 {bouquets.economy.name} — {bouquets.economy.price}₽</div>
          )}
          {bouquets.medium.name && (
            <div>💐 {bouquets.medium.name} — {bouquets.medium.price}₽</div>
          )}
          {bouquets.premium.name && (
            <div>💐 {bouquets.premium.name} — {bouquets.premium.price}₽</div>
          )}
          {!bouquets.economy.name && !bouquets.medium.name && !bouquets.premium.name && (
            <div style={styles.noData}>Заполните данные букетов</div>
          )}
        </div>
      </div>

      <button 
        style={styles.saveButton} 
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? '💾 Сохранение...' : '💾 Сохранить настройки'}
      </button>
    </div>
  );
}

// Компонент формы для одного букета
function BouquetForm({ title, data, onChange }) {
  return (
    <div style={styles.bouquetCard}>
      <h3>{title}</h3>
      <div style={styles.formRow}>
        <div style={styles.formGroup}>
          <label style={styles.label}>ID товара в ВК</label>
          <input
            type="text"
            style={styles.input}
            placeholder="Например: 123456"
            value={data.vk_id}
            onChange={(e) => onChange('vk_id', e.target.value)}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Название букета</label>
          <input
            type="text"
            style={styles.input}
            placeholder="Например: Нежность"
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Цена (₽)</label>
          <input
            type="number"
            style={styles.input}
            placeholder="1500"
            value={data.price}
            onChange={(e) => onChange('price', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  description: {
    color: '#666',
    marginBottom: '20px'
  },
  error: {
    background: '#ffe0e0',
    color: '#c00',
    padding: '10px 15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  success: {
    background: '#e0ffe0',
    color: '#080',
    padding: '10px 15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  hint: {
    background: '#e3f2fd',
    padding: '15px 20px',
    borderRadius: '10px',
    marginBottom: '25px',
    fontSize: '14px'
  },
  bouquetCard: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '5px'
  },
  input: {
    padding: '10px 12px',
    fontSize: '15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    outline: 'none'
  },
  preview: {
    background: '#fff3e0',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '25px'
  },
  previewContent: {
    marginTop: '10px',
    lineHeight: '1.8'
  },
  noData: {
    color: '#999',
    fontStyle: 'italic'
  },
  saveButton: {
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    borderRadius: '10px',
    fontSize: '16px',
    cursor: 'pointer',
    width: '100%'
  }
};
