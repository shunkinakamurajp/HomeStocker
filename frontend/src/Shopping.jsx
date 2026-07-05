import React from 'react';

function Shopping({ items, purchaseSingleItem, completePurchase }) {
  return (
    <div className="app-shopping-container">
      <h2>買うものリスト</h2>
      {items.filter(item => item.is_in_cart).length === 0 ? (
        <div className="text-muted">
          現在買うものはありません<br/>
          <span>
            ストックはバッチリです！ホームから必要なものをクイック追加することもできます。
          </span>
        </div>
      ) : (
        <>
          <div className="item-list">
            {items.filter(item => item.is_in_cart).map(item => (
              <div key={item.id} className="item-card">
                <span className="item-name">{item.general_name}</span>
                <button className="btn-success" onClick={() => purchaseSingleItem(item.id)}>
                  購入済
                </button>
              </div>
            ))}
          </div>
          
          <button className="btn-success" onClick={completePurchase}>
            一括で買い物完了！（在庫に追加）
          </button>
        </>
      )}
    </div>
  );
}

export default Shopping;