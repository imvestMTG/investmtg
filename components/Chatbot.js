/* Chatbot.js */
import React from 'react';
import { SparkleIcon, XIcon, SendIcon } from './shared/Icons.js';
var h = React.createElement;

var CANNED_RESPONSES = [
  { pattern: /black lotus/i, response: 'Black Lotus is one of the most valuable Magic cards ever printed. Alpha/Beta copies can exceed $50,000 in mint condition. Even Unlimited copies hover around $18,000–25,000. It\'s restricted in Vintage and banned everywhere else.' },
  { pattern: /price|worth|value/i, response: 'Card prices fluctuate based on tournament play, reprints, and market demand. I recommend checking the Live Price charts on each card\'s detail page for real-time Scryfall data.' },
  { pattern: /invest|spec|speculation/i, response: 'MTG investing often focuses on: (1) Reserved List cards that can\'t be reprinted, (2) Commander staples with consistent demand, and (3) rotating Standard cards near rotation lows. Always diversify and only invest what you can afford to hold.' },
  { pattern: /guam|local|store/i, response: 'Guam has 4 local MTG stores: Geek Out Guam (Hagatna), Inventory Game Store (Tamuning), Pacific Card Exchange (Tumon), and Island Hobby Center (Dededo). Check the Local Stores page for hours and contact info.' },
  { pattern: /portfolio|track/i, response: 'Use the Portfolio page to track your collection\'s value over time. Add cards by viewing their detail page and clicking "Track". Your data is saved locally in your browser.' },
  { pattern: /foil|etched|showcase/i, response: 'Foil prices are typically 1.5–3x non-foil. Some showcase/extended art treatments are worth more. Older pre-M15 foils often carry a premium due to the distinctive foil pattern.' },
  { pattern: /draft|sealed|limited/i, response: 'For limited play, prioritize bomb rares, removal, and card advantage. Check EDHREC.com for Commander staples. Limited Resources podcast is great for improving draft game.' },
  { pattern: /hello|hi|hey/i, response: 'Hey there! I\'m your MTG Price Intelligence assistant. Ask me about card prices, local stores, portfolio tips, or investment strategies.' },
];

var DEFAULT_RESPONSE = 'Great question! For specific card prices, use the Search page. For local buying/selling, check the Guam Marketplace. Anything else I can help with?';

function getResponse(message) {
  for (var i = 0; i < CANNED_RESPONSES.length; i++) {
    if (CANNED_RESPONSES[i].pattern.test(message)) {
      return CANNED_RESPONSES[i].response;
    }
  }
  return DEFAULT_RESPONSE;
}

export function Chatbot() {
  var ref1 = React.useState(false);
  var open = ref1[0], setOpen = ref1[1];
  var ref2 = React.useState([
    { role: 'bot', text: 'Hi! I\'m your MTG Price Intelligence assistant. Ask me about card values, local stores, or investment tips.' }
  ]);
  var messages = ref2[0], setMessages = ref2[1];
  var ref3 = React.useState('');
  var input = ref3[0], setInput = ref3[1];
  var ref4 = React.useState(false);
  var typing = ref4[0], setTyping = ref4[1];
  var messagesEndRef = React.useRef(null);

  React.useEffect(function() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typing]);

  function sendMessage() {
    var msg = input.trim();
    if (!msg) return;
    setInput('');
    setMessages(function(prev) { return prev.concat([{ role: 'user', text: msg }]); });
    setTyping(true);
    setTimeout(function() {
      var response = getResponse(msg);
      setMessages(function(prev) { return prev.concat([{ role: 'bot', text: response }]); });
      setTyping(false);
    }, 800 + Math.random() * 600);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return h(React.Fragment, null,
    !open && h('button', {
      className: 'chatbot-fab',
      onClick: function() { setOpen(true); },
      'aria-label': 'Open AI assistant'
    },
      h(SparkleIcon, null)
    ),
    open && h('div', { className: 'chatbot-panel open', role: 'dialog', 'aria-label': 'MTG AI Assistant' },
      h('div', { className: 'chatbot-header' },
        h('div', { className: 'chatbot-header-title' },
          h(SparkleIcon, null), ' MTG Assistant'
        ),
        h('button', {
          className: 'chatbot-close',
          onClick: function() { setOpen(false); },
          'aria-label': 'Close assistant'
        }, h(XIcon, null))
      ),
      h('div', { className: 'chatbot-messages', role: 'log', 'aria-live': 'polite' },
        messages.map(function(msg, i) {
          return h('div', { key: i, className: 'chat-msg ' + (msg.role === 'bot' ? 'bot-msg' : 'user-msg') },
            h('div', { className: 'chat-bubble' }, msg.text)
          );
        }),
        typing && h('div', { className: 'chat-msg bot-msg' },
          h('div', { className: 'chat-bubble chat-typing' },
            h('span', null), h('span', null), h('span', null)
          )
        ),
        h('div', { ref: messagesEndRef })
      ),
      h('div', { className: 'chatbot-input-area' },
        h('input', {
          type: 'text',
          placeholder: 'Ask about prices, stores, investing...',
          value: input,
          onChange: function(e) { setInput(e.target.value); },
          onKeyDown: handleKey,
          'aria-label': 'Type a message'
        }),
        h('button', {
          id: 'chatbot-send',
          onClick: sendMessage,
          disabled: !input.trim(),
          'aria-label': 'Send message'
        }, h(SendIcon, null))
      )
    )
  );
}
