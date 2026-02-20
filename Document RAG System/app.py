from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import shutil
import os
from ingest import ingest_file, get_collection_stats
from rag import query_rag
from pydantic import BaseModel

app = FastAPI()

os.makedirs("data", exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/files_static", StaticFiles(directory="data"), name="files_static")

class QueryRequest(BaseModel):
    query: str
    history: list[dict] = []

@app.get("/")
async def read_root():
    return FileResponse('templates/index.html')

from fastapi import BackgroundTasks

def background_ingest(file_location):
    ingest_file(file_location)

@app.post("/upload")
async def upload_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    try:
        file_location = f"data/{file.filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run ingestion in background
        background_tasks.add_task(background_ingest, file_location)
        
        return JSONResponse(content={"message": f"Upload accepted. Processing {file.filename} in background."}, status_code=200)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"ERROR: Upload failed: {e}")
        return JSONResponse(content={"message": str(e)}, status_code=500)

@app.get("/files")
async def list_files():
    files = []
    if os.path.exists("data"):
        for f in os.listdir("data"):
            if os.path.isfile(os.path.join("data", f)):
                 files.append(f)
    return files

@app.delete("/files/{filename}")
async def delete_file(filename: str):
    file_path = os.path.join("data", filename)
    
    # 1. Delete from disk
    if os.path.exists(file_path):
        os.remove(file_path)
    else:
        return JSONResponse(content={"message": "File not found on disk"}, status_code=404)
        
    # 2. Delete from ChromaDB
    from ingest import delete_file_embeddings
    success = delete_file_embeddings(filename)
    
    if success:
        return {"message": f"Deleted {filename}"}
    else:
         return JSONResponse(content={"message": "File deleted from disk but failed to remove from DB"}, status_code=500)

@app.post("/query")
async def query_endpoint(request: QueryRequest):
    response_data = query_rag(request.query, request.history)
    return response_data

@app.get("/status")
async def get_status():
    count = get_collection_stats()
    return {"status": "running", "chunk_count": count}

@app.get("/history")
async def get_history():
    from history import get_all_chats
    return get_all_chats()

@app.get("/history/{chat_id}")
async def get_chat_history(chat_id: str):
    from history import get_chat
    chat = get_chat(chat_id)
    if chat:
        return chat
    return JSONResponse(content={"message": "Chat not found"}, status_code=404)

@app.delete("/history/{chat_id}")
async def delete_chat_history(chat_id: str):
    from history import delete_chat
    success = delete_chat(chat_id)
    if success:
        return {"message": "Chat deleted"}
    return JSONResponse(content={"message": "Chat not found"}, status_code=404)

class SaveChatRequest(BaseModel):
    id: str
    title: str
    messages: list[dict]

@app.post("/history")
async def save_chat_history(request: SaveChatRequest):
    from history import save_chat
    save_chat(request.id, request.title, request.messages)
    return {"message": "Chat saved"}

if __name__ == "__main__":
    import uvicorn
    print("starting server...")
    print("Open http://localhost:8000 in your browser to access the application.")
    uvicorn.run(app, host="localhost", port=8000)