import React from 'react';

function Dashboard({
  items,
  newItemName,
  setNewItemName,
  newItemCategory,
  setNewItemCategory,
  newItemStock,
  setNewItemStock,
  addNewItem,
  addToCart,
  settings,
  onUpdateSettings
}) {
  // カテゴリのリスト作成
  const defaultCategories = ['食品', '日用品', '消耗品', '掃除用品', 'その他'];
  const existingCategories = Array.from(
    new Set(items.map(item => item.category).filter(Boolean))
  );
  const allCategories = Array.from(new Set([...defaultCategories, ...existingCategories]));

  // 統計データの計算
  const totalItems = items.length;
  const outOfStockItems = items.filter(item => item.stock_count === 0).length;
  const lowStockItems = items.filter(item => item.stock_count === 1).length;
  const inCartItems = items.filter(item => item.is_in_cart).length;

  // フォーム送信時の処理
  const handleSubmit = (e) => {
    e.preventDefault();
    addNewItem();
  };

  return (
    <div className="dashboard-container">
      
      {/* 状況サマリーパネル */}
      <section className="dashboard-section summary-section">
        <h2>現在の状況</h2>
        <div className="summary-cards">
          <div className="summary-card">
            <span className="card-label">登録アイテム</span>
            <span className="card-value">{totalItems}</span>
          </div>
          <div className="summary-card alert-red">
            <span className="card-label">在庫切れ</span>
            <span className="card-value">{outOfStockItems}</span>
          </div>
          <div className="summary-card alert-yellow">
            <span className="card-label">残りわずか</span>
            <span className="card-value">{lowStockItems}</span>
          </div>
          <div className="summary-card in-cart">
            <span className="card-label">カートの中</span>
            <span className="card-value">{inCartItems}</span>
          </div>
        </div>
      </section>

      {/* クイック追加 */}
      <section className="dashboard-section alert-section">
        <h2>クイック追加（買うものへ）</h2>
        <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
          カートに入れるアイテムを選択してください。<br/>
          すでにカートに入っているアイテムは表示されません。
        </p>
        
        {items.filter(item => !item.is_in_cart).length === 0 ? (
          <p className="no-alerts">現在追加できるアイテムはありません。<br/>すべてカートに入っているか、新しく登録してください。</p>
        ) : (
          <div className="alert-list">
            {items.filter(item => !item.is_in_cart).map(item => (
              <div key={item.id} className="alert-item">
                <div className="alert-item-info">
                  <span className="alert-item-name">{item.general_name}</span>
                  <span className={`alert-item-status ${item.stock_count === 0 ? 'empty' : item.stock_count === 1 ? 'low' : ''}`}>
                    残り {item.stock_count} コ
                  </span>
                </div>
                <button 
                  className="btn-quick-add"
                  onClick={() => addToCart(item.id)}
                >
                  追加
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 新規アイテム登録フォーム */}
      <section className="dashboard-section form-section">
        <h2>新しいアイテムを登録</h2>
        <form onSubmit={handleSubmit} className="add-item-form">
          <div className="form-group">
            <label htmlFor="item-name">アイテム名 <span className="required">※</span></label>
            <input 
              id="item-name"
              type="text" 
              value={newItemName} 
              onChange={(e) => setNewItemName(e.target.value)} 
              placeholder="例：洗剤、ラップ"
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="item-category">カテゴリ</label>
            <input
              id="item-category"
              type="text" 
              list="category-options" 
              value={newItemCategory} 
              onChange={(e) => setNewItemCategory(e.target.value)} 
              placeholder="カテゴリを入力または選択" 
            />
            {/* プルダウン選択肢 */}
            <datalist id="category-options">
              {allCategories.map((cat, index) => (
                <option key={index} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label htmlFor="item-stock">初期在庫数</label>
            <input
              id="item-stock"
              type="number"
              min="0"
              value={newItemStock}
              onChange={(e) => setNewItemStock(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-submit">
            登録する
          </button>
        </form>
      </section>

      {/* 通知設定パネル */}
      {settings && (
        <section className="dashboard-section settings-section">
          <h2>Discord通知設定</h2>
          <div className="settings-card">
            <div className="form-group">
              <label>通知時刻</label>
              <input 
                type="time" 
                value={settings.notify_time}
                onChange={(e) => onUpdateSettings({ ...settings, notify_time: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>通知頻度</label>
              <select 
                value={settings.notify_frequency}
                onChange={(e) => onUpdateSettings({ ...settings, notify_frequency: e.target.value })}
              >
                <option value="always">毎日通知する（補充されるまで）</option>
                <option value="first_day">初日のみ通知（1回だけ）</option>
              </select>
            </div>
            <p className="settings-hint">※予測日数が3日以下になったアイテムをDiscordに通知します</p>
          </div>
        </section>
      )}
    </div>
  );
}

export default Dashboard;