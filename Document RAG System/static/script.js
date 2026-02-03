document.addEventListener('DOMContentLoaded', () => {

    let currentSessionId = null;
    localStorage.removeItem('rag_chat_history');
    let chats = [];

    const chatDisplay = document.getElementById('chat-display');
    const queryInput = document.getElementById('query-input');
    const sendBtn = document.getElementById('send-btn');
    const historyList = document.querySelector('.history-list');
    const newChatBtn = document.getElementById('new-chat-btn');

    initialize();

    function initialize() {
        renderSidebar();
        if (chats.length > 0) {
            loadChat(chats[0].id);
        } else {
            startNewChat(false);
        }
    }

    function startNewChat(savePrevious = true) {
        currentSessionId = Date.now().toString();

        const newSession = {
            id: currentSessionId,
            title: 'New Chat',
            messages: [],
            timestamp: Date.now()
        };

        chats.unshift(newSession);
        saveChats();

        chatDisplay.innerHTML = `
            <div class="empty-state">
                <h1>Document RAG</h1>
                <p>Upload a document and ask me anything.</p>
            </div>
        `;
        renderSidebar();
    }

    function loadChat(id) {
        currentSessionId = id;
        const session = chats.find(c => c.id === id);
        if (!session) return;

        chatDisplay.innerHTML = '';

        if (session.messages.length === 0) {
            chatDisplay.innerHTML = `
                <div class="empty-state">
                    <h1>Document RAG</h1>
                    <p>Upload a document and ask me anything.</p>
                </div>
            `;
        } else {
            session.messages.forEach(msg => {
                renderMessage(msg.text, msg.type, msg.sources, false);
            });
            chatDisplay.scrollTop = chatDisplay.scrollHeight;
        }

        renderSidebar();
    }

    function saveChats() {
    }

    function updateSessionTitle(text) {
        const session = chats.find(c => c.id === currentSessionId);
        if (session && session.title === 'New Chat') {
            session.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
            saveChats();
            renderSidebar();
        }
    }

    function addMessageToSession(text, type, sources = []) {
        const session = chats.find(c => c.id === currentSessionId);
        if (session) {
            session.messages.push({ text, type, sources, timestamp: Date.now() });
            saveChats();
        }
    }

    function renderSidebar() {
        historyList.innerHTML = '';

        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = `history-item ${chat.id === currentSessionId ? 'active' : ''}`;
            div.textContent = chat.title || 'New Chat';

            div.addEventListener('click', () => {
                if (chat.id !== currentSessionId) {
                    loadChat(chat.id);
                }
            });

            historyList.appendChild(div);
        });

        const activeItem = historyList.querySelector('.active');
        if (activeItem) {
            activeItem.style.background = '#2a2b32';
        }
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            startNewChat();
        });
    }

    async function sendMessage() {
        const query = queryInput.value.trim();
        if (!query) return;

        if (!currentSessionId) startNewChat();

        updateSessionTitle(query);

        const emptyState = chatDisplay.querySelector('.empty-state');
        if (emptyState) emptyState.remove();

        renderMessage(query, 'user', [], true);
        addMessageToSession(query, 'user');

        queryInput.value = '';
        queryInput.style.height = 'auto';
        sendBtn.disabled = true;

        const loadingId = renderMessage('<span class="typing-dots">Thinking...</span>', 'bot temp', [], false);

        try {
            const session = chats.find(c => c.id === currentSessionId);
            let history = [];
            if (session) {
                const previousMsgs = session.messages.slice(0, -1);
                history = previousMsgs.map(m => ({
                    role: m.type === 'user' ? 'user' : 'model',
                    content: m.text
                }));
            }

            const response = await fetch('/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: query,
                    history: history
                })
            });

            const data = await response.json();

            const loader = document.getElementById(loadingId);
            if (loader) loader.remove();

            if (!response.ok) throw new Error(data.message || 'Error');

            const answer = data.answer;
            const sources = data.sources || [];

            renderMessage(answer, 'bot', sources, true);
            addMessageToSession(answer, 'bot', sources);

        } catch (error) {
            const loader = document.getElementById(loadingId);
            if (loader) loader.remove();

            const errMsg = 'Sorry, something went wrong.';
            renderMessage(errMsg, 'bot', [], true);
            addMessageToSession(errMsg, 'bot');
            console.error(error);
        }
    }

    function renderMessage(text, type, sources = [], animate = false) {
        const div = document.createElement('div');
        const id = 'msg-' + Date.now() + Math.random();
        div.id = id;
        div.className = `message ${type}`;

        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        let content = `<div class="content">${formattedText}`;

        if (sources && sources.length > 0) {
            content += `<div class="sources-container"><div class="source-header" style="opacity:0.8; font-size:0.8rem">Sources:</div>`;
            sources.forEach(src => {
                content += `
                    <div class="source-item">
                        <div class="source-header">📄 ${src.source} <span class="chunk-badge">Chunk ${src.chunk_id || '?'}</span></div>
                        <div class="source-text">"${(src.text || '').substring(0, 150)}..."</div>
                    </div>`;
            });
            content += `</div>`;
        }

        content += `</div>`;
        div.innerHTML = content;
        chatDisplay.appendChild(div);

        chatDisplay.scrollTop = chatDisplay.scrollHeight;
        return id;
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        queryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        queryInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value.trim() !== '') {
                sendBtn.disabled = false;
                sendBtn.style.color = '#ececf1';
            } else {
                sendBtn.disabled = true;
                sendBtn.style.color = '#c5c5d2';
            }
        });
    }

    const modals = {
        upload: document.getElementById('upload-modal'),
        status: document.getElementById('status-modal')
    };

    const btns = {
        upload: document.getElementById('upload-btn'),
        status: document.getElementById('status-btn')
    };

    const closeBtns = document.querySelectorAll('.close-modal');

    if (btns.upload) btns.upload.addEventListener('click', () => modals.upload.classList.remove('hidden'));
    if (btns.status) {
        btns.status.addEventListener('click', () => {
            modals.status.classList.remove('hidden');
            fetchStatus();
        });
    }

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('hidden');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
        }
    });

    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const dropZone = document.getElementById('drop-zone');

    if (fileInput) fileInput.addEventListener('change', (e) => handleFileUpload(e.target.files[0]));

    if (dropZone) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#ececf1'; });
        dropZone.addEventListener('dragleave', (e) => { e.preventDefault(); dropZone.style.borderColor = '#4d4d4f'; });
        dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.style.borderColor = '#4d4d4f'; handleFileUpload(e.dataTransfer.files[0]); });
    }

    async function handleFileUpload(file) {
        if (!file) return;
        uploadStatus.textContent = `Uploading ${file.name}...`;
        uploadStatus.className = 'status-msg loading';
        uploadStatus.style.color = '#ececf1';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (response.ok) {
                uploadStatus.innerHTML = `✅ ${data.message}`;
                uploadStatus.style.color = '#10a37f';
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            uploadStatus.textContent = `❌ Error: ${error.message}`;
            uploadStatus.style.color = 'red';
        }
    }

    async function fetchStatus() {
        try {
            const statusText = document.getElementById('system-status-text');
            const chunkCount = document.getElementById('chunk-count');
            statusText.textContent = "Checking...";
            const response = await fetch('/status');
            const data = await response.json();
            statusText.textContent = data.status === 'running' ? 'Active' : 'Stopped';
            statusText.style.color = data.status === 'running' ? '#10a37f' : 'red';
            chunkCount.textContent = data.chunk_count;
        } catch (error) {
            console.error(error);
            document.getElementById('system-status-text').textContent = 'Error';
        }
    }

});
