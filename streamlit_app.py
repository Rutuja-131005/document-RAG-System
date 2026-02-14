import streamlit as st
import os
import sys
from pathlib import Path

# Add the Document RAG System directory to the path
sys.path.insert(0, str(Path(__file__).parent / "Document RAG System"))

try:
    from rag import query_rag
    from ingest import ingest_file, get_collection_stats
except ImportError as e:
    st.error(f"Error importing RAG modules: {e}")
    st.stop()

st.set_page_config(
    page_title="Document RAG System",
    page_icon="📚",
    layout="wide",
    initial_sidebar_state="expanded"
)

st.title("📚 Document RAG System")
st.markdown("Ask questions about your documents using Retrieval-Augmented Generation")

with st.sidebar:
    st.header("Settings")
    st.markdown("---")
    st.subheader("📂 Document Management")
    
    uploaded_file = st.file_uploader(
        "Upload a document (PDF, DOCX, or TXT)",
        type=["pdf", "docx", "txt"],
        help="Upload documents to build the RAG database"
    )
    
    if uploaded_file is not None:
        with st.spinner(f"Processing {uploaded_file.name}..."):
            try:
                # Save uploaded file temporarily
                temp_path = f"/tmp/{uploaded_file.name}"
                with open(temp_path, "wb") as f:
                    f.write(uploaded_file.getbuffer())
                
                # Ingest the document
                result = ingest_file(temp_path)
                st.success(f"✅ Successfully processed: {uploaded_file.name}")
                st.info(f"Document stats: {result}")
                
                # Clean up temp file
                os.remove(temp_path)
            except Exception as e:
                st.error(f"Error processing file: {str(e)}")
    
    st.markdown("---")
    st.subheader("📄 Collection Info")
    try:
        stats = get_collection_stats()
        col1, col2 = st.columns(2)
        with col1:
            st.metric("Documents", stats.get('document_count', 0))
        with col2:
            st.metric("Chunks", stats.get('chunk_count', 0))
    except Exception as e:
        st.info("No documents in collection yet. Upload a document to get started.")

# Main chat interface
st.header("🗣️ Ask Questions")

if "messages" not in st.session_state:
    st.session_state.messages = []

# Display chat history
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Chat input
if user_input := st.chat_input("Ask a question about your documents..."):
    # Add user message to chat history
    st.session_state.messages.append({"role": "user", "content": user_input})
    
    with st.chat_message("user"):
        st.markdown(user_input)
    
    # Get RAG response
    with st.chat_message("assistant"):
        with st.spinner("Searching documents and generating answer..."):
            try:
                response = query_rag(user_input)
                
                # Display answer
                if isinstance(response, dict):
                    answer = response.get('answer', 'No answer found.')
                    citations = response.get('citations', [])
                    
                    st.markdown(answer)
                    
                    if citations:
                        with st.expander("📁 View Sources"):
                            for i, citation in enumerate(citations, 1):
                                st.write(f"**Source {i}:** {citation}")
                else:
                    answer = str(response)
                    st.markdown(answer)
                
                # Add assistant message to chat history
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": answer if isinstance(response, dict) else answer
                })
                
            except Exception as e:
                error_msg = f"Error generating response: {str(e)}"
                st.error(error_msg)
                st.session_state.messages.append({"role": "assistant", "content": error_msg})

