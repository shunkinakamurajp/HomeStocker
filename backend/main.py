from fastapi import FastAPI
# APIテスト用
app = FastAPI(title="HomeStocker API")

@app.get("/")
def read_root():
    return {"Hello": "HomeStockerが起動しました。"}