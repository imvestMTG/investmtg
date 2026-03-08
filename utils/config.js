/* config.js — Centralized configuration constants for investMTG */

// Shipping
export var SHIPPING_FLAT_RATE = 5.00; // USD

// Cart
export var CART_MAX_QUANTITY = 4; // Max qty per card (tournament playset)

// Chatbot
export var CHATBOT_RATE_WINDOW = 60000; // 1 minute
export var CHATBOT_RATE_MAX = 8; // max messages per window
export var CHATBOT_COOLDOWN = 2000; // min ms between messages
export var CHATBOT_MAX_INPUT = 500; // max chars per message

// Listing
export var LISTING_MAX_PRICE = 99999; // max listing price in USD

// API
export var SCRYFALL_RATE_LIMIT_MS = 100; // min ms between Scryfall requests

// Timeouts (UI)
export var TOAST_DURATION = 3000; // ms
export var FLASH_DURATION = 3000; // ms
export var CART_ADDED_FEEDBACK = 1500; // ms
export var RESERVE_PROCESSING_DELAY = 1500; // ms

// SumUp — public key stays client-side (designed for browser use)
export var SUMUP_PUBLIC_KEY = 'sup_pk_qRhf6eGzMipB9IwxFFKpsqe0w15FXo4Jk';

// Proxy
export var PROXY_BASE = 'https://api.investmtg.com';
