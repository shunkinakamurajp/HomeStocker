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
def update_item(item_id: int, item_data: ItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(Item).filter(Item.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # 🌟 変更前の状態を記憶しておく
    was_in_cart = db_item.is_in_cart

    # データの更新処理
    update_data = item_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)
        
    # 🌟 ここから「消費サイクル自動学習」のアルゴリズム
    today = date.today()

    # パターン1：購入した時（カートから外れた時）
    if was_in_cart == True and db_item.is_in_cart == False:
        db_item.last_purchased_at = today 
        new_log = Consumptionlog(item_id=item_id, purchased_at=today)
        db.add(new_log)

    # パターン2：枯渇した時（カートに入った時）
    elif was_in_cart == False and db_item.is_in_cart == True:
        active_log = db.query(Consumptionlog).filter(
            Consumptionlog.item_id == item_id,
            Consumptionlog.depletes_at.is_(None)
        ).order_by(Consumptionlog.id.desc()).first()

        if active_log:
            active_log.depletes_at = today
            db.flush() 

            completed_logs = db.query(Consumptionlog).filter(
                Consumptionlog.item_id == item_id,
                Consumptionlog.depletes_at.isnot(None)
            ).all()

            total_days = 0
            valid_count = 0

            for log in completed_logs:
                days = (log.depletes_at - log.purchased_at).days
                # 🌟 テスト用に、同日中に買っても「1日」として計算されるように調整
                if days == 0:
                    days = 1
                
                if days > 0:  
                    total_days += days
                    valid_count += 1

            if valid_count > 0:
                db_item.avg_cycle_days = total_days // valid_count

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