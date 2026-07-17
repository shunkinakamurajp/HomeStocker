FROM python:3.11-slim
WORKDIR /app

# 1. 依存ライブラリのインストール
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. ソースコード本体のコピー（必須追加）
COPY . .

# 3. ポートの公開と起動コマンド（必須追加）
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]