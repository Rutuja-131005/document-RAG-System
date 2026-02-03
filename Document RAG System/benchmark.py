import time
import os
from ingest import ingest_file
from rag import query_rag

# Test Configuration
TEST_FILE = "data/tic cisco report.pdf"  # Using existing file
TEST_QUERY = "What is the main topic of this report?"

def benchmark_ingestion():
    print(f"--- Benchmarking Ingestion of {TEST_FILE} ---")
    start_time = time.time()
    success = ingest_file(TEST_FILE)
    end_time = time.time()
    
    if success:
        duration = end_time - start_time
        print(f"Ingestion Successful. Duration: {duration:.4f} seconds")
        return duration
    else:
        print("Ingestion Failed.")
        return None

def benchmark_retrieval():
    print(f"--- Benchmarking Retrieval for query: '{TEST_QUERY}' ---")
    start_time = time.time()
    result = query_rag(TEST_QUERY)
    end_time = time.time()
    
    duration = end_time - start_time
    print(f"Retrieval Complete. Duration: {duration:.4f} seconds")
    print(f"Answer: {result['answer'][:100]}...") # Print specific part for verification
    return duration

if __name__ == "__main__":
    if not os.path.exists(TEST_FILE):
        print(f"Error: {TEST_FILE} not found. Please ensure a test file exists.")
    else:
        ingest_time = benchmark_ingestion()
        retrieval_time = benchmark_retrieval()
        
        print("\n--- Summary ---")
        if ingest_time:
            print(f"Ingestion Time: {ingest_time:.4f}s")
        if retrieval_time:
            print(f"Retrieval + Gen Time: {retrieval_time:.4f}s")
