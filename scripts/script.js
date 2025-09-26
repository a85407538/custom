const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Remplacez par votre clé API Gemini
const apiKey = 'AIzaSyAL4GPw5_5mgrkqNXL_aXDioFkTX8qto08';
const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

let referenceCounter = 1; // Compteur pour les références
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
                        parts: [{ text: userMessage }],
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

    // Ajouter l'avatar
    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.textContent = sender === 'user' ? 'U' : 'AI';
    if (sender === 'user') {
        avatar.classList.add('user');
    }
    messageElement.appendChild(avatar);

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    // Traiter le message pour les références et sources
    const processedMessage = processReferencesAndSources(message);
    messageContent.innerHTML = formatMarkdown(processedMessage.content);
    
    // Ajouter les références si elles existent
    if (processedMessage.references.length > 0) {
        const referencesSection = createReferencesSection(processedMessage.references);
        messageContent.appendChild(referencesSection);
    }
    
    messageElement.appendChild(messageContent);
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;

    // Post-traitement pour améliorer l'affichage
    setTimeout(() => {
        enhanceCodeBlocks();
        highlightSyntax();
        processLinks();
    }, 100);
}

function processReferencesAndSources(message) {
    const references = [];
    let content = message;
    
    // Extraire les références [1], [2], etc.
    const referenceRegex = /\[(\d+)\]\s*([^\n\r]*(?:https?:\/\/[^\s\)]+)?[^\n\r]*)/g;
    let match;
    
    while ((match = referenceRegex.exec(message)) !== null) {
        const refNum = match[1];
        const refText = match[2].trim();
        
        if (refText) {
            references.push({
                number: refNum,
                text: refText
            });
        }
    }
    
    // Remplacer les références par des liens cliquables
    content = content.replace(/\[(\d+)\](?!\s*[^\n\r]*(?:https?:\/\/|[a-zA-Z]))/g, 
        '<a href="#ref$1" class="reference" title="Voir la référence $1">$1</a>');
    
    return { content, references };
}

function createReferencesSection(references) {
    const section = document.createElement('div');
    section.classList.add('references-section');
    
    const title = document.createElement('h4');
    title.textContent = 'Sources et références :';
    section.appendChild(title);
    
    const list = document.createElement('ul');
    list.classList.add('references-list');
    
    references.forEach(ref => {
        const listItem = document.createElement('li');
        listItem.setAttribute('data-ref', ref.number);
        listItem.id = `ref${ref.number}`;
        
        // Détecter et formater les URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        let refText = ref.text.replace(urlRegex, '<a href="$1" target="_blank" class="source-link">$1</a>');
        
        listItem.innerHTML = refText;
        list.appendChild(listItem);
    });
    
    section.appendChild(list);
    return section;
}

function enhanceCodeBlocks() {
    document.querySelectorAll('pre').forEach(pre => {
        if (!pre.querySelector('.copy-btn')) {
            const container = document.createElement('div');
            container.classList.add('code-block-container');
            
            const copyBtn = document.createElement('button');
            copyBtn.classList.add('copy-btn');
            copyBtn.textContent = 'Copier';
            copyBtn.onclick = () => copyToClipboard(pre.textContent, copyBtn);
            
            pre.parentNode.insertBefore(container, pre);
            container.appendChild(pre);
            container.appendChild(copyBtn);
        }
    });
}

function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copié !';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    });
}

function highlightSyntax() {
    document.querySelectorAll('pre code').forEach((block) => {
        if (!block.classList.contains('hljs')) {
            hljs.highlightElement(block);
        }
    });
}

function processLinks() {
    // Améliorer l'affichage des liens externes
    document.querySelectorAll('a[href^="http"]').forEach(link => {
        if (!link.classList.contains('source-link') && !link.classList.contains('reference')) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
        }
    });
}

function formatMarkdown(message) {
    // Configuration avancée de marked.js
    marked.setOptions({
        highlight: function(code, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return hljs.highlight(code, { language: lang }).value;
                } catch (err) {}
            }
            return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true,
        tables: true,
        sanitize: false
    });
    
    // Traitement personnalisé pour les éléments spéciaux
    let processedMessage = message;
    
    // Améliorer les citations avec ==texte==
    processedMessage = processedMessage.replace(/==(.*?)==/g, '<mark>$1</mark>');
    
    // Traiter les scripts et formules mathématiques basiques
    processedMessage = processedMessage.replace(/\$\$(.*?)\$\$/g, '<code class="math">$1</code>');
    processedMessage = processedMessage.replace(/\$(.*?)\$/g, '<code class="math-inline">$1</code>');
    
    return marked.parse(processedMessage);
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