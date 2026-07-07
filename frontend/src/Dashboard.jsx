import React from 'react';

// App.jsxから渡されるpropsを受け取る
function Dashboard({ items, newItemName, setNewItemName, newItemCategory, setNewItemCategory, addNewItem, addToCart }) {
  // 初期カテゴリ
  const defaultCategories = ['食品', '日用品', '消耗品', '掃除用品', 'その他'];
  
  // 既存のアイテムから使われているカテゴリを抽出
  const existingCategories = Array.from(
    new Set(items.map(item => item.category).filter(Boolean))
  );

  // 初期カテゴリと既存カテゴリを合体させて、選択肢のリストを作る
  const allCategories = Array.from(new Set([...defaultCategories, ...existingCategories]));

  return (
    <div>
      <div className="item-card">
        <h3 className="item-name">新しいアイテムを登録</h3>
        <div className="input-group">
          {/* アイテム名入力 */}
          <input 
            type="text" 
            value={newItemName} 
            onChange={(e) => setNewItemName(e.target.value)} 
            placeholder="例：洗剤、ラップ" 
          />
          {/* カテゴリ入力 */}
          <input
            type="text" 
            list="category-options" 
            value={newItemCategory} 
            onChange={(e) => setNewItemCategory(e.target.value)} 
            placeholder="カテゴリを入力または選択" 
          />
          {/* プルダウンの選択肢 */}
          <datalist id="category-options">
            {allCategories.map((cat, index) => (
              <option key={index} value={cat} />
            ))}
          </datalist>
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