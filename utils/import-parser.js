/* import-parser.js — Shared text/CSV parser for bulk imports */

/**
 * Find the index of a column in a header array by trying a list of aliases.
 * Extended to support Manabox, DragonShield, Deckbox, and TCGplayer headers.
 */
export function findCol(header, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    var idx = header.indexOf(aliases[i]);
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Parse a single CSV line, handling quoted fields and escaped double-quotes.
 */
export function parseCSVLine(line) {
  var cols = [];
  var current = '';
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  cols.push(current);
  return cols;
}

/**
 * Parse a Manabox-format CSV export (or compatible CSV).
 * Returns { cards: [...], errors: [] }
 * Each card: { cardName, setName, setCode, condition, price, foil, scryfallId, notes }
 * Quantity is expanded into individual card entries.
 */
export function parseManaboxCSV(csvText) {
  var lines = csvText.split(/\r?\n/).filter(function(l) { return l.trim(); });
  if (lines.length < 2) return { cards: [], errors: ['CSV must have a header row and at least one data row'] };

  // Parse header — Manabox uses comma-separated with possible quoted fields
  var header = parseCSVLine(lines[0]).map(function(h) { return h.toLowerCase().trim(); });

  // Find column indices — support Manabox, DragonShield, Deckbox, TCGplayer column names
  var nameIdx = findCol(header, [
    'name', 'card name', 'card_name', 'cardname',
    'product name'
  ]);
  var setIdx = findCol(header, [
    'set name', 'set_name', 'setname', 'set', 'edition',
    'folder name'
  ]);
  var setCodeIdx = findCol(header, [
    'set code', 'set_code', 'setcode',
    'card number', 'number'
  ]);
  var qtyIdx = findCol(header, [
    'quantity', 'qty', 'count',
    'trade quantity', 'tradelist count'
  ]);
  var condIdx = findCol(header, ['condition', 'cond']);
  var foilIdx = findCol(header, ['foil', 'printing']);
  var priceIdx = findCol(header, [
    'purchase price', 'price', 'purchase_price', 'cost',
    'market price'
  ]);
  var scryfallIdx = findCol(header, [
    'scryfall id', 'scryfall_id', 'scryfallid',
    'tcgplayer id'
  ]);
  var languageIdx = findCol(header, ['language', 'lang', 'card language']);

  if (nameIdx === -1) {
    return { cards: [], errors: ['Could not find a "Name" or "Card Name" column in CSV header. Found columns: ' + header.join(', ')] };
  }

  var cards = [];
  var parseErrors = [];

  for (var i = 1; i < lines.length; i++) {
    var cols = parseCSVLine(lines[i]);
    var name = (cols[nameIdx] || '').trim();
    if (!name) {
      parseErrors.push('Row ' + (i + 1) + ': empty card name, skipped');
      continue;
    }

    var qty = 1;
    if (qtyIdx !== -1 && cols[qtyIdx]) {
      var parsedQty = parseInt(cols[qtyIdx], 10);
      if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
    }

    var condition = 'NM';
    if (condIdx !== -1 && cols[condIdx]) {
      var rawCond = cols[condIdx].trim().toUpperCase();
      if (['NM', 'LP', 'MP', 'HP', 'DMG'].indexOf(rawCond) !== -1) {
        condition = rawCond;
      } else if (rawCond === 'NEAR MINT' || rawCond === 'MINT') {
        condition = 'NM';
      } else if (rawCond === 'LIGHTLY PLAYED' || rawCond === 'LIGHT PLAY') {
        condition = 'LP';
      } else if (rawCond === 'MODERATELY PLAYED' || rawCond === 'MODERATE PLAY') {
        condition = 'MP';
      } else if (rawCond === 'HEAVILY PLAYED' || rawCond === 'HEAVY PLAY') {
        condition = 'HP';
      } else if (rawCond === 'DAMAGED') {
        condition = 'DMG';
      }
    }

    var price = 0;
    if (priceIdx !== -1 && cols[priceIdx]) {
      var rawPrice = cols[priceIdx].replace(/[^0-9.]/g, '');
      var parsedPrice = parseFloat(rawPrice);
      if (!isNaN(parsedPrice) && parsedPrice > 0) price = parsedPrice;
    }

    var setName = '';
    if (setIdx !== -1 && cols[setIdx]) setName = cols[setIdx].trim();

    var setCode = '';
    if (setCodeIdx !== -1 && cols[setCodeIdx]) setCode = cols[setCodeIdx].trim();

    var foil = false;
    if (foilIdx !== -1 && cols[foilIdx]) {
      var rawFoil = cols[foilIdx].trim().toLowerCase();
      foil = rawFoil === 'true' || rawFoil === 'yes' || rawFoil === '1' || rawFoil === 'foil';
    }

    var scryfallId = '';
    if (scryfallIdx !== -1 && cols[scryfallIdx]) scryfallId = cols[scryfallIdx].trim();

    var language = 'English';
    if (languageIdx !== -1 && cols[languageIdx]) {
      var rawLang = cols[languageIdx].trim();
      if (rawLang) language = rawLang;
    }

    // Expand quantity into individual cards for bulk creation
    for (var q = 0; q < qty; q++) {
      cards.push({
        cardName: name,
        setName: setName,
        setCode: setCode,
        condition: condition,
        price: price,
        foil: foil,
        language: language,
        scryfallId: scryfallId,
        notes: foil ? 'Foil' : ''
      });
    }
  }

  return { cards: cards, errors: parseErrors };
}

/**
 * Parse a plain-text card list (MTGA export, simple list, or quantity-prefixed list).
 *
 * Supported formats per line:
 *   MTGA:   "4 Lightning Bolt (LEA) 123"
 *   Simple: "Lightning Bolt"
 *   Qty:    "4x Lightning Bolt"  or  "4 Lightning Bolt"
 *
 * Returns { cards: [...], errors: [] }
 * Each card: { cardName, setName, setCode, condition, price, foil, scryfallId, notes }
 * Quantity is expanded into individual card entries (same as parseManaboxCSV).
 */
export function parseTextList(text) {
  var lines = text.split(/\r?\n/).filter(function(l) { return l.trim(); });
  var cards = [];
  var errors = [];

  // MTGA format: "4 Lightning Bolt (LEA) 123"
  var mtgaRegex = /^(\d+)\s+(.+?)(?:\s+\(([A-Z0-9]+)\)(?:\s+(\d+))?)?$/;
  // Quantity prefix: "4x Lightning Bolt" or "4 Lightning Bolt"
  var qtyRegex = /^(\d+)x?\s+(.+)$/i;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    var qty = 1;
    var cardName = '';
    var setCode = '';

    // Try MTGA format first (handles both "4 Name (SET) 123" and "4 Name (SET)" and "4 Name")
    var mtgaMatch = mtgaRegex.exec(line);
    if (mtgaMatch) {
      qty = parseInt(mtgaMatch[1], 10) || 1;
      cardName = mtgaMatch[2].trim();
      setCode = mtgaMatch[3] ? mtgaMatch[3].trim() : '';
      // mtgaMatch[4] is the collector number — we ignore it (not used in our schema)
    } else {
      // Try quantity prefix: "4x Name" or "4 Name"
      var qtyMatch = qtyRegex.exec(line);
      if (qtyMatch) {
        qty = parseInt(qtyMatch[1], 10) || 1;
        cardName = qtyMatch[2].trim();
      } else {
        // Simple name with no quantity
        cardName = line;
      }
    }

    if (!cardName) {
      errors.push('Line ' + (i + 1) + ': could not parse card name, skipped');
      continue;
    }

    // Expand quantity into individual card entries
    for (var q = 0; q < qty; q++) {
      cards.push({
        cardName: cardName,
        setName: '',
        setCode: setCode,
        condition: 'NM',
        price: 0,
        foil: false,
        scryfallId: '',
        notes: ''
      });
    }
  }

  return { cards: cards, errors: errors };
}
