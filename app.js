/* ============================================
   Simply Design — Application Logic
   ============================================ */

// --- Constants ---
const API_URL = 'https://n8n.uptodd.co.in/webhook/update-react';

// --- State ---
let currentSessionId = '';
let selectedFramework = 'HTML/CSS';
let isProcessing = false;

// --- DOM References ---
const onboardingScreen = document.getElementById('onboarding-screen');
const workspaceScreen = document.getElementById('workspace-screen');
const frameworkSelect = document.getElementById('framework-select');
const sessionBadge = document.getElementById('session-badge');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const btnSend = document.getElementById('btn-send');
const previewFrame = document.getElementById('preview-frame');
const previewPlaceholder = document.getElementById('preview-placeholder');
const welcomeMsg = document.getElementById('welcome-msg');

// Deploy modal
const deployModalOverlay = document.getElementById('deploy-modal');
const domainInput = document.getElementById('domain-input');
const domainError = document.getElementById('domain-error');
const btnPublish = document.getElementById('btn-publish');

// Popup
const popupOverlay = document.getElementById('popup-overlay');
const popupBox = document.getElementById('popup-box');
const popupIcon = document.getElementById('popup-icon');
const popupTitle = document.getElementById('popup-title');
const popupMessage = document.getElementById('popup-message');
const popupLink = document.getElementById('popup-link');


/* ============================================
   SESSION MANAGEMENT
   ============================================ */

function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}


/* ============================================
   SCREEN NAVIGATION
   ============================================ */

function handleStart() {
    selectedFramework = frameworkSelect.value;
    currentSessionId = generateSessionId();

    // Update session badge & language badge
    sessionBadge.textContent = `Session: ${currentSessionId.substring(0, 8)}…`;
    document.getElementById('lang-badge').textContent = selectedFramework;

    // Transition: hide onboarding, show workspace (with Create view)
    onboardingScreen.classList.add('hidden');
    setTimeout(() => {
        workspaceScreen.classList.add('active');
        // Show Create view, hide chat
        document.getElementById('create-view').style.display = 'flex';
        document.getElementById('chat-view').style.display = 'none';
    }, 300);
}


/* ============================================
   CHAT ENGINE
   ============================================ */

function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Auto-resize textarea
chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isProcessing) return;

    // Hide welcome message
    if (welcomeMsg) welcomeMsg.style.display = 'none';

    // Append user bubble
    appendUserBubble(text);

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Show thinking loader
    const thinkingEl = showThinkingLoader();

    // Disable send
    isProcessing = true;
    btnSend.disabled = true;

    // Build payload
    const payload = {
        chat: text,
        code_language: selectedFramework,
        frameId: null,
        sessionId: currentSessionId,
        domain_type: 'null'
    };

    await callApi(payload, false, thinkingEl);

    isProcessing = false;
    btnSend.disabled = false;
}


/* ============================================
   API WRAPPER
   ============================================ */

