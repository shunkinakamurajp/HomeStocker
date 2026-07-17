import axios from 'axios';

// 環境変数からバックエンドのURLを取得（設定がない場合の保険としてlocalhostを設定）
const BASE_URL = `http://${window.location.hostname}:8000`;

const apiClient = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;