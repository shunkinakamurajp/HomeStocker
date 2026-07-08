import React from 'react';

function Inventory({ items, getStockColor, removeItem, updateStockCount }) {
  return (
    <div className="stock-container">
      <h2>在庫一覧</h2>
      <div className="item-list">
        {items.map(item => (
          <div key={item.id} className="item-card inventory-card">
            
            {/* 上段：アイテム名と削除ボタン */}
            <div className="inventory-header">
              <span className="item-name">{item.general_name}</span>
              <button 
                className="btn-delete-text" 
                onClick={() => removeItem(item.id)}
              >
                削除
              </button>
            </div>

            {/* 下段：数量管理コントロール */}
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