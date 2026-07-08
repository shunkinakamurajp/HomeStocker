import React from 'react';

function Shopping({ items, purchaseSingleItem, completePurchase }) {
  // カート（買うものリスト）に入っているアイテムだけを抽出
  const cartItems = items.filter(item => item.is_in_cart);

  // カテゴリごとにアイテムをグループ化する
  const groupedItems = cartItems.reduce((acc, item) => {
    const category = item.category || 'その他';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <div className="app-shopping-container">
      
      {/* ヘッダー部分（タイトルと一括購入ボタン） */}
      <div className="shopping-header-row">
        <h2>買うものリスト</h2>
        {cartItems.length > 0 && (
          <button className="btn-success btn-buy-all" onClick={completePurchase}>
            一括で買い物完了！
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        // カートが空のとき（パネル型のデザインにアップデート）
        <div className="empty-shopping text-muted">
          現在買うものはありません<br/>
          <span className="empty-sub">
            ストックはバッチリです！ホームから必要なものをクイック追加することもできます。
          </span>
        </div>
      ) : (
        // カートにアイテムがあるとき、カテゴリ別に並べて表示
        <div className="shopping-list-groups">
          {Object.keys(groupedItems).map(category => (
            <div key={category} className="category-group">
              
              {/* カテゴリ名 */}
              <h3 className="category-group-title">{category}</h3>
              
              {/* そのカテゴリのアイテム一覧（マスターの.item-listを活用） */}
              <div className="item-list">
                {groupedItems[category].map(item => (
                  <div key={item.id} className="item-card">
                    <div className="item-info-zone">
                      <span className="item-name">{item.general_name}</span>
                      <span className="shopping-current-stock">
                        (現在の在庫: {item.stock_count}コ)
                      </span>
                    </div>
                    {/* マスターの .btn-success をそのまま利用 */}
                    <button 
                      className="btn-success btn-buy-single" 
                      onClick={() => purchaseSingleItem(item.id)}
                    >
                      購入済
                    </button>
                  </div>
                ))}
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Shopping;