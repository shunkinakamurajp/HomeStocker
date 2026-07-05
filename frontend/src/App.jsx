import React, { useState } from 'react';
import './App.css';

// 作成した3つのコンポーネントを読み込む
import Dashboard from './Dashboard';
import Shopping from './Shopping';
import Inventory from './Inventory';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  //デモ用の初期データを設定
  const [items, setItems] = useState([
    { id: 1, general_name: 'シャンプー', is_in_cart: false, stock_count: 1 },
    { id: 2, general_name: '牛乳', is_in_cart: false, stock_count: 0 },
    { id: 3, general_name: 'ティッシュ', is_in_cart: false, stock_count: 2 },
  ]);
  const [newItemName, setNewItemName] = useState('');

  //データ処理
  const addNewItem = () => {
    if (newItemName.trim() === '') return;
    const newItem = {
      id: items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1,
      general_name: newItemName,
      is_in_cart: false,
      stock_count: 0
    };
    setItems([...items, newItem]);
    setNewItemName('');
  };

  // カートに追加する関数
  const addToCart = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, is_in_cart: true } : item));
  };

  // カートから購入済みにする関数
  const purchaseSingleItem = (id) => {
    setItems(items.map(item => item.id === id ? { ...item, is_in_cart: false, stock_count: item.stock_count + 1 } : item));
  };

  // カート内の全アイテムを購入済みにする関数
  const completePurchase = () => {
    setItems(items.map(item => item.is_in_cart ? { ...item, is_in_cart: false, stock_count: item.stock_count + 1 } : item));
  };

  // 在庫数に応じて色を返す関数
  const getStockColor = (count) => {
    if (count === 0) return '#dc3545';
    if (count === 1) return '#ffc107';
    return '#28a745';
  };

  //画面表示
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">HomeStocker</h1>
      </header>

      <main className="app-main">
        {/* 各コンポーネントに必要なデータ(Props)を渡して呼び出す */}
        {activeTab === 'dashboard' && (
          <Dashboard 
            items={items} 
            newItemName={newItemName} 
            setNewItemName={setNewItemName} 
            addNewItem={addNewItem} 
            addToCart={addToCart} 
          />
        )}

        {/* ここでShoppingコンポーネントとInventoryコンポーネントを条件付きでレンダリング */}
        {activeTab === 'list' && (
          <Shopping
            items={items} 
            purchaseSingleItem={purchaseSingleItem} 
            completePurchase={completePurchase} 
          />
        )}

        {/* 在庫一覧 */}
        {activeTab === 'inventory' && (
          <Inventory 
            items={items} 
            getStockColor={getStockColor} 
          />
        )}
      </main>

      {/* ナビゲーション */}
      <nav className="bottom-nav">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''} 
          onClick={() => setActiveTab('dashboard')}
        >ホーム</button>
        <button 
          className={activeTab === 'list' ? 'active' : ''} 
          onClick={() => setActiveTab('list')}
        >買うもの</button>
        <button 
          className={activeTab === 'inventory' ? 'active' : ''} 
          onClick={() => setActiveTab('inventory')}
        >在庫一覧</button>
      </nav>
    </div>
  );
}

export default App;