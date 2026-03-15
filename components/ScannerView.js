/* investMTG — Card Scanner View
   Uses device camera + Tesseract.js OCR to identify MTG cards
   by reading collector number + set code from the card face,
   then looks up via Scryfall API for exact match. */

import React from 'react';
import { searchCards, getCard } from '../utils/api.js';
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

// ===== CAMERA ICON =====
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

// ===== HELPER: Extract collector number from OCR text =====
function extractCollectorInfo(text) {
  // MTG cards show collector number + set info at the bottom
  // Format examples: "123/264", "123 / 264", "042/281 R", "123"
  // Also look for set code patterns like "MH3", "ONE", "DSK"
  var lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
  var collectorNum = null;
  var setCode = null;

  // Strategy 1: Look for "NNN/NNN" pattern (collector/total)
  var slashPattern = /(\d{1,4})\s*[\/\\|]\s*(\d{1,4})/;
  // Strategy 2: Look for standalone 2-4 digit numbers
  var numPattern = /\b(\d{1,4})\b/;
  // Strategy 3: Look for 3-letter set codes (uppercase)
  var setPattern = /\b([A-Z]{3,5})\b/;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // Try slash pattern first (most reliable)
    var slashMatch = line.match(slashPattern);
    if (slashMatch && !collectorNum) {
      collectorNum = slashMatch[1];
    }

    // Look for set codes
    var setMatch = line.match(setPattern);
    if (setMatch) {
      var candidate = setMatch[1];
      // Filter out common false positives
      if (candidate !== 'THE' && candidate !== 'AND' && candidate !== 'FOR' &&
          candidate !== 'NOT' && candidate !== 'ALL' && candidate !== 'BUT' &&
          candidate !== 'HAS' && candidate !== 'ITS' && candidate !== 'OWN') {
        setCode = candidate;
      }
    }
  }

  // Fallback: just grab any number that looks like a collector number
  if (!collectorNum) {
    var allText = text.replace(/\n/g, ' ');
    var numMatch = allText.match(/\b(\d{1,4})\b/);
    if (numMatch) {
      collectorNum = numMatch[1];
    }
  }

  return { collectorNum: collectorNum, setCode: setCode };
}

