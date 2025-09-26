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
    addMessage('ai', '🌐 Mode traduction activé. Je peux maintenant vous aider avec vos traductions.');
});

techBtn.addEventListener('click', () => {
    context = 'technical';
    addMessage('ai', '⚡ Mode technique activé. Je suis prêt à discuter de sujets techniques.');
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
        // Construire l'historique de conversation pour le contexte
        const messages = [];
        
        // Ajouter l'historique récent (derniers 10 messages pour éviter de dépasser les limites)
        const recentHistory = conversationHistory.slice(-10);
        for (const msg of recentHistory) {
            messages.push({
                parts: [{ text: msg.content }]
            });
        }
        
        // Ajouter le message actuel
        const currentMessage = context ? `${context}: ${userMessage}` : userMessage;
        messages.push({
            parts: [{ text: currentMessage }]
        });

        // Préparer le payload pour l'API Gemini
        const requestBody = {
            contents: messages,
            generationConfig: {
                temperature: 0.7,
                topK: 64,
                topP: 0.95,
                maxOutputTokens: 8192,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        // Si c'est le premier message, simplifier la structure
        if (conversationHistory.length === 0) {
            requestBody.contents = [{
                parts: [{
                    text: currentMessage
                }]
            }];
        }

        console.log('Envoi de la requête à l\'API Gemini:', requestBody);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('Statut de la réponse:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur de l\'API:', errorText);
            
            if (response.status === 400) {
                throw new Error('Requête invalide. Vérifiez votre clé API Gemini.');
            } else if (response.status === 403) {
                throw new Error('Accès refusé. Vérifiez que votre clé API Gemini est valide et active.');
            } else if (response.status === 404) {
                throw new Error('Modèle non trouvé. Le modèle Gemini Pro a été remplacé par Gemini 1.5 Flash.');
            } else if (response.status === 429) {
                throw new Error('Limite de taux dépassée. Attendez un moment avant de réessayer.');
            } else {
                throw new Error(`Erreur HTTP: ${response.status} - ${response.statusText}`);
            }
        }

        const data = await response.json();
        console.log('Réponse de l\'API:', data);
        
        // Vérification de la structure de la réponse
        if (!data) {
            throw new Error('Réponse vide de l\'API');
        }
        
        if (!data.candidates || !Array.isArray(data.candidates) || data.candidates.length === 0) {
            console.error('Structure de réponse inattendue:', data);
            
            // Vérifier si la réponse a été bloquée par les filtres de sécurité
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                throw new Error(`Réponse bloquée: ${data.promptFeedback.blockReason}. Essayez de reformuler votre question.`);
            }
            
            throw new Error('Aucune réponse générée par l\'IA. Essayez de reformuler votre question.');
        }
        
        const candidate = data.candidates[0];
        
        // Vérifier si la réponse a été bloquée
        if (candidate.finishReason === 'SAFETY') {
            throw new Error('Réponse bloquée par les filtres de sécurité. Essayez de reformuler votre question.');
        }
        
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            console.error('Contenu de réponse invalide:', candidate);
            throw new Error('Contenu de réponse invalide');
        }
        
        return candidate.content.parts[0].text || 'Réponse vide reçue';
        
    } catch (error) {
        console.error('Erreur lors de la récupération de la réponse de Gemini:', error);
        
        // Messages d'erreur plus spécifiques
        if (error.message.includes('HTTP')) {
            return error.message;
        } else if (error.message.includes('JSON')) {
            return "Erreur de format de réponse. L'API a retourné une réponse invalide.";
        } else if (error.message.includes('candidates')) {
            return "L'IA n'a pas pu générer de réponse. Essayez de reformuler votre question.";
        } else {
            return `Erreur: ${error.message}. Veuillez réessayer.`;
        }
    }
}

function addMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);

    // Ajouter l'avatar
    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.textContent = sender === 'user' ? 'Vous' : 'IA';
    messageElement.appendChild(avatar);

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
    
    const avatar = document.createElement('div');
    avatar.classList.add('avatar');
    avatar.textContent = 'IA';
    typingIndicator.appendChild(avatar);
    
    typingIndicator.innerHTML = `
        <div class="message-content typing-animation">...</div>
    `;
    chatBox.appendChild(typingIndicator);
    chatBox.scrollTop = chatBox.scrollHeight;
    return typingIndicator;
}

function removeTypingIndicator(typingIndicator) {
    typingIndicator.remove();
}