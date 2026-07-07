import React, { useState, useEffect } from 'react'; // API取得用
import './App.css';

// 作成した3つのコンポーネントを読み込む
import Dashboard from './Dashboard';
import Shopping from './Shopping';
import Inventory from './Inventory';

// 作成したAPI通信用の関数を読み込む
import { getItems, createItem, updateItem } from './api/items';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  //デモ用の初期データを設定
  const [items, setItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');

  // アプリ起動時に、自動でバックエンドからデータを取得する処理
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await getItems();
        setItems(data); // 取得した本物のデータをStateにセット
      } catch (error) {
        console.error("データの取得に失敗しました:", error);
      }
    };
    fetchItems();
  }, []);

  //データ処理
  const addNewItem = async () => {
    if (newItemName.trim() === '') return;
    
    // カテゴリが未入力の場合は「その他」として扱う
    const category = newItemCategory.trim() === '' ? 'その他' : newItemCategory;

    const newItemData = {
      general_name: newItemName,
      category: category,
      is_in_cart: false,
      stock_count: 0
    };

    try {
      // API経由でデータベースに新規登録
      const createdItem = await createItem(newItemData);
      // 成功したら、サーバー側でIDが付与された本物のデータを画面に追加
      setItems([...items, createdItem]);
      setNewItemName('');
      setNewItemCategory('');
    } catch (error) {
      console.error("アイテムの登録に失敗しました:", error);
    }
  };

  // カートに追加する関数
  const addToCart = async (id) => {
    try {
      // API経由で対象アイテムの is_in_cart を true に更新
      const updatedItem = await updateItem(id, { is_in_cart: true });
      // 画面上の表示データもサーバーから返ってきた最新状態に更新
      setItems(items.map(item => item.id === id ? updatedItem : item));
    } catch (error) {
      console.error("カート追加に失敗しました:", error);
    }
  };

  // カートから購入済みにする関数
  const purchaseSingleItem = async (id) => {
    const targetItem = items.find(item => item.id === id);
    if (!targetItem) return;

    try {
      // API経由でカートを外し、在庫数を +1 して更新
      const updatedItem = await updateItem(id, { 
        is_in_cart: false, 
        stock_count: targetItem.stock_count + 1 
      });
      setItems(items.map(item => item.id === id ? updatedItem : item));
    } catch (error) {
      console.error("購入処理に失敗しました:", error);
    }
  };

  // カート内の全アイテムを購入済みにする関数
  const completePurchase = async () => {
    const cartItems = items.filter(item => item.is_in_cart);
    
    try {
      // カートに入っているすべてのアイテムに対して、並行して更新リクエストを送信
      const updatePromises = cartItems.map(item => 
        updateItem(item.id, { is_in_cart: false, stock_count: item.stock_count + 1 })
      );
      
      // すべての通信が完了するまで待機
      await Promise.all(updatePromises);
      
      // 更新完了後、最新の全データをDBから再取得して画面を同期させる
      const data = await getItems();
      setItems(data);
    } catch (error) {
      console.error("一括購入処理に失敗しました:", error);
    }
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
            newItemCategory={newItemCategory}
            setNewItemCategory={setNewItemCategory}
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