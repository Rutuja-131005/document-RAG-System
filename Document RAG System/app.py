from fastapi import FastAPI, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse
import shutil
import os
from ingest import ingest_file, get_collection_stats
from rag import query_rag
from pydantic import BaseModel

app = FastAPI()

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

class QueryRequest(BaseModel):
    query: str

@app.get("/")
async def read_root():
    return FileResponse('templates/index.html')

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    try:
        file_location = f"data/{file.filename}"
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Trigger ingestion
        success = ingest_file(file_location)
        
        if success:
            return JSONResponse(content={"message": f"Successfully processed {file.filename}"}, status_code=200)
        else:
            return JSONResponse(content={"message": "Failed to extract text from file."}, status_code=400)
            
    except Exception as e:
        return JSONResponse(content={"message": str(e)}, status_code=500)

@app.post("/query")
async def query_endpoint(request: QueryRequest):
    response_data = query_rag(request.query)
    return response_data

@app.get("/status")
async def get_status():
    count = get_collection_stats()
    return {"status": "running", "chunk_count": count}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)
