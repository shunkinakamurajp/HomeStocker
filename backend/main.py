from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date
from fastapi.middleware.cors import CORSMiddleware

# --- 1. データベース設計 (SQLAlchemy) ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./homestocker.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Item(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    general_name = Column(String, nullable=False)
    specific_name = Column(String, nullable=True)
    category = Column(String, nullable=False)
    store_tag = Column(String, nullable=True)
    stock_count = Column(Integer, default=0)
    is_in_cart = Column(Boolean, default=False)
    
    # 🌟 学習用データの箱
    last_purchased_at = Column(Date, nullable=True)
    avg_cycle_days = Column(Integer, nullable=True)

class Consumptionlog(Base):
    __tablename__ = "consumption_logs"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    purchased_at = Column(Date)
    depletes_at = Column(Date, nullable=True)

# データベースのテーブルを作成
Base.metadata.create_all(bind=engine)

# --- 2. APIのデータ送受信ルール (Pydantic) ---
class ItemCreate(BaseModel):
    general_name: str
    category: str
    is_in_cart: Optional[bool] = False
    stock_count: Optional[int] = 0

class ItemUpdate(BaseModel):
    general_name: Optional[str] = None
    specific_name: Optional[str] = None
    category: Optional[str] = None
    store_tag: Optional[str] = None
    stock_count: Optional[int] = None
    is_in_cart: Optional[bool] = None

class ItemResponse(BaseModel):
    id: int
    general_name: str
    specific_name: Optional[str] = None
    category: str
    store_tag: Optional[str] = None
    stock_count: int
    is_in_cart: bool
    last_purchased_at: Optional[date] = None
    avg_cycle_days: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

# --- 3. FastAPIアプリケーション本体 ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/items", response_model=list[ItemResponse])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Item).offset(skip).limit(limit).all()

@app.post("/api/items", response_model=ItemResponse)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    db_item = Item(**item.model_dump())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

# 🌟 自動学習アルゴリズム搭載のアイテム更新API
@app.put("/api/items/{item_id}", response_model=ItemResponse)
def update_item(item_id: int, item: ItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")

    today = date.today()
    
    # 状態の変化を検知するための変数を準備
    stock_decreased = False
    stock_increased = False

    # 在庫数（stock_count）の増減をチェック
    if item.stock_count is not None:
        if item.stock_count < db_item.stock_count:
            stock_decreased = True
        elif item.stock_count > db_item.stock_count:
            stock_increased = True
            
    # カート状態の変化をチェック
    bought_from_cart = (db_item.is_in_cart == True and item.is_in_cart == False)
    put_into_cart = (db_item.is_in_cart == False and item.is_in_cart == True)

    # 🎯 1. 購入・補充した時の処理（まとめ買い含む）
    # 新しいサイクルの始まりとして、1個目の使用開始日を「今日」にセット
    if stock_increased or bought_from_cart:
        db_item.last_purchased_at = today

    # 🎯 2. 「1個消費」した時の処理（マイナスボタンを押した、または枯渇してカートに入れた）
    if stock_decreased or put_into_cart:
        if db_item.last_purchased_at:
            days = (today - db_item.last_purchased_at).days
            
            # 【ルール1】同日中の操作（0日以下）はイレギュラーとして無視
            if days > 0:
                # ログに「1個分の消費日数」を記録する
                new_log = Consumptionlog(
                    item_id=item_id,
                    purchased_at=db_item.last_purchased_at,
                    depletes_at=today
                )
                db.add(new_log)
                db.flush() # ログを一時的に反映
                
                # 有効なログを取得して平均を計算
                completed_logs = db.query(Consumptionlog).filter(
                    Consumptionlog.item_id == item_id,
                    Consumptionlog.depletes_at != None
                ).all()
                
                total_days = sum((log.depletes_at - log.purchased_at).days for log in completed_logs)
                valid_count = len(completed_logs)
                
                # 【ルール2】サンプル数が2件以上の場合のみ予測（平均日数）を更新
                if valid_count >= 2:
                    db_item.avg_cycle_days = round(total_days / valid_count, 1)

            # 🎯 3. 次の計測のためのリセット処理
            if put_into_cart:
                # 完全にストックがゼロになった場合は計測ストップ
                db_item.last_purchased_at = None
            else:
                # まだストックがある場合（マイナスボタン）は、ここから「次の1個」を使い始めるので「今日」をセット
                db_item.last_purchased_at = today

    # クライアントから送られてきた値で db_item を上書き更新
    for key, value in item.dict(exclude_unset=True).items():
        setattr(db_item, key, value)

    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted successfully"}