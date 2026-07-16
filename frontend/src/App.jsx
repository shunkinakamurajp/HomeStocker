import React, { useState, useEffect } from 'react'; // API取得用
import './App.css';

// 作成した3つのコンポーネントを読み込む
import Dashboard from './Dashboard';
import Shopping from './Shopping';
import Inventory from './Inventory';

// 作成したAPI通信用の関数を読み込む
import { getItems, createItem, updateItem, deleteItem, getSettings, updateSettings } from './api/items';
 
function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [items, setItems] = useState([]); // 実データはAPIから取得する（初期値は空配列）
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemStock, setNewItemStock] = useState('0'); // 登録時の初期在庫数
  const [isLoading, setIsLoading] = useState(true); // 初回データ取得中かどうか
  const [errorMessage, setErrorMessage] = useState(''); // API失敗時にユーザーへ表示するメッセージ
  const [deleteTargetId, setDeleteTargetId] = useState(null);// 削除対象のIDがnullならポップアップ非表示
  const [editingItem, setEditingItem] = useState(null); // 編集対象のアイテムを保存する箱

  // アプリ起動時に、自動でバックエンドからデータを取得する処理
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const data = await getItems();
        setItems(data); // 取得した本物のデータをStateにセット
      } catch (error) {
        console.error("データの取得に失敗しました:", error);
        setErrorMessage("データの取得に失敗しました。サーバーを確認してください。");
      }
    };
    fetchItems();
  }, []);

  //データ処理
  const addNewItem = async () => {
    if (newItemName.trim() === '') return;
    
    // カテゴリが未入力の場合は「その他」として扱う
    const category = newItemCategory.trim() === '' ? 'その他' : newItemCategory;

    // 未入力や不正値の場合は0扱いにする（マイナス値は登録させない）
    const parsedStock = Math.max(0, parseInt(newItemStock, 10) || 0);

    const newItemData = {
      general_name: newItemName,
      category: category,
      is_in_cart: false,
      stock_count: parsedStock
    };

    try {
      // API経由でデータベースに新規登録
      const createdItem = await createItem(newItemData);
      // 成功したら、サーバー側でIDが付与された本物のデータを画面に追加
      setItems([...items, createdItem]);
      setNewItemName('');
      setNewItemCategory('');
      setNewItemStock('0');
      setErrorMessage('');
    } catch (error) {
      console.error("アイテムの登録に失敗しました:", error);
      setErrorMessage('アイテムの登録に失敗しました。もう一度お試しください。');
    }
  };

  // カートに追加する関数
  const addToCart = async (id) => {
    try {
      // API経由で対象アイテムの is_in_cart を true に更新
      const updatedItem = await updateItem(id, { is_in_cart: true });
      // 画面上の表示データもサーバーから返ってきた最新状態に更新
      setItems(items.map(item => item.id === id ? updatedItem : item));
      setErrorMessage('');
    } catch (error) {
      console.error("カート追加に失敗しました:", error);
      setErrorMessage('カートへの追加に失敗しました。');
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
      setErrorMessage('');
    } catch (error) {
      console.error("購入処理に失敗しました:", error);
      setErrorMessage('購入処理に失敗しました。');
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
      setErrorMessage('');
    } catch (error) {
      console.error("一括購入処理に失敗しました:", error);
      setErrorMessage('一括購入処理に失敗しました。');
    }
  };

  // 削除処理の関数
  // 削除ボタンが押されたときポップアップを開く
  const confirmDelete = (id) => {
    setDeleteTargetId(id);
  };

  // ポップアップを閉じる処理
  const cancelDelete = () => {
    setDeleteTargetId(null);
  };

  // 実際に削除を実行する処理
  const executeDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await deleteItem(deleteTargetId);
      setItems(items.filter(item => item.id !== deleteTargetId));
      setDeleteTargetId(null); // 成功したらポップアップを閉じる
      setErrorMessage('');
    } catch (error) {
      console.error("アイテムの削除に失敗しました:", error);
      setErrorMessage('アイテムの削除に失敗しました。');
      setDeleteTargetId(null); // 失敗しても一旦閉じる
    }
  };

  // 在庫数に応じて色を返す関数
  const getStockColor = (count) => {
    if (count === 0) return '#dc3545';
    if (count === 1) return '#ffc107';
    return '#28a745';
  };

  // 在庫一覧から直接個数を増減させる関数
  const updateStockCount = async (id, currentStock, change) => {
    const newStock = currentStock + change;
    if (newStock < 0) return; // 在庫数がマイナスにならないようにガード

    try {
      // 既存の updateItem API を利用してバックエンドのDBを更新
      const updatedItem = await updateItem(id, { stock_count: newStock });
      
      // フロントエンドの State を最新のデータに更新
      setItems(items.map(item => item.id === id ? updatedItem : item));
      setErrorMessage('');
    } catch (error) {
      console.error("在庫数の更新に失敗しました:", error);
      setErrorMessage('在庫数の更新に失敗しました。');
    }
  };
 // 🌟 新設：残り日数を計算する共通関数
  const calculateRemainingDays = (lastPurchasedAt, avgCycleDays) => {
    if (!lastPurchasedAt || !avgCycleDays) return null;
    const depletionDate = new Date(lastPurchasedAt);
    depletionDate.setDate(depletionDate.getDate() + avgCycleDays);
    const today = new Date();
    // 差分をミリ秒から日数に変換して切り捨て（整数）
    return Math.floor((depletionDate - today) / (1000 * 60 * 60 * 24));
  };

  // 予測メッセージを生成する関数（上の共通関数を使うようにスッキリ修正）
  const getPredictionMessage = (lastPurchasedAt, avgCycleDays) => {
    const remainingDays = calculateRemainingDays(lastPurchasedAt, avgCycleDays);
    if (remainingDays === null) return null;

    if (remainingDays <= 0) return "⚠️ 予測: そろそろ切れそうです";
    if (remainingDays <= 3) return `⏳ 予測: あと ${remainingDays} 日`;
    return null;
  };

  const [settings, setSettings] = useState(null);

  // useEffect内の fetchItems 関数を以下のように書き換える
  useEffect(() => {
    const fetchData = async () => {
      try {
        // アイテムと設定を同時に取得
        const [itemsData, settingsData] = await Promise.all([
          getItems(),
          getSettings()
        ]);
        setItems(itemsData);
        setSettings(settingsData);
      } catch (error) {
        console.error("データの取得に失敗しました:", error);
        setErrorMessage('データの取得に失敗しました。バックエンドが起動しているか確認してください。');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

 // アイテムの編集を保存する処理
  const saveItemEdit = async (id, updatedData) => {
    try {
      const updatedItem = await updateItem(id, updatedData);
      setItems(items.map(item => item.id === id ? updatedItem : item));
      return true; // 🌟 追加：成功したことを Inventory.jsx に教える
    } catch (error) {
      console.error("更新エラー:", error);
      setErrorMessage("アイテムの更新に失敗しました。"); // 🌟 追加：エラーメッセージを画面に出す
      return false; // 🌟 追加：失敗したことを教える
    }
  };

  // updateItem を使って編集内容を保存する関数を追加
  const saveItemEdit = async (id, updatedData) => {
    try {
      const updated = await updateItem(id, updatedData);
      setItems(items.map(item => item.id === id ? updated : item));
      setEditingItem(null); // 編集モード終了
    } catch (error) {
      console.error("更新に失敗しました:", error);
    }
  };

  //画面表示
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">HomeStocker</h1>
      </header>

      <main className="app-main">
        {/* API通信失敗時のエラーメッセージ表示（閉じるまで残す） */}
        {errorMessage && (
          <div className="error-banner">
            {errorMessage}
            <button className="error-banner-close" onClick={() => setErrorMessage('')}>×</button>
          </div>
        )}

        {isLoading ? (
          <div className="text-muted">読み込み中...</div>
        ) : (
          <>
            {/* 各コンポーネントに必要なデータ(Props)を渡して呼び出す */}
            {activeTab === 'dashboard' && (
              <Dashboard 
                items={items} 
                newItemName={newItemName} 
                setNewItemName={setNewItemName}
                newItemCategory={newItemCategory}
                setNewItemCategory={setNewItemCategory}
                newItemStock={newItemStock}
                setNewItemStock={setNewItemStock}
                addNewItem={addNewItem}
                addToCart={addToCart}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
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
                removeItem={confirmDelete}
                updateStockCount={updateStockCount}
                getPredictionMessage={getPredictionMessage}
                saveItemEdit={saveItemEdit}
                calculateRemainingDays={calculateRemainingDays}
              />
            )}

            {/* 削除確認ポップアップ */}
            {deleteTargetId && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <h3>削除の確認</h3>
                  <p>本当にこのアイテムを削除しますか？</p>
                  <div className="modal-actions">
                    <button className="btn-cancel" onClick={cancelDelete}>キャンセル</button>
                    <button className="btn-danger" onClick={executeDelete}>削除する</button>
                  </div>
                </div>
              </div>
            )}
          </>
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