document.addEventListener('DOMContentLoaded', () => {

    let currentSessionId = null;
    let chats = [];
    let currentUtterance = null; // Track current speech

    const chatDisplay = document.getElementById('chat-display');
    const queryInput = document.getElementById('query-input');
    const sendBtn = document.getElementById('send-btn');
    const historyList = document.querySelector('.history-list');
    const newChatBtn = document.getElementById('new-chat-btn');


    const filesList = document.querySelector('.files-list');

    initialize();

    async function initialize() {
        await Promise.all([loadHistory(), loadFiles()]);
        if (chats.length > 0) {
            renderSidebar();
        } else {
            renderSidebar();
        }
        renderFilesSidebar();
    }

    async function loadHistory() {
        try {
            const response = await fetch('/history');
            chats = await response.json();
        } catch (error) {
            console.error('Failed to load history:', error);
            chats = [];
        }
    }

    let files = [];
    async function loadFiles() {
        try {
            const response = await fetch('/files');
            files = await response.json();
        } catch (error) {
            console.error('Failed to load files:', error);
            files = [];
        }
    }

    function renderFilesSidebar() {
        if (!filesList) return;
        filesList.innerHTML = '';

        if (files.length === 0) {
            filesList.innerHTML = '<div style="padding:0.75rem; color:#666; font-size:0.8rem; font-style:italic">No files uploaded</div>';
            return;
        }

        files.forEach(file => {
            const div = document.createElement('div');
            div.className = 'file-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'file-name';
            nameSpan.textContent = file;
            div.appendChild(nameSpan);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-file-btn';
            deleteBtn.innerHTML = '🗑️';
            deleteBtn.title = "Delete File";

            deleteBtn.addEventListener('click', async (e) => {
                if (confirm(`Are you sure you want to delete ${file}? This will likely break any queries referencing this document.`)) {
                    await deleteFile(file);
                }
            });

            div.appendChild(deleteBtn);
            filesList.appendChild(div);
        });
    }

    async function deleteFile(filename) {
        try {
            const res = await fetch(`/files/${filename}`, { method: 'DELETE' });
            if (res.ok) {
                await loadFiles();
                renderFilesSidebar();
            } else {
                alert('Failed to delete file');
            }
        } catch (e) {
            console.error("Failed to delete file", e);
        }
    }


    async function startNewChat() {
        // If there's an active session with messages, ensure it's saved/visible
        if (currentSessionId) {
            const currentChat = chats.find(c => c.id === currentSessionId);
            if (currentChat && currentChat.messages && currentChat.messages.length > 0) {
                await saveCurrentChat();
                await loadHistory(); // Reload to show the just-finished chat in list
                renderSidebar();
            }
        }

        currentSessionId = Date.now().toString();

        // Create new empty session object immediately
        const newSession = {
            id: currentSessionId,
            title: 'New Chat',
            messages: []
        };
        chats.unshift(newSession); // Add to local list immediately

        // Don't add to chats list yet, wait for first message
        chatDisplay.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👋</div>
                <h2>Welcome!</h2>
                <p>I'm ready to help you with your documents.</p>
            </div>
        `;

        // Remove active class from all items
        document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
    }

    async function loadChat(id) {
        if (currentSessionId === id) return;
        currentSessionId = id;

        try {
            const response = await fetch(`/history/${id}`);
            const session = await response.json();

            if (!session) return;

            chatDisplay.innerHTML = '';

            if (!session.messages || session.messages.length === 0) {
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
        } catch (e) {
            console.error("Error loading chat", e);
        }
    }

    async function saveCurrentChat() {
        const session = chats.find(c => c.id === currentSessionId);
        if (session) {
            await saveChatToServer(session.id, session.title, session.messages);
        }
    }

    async function saveChatToServer(id, title, messages) {
        try {
            await fetch('/history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, title, messages })
            });
            // We don't reload history here to avoid jitter, just ensure server has it.
            // But we might want to update the title in the sidebar if it changed.
        } catch (error) {
            console.error('Failed to save chat:', error);
        }
    }

    function renderSidebar() {
        historyList.innerHTML = '';

        chats.forEach(chat => {
            const div = document.createElement('div');
            div.className = `history-item ${chat.id === currentSessionId ? 'active' : ''}`;

            const titleSpan = document.createElement('span');
            titleSpan.className = 'history-title';
            titleSpan.textContent = chat.title || 'New Chat';
            div.appendChild(titleSpan);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat-btn';
            deleteBtn.innerHTML = '🗑️'; // or Use an SVG
            deleteBtn.title = "Delete Chat";

            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation(); // Prevent loading the chat
                if (confirm('Are you sure you want to delete this chat?')) {
                    await deleteChat(chat.id);
                }
            });

            div.appendChild(deleteBtn);

            div.addEventListener('click', () => {
                loadChat(chat.id);
            });

            historyList.appendChild(div);
        });
    }

    async function deleteChat(id) {
        try {
            const res = await fetch(`/history/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await loadHistory();
                if (currentSessionId === id) {
                    startNewChat();
                } else {
                    renderSidebar();
                }
            }
        } catch (e) {
            console.error("Failed to delete", e);
        }
    }

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            startNewChat();
        });
    }

    function updateSessionTitle(text) {
        const session = chats.find(c => c.id === currentSessionId);
        if (session && session.title === 'New Chat') {
            session.title = text.length > 30 ? text.substring(0, 30) + '...' : text;
            saveCurrentChat();
            // renderSidebar(); // Defer re-rendering or do it here
            // We want the new chat to appear in the list now that it has a title
            renderSidebar();
        }
    }

    function addMessageToSession(text, type, sources = []) {
        const session = chats.find(c => c.id === currentSessionId);
        if (session) {
            session.messages.push({ text, type, sources, timestamp: Date.now() });
            saveCurrentChat();
        }
    }

    async function sendMessage() {
        const query = queryInput.value.trim();
        if (!query) return;

        if (!currentSessionId) {
            // Should verify if we have a session object
            await startNewChat();
        }

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
        
        // Using 'message-content' to match style.css
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Message Text
        const textDiv = document.createElement('div');
        textDiv.className = 'content-text';
        textDiv.innerHTML = formattedText;
        contentDiv.appendChild(textDiv);

        // Sources section removed as per request
        /* 
        if (sources && sources.length > 0) {
            // Sources hidden
        }
        */

        // Action Buttons (Only for bot)
        if (type === 'bot' || type === 'model') {
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'message-actions';

            // Copy Button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-btn';
            copyBtn.title = 'Copy to clipboard';
            copyBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>`;
            copyBtn.onclick = () => copyToClipboard(text, copyBtn);
            
            // TTS Button
            const ttsBtn = document.createElement('button');
            ttsBtn.className = 'action-btn';
            ttsBtn.title = 'Listen';
            ttsBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>`;
            ttsBtn.onclick = () => toggleSpeech(text, ttsBtn);

            actionsDiv.appendChild(copyBtn);
            actionsDiv.appendChild(ttsBtn);
            contentDiv.appendChild(actionsDiv);
        }

        div.appendChild(contentDiv);
        chatDisplay.appendChild(div);

        chatDisplay.scrollTop = chatDisplay.scrollHeight;
        return id;
    }

    // Helper functions for Actions
    function copyToClipboard(text, btn) {
        navigator.clipboard.writeText(text).then(() => {
            const originalIcon = btn.innerHTML;
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #10a37f;">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`;
            setTimeout(() => {
                btn.innerHTML = originalIcon;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }

    function toggleSpeech(text, btn) {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            // Reset icon if we were speaking THIS text (primitive check)
            // Ideally we check if THIS button was active, but for now we reset all or just toggle logic
            // We'll update the button state based on simple toggle for now
            if (btn.classList.contains('active')) {
                btn.classList.remove('active');
                btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>`;
                return; 
            }
        }

        const utterance = new SpeechSynthesisUtterance(text);
        currentUtterance = utterance;
        
        utterance.onend = () => {
            btn.classList.remove('active');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>`;
        };

        utterance.onerror = () => {
             btn.classList.remove('active');
        };

        // Change icon to stop
        btn.classList.add('active');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <rect x="9" y="9" width="6" height="6"></rect>
            </svg>`;

        window.speechSynthesis.speak(utterance);
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

    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const dropZone = document.getElementById('drop-zone');
    const browseBtn = document.getElementById('browse-btn');

    // Browse Button Click
    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', () => fileInput.click());
    }

    // File Input Change
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileUpload(e.target.files[0]);
            }
        });
    }

    // Drag and Drop
    if (dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        dropZone.addEventListener('dragover', () => dropZone.classList.add('dragover'));
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        });
    }

    // Initial Status Check
    fetchStatus();
    // Poll status every 30 seconds
    setInterval(fetchStatus, 30000);

    async function handleFileUpload(file) {
        if (!file) return;
        uploadStatus.textContent = `Uploading ${file.name}...`;
        uploadStatus.className = 'status-msg';
        uploadStatus.style.color = '#c0c0c5';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (response.ok) {
                uploadStatus.textContent = `✅ Uploaded`;
                uploadStatus.style.color = '#10a37f';
                setTimeout(() => { uploadStatus.textContent = ''; }, 3000);

                // Inject message into chat
                renderMessage(`Uploaded file: **${file.name}**`, 'user', [], true);
                addMessageToSession(`Uploaded file: ${file.name}`, 'user');

                await loadFiles();
                renderFilesSidebar();
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            uploadStatus.textContent = `❌ Error`;
            uploadStatus.style.color = '#ff4b4b';
            console.error(error);
        }
    }

    async function fetchStatus() {
        try {
            const statusText = document.getElementById('system-status-text');
            const chunkCount = document.getElementById('chunk-count');
            if (!statusText || !chunkCount) return;

            const response = await fetch('/status');
            const data = await response.json();
            statusText.textContent = data.status === 'running' ? 'Active' : 'Stopped';
            statusText.style.color = data.status === 'running' ? '#10a37f' : '#ff4b4b';
            chunkCount.textContent = data.chunk_count;
        } catch (error) {
            console.error(error);
        }
    }

});
