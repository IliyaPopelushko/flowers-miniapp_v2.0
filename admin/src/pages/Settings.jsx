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
    economy: { vk_id: '', name: '', price: '', photo: '' },
    medium: { vk_id: '', name: '', price: '', photo: '' },
    premium: { vk_id: '', name: '', price: '', photo: '' }
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
      
      setBouquets({
        economy: {
          vk_id: s.bouquet_economy_vk_id || '',
          name: s.bouquet_economy_name || '',
          price: s.bouquet_economy_price || '',
          photo: s.bouquet_economy_photo || ''
        },
        medium: {
          vk_id: s.bouquet_medium_vk_id || '',
          name: s.bouquet_medium_name || '',
          price: s.bouquet_medium_price || '',
          photo: s.bouquet_medium_photo || ''
        },
        premium: {
          vk_id: s.bouquet_premium_vk_id || '',
          name: s.bouquet_premium_name || '',
          price: s.bouquet_premium_price || '',
          photo: s.bouquet_premium_photo || ''
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
        bouquet_economy_photo: bouquets.economy.photo || null,
        
        bouquet_medium_vk_id: bouquets.medium.vk_id || null,
        bouquet_medium_name: bouquets.medium.name || null,
        bouquet_medium_price: bouquets.medium.price ? Number(bouquets.medium.price) : null,
        bouquet_medium_photo: bouquets.medium.photo || null,
        
        bouquet_premium_vk_id: bouquets.premium.vk_id || null,
        bouquet_premium_name: bouquets.premium.name || null,
        bouquet_premium_price: bouquets.premium.price ? Number(bouquets.premium.price) : null,
        bouquet_premium_photo: bouquets.premium.photo || null
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
        Укажите 3 букета для напоминаний клиентам.
      </p>

      {error && <div style={styles.error}>❌ {error}</div>}
      {success && <div style={styles.success}>✅ Настройки сохранены!</div>}

      <div style={styles.hint}>
        <strong>💡 Как получить данные:</strong>
        <ol>
          <li>Откройте товар в группе ВК</li>
          <li><strong>ID товара:</strong> в адресной строке <code>vk.com/market-123_<strong>789</strong></code> → ID = 789</li>
          <li><strong>Фото:</strong> кликните правой кнопкой на фото → "Копировать адрес изображения"</li>
        </ol>
      </div>

      {/* Эконом букет */}
      <BouquetForm
        title="💰 Эконом"
        data={bouquets.economy}
        onChange={(field, value) => handleChange('economy', field, value)}
      />

      {/* Средний букет */}
      <BouquetForm
        title="💐 Средний"
        data={bouquets.medium}
        onChange={(field, value) => handleChange('medium', field, value)}
      />

      {/* Премиум букет */}
      <BouquetForm
        title="👑 Премиум"
        data={bouquets.premium}
        onChange={(field, value) => handleChange('premium', field, value)}
      />

      {/* Предпросмотр */}
      <div style={styles.preview}>
        <h3>📋 Предпросмотр</h3>
        <div style={styles.previewCards}>
          {['economy', 'medium', 'premium'].map(cat => (
            bouquets[cat].name && (
              <div key={cat} style={styles.previewCard}>
                {bouquets[cat].photo && (
                  <img 
                    src={bouquets[cat].photo} 
                    alt={bouquets[cat].name}
                    style={styles.previewImage}
                  />
                )}
                <div style={styles.previewInfo}>
                  <strong>{bouquets[cat].name}</strong>
                  <div>{bouquets[cat].price}₽</div>
                </div>
              </div>
            )
          ))}
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

function BouquetForm({ title, data, onChange }) {
  return (
    <div style={styles.bouquetCard}>
      <h3>{title}</h3>
      <div style={styles.formGrid}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Название букета *</label>
          <input
            type="text"
            style={styles.input}
            placeholder="Например: Нежность"
            value={data.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Цена (₽) *</label>
          <input
            type="number"
            style={styles.input}
            placeholder="1500"
            value={data.price}
            onChange={(e) => onChange('price', e.target.value)}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>ID товара в ВК</label>
          <input
            type="text"
            style={styles.input}
            placeholder="123456"
            value={data.vk_id}
            onChange={(e) => onChange('vk_id', e.target.value)}
          />
        </div>
        <div style={styles.formGroupFull}>
          <label style={styles.label}>Ссылка на фото</label>
          <input
            type="text"
            style={styles.input}
            placeholder="https://sun9-xx.userapi.com/..."
            value={data.photo}
            onChange={(e) => onChange('photo', e.target.value)}
          />
        </div>
      </div>
      {data.photo && (
        <div style={styles.photoPreview}>
          <img src={data.photo} alt="Превью" style={styles.photoImg} />
        </div>
      )}
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
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '15px',
    marginTop: '15px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  formGroupFull: {
    display: 'flex',
    flexDirection: 'column',
    gridColumn: '1 / -1'
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
  photoPreview: {
    marginTop: '15px'
  },
  photoImg: {
    maxWidth: '150px',
    maxHeight: '150px',
    borderRadius: '8px',
    objectFit: 'cover'
  },
  preview: {
    background: '#fff3e0',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '25px'
  },
  previewCards: {
    display: 'flex',
    gap: '15px',
    marginTop: '15px',
    flexWrap: 'wrap'
  },
  previewCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '10px',
    width: '150px'
  },
  previewImage: {
    width: '100%',
    height: '100px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  previewInfo: {
    marginTop: '10px',
    textAlign: 'center'
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
