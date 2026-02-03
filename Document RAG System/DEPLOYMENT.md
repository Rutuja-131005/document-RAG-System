# Deployment Guide

This guide covers how to deploy the Document RAG System using Docker or to a Platform as a Service (PaaS) like Render or Heroku.

## Prerequisites

- **Google Gemini API Key**: You need an API key from Google AI Studio.
- **Git**: Ensure your project is pushed to a Git repository (GitHub/GitLab).

## Option 1: Docker Deployment (Recommended)

1.  **Build the Docker Image:**
    ```bash
    docker build -t document-rag-system .
    ```

2.  **Run the Container:**
    Replace `YOUR_API_KEY` with your actual Gemini API key.
    ```bash
    docker run -p 8000:8000 -e GOOGLE_API_KEY=YOUR_API_KEY document-rag-system
    ```

3.  **Access the Application:**
    Open your browser to `http://localhost:8000`.

## Option 2: Render/Heroku (PaaS)

These platforms can read the `Procfile` or `Dockerfile` to automatically deploy your app.

### Deploying on Render.com

1.  Create a new **Web Service**.
2.  Connect your GitHub repository.
3.  Render will automatically detect the Python environment.
4.  **Build Command:** `pip install -r requirements.txt`
5.  **Start Command:** `uvicorn app:app --host 0.0.0.0 --port $PORT` (or let it use the `Procfile`).
6.  **Environment Variables:**
    - Add `GOOGLE_API_KEY` with your API key value.
    - Add `PYTHON_VERSION` set to `3.10.0` (optional but recommended).

### Persistent Data (Important)

By default, the ChromaDB database (`chroma_db` folder) is stored locally. On platforms like Heroku/Render, the filesystem is **ephemeral**, meaning your uploaded documents and index will disappear when the app restarts.

To fix this for production:
- **Solution A**: Re-upload documents every time (fine for demos).
- **Solution B**: Use a Docker volume if hosting yourself.
- **Solution C**: Configuring ChromaDB to use a client/server mode with persistent storage (advanced).

For this milestone, **Solution A** is acceptable for simple verified hosting.