// ===== HELPER: Search Scryfall by collector number + set =====
function scryfallLookup(collectorNum, setCode) {
  // Build Scryfall search query
  var query = 'number:' + collectorNum;
  if (setCode) {
    query += ' set:' + setCode.toLowerCase();
  }
  query += ' -is:digital';

  return searchCards(query + ' has:usd').then(function(results) {
    if (results && results.length > 0) return results;
    // Fallback without USD filter
    return searchCards(query);
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

  var ref3 = React.useState('environment'); // environment | user
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

  var videoRef = React.useRef(null);
  var canvasRef = React.useRef(null);
  var fileInputRef = React.useRef(null);

  // Cleanup camera stream on unmount
  React.useEffect(function() {
    return function() {
      if (stream) {
        stream.getTracks().forEach(function(t) { t.stop(); });
      }
    };
  }, [stream]);

  // ===== Initialize Tesseract worker =====
  function initTesseract() {
    setPhase('loading-ocr');
    setStatusMsg('Loading card recognition engine…');

    // 30s timeout so it doesn't hang forever
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
    // Check if camera is available (Permissions-Policy may block it)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setPhase('error');
      setErrorMsg('Camera access is not available in this browser. Please use the "Upload Photo" option instead.');
      return;
    }

    // Start camera FIRST for instant feedback, load OCR in parallel
    setPhase('camera');
    setStatusMsg('');
    setErrorMsg(null);
    setMatchedCards([]);
    setCapturedImage(null);
    setOcrText(null);

    var constraints = {
      video: {
        facingMode: facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };

    navigator.mediaDevices.getUserMedia(constraints).then(function(mediaStream) {
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      // Load Tesseract in background if not already loaded
      if (!workerRef) {
        initTesseract().catch(function(err) {
          console.warn('OCR preload failed (will retry on capture):', err.message);
        });
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
    // Re-start with new mode after state update
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

    // Crop bottom 30% of the frame (where collector number typically is)
    var cropY = Math.floor(canvas.height * 0.7);
    var cropHeight = canvas.height - cropY;

    var cropCanvas = document.createElement('canvas');
    cropCanvas.width = canvas.width;
    cropCanvas.height = cropHeight;
    var cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(canvas, 0, cropY, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight);

    // Pre-process: increase contrast for better OCR
    var imageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
    var data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
      var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      var val = avg > 128 ? 255 : 0; // Threshold
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
    cropCtx.putImageData(imageData, 0, 0);

    var imageUrl = canvas.toDataURL('image/png');
    setCapturedImage(imageUrl);
    stopCamera();

    // Run OCR on the cropped + processed bottom region
    processImage(cropCanvas.toDataURL('image/png'), imageUrl);
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

        // Crop bottom 30%
        var cropY = Math.floor(canvas.height * 0.7);
        var cropHeight = canvas.height - cropY;
        var cropCanvas = document.createElement('canvas');
        cropCanvas.width = canvas.width;
        cropCanvas.height = cropHeight;
        var cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(canvas, 0, cropY, canvas.width, cropHeight, 0, 0, canvas.width, cropHeight);

        // Pre-process
        var imageData = cropCtx.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
        var data = imageData.data;
        for (var i = 0; i < data.length; i += 4) {
          var avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          var val = avg > 128 ? 255 : 0;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
        cropCtx.putImageData(imageData, 0, 0);

        // Initialize tesseract if needed, then process
        var workerP = workerRef ? Promise.resolve(workerRef) : initTesseract();
        workerP.then(function() {
          processImage(cropCanvas.toDataURL('image/png'), fullUrl);
        }).catch(function(err) { console.error('OCR init failed:', err); });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);

    // Reset file input so same file can be re-selected
    e.target.value = '';
  }

  // ===== Process image through OCR pipeline =====
  function processImage(croppedDataUrl, fullImageUrl) {
    setPhase('processing');
    setStatusMsg('Reading card info…');
    setMatchedCards([]);
    setOcrText(null);

    // If OCR isn't loaded yet, load it now before processing
    var workerPromise = workerRef
      ? Promise.resolve(workerRef)
      : initTesseract();

    workerPromise.then(function(worker) {
      if (!worker) {
        setPhase('error');
        setErrorMsg('OCR engine failed to load. Try again or use Upload Photo.');
        return;
      }
      return doOCR(worker, croppedDataUrl, fullImageUrl);
    }).catch(function(err) {
      setPhase('error');
      setErrorMsg('OCR engine failed: ' + err.message + '. Try using "Upload Photo" instead.');
    });
  }

  function doOCR(worker, croppedDataUrl, fullImageUrl) {

    worker.recognize(croppedDataUrl).then(function(result) {
      var text = result.data.text || '';
      setOcrText(text);
      setStatusMsg('Looking up card…');

      var info = extractCollectorInfo(text);

      if (!info.collectorNum) {
        // Try full image OCR as fallback — look for card name
        return worker.recognize(fullImageUrl || croppedDataUrl).then(function(fullResult) {
          var fullText = fullResult.data.text || '';
          setOcrText(text + '\n---Full scan---\n' + fullText);

          // Try to extract card name from first few lines
          var nameLines = fullText.split('\n').filter(function(l) { return l.trim().length > 2; });
          if (nameLines.length > 0) {
            // First non-trivial line is usually the card name
            var cardName = nameLines[0].trim()
              .replace(/[^a-zA-Z\s,'-]/g, '') // strip non-alpha
              .trim();
            if (cardName.length > 2) {
              return searchCards(cardName + ' -is:digital has:usd').then(function(results) {
                if (results && results.length > 0) return results;
                return searchCards(cardName + ' -is:digital');
              });
            }
          }
          return [];
        });
      }

      return scryfallLookup(info.collectorNum, info.setCode);
    }).then(function(results) {
      if (results && results.length > 0) {
        setMatchedCards(results.slice(0, 6));
        setPhase('results');
        setStatusMsg('');

        // Add to scan history
        setScanHistory(function(prev) {
          var entry = { card: results[0], time: Date.now(), image: fullImageUrl };
          return [entry].concat(prev).slice(0, 20);
        });
      } else {
        setPhase('results');
        setStatusMsg('No matching cards found. Try adjusting the card position or lighting.');
      }
    }).catch(function(err) {
      console.warn('OCR/lookup error:', err);
      setPhase('error');
      setErrorMsg('Recognition failed: ' + err.message);
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
            onClick: startCamera,
            disabled: phase === 'loading-ocr'
          },
            h(CameraIcon),
            phase === 'loading-ocr' ? ' Loading…' : ' Start Camera'
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
            h('li', null, 'Hold the card flat with good lighting'),
            h('li', null, 'Make sure the collector number at the bottom is visible'),
            h('li', null, 'Avoid glare on foil cards'),
            h('li', null, 'The rear camera usually works better than the front camera')
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
        // Overlay guide frame
        h('div', { className: 'scanner-overlay' },
          h('div', { className: 'scanner-guide' },
            h('div', { className: 'scanner-corner scanner-corner-tl' }),
            h('div', { className: 'scanner-corner scanner-corner-tr' }),
            h('div', { className: 'scanner-corner scanner-corner-bl' }),
            h('div', { className: 'scanner-corner scanner-corner-br' }),
            h('p', { className: 'scanner-guide-text' }, 'Align card within frame')
          )
        ),
        // Camera controls
        h('div', { className: 'scanner-controls' },
          h('button', {
            className: 'scanner-control-btn',
            onClick: function() { stopCamera(); setPhase('idle'); },
            title: 'Cancel'
          }, '✕'),
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
            title: 'Flip Camera'
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
          h('p', { className: 'scanner-status' }, statusMsg || 'Processing…')
        )
      )
    );
  }

  // --- Error state ---
  if (phase === 'error') {
    return h('div', { className: 'scanner-page' },
      h('div', { className: 'scanner-error' },
        h('div', { className: 'scanner-error-icon' }, '⚠'),
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
                  ' · ' + (card.rarity || '') +
                  (card.type_line ? ' · ' + card.type_line : '')
                ),
                price && h('p', { className: 'scanner-match-price' }, formatUSD(price)),
                h('span', { className: 'scanner-match-link' }, 'View Details →')
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
