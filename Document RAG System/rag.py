import os
import chromadb
from chromadb.utils import embedding_functions
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configuration
CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "rag_collection"
MODEL_NAME = "all-MiniLM-L6-v2"

def query_rag(query_text):
    """
    Retrieve relevant docs and generate answer.
    Returns a dict: {'answer': str, 'citations': list}
    """
    
    # 1. Initialize Client & Collection
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=MODEL_NAME)
    
    try:
        collection = client.get_collection(name=COLLECTION_NAME, embedding_function=ef)
    except ValueError:
        return {"answer": "System not initialized. Please upload documents first.", "citations": []}

    # 2. Retrieve
    results = collection.query(
        query_texts=[query_text],
        n_results=3
    )
    
    if not results['documents'] or not results['documents'][0]:
        return {"answer": "I couldn't find any relevant information in the documents.", "citations": []}

    retrieved_docs = results['documents'][0]
    metadatas = results['metadatas'][0]
    
    # 3. Construct Context
    context_str = ""
    citations = []
    
    for i, doc in enumerate(retrieved_docs):
        source = metadatas[i].get("source", "Unknown")
        chunk_id = metadatas[i].get("chunk_id", "Unknown")
        context_str += f"---\nSource: {source} (Chunk {chunk_id})\nContent: {doc}\n"
        citations.append(f"{source}: Chunk {chunk_id}")

    prompt = f"""You are a helpful assistant. Answer the user's question based strictly on the context provided below.

Context:
{context_str}

Question: {query_text}

Answer:"""

    # 4. Generate Answer
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return {"answer": "API Key missing. Please check server configuration.", "citations": []}

    try:
        genai.configure(api_key=api_key)
        
        # Auto-discovery logic for model
        model_name = 'gemini-1.5-flash'
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
        except Exception:
            # Fallback to gemini-pro if 1.5-flash not found
            try:
                model = genai.GenerativeModel('gemini-pro')
                response = model.generate_content(prompt)
            except Exception:
                 # Final fallback: list available models
                available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
                if not available_models:
                    return {"answer": "No available Gemini models found for this API key.", "citations": []}
                
                model_name = next((m for m in available_models if 'gemini' in m), available_models[0])
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)

        return {
            "answer": response.text,
            "sources": [
                {"source": m.get("source"), "chunk_id": m.get("chunk_id"), "text": d} 
                for m, d in zip(metadatas, retrieved_docs)
            ]
        }
            
    except Exception as e:
        return {"answer": f"Error generating response: {str(e)}", "sources": []}

if __name__ == "__main__":
    # Test
    result = query_rag("What is the Turing test?")
    print(result['answer'])
