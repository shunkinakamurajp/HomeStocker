import React from 'react';

// 1️⃣ 引数（Props）に getPredictionMessage を追加
function Inventory({ items, getStockColor, removeItem, updateStockCount, getPredictionMessage }) {
  return (
    <div className="stock-container">
      <h2>在庫一覧</h2>
      <div className="item-list">
        {items.map(item => (
          <div key={item.id} className="item-card inventory-card">
            
            {/* 上段：アイテム名と削除ボタン */}
            <div className="inventory-header">
              <div className="item-name-group"> {/* 👈 アイテム名とバッジを縦に並べるための枠 */}
                <span className="item-name">{item.general_name}</span>
                
                {/* 2️⃣ 🌟 ここに予測バッジを表示するコードを追加 */}
                {/* App.jsxから関数が渡されていて、かつメッセージがある時だけ表示する */}
                {getPredictionMessage && getPredictionMessage(item.last_purchased_at, item.avg_cycle_days) && (
                  <span className="prediction-badge">
                    {getPredictionMessage(item.last_purchased_at, item.avg_cycle_days)}
                  </span>
                )}
              </div>

              <button 
                className="btn-delete-text" 
                onClick={() => removeItem(item.id)}
              >
                削除
              </button>
            </div>

            {/* 下段：数量管理コントロール（変更なし） */}
            <div className="inventory-controls">
              <span className="inventory-label">在庫数</span>
              
              <div className="inventory-quantity-wrapper">
                {/* マイナスボタン */}
                <button 
                  className="btn-quantity minus"
                  onClick={() => updateStockCount(item.id, item.stock_count, -1)}
                  disabled={item.stock_count <= 0}
                >
                  -
                </button>

                {/* 現在の個数（★色だけは動的なのでインラインスタイルで残します） */}
                <span 
                  className="inventory-stock-count" 
                  style={{ color: getStockColor(item.stock_count) }}
                >
                  {item.stock_count} コ
                </span>

                {/* プラスボタン */}
                <button 
                  className="btn-quantity plus"
                  onClick={() => updateStockCount(item.id, item.stock_count, 1)}
                >
                  +
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}

export default Inventory;