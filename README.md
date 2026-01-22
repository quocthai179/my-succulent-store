# my-succulent-store

## Cấu trúc
- `ui/`: giao diện người dùng.
- `be/`: backend FastAPI.
- `history_codex`: các yêu cầu ràng buộc dự án.

## Chạy backend (FastAPI)
```bash
cd be
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Chạy giao diện (tĩnh)
```bash
cd ui
python -m http.server 5173
```
Mở `http://localhost:5173` để xem giao diện. Backend mặc định chạy tại `http://localhost:8000`.
