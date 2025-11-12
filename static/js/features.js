// static/js/features.js

// 1) Ensure we have a socket reference
// If socket is already made in socket.js (e.g., window.socket), reuse it; otherwise create one.
const socket = window.socket || io();

// 2) Cache DOM elements
const userListElem = document.getElementById('user-list');
const typingIndicator = document.getElementById('typing-indicator');
const messagePanel = document.getElementById('message-panel');
const messageInput = document.getElementById('message-input');
const messageForm  = document.getElementById('message-form');

// Fallback for username if not set elsewhere
const currentUsername = window.currentUsername || localStorage.getItem('username') || 'You';

// 3) ----- Active Users: listen for `user_list` -----
socket.on('user_list', (users) => {
  // Expecting an array of usernames: ['Alice','Bob',...]
  userListElem.innerHTML = '';
  (users || []).forEach(u => {
    const li = document.createElement('li');
    li.textContent = (u === currentUsername) ? `${u} (you)` : u;
    userListElem.appendChild(li);
  });
});

// 4) ----- Typing Indicator: emit + listen -----

// Emit 'typing' while the user types, but debounce to avoid spam
let typingTimer;
const TYPING_EMIT_DELAY_MS = 350;

if (messageInput) {
  messageInput.addEventListener('input', () => {
    // Debounce emits
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit('typing', { user: currentUsername });
    }, TYPING_EMIT_DELAY_MS);
  });
}

// Show "<user> is typing..." when others are typing
socket.on('typing', (data) => {
  const typingUser = data && data.user;
  if (!typingUser || typingUser === currentUsername) return; // don't show for self
  typingIndicator.textContent = `${typingUser} is typing...`;
  typingIndicator.style.display = 'block';

  // Hide after a short timeout
  clearTimeout(typingIndicator._hideTimer);
  typingIndicator._hideTimer = setTimeout(() => {
    typingIndicator.style.display = 'none';
  }, 2000);
});

// 5) ----- Optional quality-of-life hooks -----

// Smooth auto-scroll when a new message arrives (requires your socket.js to append to #message-panel)
function scrollMessagesToBottom() {
  if (!messagePanel) return;
  messagePanel.scrollTo({ top: messagePanel.scrollHeight, behavior: 'smooth' });
}

// If socket.js emits 'new_message_rendered' after adding a message node, auto-scroll here.
// Example: in socket.js after appending, call: socket.emit('client_scrolled')
// Or simpler: observe child changes:
if (messagePanel) {
  const observer = new MutationObserver(() => scrollMessagesToBottom());
  observer.observe(messagePanel, { childList: true });
}

// 6) ----- Helper to render a message bubble if you need it here -----
// If Talla already renders messages in socket.js, you can skip this.
// Kept here in case you need to render messages and set alignment classes.
function renderMessage({ user, text }) {
  const div = document.createElement('div');
  const isSelf = (user === currentUsername);
  div.className = `message ${isSelf ? 'self' : 'other'}`;
  div.textContent = text;
  messagePanel.appendChild(div);
  scrollMessagesToBottom();
}

// 7) If you want to listen to server messages here (only if not already handled in socket.js):
// socket.on('message', (payload) => {
//   // payload: { user: 'Alice', text: 'Hello', ts: ... }
//   renderMessage(payload);
//   // Clear typing indicator on message arrival
//   typingIndicator.style.display = 'none';
// });

// 8) Optionally, intercept the form submit if socket.js doesn’t already do it
if (messageForm) {
  messageForm.addEventListener('submit', (e) => {
    // If Talla already handles submit in socket.js, remove this block to avoid double sends
    // e.preventDefault();
    // const text = messageInput.value.trim();
    // if (!text) return;
    // socket.emit('message', { user: currentUsername, text });
    // messageInput.value = '';
  });
}