async function callApi(payload, isDeploy, thinkingEl) {
    console.log('🚀 [API START] Sending request:', payload);
    const startTime = Date.now();

    // AbortController lets us cancel the fetch after a timeout
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes — adjust if needed
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal   // 👈 ties the fetch to our abort controller
        });

        clearTimeout(timeoutId); // ✅ Response arrived — cancel the timeout

        console.log(`📡 [API RESPONSE] Status: ${response.status}`, response);
        const resData = await response.json();
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`⏱️ [API TIME] Request took ${duration}s`);
        console.log('📦 [API DATA] Response body:', resData);

        // Remove thinking loader if present
        if (thinkingEl) thinkingEl.remove();

        if (resData.status === 'success') {
            if (isDeploy) {
                closeDeployModal();
                showSuccessPopup(resData.data.url);
            } else {
                renderBotResponse(resData.data);
            }
        } else {
            console.error('❌ [API ERROR] Application error:', resData.msg);
            handleError(resData.msg, isDeploy);
        }
    } catch (error) {
        clearTimeout(timeoutId);

        // Remove thinking loader if present
        if (thinkingEl) thinkingEl.remove();

        if (error.name === 'AbortError') {
            // Fetch was cancelled because it exceeded TIMEOUT_MS
            console.error('⏰ [API TIMEOUT] Request exceeded timeout limit');
            const timeoutMsg = 'Request timed out. The server is taking too long to respond — please try again.';
            handleError(timeoutMsg, isDeploy);
        } else if (error instanceof TypeError && error.message === 'Failed to fetch') {
            // This usually means:
            //   1. CORS blocked (opening file:// directly in browser without a local server)
            //   2. Server is down or unreachable
            //   3. No internet connection
            console.error('🚫 [API CORS/NETWORK] Failed to fetch — likely CORS or server down:', error);
            handleError('Cannot reach the server. Check your internet connection or open the app via a local server (not file://).', isDeploy);
        } else {
            // Other unexpected error
            console.error('💥 [API EXCEPTION] Unexpected error:', error);
            handleError(null, isDeploy);
        }
    }
}

function handleError(msg, isDeploy) {
    if (isDeploy) {
        closeDeployModal();
        const errorText = msg || 'Deployment failed. Please try again.';
        showErrorPopup(errorText);
    } else {
        const finalMsg = msg || 'System Error: Unable to process request. Please try again.';
        appendErrorBubble(finalMsg);
    }
}


/* ============================================
   CHAT BUBBLE RENDERING
   ============================================ */

function appendUserBubble(text) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble user';
    bubble.innerHTML = `
        <span class="bubble-label">You</span>
        ${escapeHtml(text)}
    `;
    chatMessages.appendChild(bubble);
    scrollChatToBottom();
}

function renderBotResponse(data) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot';

    let html = `<span class="bubble-label">Simply Design AI</span>`;

    // Code block
    if (data.code) {
        const langLabel = selectedFramework || 'code';
        html += `
            <div class="code-block-wrapper">
                <div class="code-block-header">
                    <span>${escapeHtml(langLabel)}</span>
                    <button class="btn-copy" onclick="copyCode(this)">Copy</button>
                </div>
                <div class="code-block-body">
                    <pre><code>${escapeHtml(data.code)}</code></pre>
                </div>
            </div>
        `;

        // Update live preview if HTML/CSS
        if (selectedFramework === 'HTML/CSS') {
            updatePreview(data.code);
        }
    }

    // Key Highlights (keynode)
    if (data.keynode) {
        html += `
            <div class="system-note">
                <span class="note-title">💡 Key Highlights</span>
                ${escapeHtml(data.keynode)}
            </div>
        `;
    }

    // Asset List
    if (data.Assest_list) {
        html += `
            <div class="asset-list">
                <span class="asset-title">📦 Assets Required</span>
                ${escapeHtml(data.Assest_list)}
            </div>
        `;
    }

    bubble.innerHTML = html;
    chatMessages.appendChild(bubble);
    scrollChatToBottom();
}

function appendErrorBubble(msg) {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble bot-error';
    bubble.innerHTML = `
        <span class="bubble-label">Error</span>
        ${escapeHtml(msg)}
    `;
    chatMessages.appendChild(bubble);
    scrollChatToBottom();
}

function showThinkingLoader() {
    const loader = document.createElement('div');
    loader.className = 'thinking-loader';
    loader.innerHTML = `
        <div class="thinking-dots">
            <span></span><span></span><span></span>
        </div>
        <span class="thinking-text">Thinking...</span>
    `;
    chatMessages.appendChild(loader);
    scrollChatToBottom();
    return loader;
}

function scrollChatToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}


/* ============================================
   LIVE PREVIEW ENGINE
   ============================================ */

