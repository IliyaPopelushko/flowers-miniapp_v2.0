import { useState, useEffect } from 'react';
import { getProducts, getSettings, updateSettings } from '../api';

export default function Settings() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Выбранные букеты
  const [selectedBouquets, setSelectedBouquets] = useState({
    economy: null,
    medium: null,
    premium: null
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [productsRes, settingsRes] = await Promise.all([
        getProducts(),
        getSettings()
      ]);

      setProducts(productsRes.products || []);
      setSettings(settingsRes.settings || {});

      // Устанавливаем текущие выбранные букеты
      const s = settingsRes.settings || {};
      setSelectedBouquets({
        economy: s.bouquet_economy_vk_id || null,
        medium: s.bouquet_medium_vk_id || null,
        premium: s.bouquet_premium_vk_id || null
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const economyProduct = products.find(p => p.id === selectedBouquets.economy);
      const mediumProduct = products.find(p => p.id === selectedBouquets.medium);
      const premiumProduct = products.find(p => p.id === selectedBouquets.premium);

      const updates = {
        bouquet_economy_vk_id: economyProduct?.id || null,
        bouquet_economy_name: economyProduct?.name || null,
        bouquet_economy_price: economyProduct?.price || null,
        bouquet_medium_vk_id: mediumProduct?.id || null,
        bouquet_medium_name: mediumProduct?.name || null,
        bouquet_medium_price: mediumProduct?.price || null,
        bouquet_premium_vk_id: premiumProduct?.id || null,
        bouquet_premium_name: premiumProduct?.name || null,
        bouquet_premium_price: premiumProduct?.price || null
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

  function handleSelect(category, productId) {
    setSelectedBouquets(prev => ({
      ...prev,
      [category]: productId === prev[category] ? null : productId
    }));
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>⚙️ Настройки</h1>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>⚙️ Настройки букетов</h1>
      <p style={styles.description}>
        Выберите 3 букета для напоминаний клиентам: эконом, средний и премиум
      </p>

      {error && <div style={styles.error}>❌ {error}</div>}
      {success && <div style={styles.success}>✅ Настройки сохранены!</div>}

      {products.length === 0 ? (
        <div style={styles.warning}>
          ⚠️ В группе ВК нет товаров. Добавьте товары в раздел "Товары" группы.
        </div>
      ) : (
        <>
          <div style={styles.categories}>
            {/* Эконом */}
            <div style={styles.category}>
              <h2>💰 Эконом (до 1500₽)</h2>
              <div style={styles.productList}>
                {products.filter(p => p.price <= 1500).map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedBouquets.economy === product.id}
                    onSelect={() => handleSelect('economy', product.id)}
                  />
                ))}
                {products.filter(p => p.price <= 1500).length === 0 && (
                  <p style={styles.noProducts}>Нет товаров до 1500₽</p>
                )}
              </div>
            </div>

            {/* Средний */}
            <div style={styles.category}>
              <h2>💐 Средний (1500-3000₽)</h2>
              <div style={styles.productList}>
                {products.filter(p => p.price > 1500 && p.price <= 3000).map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedBouquets.medium === product.id}
                    onSelect={() => handleSelect('medium', product.id)}
                  />
                ))}
                {products.filter(p => p.price > 1500 && p.price <= 3000).length === 0 && (
                  <p style={styles.noProducts}>Нет товаров 1500-3000₽</p>
                )}
              </div>
            </div>

            {/* Премиум */}
            <div style={styles.category}>
              <h2>👑 Премиум (от 3000₽)</h2>
              <div style={styles.productList}>
                {products.filter(p => p.price > 3000).map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={selectedBouquets.premium === product.id}
                    onSelect={() => handleSelect('premium', product.id)}
                  />
                ))}
                {products.filter(p => p.price > 3000).length === 0 && (
                  <p style={styles.noProducts}>Нет товаров от 3000₽</p>
                )}
              </div>
            </div>
          </div>

          {/* Все товары (если не попали в категории) */}
          <div style={styles.category}>
            <h2>📦 Все товары</h2>
            <p style={styles.hint}>Можно выбрать любой товар для любой категории</p>
            <div style={styles.productList}>
              {products.map(product => (
                <ProductCardFull
                  key={product.id}
                  product={product}
                  selectedAs={
                    selectedBouquets.economy === product.id ? 'economy' :
                    selectedBouquets.medium === product.id ? 'medium' :
                    selectedBouquets.premium === product.id ? 'premium' : null
                  }
                  onSelect={(category) => handleSelect(category, product.id)}
                />
              ))}
            </div>
          </div>

          {/* Выбранные букеты */}
          <div style={styles.summary}>
            <h2>📋 Выбранные букеты</h2>
            <div style={styles.summaryList}>
              <div style={styles.summaryItem}>
                <strong>Эконом:</strong> {
                  products.find(p => p.id === selectedBouquets.economy)?.name || 
                  '❌ не выбран'
                }
              </div>
              <div style={styles.summaryItem}>
                <strong>Средний:</strong> {
                  products.find(p => p.id === selectedBouquets.medium)?.name || 
                  '❌ не выбран'
                }
              </div>
              <div style={styles.summaryItem}>
                <strong>Премиум:</strong> {
                  products.find(p => p.id === selectedBouquets.premium)?.name || 
                  '❌ не выбран'
                }
              </div>
            </div>
          </div>

          <button 
            style={styles.saveButton} 
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '💾 Сохранение...' : '💾 Сохранить настройки'}
          </button>
        </>
      )}
    </div>
  );
}

