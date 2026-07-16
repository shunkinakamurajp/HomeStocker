from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
import zoneinfo
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler

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
    last_purchased_at = Column(Date, nullable=True)
    avg_cycle_days = Column(Integer, nullable=True)
    is_notified = Column(Boolean, default=False)

class Consumptionlog(Base):
    __tablename__ = "consumption_logs"
    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id"))
    purchased_at = Column(Date)
    depletes_at = Column(Date, nullable=True)

class SystemSettings(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    notify_time = Column(String, default="07:00")
    notify_frequency = Column(String, default="always")

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

class SystemSettingsBase(BaseModel):
    notify_time: str
    notify_frequency: str

class SystemSettingsResponse(SystemSettingsBase):
    id: int

    model_config = ConfigDict(from_attributes=True) # Pydantic v2 用

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

# --- 🌟 STEP 6: Discord通知バッチ処理ロジック ---

def JST_now():
    """自宅サーバー内で確実に日本時間(JST)を基準にするためのヘルパー"""
    return datetime.now(zoneinfo.ZoneInfo("Asia/Tokyo"))

def batch_check_and_notify():
    """毎分実行され、設定時刻になったら在庫をスキャンしてDiscordへ通知する"""
    db: Session = SessionLocal()
    try:
        # 1. DBから現在の通知設定を取得
        settings = db.query(SystemSettings).first()
        if not settings:
            return  # 設定テーブルが空の場合は何もしない

        # 現在のJST時刻を "HH:MM" 形式の文字列にする (例: "07:00")
        now_str = JST_now().strftime("%H:%M")

        # 画面から設定された通知時刻と一致しなければ、この分は処理をスキップ
        if now_str != settings.notify_time:
            return

        # 2. 通知対象アイテムの抽出 (残り予測日数が3日以下のもの)
        alert_items = []
        today_jst = JST_now().date()
        
        # カートに入っておらず、ストックが1個以上あるアイテムを全スキャン
        items = db.query(Item).filter(Item.is_in_cart == False, Item.stock_count > 0).all()

        for item in items:
            if item.last_purchased_at and item.avg_cycle_days and item.avg_cycle_days > 0:
                # 枯渇予測日 = 前回購入日 + 平均消費日数
                estimated_depletion = item.last_purchased_at + timedelta(days=item.avg_cycle_days)
                # 残り日数計算
                remaining_days = (estimated_depletion - today_jst).days

                # 残り3日以下が通知対象
            if remaining_days <= 3:
                # 設定が「初日のみ（first_day）」かつ「既に通知済み」ならリストに入れない
                if settings.notify_frequency == "first_day" and item.is_notified:
                    continue
                
                alert_items.append(item)

        # 3. Discord Webhookへの送信処理
        if alert_items:
            # 直接ここにURLを書いても、環境変数 DISCORD_WEBHOOK_URL から読み込んでも動く設計
            webhook_url = os.getenv("DISCORD_WEBHOOK_URL", "ここにマスターが発行したDiscordのWebhookURLを貼り付けてください")
            
            if not webhook_url or "DiscordのWebhookURL" in webhook_url:
                print("【警告】Discord Webhook URLが正しく設定されていないため、通知をスキップしました。")
                return

            # メッセージ文面の構築（温かみのあるアースカラー通知）
            content = "📢 **【HomeStocker】ストック切れ間近アラート**\n"
            content += f"朝の定期ストックチェックです。以下のアイテムの消費予測が近づいています！\n"
            content += "========================================\n\n"
            
            for item, days in alert_items:
                if days == 0:
                    time_msg = "🚨 本日枯渇する予測です！"
                elif days < 0:
                    time_msg = f"⚠️ 予測日を {abs(days)} 日超過しています"
                else:
                    time_msg = f"⏳ あと {days} 日で枯渇予測"
                
                # 特定の商品名(specific_name)や店舗タグ(store_tag)があればそれも親切に表示
                store_info = f"（購入先: {item.store_tag}）" if item.store_tag else ""
                content += f"・**{item.general_name}** {store_info}\n"
                content += f"  ┗ 在庫: {item.stock_count}個  [{time_msg}]\n"
            
            content += "\n========================================\n"
            content += "買い出しの際は、買うものリスト（カート）への追加をお忘れなく！🛒✨"

            # DiscordへPOST送信
            payload = {"content": content}
            response = requests.post(webhook_url, json=payload)
            if response.status_code == 204:
                print(f"[{JST_now()}] Discordへの通知バッチが正常に完了しました。")
            else:
                print(f"[{JST_now()}] Discord通知に失敗しました。ステータスコード: {response.status_code}")

            # Discordへ送信した後、通知したアイテムのフラグを「通知済み(True)」に変更して保存します
            for item in alert_items:
                item.is_notified = True
            db.commit()
            
    except Exception as e:
        print(f"【エラー】通知バッチ処理中に予期せぬ問題が発生しました: {e}")
    finally:
        db.close()

@app.get("/api/items", response_model=list[ItemResponse])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Item).offset(skip).limit(limit).all()

# --- システム設定 API ---
@app.get("/settings", response_model=SystemSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings(id=1, notify_time="07:00", notify_frequency="always")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@app.put("/settings", response_model=SystemSettingsResponse)
def update_settings(settings_update: SystemSettingsBase, db: Session = Depends(get_db)):
    settings = db.query(SystemSettings).first()
    if not settings:
        settings = SystemSettings(id=1)
        db.add(settings)
    
    settings.notify_time = settings_update.notify_time
    settings.notify_frequency = settings_update.notify_frequency
    db.commit()
    db.refresh(settings)
    return settings

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

    # カート状態の変化を先にチェック（変数の定義）
    bought_from_cart = (db_item.is_in_cart == True and item.is_in_cart == False)
    put_into_cart = (db_item.is_in_cart == False and item.is_in_cart == True)

    # === レアケース（同時操作）の排他制御 ===
    # 定義した変数を使って判定。在庫増加とカート投入が同時に行われた場合はカート投入をキャンセル
    if stock_increased and put_into_cart:
        put_into_cart = False

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
                    # round(..., 1) の「, 1」を消して、きれいな整数にします
                    db_item.avg_cycle_days = round(total_days / valid_count)

            # 🎯 3. 次の計測のためのリセット処理
            if put_into_cart:
                # 完全にストックがゼロになった場合は計測ストップ
                db_item.last_purchased_at = None
            else:
                # まだストックがある場合（マイナスボタン）は、ここから「次の1個」を使い始めるので「今日」をセット
                db_item.last_purchased_at = today

    # クライアントから送られてきた値で db_item を上書き更新
    # .dict() を .model_dump() に変更します
    for key, value in item.model_dump(exclude_unset=True).items():
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

# バックグラウンドスケジューラーの初期化
scheduler = BackgroundScheduler()
# 毎分 00秒 にチェックを走らせる設定
scheduler.add_job(batch_check_and_notify, 'cron', minute='*', second='00')

@app.on_event("startup")
def start_scheduler():
    scheduler.start()
    print("🚀 [HomeStocker] バックグラウンド通知スケジューラーが常駐を開始しました。")

@app.on_event("shutdown")
def shutdown_scheduler():
    scheduler.shutdown()
    print("🔒 [HomeStocker] バックグラウンド通知スケジューラーを停止しました。")