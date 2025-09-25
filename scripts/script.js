const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const translateBtn = document.getElementById('translate-btn');
const techBtn = document.getElementById('tech-btn');

// Remplacez par votre clé API Gemini
const apiKey = 'AIzaSyAL4GPw5_5mgrkqNXL_aXDioFkTX8qto08';
const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;

let referenceCounter = 1; // Compteur pour les références
let context = ''; // Contexte de recherche
let conversationHistory = []; // Historique de la conversation

// Envoi du message via le bouton ou la touche Entrée
sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Empêcher le saut de ligne
        sendMessage();
    }
});

// Gérer l'agrandissement de la zone d'input
userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = `${userInput.scrollHeight}px`;
});

translateBtn.addEventListener('click', () => {
    context = 'translation';
    addMessage('ai', 'Mode traduction activé.');
});

techBtn.addEventListener('click', () => {
    context = 'technical';
    addMessage('ai', 'Mode sujets techniques activé.');
});

async function sendMessage() {
    const userMessage = userInput.value.trim();
    if (userMessage) {
        addMessage('user', userMessage);
        userInput.value = '';
        userInput.style.height = 'auto'; // Réinitialiser la hauteur de l'input

        // Simuler une réponse en cours de frappe
        const typingIndicator = addTypingIndicator();
        const aiMessage = await getAIResponse(userMessage);
        removeTypingIndicator(typingIndicator);
        addMessage('ai', aiMessage);

        // Ajouter le message à l'historique de la conversation
        conversationHistory.push({ role: 'user', content: userMessage });
        conversationHistory.push({ role: 'ai', content: aiMessage });
    }
}

async function getAIResponse(userMessage) {
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [
                    ...conversationHistory.map(msg => ({
                        role: msg.role === 'user' ? 'user' : 'model',
                        parts: [{ text: msg.content }],
                    })),
                    {
                        role: 'user',
                        parts: [{ text: context + ' ' + userMessage }],
                    },
                ],
            }),
        });

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Erreur lors de la récupération de la réponse de Gemini:', error);
        return "Désolé, une erreur s'est produite. Veuillez réessayer.";
    }
}

function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    messageContent.innerHTML = formatMarkdown(message); // Formater le Markdown
    messageElement.appendChild(messageContent);
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Appliquer la coloration syntaxique aux blocs de code
    document.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightBlock(block);
    });
}

function formatMarkdown(message) {
    // Utiliser marked.js pour convertir le Markdown en HTML
    return marked.parse(message);
}

function addTypingIndicator() {
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('message', 'ai');
    typingIndicator.innerHTML = `
        <div class="avatar">AI</div>
        <div class="message-content typing-animation">...</div>
    `;
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;
    return typingIndicator;
}

function removeTypingIndicator(typingIndicator) {
    typingIndicator.remove();
}