from fastapi import FastAPI
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import FastAPI, Depends, HTTPException

# データベース設計
# データベースのフィル名と保存場所の指定
SQLALCHEMY_DATABASE_URL = "sqlite:///./homestocker.db"
# データベースと通信するためのエンジン
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
# データベースにアクセスするためのセッショ作る
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# テーブルの親となる基本クラス
Base = declarative_base()

# 在庫管理テーブル
class Item(Base):
    __tablename__ = "items" # データベース内での名前

    id = Column(Integer, primary_key=True, index=True)
    general_name = Column(String, nullable=False)       # 一般名
    specific_name = Column(String, nullable=True)       # 具体的な商品名（後から追加可能）
    category = Column(String, nullable=False)           # カテゴリ
    store_tag = Column(String, nullable=True)           # 優先購入先
    stock_count = Column(Integer, default=0)            # 現在の在庫数（初期値は0）
    image_url = Column(String, nullable=True)           # 画像の保存場所
    last_purchased_at = Column(Date, nullable=True)     # 前回購入日
    avg_cycle_days = Column(Integer, nullable=True)     # 平均消費日数（システムが自動計算）
    is_in_cart = Column(Boolean, default=False)         # 買い物リストに入っているか

# 消費サイクル学習用記録テーブル
class Consumptionlog(Base):
    __tablename__ = "consumption_logs"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))   # どのアイテムの記録か
    purchased_at = Column(Date,nullable=False)          # 買った日
    depletes_at = Column(Date, nullable=True)           #使い切ってカゴに入れた日

# 新規登録でReactから受け取るデータのルール
class ItemCreate(BaseModel):
    general_name: str
    category: str
    specific_name: Optional[str] = None
    store_tag: Optional[str] = None
    stock_count: int = 0        # 登録時に初期在庫数を指定できるようにする
    is_in_cart: bool = False    # 登録時は必ずカート外からスタート

# Reactへデータを返すときのルール（ItemCreateの項目 ＋ DBで自動付与される情報）
class ItemResponse(ItemCreate):
    id: int
    stock_count: int
    is_in_cart: bool

    # データベースのデータ形式を、通信用のデータ形式に自動翻訳するための設定
    model_config = ConfigDict(from_attributes=True)

# 更新でReactから受け取るデータのルール
class ItemUpdate(BaseModel):
    general_name: Optional[str] = None
    category: Optional[str] = None
    specific_name: Optional[str] = None
    store_tag: Optional[str] = None
    stock_count: Optional[int] = None
    is_in_cart: Optional[bool] = None

#データベースにテーブルを作成
Base.metadata.create_all(bind=engine)

# FastAPIの立ち上げ
app = FastAPI(title="HomeStocker API")

#CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # ReactアプリのURLを許可
    allow_credentials=True,
    allow_methods=["*"], # GET, POST, PUT, DELETEなど、すべての通信手段を許可
    allow_headers=["*"], # すべての通信ヘッダーを許可
)

# データベースセッション管理
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# アイテム新規登録API
@app.post("/api/items", response_model=ItemResponse)
def create_item(item_data: ItemCreate, db: Session = Depends(get_db)):
    # フロントから届いた検品済みのデータを、データベース用のモデル（Itemクラス）に変換
    db_item = Item(**item_data.model_dump())
    
    # データベースにデータを追加する指示
    db.add(db_item)
    
    # データをコミットさせて、データベースファイルに書き込む
    db.commit()
    
    # データベース側で自動採番された id や、初期値（stock_count=0など）を反映させるためにデータを最新に更新
    db.refresh(db_item)
    
    # 保存された最新のアイテムデータをフロントへ返す
    return db_item

# アイテム一覧取得API
@app.get("/api/items", response_model=list[ItemResponse])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    items = db.query(Item).offset(skip).limit(limit).all()

    return items

# アイテム更新API
@app.put("/api/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item_data: ItemUpdate, db: Session = Depends(get_db)):
    # データベースから指定されたIDのアイテムを探す
    db_item = db.query(Item).filter(Item.id == item_id).first()
    
    # 見つからなかった場合は、404エラー（Not Found）を返す
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # 送られてきたデータ（item_data）のうち、入力があった項目だけを抽出
    # exclude_unset=True によって、空っぽのデータは無視する
    update_data = item_data.model_dump(exclude_unset=True)
    
    # データベースのアイテムを上書きする
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    # データベースに変更をコミットさせて最新状態を取得
    db.commit()
    db.refresh(db_item)
    
    return db_item

# アイテム削除API
@app.delete("/api/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    # データベースから指定されたIDのアイテムを探す
    db_item = db.query(Item).filter(Item.id == item_id).first()
    
    # 更新の時と同様に、見つからなかった場合は404エラー（Not Found）を投げる
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # 見つかったアイテムを「削除対象」として指定する
    db.delete(db_item)
    
    # データベースに変更をコミットさせてファイルから完全に消去する
    db.commit()
    
    # フロントエンドに無事消せたことを伝えるメッセージを返す
    return {"message": f"Item with ID {item_id} has been deleted successfully"}