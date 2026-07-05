import React from 'react';

// App.jsxから渡されるpropsを受け取る
function Dashboard({ items, newItemName, setNewItemName, addNewItem, addToCart }) {
  return (
    <div>
      <div className="item-card">
        <h3 className="item-name">新しいアイテムを登録</h3>
        <div className="input-group">
          <input 
            type="text" 
            value={newItemName} 
            onChange={(e) => setNewItemName(e.target.value)} 
            placeholder="例：洗剤、ラップ" 
          />
          <button className="btn btn-primary" onClick={addNewItem}>登録</button>
        </div>
      </div>

      <div className="quick-add-container">
        <h3 className="item-name">クイック追加</h3>
          <div className="quick-add-text">
            カートに入れるアイテムを選択してください。<br/>
            すでにカートに入っているアイテムは表示されません。
          </div>
        {items.filter(item => !item.is_in_cart).length === 0 ? (
          <div className="text-muted">
            現在追加できるアイテムはありません<br/>
            すべてカートに入っているか、新しく登録してください。
          </div>
        ) : (
          items.filter(item => !item.is_in_cart).map(item => (
            <button className="quick-add-btn" key={item.id} onClick={() => addToCart(item.id)}>
              + {item.general_name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default Dashboard;