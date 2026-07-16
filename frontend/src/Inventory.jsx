import React, { useState } from 'react';

function Inventory({ items, getStockColor, removeItem, updateStockCount, getPredictionMessage, saveItemEdit, calculateRemainingDays }) {
  // 編集モード用の状態（ここで定義します）
  const [editingItem, setEditingItem] = useState(null);

  // 1️⃣ 枯渇が近い順にソートする処理
  const sortedItems = [...items].sort((a, b) => {
    const daysA = calculateRemainingDays(a.last_purchased_at, a.avg_cycle_days) ?? 999;
    const daysB = calculateRemainingDays(b.last_purchased_at, b.avg_cycle_days) ?? 999;
    return daysA - daysB;
  });

  return (
    <div className="stock-container">
      <h2>在庫一覧</h2>
      <div className="item-list">
        {sortedItems.map(item => (
          <div key={item.id} className="item-card inventory-card">
            
            {/* 編集モードか通常表示かの切り替え */}
            {editingItem?.id === item.id ? (
              <div className="edit-mode">
                <input 
                  value={editingItem.general_name} 
                  onChange={(e) => setEditingItem({...editingItem, general_name: e.target.value})}
                />
                <input 
                  value={editingItem.category} 
                  onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}
                />
                {/* 🌟 成功した時(successがtrue)だけ編集モードを終了(null)するように変更 */}
                <button onClick={async () => {
                  const success = await saveItemEdit(item.id, editingItem);
                  if (success) {
                    setEditingItem(null);
                  }
                }}>保存</button>
                <button onClick={() => setEditingItem(null)}>キャンセル</button>
              </div>
            ) : (
              <div className="inventory-header">
                <div className="item-name-group">
                  <span className="item-name">{item.general_name}</span>
                  <button onClick={() => setEditingItem(item)}>🖋️</button>
                  
                  {getPredictionMessage && getPredictionMessage(item.last_purchased_at, item.avg_cycle_days) && (
                    <span className="prediction-badge">
                      {getPredictionMessage(item.last_purchased_at, item.avg_cycle_days)}
                    </span>
                  )}
                </div>

                <button className="btn-delete-text" onClick={() => removeItem(item.id)}>削除</button>
              </div>
            )}

            {/* 在庫管理UI */}
            <div className="inventory-controls">
              <span className="inventory-label">在庫数</span>
              <div className="inventory-quantity-wrapper">
                <button className="btn-quantity minus" onClick={() => updateStockCount(item.id, item.stock_count, -1)} disabled={item.stock_count <= 0}>-</button>
                <span className="inventory-stock-count" style={{ color: getStockColor(item.stock_count) }}>
                  {item.stock_count} コ
                </span>
                <button className="btn-quantity plus" onClick={() => updateStockCount(item.id, item.stock_count, 1)}>+</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Inventory;