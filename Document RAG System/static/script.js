document.addEventListener('DOMContentLoaded', () => {
    // --- Tabs Logic ---
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => {
                c.style.display = 'none';
                c.classList.remove('active');
            });

            // Add active to clicked
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab') + '-tab';
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.style.display = 'block';
                setTimeout(() => targetContent.classList.add('active'), 10);

                // If Status tab is clicked, fetch stats
                if (tab.getAttribute('data-tab') === 'status') {
                    fetchStatus();
                }
            }
        });
    });

    // --- Status Logic ---
    async function fetchStatus() {
        try {
            const response = await fetch('/status');
            const data = await response.json();
            document.getElementById('system-status-text').textContent = data.status === 'running' ? 'Running' : 'Stopped';
            document.getElementById('chunk-count').textContent = data.chunk_count;
        } catch (error) {
            console.error('Error fetching status:', error);
            document.getElementById('system-status-text').textContent = 'Error';
        }
    }

    // Set Date in Header
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }

    // --- Document Upload Logic ---
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');

    if (fileInput) {
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            uploadStatus.textContent = `Uploading ${file.name}...`;
            uploadStatus.className = 'status-msg loading';

            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch('/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (response.ok) {
                    uploadStatus.innerHTML = `✅ ${data.message}`;
                    uploadStatus.className = 'status-msg success';
                    // Refresh stats silently if needed
                } else {
                    throw new Error(data.message);
                }
            } catch (error) {
                uploadStatus.textContent = `❌ Error: ${error.message}`;
                uploadStatus.className = 'status-msg error';
            }
        });
    }

    // --- Chat Logic ---
    const sendBtn = document.getElementById('send-btn');
    const queryInput = document.getElementById('query-input');
    const chatDisplay = document.getElementById('chat-display');

    async function sendMessage() {
        const query = queryInput.value.trim();
        if (!query) return;

        // Clear empty state
        if (chatDisplay.querySelector('.empty-state')) {
            chatDisplay.innerHTML = '';
        }

        // Add User Message
        appendMessage(query, 'user');
        queryInput.value = '';
        queryInput.disabled = true;
        sendBtn.disabled = true;

        // Add Loading Placeholder
        const loadingId = appendMessage('<span class="typing-dots">Thinking...</span>', 'bot temp');

        try {
            const response = await fetch('/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query })
            });
            const data = await response.json();

            // Remove loading
            const loader = document.getElementById(loadingId);
            if (loader) loader.remove();

            // Add Bot Response
            appendMessage(data.answer, 'bot', data.sources);

        } catch (error) {
            const loader = document.getElementById(loadingId);
            if (loader) loader.remove();
            appendMessage('Sorry, something went wrong. Please check the backend.', 'bot');
            console.error(error);
        } finally {
            queryInput.disabled = false;
            sendBtn.disabled = false;
            queryInput.focus();
        }
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        queryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    function appendMessage(text, type, sources = []) {
        const div = document.createElement('div');
        const id = 'msg-' + Date.now();
        div.id = id;
        div.className = `message ${type}`;

        let formattedText = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');

        let content = `<div class="content">${formattedText}</div>`;

        if (sources && sources.length > 0) {
            content += `<div class="sources-container"><div class="source-header" style="margin-bottom:8px">Sources Used:</div>`;
            sources.forEach(src => {
                content += `
                    <div class="source-item">
                        <div class="source-header">📄 ${src.source} <span class="chunk-badge">Chunk ${src.chunk_id}</span></div>
                        <div class="source-text">"${src.text.substring(0, 150)}..."</div>
                    </div>`;
            });
            content += `</div>`;
        }

        div.innerHTML = content;
        chatDisplay.appendChild(div);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
        return id;
    }
});