// Карточка товара (компактная)
function ProductCard({ product, selected, onSelect }) {
  return (
    <div 
      style={{
        ...styles.productCard,
        ...(selected ? styles.productCardSelected : {})
      }}
      onClick={onSelect}
    >
      {product.photo && (
        <img src={product.photo} alt={product.name} style={styles.productImage} />
      )}
      <div style={styles.productInfo}>
        <div style={styles.productName}>{product.name}</div>
        <div style={styles.productPrice}>{product.price}₽</div>
      </div>
      {selected && <div style={styles.checkmark}>✓</div>}
    </div>
  );
}

// Карточка товара с кнопками выбора категории
function ProductCardFull({ product, selectedAs, onSelect }) {
  return (
    <div style={styles.productCardFull}>
      {product.photo && (
        <img src={product.photo} alt={product.name} style={styles.productImageFull} />
      )}
      <div style={styles.productInfoFull}>
        <div style={styles.productName}>{product.name}</div>
        <div style={styles.productPrice}>{product.price}₽</div>
        {product.description && (
          <div style={styles.productDesc}>{product.description.slice(0, 50)}...</div>
        )}
      </div>
      <div style={styles.categoryButtons}>
        <button
          style={{
            ...styles.catButton,
            ...(selectedAs === 'economy' ? styles.catButtonActive : {})
          }}
          onClick={() => onSelect('economy')}
        >
          💰 Эконом
        </button>
        <button
          style={{
            ...styles.catButton,
            ...(selectedAs === 'medium' ? styles.catButtonActive : {})
          }}
          onClick={() => onSelect('medium')}
        >
          💐 Средний
        </button>
        <button
          style={{
            ...styles.catButton,
            ...(selectedAs === 'premium' ? styles.catButtonActive : {})
          }}
          onClick={() => onSelect('premium')}
        >
          👑 Премиум
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
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
  warning: {
    background: '#fff3cd',
    color: '#856404',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  categories: {
    display: 'grid',
    gap: '20px',
    marginBottom: '30px'
  },
  category: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '12px'
  },
  hint: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '15px'
  },
  productList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px',
    marginTop: '15px'
  },
  noProducts: {
    color: '#999',
    fontStyle: 'italic'
  },
  productCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '10px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s',
    position: 'relative'
  },
  productCardSelected: {
    border: '2px solid #4CAF50',
    background: '#f0fff0'
  },
  productImage: {
    width: '100%',
    height: '120px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  productInfo: {
    marginTop: '10px'
  },
  productName: {
    fontWeight: 'bold',
    fontSize: '14px'
  },
  productPrice: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: '5px'
  },
  checkmark: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#4CAF50',
    color: 'white',
    width: '25px',
    height: '25px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  },
  productCardFull: {
    background: 'white',
    borderRadius: '10px',
    padding: '15px',
    display: 'flex',
    gap: '15px',
    alignItems: 'center'
  },
  productImageFull: {
    width: '80px',
    height: '80px',
    objectFit: 'cover',
    borderRadius: '8px'
  },
  productInfoFull: {
    flex: 1
  },
  productDesc: {
    color: '#666',
    fontSize: '12px',
    marginTop: '5px'
  },
  categoryButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  catButton: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s'
  },
  catButtonActive: {
    background: '#4CAF50',
    color: 'white',
    border: '1px solid #4CAF50'
  },
  summary: {
    background: '#e3f2fd',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px'
  },
  summaryList: {
    marginTop: '10px'
  },
  summaryItem: {
    padding: '8px 0',
    borderBottom: '1px solid #bbdefb'
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
