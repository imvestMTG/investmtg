/* investMTG — Card Scanner View (v2)
   Dual-strategy OCR: reads card name from top + collector number from bottom.
   Uses Tesseract.js with adaptive image preprocessing for better mobile accuracy.
   Looks up via Scryfall API with autocomplete fallback for fuzzy matching. */

import React from 'react';
import { searchCards, getNamedCard, autocomplete } from '../utils/api.js';
import { formatUSD, getCardImageSmall, getScryfallImageUrl, handleImageError } from '../utils/helpers.js';

var h = React.createElement;

// Tesseract.js loaded dynamically from CDN
var tesseractPromise = null;
function loadTesseract() {
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise(function(resolve, reject) {
    if (window.Tesseract) { resolve(window.Tesseract); return; }
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = function() { resolve(window.Tesseract); };
    script.onerror = function() { reject(new Error('Failed to load Tesseract.js')); };
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

// ===== ICONS =====
function CameraIcon() {
  return h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('path', { d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' }),
    h('circle', { cx: 12, cy: 13, r: 4 })
  );
}

function FlipIcon() {
  return h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('path', { d: 'M21 2v6h-6' }),
    h('path', { d: 'M3 12a9 9 0 0 1 15-6.7L21 8' }),
    h('path', { d: 'M3 22v-6h6' }),
    h('path', { d: 'M21 12a9 9 0 0 1-15 6.7L3 16' })
  );
}

function ImageIcon() {
  return h('svg', { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
    h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 2, ry: 2 }),
    h('circle', { cx: 8.5, cy: 8.5, r: 1.5 }),
    h('polyline', { points: '21 15 16 10 5 21' })
  );
}

// ===== IMAGE PREPROCESSING =====
// Adaptive threshold: compare each pixel to local neighborhood average
// Much better than fixed 128 threshold for varied card backgrounds
function preprocessForOCR(canvas, ctx) {
  var w = canvas.width;
  var h = canvas.height;
  var imageData = ctx.getImageData(0, 0, w, h);
  var src = imageData.data;

  // Step 1: Convert to grayscale
  var gray = new Uint8Array(w * h);
  for (var i = 0; i < gray.length; i++) {
    var r = src[i * 4];
    var g = src[i * 4 + 1];
    var b = src[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Step 2: Adaptive threshold using integral image
  // Window size scales with image — ~1/15th of shorter dimension
  var blockSize = Math.max(15, Math.floor(Math.min(w, h) / 15) | 1);
  if (blockSize % 2 === 0) blockSize += 1;
  var halfBlock = Math.floor(blockSize / 2);
  var C = 10; // Threshold offset — pixels must be C darker than local mean to be "black"

  // Build integral image for fast block sums
  var integral = new Float64Array((w + 1) * (h + 1));
  for (var y = 0; y < h; y++) {
    var rowSum = 0;
    for (var x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
    }
  }

  // Step 3: Apply adaptive threshold
  var out = ctx.createImageData(w, h);
  var dst = out.data;
  for (var y2 = 0; y2 < h; y2++) {
    for (var x2 = 0; x2 < w; x2++) {
      var x1b = Math.max(0, x2 - halfBlock);
      var y1b = Math.max(0, y2 - halfBlock);
      var x2b = Math.min(w - 1, x2 + halfBlock);
      var y2b = Math.min(h - 1, y2 + halfBlock);
      var count = (x2b - x1b + 1) * (y2b - y1b + 1);

      var sum = integral[(y2b + 1) * (w + 1) + (x2b + 1)]
              - integral[y1b * (w + 1) + (x2b + 1)]
              - integral[(y2b + 1) * (w + 1) + x1b]
              + integral[y1b * (w + 1) + x1b];
      var mean = sum / count;

      var val = gray[y2 * w + x2] < (mean - C) ? 0 : 255;
      var idx = (y2 * w + x2) * 4;
      dst[idx] = val;
      dst[idx + 1] = val;
      dst[idx + 2] = val;
      dst[idx + 3] = 255;
    }
  }

  ctx.putImageData(out, 0, 0);
  return canvas;
}

// Crop a region from a canvas
function cropCanvas(sourceCanvas, yPercent, heightPercent) {
  var y = Math.floor(sourceCanvas.height * yPercent);
  var cropH = Math.floor(sourceCanvas.height * heightPercent);
  var cropCanvas = document.createElement('canvas');
  cropCanvas.width = sourceCanvas.width;
  cropCanvas.height = cropH;
  var ctx = cropCanvas.getContext('2d');
  ctx.drawImage(sourceCanvas, 0, y, sourceCanvas.width, cropH, 0, 0, sourceCanvas.width, cropH);
  return cropCanvas;
}

// Scale up small images for better OCR (Tesseract likes ~300 DPI)
function upscaleIfNeeded(canvas) {
  var minWidth = 800;
  if (canvas.width >= minWidth) return canvas;
  var scale = minWidth / canvas.width;
  var scaled = document.createElement('canvas');
  scaled.width = Math.round(canvas.width * scale);
  scaled.height = Math.round(canvas.height * scale);
  var ctx = scaled.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(canvas, 0, 0, scaled.width, scaled.height);
  return scaled;
}

// ===== COLLECTOR NUMBER EXTRACTION =====
function extractCollectorInfo(text) {
  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  var collectorNum = null;
  var setCode = null;

  // Common MTG set codes for validation (top 100+ sets)
  var KNOWN_SETS = [
    'LEA','LEB','2ED','ARN','ATQ','3ED','LEG','DRK','FEM','4ED','ICE','CHR',
    'HML','ALL','MIR','VIS','5ED','WTH','TMP','STH','EXO','USG','ULG','6ED',
    'UDS','MMQ','NEM','PCY','INV','PLS','7ED','APC','ODY','TOR','JUD','ONS',
    'LGN','SCG','8ED','MRD','DST','5DN','CHK','BOK','SOK','9ED','RAV','GPT',
    'DIS','CSP','TSP','PLC','FUT','10E','LRW','MOR','SHM','EVE','ALA','CON',
    'ARB','M10','ZEN','WWK','ROE','M11','SOM','MBS','NPH','M12','ISD','DKA',
    'AVR','M13','RTR','GTC','DGM','M14','THS','BNG','JOU','M15','KTK','FRF',
    'DTK','ORI','BFZ','OGW','SOI','EMN','KLD','AER','AKH','HOU','XLN','RIX',
    'DOM','M19','GRN','RNA','WAR','M20','ELD','THB','IKO','M21','ZNR','KHM',
    'STX','AFR','MID','VOW','NEO','SNC','DMU','BRO','ONE','MOM','WOE','LCI',
    'MKM','OTJ','BLB','DSK','FDN','INN','MH1','MH2','MH3','2XM','2X2','CLB',
    'CMR','CMD','C13','C14','C15','C16','C17','C18','C19','C20','C21',
    'TSR','JMP','J22','CMM','LTR','WHO','PIP','ACR','INR','DFT'
  ];
  var setLookup = {};
  KNOWN_SETS.forEach(function(s) { setLookup[s] = true; });

  // Strategy 1: "NNN/NNN" pattern (collector number / total)
  var slashPattern = /(\d{1,4})\s*[\/\\|]\s*(\d{1,4})/;
  // Strategy 2: "NNN · SET" or "NNN SET" pattern
  var numSetPattern = /(\d{1,4})\s*[·•\-]\s*([A-Z]{3,5})/;
  // Strategy 3: Isolated collector number
  var numPattern = /\b(\d{1,4})\b/;
  // Strategy 4: 3-letter uppercase codes that match known sets
  var setPattern = /\b([A-Z]{3,5})\b/g;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // Try "NNN · SET" first (very reliable)
    var numSetMatch = line.match(numSetPattern);
    if (numSetMatch && !collectorNum) {
      collectorNum = numSetMatch[1];
      if (setLookup[numSetMatch[2]]) {
        setCode = numSetMatch[2];
      }
    }

    // Try slash pattern (collector/total)
    if (!collectorNum) {
      var slashMatch = line.match(slashPattern);
      if (slashMatch) {
        collectorNum = slashMatch[1];
      }
    }

    // Look for known set codes
    if (!setCode) {
      var match;
      setPattern.lastIndex = 0;
      while ((match = setPattern.exec(line)) !== null) {
        if (setLookup[match[1]]) {
          setCode = match[1];
          break;
        }
      }
    }
  }

  // Fallback: any 1-4 digit number
  if (!collectorNum) {
    var allText = text.replace(/\n/g, ' ');
    var numMatch = allText.match(numPattern);
    if (numMatch) {
      collectorNum = numMatch[1];
    }
  }

  return { collectorNum: collectorNum, setCode: setCode };
}

// ===== CARD NAME EXTRACTION =====
// Clean OCR text to extract a plausible card name
function extractCardName(text) {
  var lines = text.split('\n')
    .map(function(l) { return l.trim(); })
    .filter(function(l) { return l.length > 2; });

  if (lines.length === 0) return null;

  // The card name is typically the first readable line at the top of the card.
  // Filter out lines that look like mana costs, artist credits, or other noise.
  for (var i = 0; i < Math.min(lines.length, 4); i++) {
    var line = lines[i];

    // Skip lines that are mostly numbers or symbols
    var alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount < 3) continue;

    // Skip lines that look like mana costs {W}{U}{B}{R}{G}
    if (/^\{.*\}$/.test(line)) continue;

    // Clean the line: keep letters, spaces, commas, hyphens, apostrophes
    var cleaned = line
      .replace(/[^a-zA-Z\s,'\-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Valid card names are 2-50 chars
    if (cleaned.length >= 2 && cleaned.length <= 50) {
      return cleaned;
    }
  }
  return null;
}

// ===== SCRYFALL SEARCH WITH PROPER RESPONSE HANDLING =====
// Scryfall /cards/search returns { object: "list", data: [...] }
// Our searchCards wrapper returns this raw object, so we must extract .data
function scryfallSearch(query) {
  return searchCards(query).then(function(response) {
    // searchCards returns raw Scryfall JSON: { object: "list", data: [...], ... }
    if (response && response.data && response.data.length > 0) {
      return response.data;
    }
    return [];
  }).catch(function() {
    // Scryfall returns 404 for zero results — not an error
    return [];
  });
}

// Lookup by collector number + set
function scryfallLookup(collectorNum, setCode) {
  var query = 'number:' + collectorNum;
  if (setCode) {
    query += ' set:' + setCode.toLowerCase();
  }
  query += ' -is:digital';

  return scryfallSearch(query + ' has:usd').then(function(results) {
    if (results.length > 0) return results;
    return scryfallSearch(query);
  });
}

// Lookup by card name using autocomplete + named lookup for better fuzzy matching
function scryfallNameLookup(cardName) {
  // Strategy A: Use Scryfall autocomplete for fuzzy matching, then fetch first result
  return autocomplete(cardName).then(function(response) {
    // autocomplete returns { object: "catalog", data: ["Card Name 1", ...] }
    var suggestions = (response && response.data) || [];
    if (suggestions.length === 0) return [];

    // Use the best autocomplete match for a named lookup
    var bestName = suggestions[0];
    return getNamedCard(bestName).then(function(card) {
      if (card && card.id) return [card];
      return [];
    }).catch(function() { return []; });
  }).catch(function() {
    // Fallback: direct search
    return scryfallSearch(cardName + ' -is:digital');
  });
}

// ===== MAIN COMPONENT =====
export function ScannerView(props) {
  var h = React.createElement;

  // State
  var ref1 = React.useState('idle'); // idle | loading-ocr | camera | processing | results | error
  var phase = ref1[0], setPhase = ref1[1];

  var ref2 = React.useState(null);
  var stream = ref2[0], setStream = ref2[1];

  var ref3 = React.useState('environment');
  var facingMode = ref3[0], setFacingMode = ref3[1];

  var ref4 = React.useState(null);
  var capturedImage = ref4[0], setCapturedImage = ref4[1];

  var ref5 = React.useState(null);
  var ocrText = ref5[0], setOcrText = ref5[1];

  var ref6 = React.useState([]);
  var matchedCards = ref6[0], setMatchedCards = ref6[1];

  var ref7 = React.useState('');
  var statusMsg = ref7[0], setStatusMsg = ref7[1];

  var ref8 = React.useState(null);
  var errorMsg = ref8[0], setErrorMsg = ref8[1];

  var ref9 = React.useState([]);
  var scanHistory = ref9[0], setScanHistory = ref9[1];

  var ref10 = React.useState(null);
  var workerRef = ref10[0], setWorkerRef = ref10[1];

  // Track which strategy found the match
  var ref11 = React.useState('');
  var matchStrategy = ref11[0], setMatchStrategy = ref11[1];

  var videoRef = React.useRef(null);
  var canvasRef = React.useRef(null);
  var fileInputRef = React.useRef(null);

  // Wire stream to video element when either changes (fixes Safari + race condition)
  React.useEffect(function() {
    var video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play().catch(function(err) {
      console.warn('[Scanner] video.play() failed:', err.message);
    });
  }, [stream, phase]);

  // Cleanup camera stream + Tesseract worker on unmount
  React.useEffect(function() {
    return function() {
      if (stream) {
        stream.getTracks().forEach(function(t) { t.stop(); });
      }
      /* Terminate OCR worker to reclaim ~20-40 MB WASM memory */
      if (workerRef && typeof workerRef.terminate === 'function') {
        workerRef.terminate().catch(function() {});
      }
    };
  }, [stream, workerRef]);

  // ===== Initialize Tesseract worker =====
  function initTesseract() {
    setStatusMsg('Loading card recognition engine\u2026');

    var timeout = new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('OCR engine took too long to load. Check your connection and try again.')); }, 30000);
    });

    var load = loadTesseract().then(function(Tesseract) {
      return Tesseract.createWorker('eng', 1, {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
        langPath: 'https://cdn.jsdelivr.net/gh/naptha/tessdata@gh-pages/4.0.0_best'
      });
    }).then(function(w) {
      setWorkerRef(w);
      return w;
    });

    return Promise.race([load, timeout]);
  }

  // ===== Start camera =====
  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPhase('error');
      setErrorMsg('Camera access is not available in this browser. Please use the "Upload Photo" option instead.');
      return;
    }

    setPhase('camera');
    setStatusMsg('');
    setErrorMsg(null);
    setMatchedCards([]);
    setCapturedImage(null);
    setOcrText(null);
    setMatchStrategy('');

    var constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream) {
      setStream(mediaStream);
      /* Video element wiring is handled by the useEffect watching [stream, phase] */
      /* Preload Tesseract in background — non-blocking, camera shows immediately */
      if (!workerRef) {
        loadTesseract().catch(function() { /* will retry on capture */ });
      }
    }).catch(function(err) {
      console.warn('Camera error:', err);
      setPhase('error');
      setErrorMsg(err.name === 'NotAllowedError'
        ? 'Camera access was denied. Go to your browser settings and allow camera access for investmtg.com, then reload the page.'
        : err.name === 'NotFoundError'
        ? 'No camera found on this device. Use the "Upload Photo" option instead.'
        : err.name === 'NotReadableError'
        ? 'Camera is in use by another app. Close other apps using the camera and try again.'
        : 'Camera error: ' + err.message + '. Try using the "Upload Photo" option instead.');
    });
  }

  // ===== Stop camera =====
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(function(t) { t.stop(); });
      setStream(null);
    }
  }

  // ===== Flip camera =====
  function flipCamera() {
    stopCamera();
    var newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
    setTimeout(function() {
      var constraints = {
        video: { facingMode: newMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
      };
      navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream) {
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }).catch(function(err) {
        console.warn('Camera flip error:', err);
      });
    }, 100);
  }

  // ===== Capture frame from video =====
  function captureFrame() {
    var video = videoRef.current;
    var canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    var imageUrl = canvas.toDataURL('image/png');
    setCapturedImage(imageUrl);
    stopCamera();

    processImage(canvas, imageUrl);
  }

  // ===== Handle file upload =====
  function handleFileUpload(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function(ev) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        var fullUrl = canvas.toDataURL('image/png');
        setCapturedImage(fullUrl);

        var workerP = workerRef ? Promise.resolve(workerRef) : initTesseract();
        workerP.then(function() {
          processImage(canvas, fullUrl);
        }).catch(function(err) {
          setPhase('error');
          setErrorMsg('OCR engine failed to load: ' + err.message);
        });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ===== DUAL-STRATEGY OCR PIPELINE =====
  function processImage(fullCanvas, fullImageUrl) {
    setPhase('processing');
    setStatusMsg('Analyzing card\u2026');
    setMatchedCards([]);
    setOcrText(null);
    setMatchStrategy('');

    var workerPromise = workerRef
      ? Promise.resolve(workerRef)
      : initTesseract();

    workerPromise.then(function(worker) {
      if (!worker) {
        setPhase('error');
        setErrorMsg('OCR engine failed to load. Try again or use Upload Photo.');
        return;
      }
      return dualStrategyOCR(worker, fullCanvas, fullImageUrl);
    }).catch(function(err) {
      setPhase('error');
      setErrorMsg('OCR engine failed: ' + err.message + '. Try using "Upload Photo" instead.');
    });
  }

  function dualStrategyOCR(worker, fullCanvas, fullImageUrl) {
    // Crop top 18% for card name, bottom 30% for collector number
    var topCrop = cropCanvas(fullCanvas, 0, 0.18);
    var bottomCrop = cropCanvas(fullCanvas, 0.7, 0.3);

    // Upscale small crops
    topCrop = upscaleIfNeeded(topCrop);
    bottomCrop = upscaleIfNeeded(bottomCrop);

    // Preprocess both crops with adaptive threshold
    var topCtx = topCrop.getContext('2d');
    var bottomCtx = bottomCrop.getContext('2d');
    preprocessForOCR(topCrop, topCtx);
    preprocessForOCR(bottomCrop, bottomCtx);

    var topDataUrl = topCrop.toDataURL('image/png');
    var bottomDataUrl = bottomCrop.toDataURL('image/png');

    // Run both OCR passes concurrently
    setStatusMsg('Reading card text\u2026');
    var topOCR = worker.recognize(topDataUrl);
    var bottomOCR = worker.recognize(bottomDataUrl);

    Promise.all([topOCR, bottomOCR]).then(function(results) {
      var topText = results[0].data.text || '';
      var bottomText = results[1].data.text || '';

      setOcrText('--- Card Name Area ---\n' + topText + '\n--- Collector Info ---\n' + bottomText);

      var cardName = extractCardName(topText);
      var collectorInfo = extractCollectorInfo(bottomText);

      // Strategy priority:
      // 1. Collector number + set code (most precise)
      // 2. Collector number only
      // 3. Card name via autocomplete (fuzzy match)
      // 4. Card name via search (broad match)

      if (collectorInfo.collectorNum && collectorInfo.setCode) {
        setStatusMsg('Looking up #' + collectorInfo.collectorNum + ' in ' + collectorInfo.setCode + '\u2026');
        return scryfallLookup(collectorInfo.collectorNum, collectorInfo.setCode).then(function(cards) {
          if (cards.length > 0) {
            setMatchStrategy('Matched by collector number #' + collectorInfo.collectorNum + ' (' + collectorInfo.setCode + ')');
            return cards;
          }
          // Fall through to name-based lookup
          return tryNameLookup(cardName, collectorInfo);
        });
      }

      if (collectorInfo.collectorNum) {
        setStatusMsg('Looking up collector #' + collectorInfo.collectorNum + '\u2026');
        return scryfallLookup(collectorInfo.collectorNum, null).then(function(cards) {
          if (cards.length > 0) {
            setMatchStrategy('Matched by collector number #' + collectorInfo.collectorNum);
            return cards;
          }
          return tryNameLookup(cardName, collectorInfo);
        });
      }

      return tryNameLookup(cardName, collectorInfo);
    }).then(function(results) {
      if (!results) return; // error path already handled
      if (results.length > 0) {
        setMatchedCards(results.slice(0, 8));
        setPhase('results');
        setStatusMsg('');

        setScanHistory(function(prev) {
          var entry = { card: results[0], time: Date.now(), image: fullImageUrl };
          return [entry].concat(prev).slice(0, 20);
        });
      } else {
        setPhase('results');
        setMatchStrategy('');
        setStatusMsg('No matching cards found. Try adjusting the card position or lighting, or use Upload Photo for a clearer image.');
      }
    }).catch(function(err) {
      console.warn('OCR/lookup error:', err);
      setPhase('error');
      setErrorMsg('Recognition failed: ' + err.message);
    });
  }

  function tryNameLookup(cardName, collectorInfo) {
    if (!cardName || cardName.length < 3) {
      return Promise.resolve([]);
    }

    setStatusMsg('Searching for "' + cardName + '"\u2026');

    // Try autocomplete first (better fuzzy matching)
    return scryfallNameLookup(cardName).then(function(cards) {
      if (cards.length > 0) {
        setMatchStrategy('Matched by card name: "' + cardName + '"');
        return cards;
      }

      // Fallback: direct search
      return scryfallSearch(cardName + ' -is:digital').then(function(searchCards) {
        if (searchCards.length > 0) {
          setMatchStrategy('Possible match for "' + cardName + '" (verify manually)');
        }
        return searchCards;
      });
    });
  }

  // ===== Navigate to card detail =====
  function goToCard(cardId) {
    window.location.hash = '#card/' + cardId;
  }

  // ===== RENDER =====

  // --- Idle / Landing state ---
  if (phase === 'idle' || phase === 'loading-ocr') {
    return h('div', { className: 'scanner-page' },
      h('div', { className: 'scanner-hero' },
        h('div', { className: 'scanner-hero-icon' }, h(CameraIcon)),
        h('h1', { className: 'scanner-title' }, 'Card Scanner'),
        h('p', { className: 'scanner-subtitle' },
          'Point your camera at a Magic card to instantly identify it and check its market value.'
        ),
        h('div', { className: 'scanner-actions' },
          h('button', {
            className: 'btn-primary scanner-start-btn',
            onClick: startCamera
          },
            h(CameraIcon),
            ' Start Camera'
          ),
          h('button', {
            className: 'btn-secondary scanner-upload-btn',
            onClick: function() { fileInputRef.current && fileInputRef.current.click(); }
          },
            h(ImageIcon),
            ' Upload Photo'
          ),
          h('input', {
            ref: fileInputRef,
            type: 'file',
            accept: 'image/*',
            style: { display: 'none' },
            onChange: handleFileUpload
          })
        ),
        h('div', { className: 'scanner-tips' },
          h('h3', null, 'Tips for best results'),
          h('ul', null,
            h('li', null, 'Hold the card flat with good, even lighting'),
            h('li', null, 'The card name and collector number should both be visible'),
            h('li', null, 'Avoid glare on foil cards \u2014 tilt slightly if needed'),
            h('li', null, 'The rear camera usually works better than the front camera'),
            h('li', null, 'Upload Photo works great for close-up shots')
          )
        )
      ),

      // Scan history
      scanHistory.length > 0 && h('div', { className: 'scanner-history' },
        h('h3', null, 'Recent Scans'),
        h('div', { className: 'scanner-history-grid' },
          scanHistory.map(function(entry, idx) {
            return h('div', {
              key: idx,
              className: 'scanner-history-card',
              onClick: function() { goToCard(entry.card.id); }
            },
              h('img', {
                src: getCardImageSmall(entry.card),
                alt: entry.card.name,
                loading: 'lazy'
              }),
              h('div', { className: 'scanner-history-info' },
                h('span', { className: 'scanner-history-name' }, entry.card.name),
                entry.card.prices && entry.card.prices.usd &&
                  h('span', { className: 'scanner-history-price' }, formatUSD(entry.card.prices.usd))
              )
            );
          })
        )
      )
    );
  }

  // --- Camera state ---
  if (phase === 'camera') {
    return h('div', { className: 'scanner-page' },
      h('div', { className: 'scanner-camera-container' },
        h('video', {
          ref: videoRef,
          autoPlay: true,
          playsInline: true,
          muted: true,
          className: 'scanner-video'
        }),
        h('div', { className: 'scanner-overlay' },
          h('div', { className: 'scanner-guide' },
            h('div', { className: 'scanner-corner scanner-corner-tl' }),
            h('div', { className: 'scanner-corner scanner-corner-tr' }),
            h('div', { className: 'scanner-corner scanner-corner-bl' }),
            h('div', { className: 'scanner-corner scanner-corner-br' }),
            h('p', { className: 'scanner-guide-text' }, 'Align card within frame')
          )
        ),
        h('div', { className: 'scanner-controls' },
          h('button', {
            className: 'scanner-control-btn',
            onClick: function() { stopCamera(); setPhase('idle'); },
            title: 'Cancel'
          }, '\u2715'),
          h('button', {
            className: 'scanner-capture-btn',
            onClick: captureFrame,
            title: 'Capture'
          },
            h('div', { className: 'scanner-capture-ring' })
          ),
          h('button', {
            className: 'scanner-control-btn',
            onClick: flipCamera,
            title: 'Flip Camera',
            'aria-label': 'Flip Camera'
          }, h(FlipIcon))
        )
      ),
      h('canvas', { ref: canvasRef, style: { display: 'none' } })
    );
  }

  // --- Processing state ---
  if (phase === 'processing') {
    return h('div', { className: 'scanner-page' },
      h('div', { className: 'scanner-processing' },
        capturedImage && h('img', { src: capturedImage, className: 'scanner-captured-img', alt: 'Captured card' }),
        h('div', { className: 'scanner-processing-overlay' },
          h('div', { className: 'scanner-spinner' }),
          h('p', { className: 'scanner-status' }, statusMsg || 'Processing\u2026')
        )
      )
    );
  }

  // --- Error state ---
  if (phase === 'error') {
    return h('div', { className: 'scanner-page' },
      h('div', { className: 'scanner-error' },
        h('div', { className: 'scanner-error-icon' }, '\u26A0'),
        h('h2', null, 'Something went wrong'),
        h('p', null, errorMsg),
        h('div', { className: 'scanner-error-actions' },
          h('button', { className: 'btn-primary', onClick: function() { setPhase('idle'); setErrorMsg(null); } }, 'Try Again'),
          h('button', {
            className: 'btn-secondary',
            onClick: function() {
              setPhase('idle');
              setErrorMsg(null);
              setTimeout(function() {
                if (fileInputRef.current) fileInputRef.current.click();
              }, 100);
            }
          },
            h(ImageIcon),
            ' Upload Photo'
          ),
          h('input', {
            ref: fileInputRef,
            type: 'file',
            accept: 'image/*',
            capture: 'environment',
            style: { display: 'none' },
            onChange: handleFileUpload
          })
        )
      )
    );
  }

  // --- Results state ---
  return h('div', { className: 'scanner-page' },
    h('div', { className: 'scanner-results' },
      h('div', { className: 'scanner-results-header' },
        h('h2', null, matchedCards.length > 0 ? 'Card Identified' : 'No Match Found'),
        h('div', { className: 'scanner-results-actions' },
          h('button', { className: 'btn-primary', onClick: startCamera },
            h(CameraIcon), ' Scan Another'
          ),
          h('button', {
            className: 'btn-secondary',
            onClick: function() { fileInputRef.current && fileInputRef.current.click(); }
          },
            h(ImageIcon), ' Upload Photo'
          ),
          h('input', {
            ref: fileInputRef,
            type: 'file',
            accept: 'image/*',
            style: { display: 'none' },
            onChange: handleFileUpload
          })
        )
      ),

      // Match strategy indicator
      matchStrategy && h('div', { className: 'scanner-strategy-badge' },
        h('span', { className: 'scanner-strategy-dot' }),
        matchStrategy
      ),

      statusMsg && h('p', { className: 'scanner-status-msg' }, statusMsg),

      // Preview of captured image
      capturedImage && h('div', { className: 'scanner-preview-row' },
        h('img', { src: capturedImage, className: 'scanner-preview-thumb', alt: 'Captured' })
      ),

      // Matched cards
      matchedCards.length > 0 && h('div', { className: 'scanner-matches' },
        h('p', { className: 'scanner-match-label' },
          matchedCards.length === 1
            ? 'Best match:'
            : 'Possible matches (' + matchedCards.length + '):'
        ),
        h('div', { className: 'scanner-match-grid' },
          matchedCards.map(function(card, idx) {
            var price = card.prices && (card.prices.usd || card.prices.usd_foil);
            return h('div', {
              key: card.id,
              className: 'scanner-match-card' + (idx === 0 ? ' scanner-match-card--best' : ''),
              onClick: function() { goToCard(card.id); }
            },
              h('img', {
                src: getScryfallImageUrl(card, 'normal') || getCardImageSmall(card),
                alt: card.name,
                className: 'scanner-match-img',
                loading: 'lazy',
                onError: function(e) { handleImageError(e, card.id, 'normal'); }
              }),
              h('div', { className: 'scanner-match-info' },
                h('h3', { className: 'scanner-match-name' }, card.name),
                h('p', { className: 'scanner-match-set' }, card.set_name),
                h('p', { className: 'scanner-match-details' },
                  (card.collector_number ? '#' + card.collector_number : '') +
                  ' \u00B7 ' + (card.rarity || '') +
                  (card.type_line ? ' \u00B7 ' + card.type_line : '')
                ),
                price && h('p', { className: 'scanner-match-price' }, formatUSD(price)),
                h('span', { className: 'scanner-match-link' }, 'View Details \u2192')
              )
            );
          })
        )
      ),

      // Scan history
      scanHistory.length > 1 && h('div', { className: 'scanner-history scanner-history--compact' },
        h('h3', null, 'Recent Scans'),
        h('div', { className: 'scanner-history-grid' },
          scanHistory.slice(1).map(function(entry, idx) {
            return h('div', {
              key: idx,
              className: 'scanner-history-card',
              onClick: function() { goToCard(entry.card.id); }
            },
              h('img', {
                src: getCardImageSmall(entry.card),
                alt: entry.card.name,
                loading: 'lazy'
              }),
              h('div', { className: 'scanner-history-info' },
                h('span', { className: 'scanner-history-name' }, entry.card.name),
                entry.card.prices && entry.card.prices.usd &&
                  h('span', { className: 'scanner-history-price' }, formatUSD(entry.card.prices.usd))
              )
            );
          })
        )
      )
    )
  );
}
