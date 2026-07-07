import apiClient from './client';

// 全アイテム取得 (GET)
export const getItems = async () => {
  const response = await apiClient.get('/api/items');
  return response.data;
};

// 新規アイテム登録 (POST)
export const createItem = async (itemData) => {
  const response = await apiClient.post('/api/items', itemData);
  return response.data;
};

// アイテム更新（カート追加、購入時の在庫数変更など） (PUT)
export const updateItem = async (id, itemData) => {
  const response = await apiClient.put(`/api/items/${id}`, itemData);
  return response.data;
};

// アイテム削除 (DELETE)
export const deleteItem = async (id) => {
  const response = await apiClient.delete(`/api/items/${id}`);
  return response.data;
};