function updatePreview(code) {
    previewPlaceholder.style.display = 'none';
    previewFrame.style.display = 'block';

    // Inject code into iframe with broken image fallback script
    const fallbackScript = `
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                document.querySelectorAll('img').forEach(function(img) {
                    img.onerror = function() {
                        this.onerror = null;
                        this.src = 'data:image/svg+xml,' + encodeURIComponent(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">' +
                            '<rect fill="%23222" width="200" height="150" rx="8"/>' +
                            '<text fill="%23666" x="100" y="75" text-anchor="middle" font-family="sans-serif" font-size="14">Image placeholder</text>' +
                            '</svg>'
                        );
                        this.alt = 'Image placeholder';
                        this.style.opacity = '0.5';
                    };
                });
            });
        <\/script>
    `;

    const fullHtml = code + fallbackScript;
    previewFrame.srcdoc = fullHtml;
}


/* ============================================
   DEPLOYMENT FLOW
   ============================================ */

function openDeployModal() {
    deployModalOverlay.classList.add('active');
    domainInput.value = '';
    domainError.textContent = '';
    domainInput.focus();
}

function closeDeployModal() {
    deployModalOverlay.classList.remove('active');
}

function clearDomainError() {
    domainError.textContent = '';
}

function validateDomain(domain) {
    if (!domain || domain.trim() === '') {
        return 'Please enter a domain name.';
    }
    if (domain.includes(' ')) {
        return 'Domain cannot contain spaces.';
    }
    return null; // Valid — just a name is fine
}

async function publishDeploy() {
    const domain = domainInput.value.trim();

    // Validate
    const error = validateDomain(domain);
    if (error) {
        domainError.textContent = error;
        domainInput.focus();
        return;
    }

    // Disable button
    btnPublish.disabled = true;
    btnPublish.textContent = 'Publishing...';

    const payload = {
        chat: 'DEPLOY',
        code_language: selectedFramework,
        frameId: null,
        sessionId: currentSessionId,
        domain_type: domain
    };

    await callApi(payload, true, null);

    // Reset button
    btnPublish.disabled = false;
    btnPublish.textContent = 'Publish';
}


/* ============================================
   POPUPS
   ============================================ */

function showSuccessPopup(url) {
    popupBox.className = 'popup-box success';
    popupIcon.textContent = '🎉';
    popupTitle.textContent = 'Deployed Successfully!';
    popupMessage.textContent = 'Your project is now live at:';

    popupLink.style.display = 'inline-block';
    popupLink.href = url;
    popupLink.textContent = url;

    popupOverlay.classList.add('active');
}

function showErrorPopup(msg) {
    popupBox.className = 'popup-box error';
    popupIcon.textContent = '❌';
    popupTitle.textContent = 'Deployment Failed';
    popupMessage.textContent = msg;

    popupLink.style.display = 'none';

    popupOverlay.classList.add('active');
}

function closePopup() {
    popupOverlay.classList.remove('active');
}


/* ============================================
   UTILITY FUNCTIONS
   ============================================ */

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyCode(btn) {
    const codeBlock = btn.closest('.code-block-wrapper').querySelector('code');
    const text = codeBlock.textContent;

    navigator.clipboard.writeText(text).then(() => {
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.color = 'var(--accent-lime)';
        btn.style.borderColor = 'var(--accent-lime)';
        setTimeout(() => {
            btn.textContent = original;
            btn.style.color = '';
            btn.style.borderColor = '';
        }, 2000);
    }).catch(() => {
        // Fallback
        const range = document.createRange();
        range.selectNode(codeBlock);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    });
}


/* ============================================
   MODAL CLICK-OUTSIDE HANDLERS
   ============================================ */

deployModalOverlay.addEventListener('click', (e) => {
    if (e.target === deployModalOverlay) closeDeployModal();
});

popupOverlay.addEventListener('click', (e) => {
    if (e.target === popupOverlay) closePopup();
});

// ESC key to close modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (popupOverlay.classList.contains('active')) closePopup();
        else if (deployModalOverlay.classList.contains('active')) closeDeployModal();
    }
});
