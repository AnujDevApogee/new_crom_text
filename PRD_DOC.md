---

# Product Requirements Document (PRD)

| **Project Name** | Simply Design |
| :--- | :--- |
| **Version** | 1.1 (Revised) |
| **Status** | Final Draft |
| **Platform** | Web Application |
| **Tech Stack** | HTML5, CSS3, Vanilla JavaScript (ES6+) |
| **Theme** | Dark Mode, Neon/Glow, Cyberpunk/Sporty Energy |

---

## 1. Executive Summary
**Simply Design** is a chat-driven development interface that allows users to generate frontend UI code by describing their requirements to an AI bot. The application focuses on converting design intent (based on a user's selected Figma frame context) into code. It features a dual-pane interface with a Chat/Code view and a Live Preview (currently supporting HTML/CSS rendering), alongside a deployment flow for custom domains.

---

## 2. Design System & UI/UX Theme
The application relies on a "High-Voltage" aesthetic.
*   **Background:** Deep Black (`#0a0a0a`) or Dark Gunmetal (`#121212`).
*   **Primary Accent (Glow):** Neon Cyan (`#00f3ff`) or Electric Lime (`#39ff14`).
*   **Secondary Accent:** Hot Pink (`#ff00ff`) for errors or high-priority alerts.
*   **Typography:** Monospace for code (e.g., Fira Code), Sans-serif (geometric/sporty like 'Rajdhani' or 'Roboto') for UI text.
*   **Visual Effects:**
    *   Buttons have a "glow" box-shadow on hover.
    *   Chat bubbles have high contrast (Dark Gray vs. Neon borders).
    *   Glassmorphism (blur) on modal overlays.

---

## 3. User Flow

### 3.1. Onboarding (Landing Screen)
1.  User lands on the site.
2.  Background features a dynamic neon pulse or grid animation.
3.  **Center Card:** A dropdown menu asking: *"Select your Framework."*
    *   *Options:* React, Vue.js, Next.js, HTML/CSS.
4.  User selects an option and clicks **"Start Coding"**.
5.  System generates a new `sessionId` in memory.
6.  User is transitioned to the **Workspace**.

### 3.2. Workspace (Main Interface)
*   **Layout:** Split Screen.
    *   **Left Panel (40%):** Live Preview (HTML/CSS) or Asset/Status View.
    *   **Right Panel (60%):** Chat Interface & Code Display.
    *   **Header:** Project Title (Simply Design) + "Deploy" Button (Top Right).

### 3.3. The Chat Loop (Code Generation)
1.  User types a request in the chat input and clicks Send.
2.  System sends API request.
3.  System displays a "Thinking..." neon loader.
4.  **On Success:**
    *   Chat bubble appears with the bot's code response (Syntax highlighted).
    *   **Key Highlights** (from `keynode`) are displayed as a "System Note" below the code.
    *   **Asset List** (from `Assest_list`) is displayed as a warning/info box.
    *   **Preview:** If language is HTML/CSS, the Left Panel updates.
5.  **On Failure:**
    *   **UI Action:** Display a **Red Chat Bubble** (Bot side).
    *   **Content:** If the API provides a message, show it. If not, show generic text: *"System error. Please try again."*

### 3.4. Deployment Flow
1.  User clicks the **"DEPLOY"** button (Top Right).
2.  A Neon-bordered Modal appears: *"Enter Custom Domain"*.
3.  User enters domain (e.g., `mywebsite.com`) and clicks **"Publish"**.
4.  System calls API with `chat: "DEPLOY"`.
5.  **On Success:**
    *   Parse response for `data.url`.
    *   **UI Action:** Show a **Success Popup**.
    *   **Content:** "Deployed Successfully! URL: [Link]" (Clickable or Copyable).
6.  **On Failure:**
    *   **UI Action:** Show an **Error Popup** (Center screen).
    *   **Content:** API error message or generic "Deployment Failed".

---

## 4. Functional Requirements

### 4.1. Session Management (In-Memory)
*   **Logic:** Session persistence is **NOT** required across reloads.
*   **Implementation:**
    *   Create a global JavaScript variable `let currentSessionId = "";`
    *   When the user clicks "Start Coding" on the Onboarding screen:
        *   Generate a random alphanumeric string (12-16 chars).
        *   Assign it to `currentSessionId`.
    *   If the user refreshes the page, the app resets to the Onboarding screen, and a new ID is generated when they start over.

### 4.2. Chat Interface
*   **Input:** Text area with a "Send" icon.
*   **Message Bubble (User):** Aligned right.
*   **Message Bubble (Bot - Success):** Aligned left, contains Code Block + Highlights.
*   **Message Bubble (Bot - Error):** Aligned left, styled in Red/Pink borders.

### 4.3. Live Preview Engine
*   **Constraint:** Only active if `code_language` == "HTML/CSS".
*   **Functionality:**
    *   Inject the received code into an `iframe` or shadow DOM.
    *   **Asset Fallback:** Detect broken `<img>` tags and replace sources with a generic placeholder (e.g., via a script injected into the iframe) to prevent UI breakage.

### 4.4. Domain Validation
*   **Trigger:** "Publish" button in Deploy Modal.
*   **Rule:** String must contain a dot extension (e.g., `.com`, `.co.in`) and no spaces.

---

## 5. Technical Specifications (API)

**Endpoint:** `https://n8n.uptodd.co.in/webhook/update-react`
**Method:** `POST`
**Headers:** `Content-Type: application/json`

### 5.1. Request Payloads

#### Scenario A: Chatting (Generating Code)
```json
{
    "chat": "User input string",
    "code_language": "Selected Dropdown Value",
    "frameId": null,
    "sessionId": "GeneratedAlphaNumericString",
    "domain_type": "null"
}
```

#### Scenario B: Deploying
```json
{
    "chat": "DEPLOY",
    "code_language": "Selected Dropdown Value",
    "frameId": null,
    "sessionId": "SameAlphaNumericString",
    "domain_type": "user.entered.domain.com"
}
```

### 5.2. Response Handling

**Scenario A: Chat Success**
```json
{
    "status": "success",
    "msg": "success",
    "data": {
        "code": "...",
        "keynode": "...",
        "Assest_list": "..."
    }
}
```

**Scenario B: Deployment Success**
```json
{
    "status": "success",
    "msg": "success",
    "data": {
        "url": "https://ietj.verce.app/"
    }
}
```

**Scenario C: Failure (Chat or Deploy)**
*   If HTTP Status != 200 OR `status` != "success".
*   **Chat Failure:** Render generic error in Chat Bubble.
*   **Deploy Failure:** Render error message in Center Popup.

---

## 6. Implementation Guidelines (HTML/JS)

### 6.1. JavaScript Logic (Pseudo-code)

**Session Generator (Run on "Start"):**
```javascript
let appSessionId = null;

function generateSessionId() {
    // Simple random alphanumeric generator
    return Math.random().toString(36).substring(2, 10) + 
           Math.random().toString(36).substring(2, 10);
}

function handleStart() {
    appSessionId = generateSessionId();
    // Move to workspace...
}
```

**API Call Wrapper:**
```javascript
async function callApi(payload, isDeploy = false) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const resData = await response.json();

        if (resData.status === 'success') {
            if (isDeploy) {
                // Show Success Popup with URL
                showSuccessPopup(resData.data.url);
            } else {
                // Render Code Bubble
                renderBotResponse(resData.data);
            }
        } else {
            // API returned failure status
            handleError(resData.msg, isDeploy);
        }
    } catch (error) {
        // Network/Catch error
        handleError(null, isDeploy);
    }
}

function handleError(msg, isDeploy) {
    const errorText = msg || "An unexpected error occurred.";
    
    if (isDeploy) {
        // Requirement: Deploy errors go to Popup
        showErrorPopup(errorText);
    } else {
        // Requirement: Chat errors go to Chat Bubble
        // If msg is null, use generic text
        const finalMsg = msg ? msg : "System Error: Unable to process request.";
        appendChatBubble(finalMsg, 'bot-error');
    }
}
```

---

## 7. Assumptions
1.  **Figma Context:** User has selected a frame in their separate Figma app (mental model). We pass `frameId: null`.
2.  **Preview:** Only works for HTML/CSS. Other frameworks show code only.
3.  **Deploy Response:** The deployment success JSON structure provided (`msg: "success"`) is the exact format we will parse to extract the `url`.