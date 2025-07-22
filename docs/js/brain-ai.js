// Julian's Brain AI using secure proxy endpoint
// No API keys required - seamless experience!

class BrainAI {
    constructor() {
        this.isInitialized = false;
        this.isLoading = false;
        this.conversationHistory = [];
        this.apiEndpoint = 'https://weavejul-github-io.vercel.app/api/chat';
        this.maxRetries = 3;
        this.initializeInterface();
    }

    initializeInterface() {
        // Create chat interface
        this.createAIInterface();
        this.setupEventListeners();
    }

    createAIInterface() {
        const brainPanel = document.getElementById('brain-panel-container');
        if (!brainPanel) return;

        const aiInterface = document.createElement('div');
        aiInterface.innerHTML = `
            <div class="ai-section section" id="brain-ai-section">
                <h2>🧠 Neural Interface</h2>
                <div class="ai-status" id="ai-status">
                    <span class="status-indicator offline"></span>
                    <span id="status-text">AI Neural Network Offline</span>
                </div>
                
                <div class="ai-info" id="ai-info">
                    <p><strong>Julian's Brain AI:</strong> An interactive assistant specializing in neuroscience, XAI research, and AI safety. 
                    Powered by Google Gemini - no setup required!</p>
                    <p><em>Ready to discuss my research instantly. Click "Activate AI" to begin!</em></p>
                </div>
                
                <div class="ai-chat-container" id="ai-chat-container">
                    <div class="ai-messages" id="ai-messages">
                        <div class="ai-message system-message">
                            <span class="message-prefix">[SYSTEM]</span>
                            <span class="message-content">Neural network ready for activation. Click "Activate AI" to begin.</span>
                        </div>
                    </div>
                    
                    <div class="ai-input-area">
                        <div class="ai-controls">
                            <button class="ai-control-btn" id="activate-ai-btn">Activate AI</button>
                            <button class="ai-control-btn" id="clear-chat-btn" disabled>Clear Neural Buffer</button>
                            <button class="ai-control-btn" id="example-btn" disabled>Example Questions</button>
                        </div>
                        <div class="ai-input-wrapper" style="display: none;">
                            <input type="text" id="ai-input" placeholder="Query the neural network..." disabled>
                            <button id="ai-send-btn" disabled>↗</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert before the footer
        const footer = brainPanel.querySelector('.footer');
        if (footer) {
            footer.parentNode.insertBefore(aiInterface, footer);
        } else {
            brainPanel.appendChild(aiInterface);
        }

        this.addAIStyles();
    }

    addAIStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .ai-section {
                background: linear-gradient(145deg, #1a0000 0%, #2a0000 100%);
                border: 2px solid #ff4444;
                position: relative;
                overflow: hidden;
            }
            
            .ai-section::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, #ff4444, #ff6666, #ff4444, transparent);
                animation: neuralPulse 2s ease-in-out infinite;
            }
            
            @keyframes neuralPulse {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; box-shadow: 0 0 10px rgba(255, 68, 68, 0.5); }
            }
            
            .ai-info {
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 102, 102, 0.2);
                padding: 10px;
                margin-bottom: 15px;
                border-radius: 4px;
                font-size: 11px;
                line-height: 1.4;
            }
            
            .ai-info p {
                margin: 6px 0;
            }
            
            .ai-info em {
                color: #ffaa00;
            }
            
            .ai-status {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 15px;
                padding: 8px 12px;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 68, 68, 0.3);
                border-radius: 4px;
            }
            
            .status-indicator {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                animation: statusBlink 2s ease-in-out infinite;
            }
            
            .status-indicator.offline {
                background: #666;
            }
            
            .status-indicator.loading {
                background: #ffaa00;
                animation: statusPulse 1s ease-in-out infinite;
            }
            
            .status-indicator.online {
                background: #44ff44;
                box-shadow: 0 0 8px rgba(68, 255, 68, 0.5);
            }
            
            @keyframes statusBlink {
                0%, 100% { opacity: 0.5; }
                50% { opacity: 1; }
            }
            
            @keyframes statusPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.7; }
            }
            
            .ai-chat-container {
                height: 350px;
                display: flex;
                flex-direction: column;
            }
            
            .ai-messages {
                flex: 1;
                overflow-y: auto;
                padding: 10px;
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid rgba(255, 68, 68, 0.2);
                margin-bottom: 10px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
            }
            
            .ai-messages::-webkit-scrollbar {
                width: 6px;
            }
            
            .ai-messages::-webkit-scrollbar-track {
                background: rgba(26, 0, 0, 0.8);
            }
            
            .ai-messages::-webkit-scrollbar-thumb {
                background: rgba(255, 68, 68, 0.3);
                border-radius: 3px;
            }
            
            .ai-message {
                margin-bottom: 8px;
                animation: messageSlideIn 0.3s ease-out;
                word-wrap: break-word;
            }
            
            @keyframes messageSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .message-prefix {
                color: #ff4444;
                font-weight: bold;
                margin-right: 8px;
            }
            
            .user-message .message-prefix {
                color: #44ff44;
            }
            
            .system-message .message-prefix {
                color: #ffaa00;
            }
            
            .message-content {
                color: #ff6666;
            }
            
            .ai-controls {
                display: flex;
                gap: 5px;
                margin-bottom: 10px;
                flex-wrap: wrap;
            }
            
            .ai-control-btn {
                background: linear-gradient(145deg, #3a0000, #2a0000);
                border: 1px solid #ff4444;
                color: #ff6666;
                padding: 6px 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-family: 'Courier New', monospace;
                font-size: 11px;
                flex: 1;
                min-width: 80px;
            }
            
            .ai-control-btn:hover:not(:disabled) {
                background: linear-gradient(145deg, #4a0000, #3a0000);
                box-shadow: 0 0 10px rgba(255, 68, 68, 0.3);
                transform: translateY(-1px);
            }
            
            .ai-control-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .ai-input-wrapper {
                display: flex;
                gap: 5px;
            }
            
            #ai-input {
                flex: 1;
                background: rgba(0, 0, 0, 0.7);
                border: 1px solid rgba(255, 68, 68, 0.3);
                color: #ff6666;
                padding: 8px 12px;
                font-family: 'Courier New', monospace;
                font-size: 12px;
            }
            
            #ai-input:focus {
                outline: none;
                border-color: #ff4444;
                box-shadow: 0 0 5px rgba(255, 68, 68, 0.3);
            }
            
            #ai-input::placeholder {
                color: rgba(255, 102, 102, 0.5);
            }
            
            #ai-send-btn {
                background: linear-gradient(145deg, #3a0000, #2a0000);
                border: 1px solid #ff4444;
                color: #ff6666;
                padding: 8px 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-weight: bold;
            }
            
            #ai-send-btn:hover:not(:disabled) {
                background: #ff4444;
                color: #ffffff;
                transform: scale(1.05);
            }
            
            #ai-send-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
            
            .typing-indicator {
                color: #ffaa00;
                font-style: italic;
            }
            
            .typing-indicator::after {
                content: '...';
                animation: typingDots 1.4s infinite;
            }
            
            @keyframes typingDots {
                0%, 20% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }
            
            /* Mobile responsive */
            @media (max-width: 600px) {
                .ai-chat-container {
                    height: 300px;
                }
                
                .ai-controls {
                    flex-direction: column;
                }
                
                .ai-control-btn {
                    font-size: 10px;
                    padding: 5px 10px;
                }
                
                .ai-info {
                    font-size: 10px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    setupEventListeners() {
        const activateBtn = document.getElementById('activate-ai-btn');
        const clearBtn = document.getElementById('clear-chat-btn');
        const exampleBtn = document.getElementById('example-btn');
        const sendBtn = document.getElementById('ai-send-btn');
        const input = document.getElementById('ai-input');

        activateBtn?.addEventListener('click', () => this.initializeAI());
        clearBtn?.addEventListener('click', () => this.clearChat());
        exampleBtn?.addEventListener('click', () => this.showExampleQuestions());
        sendBtn?.addEventListener('click', () => this.sendMessage());
        
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    async initializeAI() {
        if (this.isLoading || this.isInitialized) return;
        
        this.isLoading = true;
        this.updateStatus('loading', 'Initializing Neural Network...');
        
        try {
            // Test the proxy connection
            await this.testConnection();
            
            this.isInitialized = true;
            this.isLoading = false;
            
            this.updateStatus('online', 'Neural Network Online');
            this.addSystemMessage('Julian\'s Brain AI initialized successfully!');
            this.addAIMessage('Hello! I\'m Julian\'s AI brain assistant. I can discuss my research in neuroscience, XAI, neuroimaging, and AI safety. I\'m particularly passionate about building safer AI systems by understanding how biological intelligence works. What would you like to explore?');
            
            // Enable input
            this.enableInput();
            
        } catch (error) {
            console.error('Failed to initialize AI:', error);
            this.updateStatus('offline', 'Neural Network Failed to Initialize');
            this.addSystemMessage(`Error: ${error.message}`);
            this.addSystemMessage('Please check your internet connection and try again.');
            this.isLoading = false;
        }
    }

    async testConnection() {
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: 'Hello, testing connection.'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Connection test failed: ${response.status}`);
        }
    }

    enableInput() {
        const inputWrapper = document.querySelector('.ai-input-wrapper');
        const input = document.getElementById('ai-input');
        const sendBtn = document.getElementById('ai-send-btn');
        const clearBtn = document.getElementById('clear-chat-btn');
        const exampleBtn = document.getElementById('example-btn');
        const activateBtn = document.getElementById('activate-ai-btn');
        
        inputWrapper.style.display = 'flex';
        input.disabled = false;
        sendBtn.disabled = false;
        clearBtn.disabled = false;
        exampleBtn.disabled = false;
        activateBtn.textContent = 'Neural Network Active';
        activateBtn.disabled = true;
        
        input.focus();
    }

    showExampleQuestions() {
        const examples = [
            "What is your XAI research about?",
            "How does predictive coding relate to AI?",
            "What are the dangers of neurotechnology?",
            "Explain your fMRI explainability work",
            "Why is AI safety important for neuroscience?",
            "What is NeuroAI and why does it matter?"
        ];
        
        this.addSystemMessage('Example questions you can ask:');
        examples.forEach(example => {
            this.addSystemMessage(`• ${example}`);
        });
    }

    updateStatus(status, text) {
        const indicator = document.querySelector('.status-indicator');
        const statusText = document.getElementById('status-text');
        
        if (indicator) {
            indicator.className = `status-indicator ${status}`;
        }
        if (statusText) {
            statusText.textContent = text;
        }
    }

    addSystemMessage(content) {
        this.addMessage('SYSTEM', content, 'system-message');
    }

    addUserMessage(content) {
        this.addMessage('USER', content, 'user-message');
    }

    addAIMessage(content) {
        this.addMessage('JULIAN.AI', content, 'ai-message');
    }

    addMessage(prefix, content, className) {
        const messagesContainer = document.getElementById('ai-messages');
        if (!messagesContainer) return;

        const messageElement = document.createElement('div');
        messageElement.className = `ai-message ${className}`;
        messageElement.innerHTML = `
            <span class="message-prefix">[${prefix}]</span>
            <span class="message-content">${content}</span>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async sendMessage() {
        const input = document.getElementById('ai-input');
        const sendBtn = document.getElementById('ai-send-btn');
        
        if (!input || !this.isInitialized || !input.value.trim()) return;
        
        const userMessage = input.value.trim();
        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;
        
        // Add user message
        this.addUserMessage(userMessage);
        
        // Add typing indicator
        const typingElement = document.createElement('div');
        typingElement.className = 'ai-message typing-indicator';
        typingElement.innerHTML = `
            <span class="message-prefix">[JULIAN.AI]</span>
            <span class="message-content">Processing neural pathways</span>
        `;
        
        const messagesContainer = document.getElementById('ai-messages');
        messagesContainer.appendChild(typingElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        try {
            // Call our secure proxy endpoint
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: userMessage,
                    conversationHistory: this.conversationHistory.slice(-10)
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Request failed: ${response.status}`);
            }

            const data = await response.json();
            
            // Remove typing indicator
            typingElement.remove();
            
            const aiResponse = data.message;
            this.addAIMessage(aiResponse);
            
            // Update conversation history
            this.conversationHistory.push(
                { role: "user", content: userMessage },
                { role: "assistant", content: aiResponse }
            );
            
            // Keep conversation history manageable (last 20 messages)
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }
            
        } catch (error) {
            typingElement.remove();
            this.addSystemMessage(`Error: ${error.message}`);
            console.error('AI response error:', error);
        }
        
        // Re-enable input
        input.disabled = false;
        sendBtn.disabled = false;
        input.focus();
    }

    clearChat() {
        const messagesContainer = document.getElementById('ai-messages');
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        this.conversationHistory = [];
        this.addSystemMessage('Neural buffer cleared. Ready for new queries.');
    }
}

// Initialize Brain AI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for brain panel to be available
    const initializeBrainAI = () => {
        if (document.getElementById('brain-panel-container')) {
            window.brainAI = new BrainAI();
            console.log('Brain AI initialized successfully');
        } else {
            setTimeout(initializeBrainAI, 100);
        }
    };
    
    initializeBrainAI();
});

export default BrainAI; 