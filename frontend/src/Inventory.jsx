import React from 'react';

function Inventory({ items, getStockColor }) {
  return (
    <div className="stock-container">
      <h2>在庫一覧</h2>
      <div className="item-list">
        {items.map(item => (
          <div key={item.id} className="item-card">
            <span className="item-name">{item.general_name}</span>
            <span className="item-stock">
              残り {item.stock_count} コ
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Inventory;