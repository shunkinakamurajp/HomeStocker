# HomeStocker

HomeStocker は、家庭内の在庫を管理し、必要なタイミングで買い物や通知を支援するための Web アプリケーションです。
このプロジェクトは、フロントエンド、バックエンド、データベース、Docker による実行環境で構成されています。

## 構成概要

- フロントエンド: React + Vite
- バックエンド: FastAPI
- データベース: SQLite
- 実行環境: Docker Compose

## プロジェクト構成

### ルート

- `docker-compose.yml`
  - フロントエンドとバックエンドをまとめて起動する設定ファイル

### フロントエンド

- `frontend/index.html`
  - アプリの起動用 HTML
- `frontend/package.json`
  - React/Vite の依存関係と実行スクリプト
- `frontend/vite.config.js`
  - Vite の設定
- `frontend/src/main.jsx`
  - React のエントリーポイント
- `frontend/src/App.jsx`
  - アプリ全体の画面構成
- `frontend/src/Inventory.jsx`
  - 在庫一覧・編集画面
- `frontend/src/Shopping.jsx`
  - 買い物リスト画面
- `frontend/src/Dashboard.jsx`
  - 在庫状況ダッシュボード画面
- `frontend/src/api/client.js`
  - API 通信の共通クライアント
- `frontend/src/api/items.js`
  - 在庫情報に関する API 呼び出し
- `frontend/src/App.css`
  - アプリのスタイル
- `frontend/src/index.css`
  - 共通スタイル

### バックエンド

- `backend/main.py`
  - FastAPI アプリ本体
  - API 定義、データベースモデル、通知処理を実装
- `backend/requirements.txt`
  - Python の依存パッケージ一覧
- `backend/Dockerfile`
  - バックエンドコンテナのビルド設定
- `backend/homestocker.db`
  - SQLite データベースファイル

## バックエンドの役割

`backend/main.py` では、以下の機能を実装しています。

- SQLite データベースへの接続
- 在庫アイテムの取得、登録、更新
- 通知設定の取得・更新
- Discord Webhook を利用した在庫切れ間近通知

データモデルとして、以下のテーブルを持っています。

- `items`
- `consumption_logs`
- `system_settings`

## フロントエンドの役割

`frontend/src/` 配下の各コンポーネントは、ユーザー入力や表示を担当します。

- `Inventory.jsx`: 在庫の管理
- `Shopping.jsx`: 買い物リストの管理
- `Dashboard.jsx`: 在庫状況の確認
- `api/`: バックエンドとの通信処理

## 実行構成

Docker Compose によって以下のサービスが起動します。

- `frontend`
  - ポート `5173`
- `backend`
  - ポート `8000`

## まとめ

HomeStocker は、家庭で使う在庫管理を支援するアプリケーションであり、React/Vite ベースのフロントエンドと FastAPI ベースのバックエンドによって構成されています。
データは SQLite に保存され、Docker Compose により開発環境を簡単に起動できます。
