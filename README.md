# Document RAG System

A full-stack Retrieval-Augmented Generation (RAG) system built with Python, FastAPI, and Google Gemini.

## 🚀 Features
- **Document Ingestion**: Helper support for PDF, DOCX, and TXT files.
- **RAG Pipeline**: Semantic search using ChromaDB and answer generation via Google Gemini.
- **Modern UI**: Dark-themed dashboard with status monitoring.

## 📅 Milestones

### Milestone 1: Document Ingestion & Indexing
- **Objective**: Build a robust data pipeline for processing and indexing documents.
- **Tasks**: Select and set up a vector database; develop scripts for document ingestion and text splitting; generate and store document embeddings.
- **Evaluation Criteria**: The document ingestion and indexing pipeline is operational, and documents can be successfully embedded and stored in the vector database.

### Milestone 2: RAG Pipeline Development
- **Objective**: Implement the core Retrieval-Augmented Generation logic.
- **Tasks**: Integrate the retrieval mechanism with the vector database; connect to an LLM API; develop the logic for synthesizing answers from retrieved chunks and citing sources.
- **Evaluation Criteria**: The RAG pipeline is functional, and the system can retrieve relevant document chunks and generate coherent, grounded answers.

## 🛠️ Prerequisites
- Python 3.9+
- A Google Cloud API Key (for Gemini)

## 📦 Installation

1.  **Clone/Download** this repository.
2.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
3.  **Setup Environment**:
    - Open the `.env` file.
    - Add your API Key: `GOOGLE_API_KEY=AIzaSy...`

## ▶️ How to Run

1.  **Start the Server**:
    ```bash
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
    ```

2.  **Access the Application**:
    - Open your web browser.
    - Go to: [http://localhost:8000](http://localhost:8000)

## 📂 Project Structure
- `app.py`: FastAPI Backend.
- `rag.py`: RAG logic (Retrieval & Generation).
- `ingest.py`: Document processing.
- `templates/index.html`: Frontend UI.
- `static/`: CSS and JS files.
