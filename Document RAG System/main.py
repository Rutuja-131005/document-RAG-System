import argparse
import sys
from ingest import ingest_directory
from rag import query_rag
from flask import Flask, render_template

app = Flask(__name__)

def main():
    parser = argparse.ArgumentParser(description="RAG System Entry Point")
    parser.add_argument("--mode", choices=["ingest", "query"], help="Mode to run: 'ingest' or 'query'")
    parser.add_argument("--query", type=str, help="Query string for retrieval (required if mode is 'query')")
    
    # Check if no arguments provided, print help
    if len(sys.argv) == 1:
        parser.print_help()
        # Also run a demo if no args provided for convenience
        print("\n--- Demo Run ---")
        print("1. Running Ingestion...")
        ingest_directory()
        print("\n2. Performing Test Query: 'What is the Turing test?'")
        query_rag("What is the Turing test?")
        return

    args = parser.parse_args()

    if args.mode == "ingest":
        ingest_directory()
    elif args.mode == "query":
        if not args.query:
            print("Error: --query argument is required for query mode.")
        else:
            query_rag(args.query)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload_error():
    return {"message": "WRONG SERVER! You are running 'python main.py' (Port 5000). Please STOP this and run 'uvicorn app:app --host 0.0.0.0 --port 8000 --reload' to use the full system."}, 400

@app.route("/query", methods=["POST"])
def query_error():
    return {"answer": "WRONG SERVER! Please use port 8000 (uvicorn app:app).", "sources": []}, 400

@app.route("/status")
def status_error():
    return {"status": "Stopped (Wrong Server)", "chunk_count": 0}, 200

if __name__ == "__main__":
    app.run(debug=True)
    main()
