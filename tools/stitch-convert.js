#!/usr/bin/env node
/**
 * stitch-convert.js — Convert Stitch/modern React output to investMTG format
 *
 * Transforms:
 *   1. JSX → React.createElement (h() calls)
 *   2. const/let → var
 *   3. Arrow functions → function expressions
 *   4. Destructuring → manual access (useState pattern)
 *   5. Default exports → named exports
 *   6. Tailwind utility classes → investMTG CSS classes (via mapping file)
 *
 * Usage:
 *   node tools/stitch-convert.js input.jsx                    # prints to stdout
 *   node tools/stitch-convert.js input.jsx -o output.js       # writes to file
 *   node tools/stitch-convert.js input.jsx --no-tailwind      # skip Tailwind mapping
 *   cat input.jsx | node tools/stitch-convert.js --stdin       # read from stdin
 *
 * Requires: npm install (from repo root) — Babel deps are in workspace node_modules
 */

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

// ── CLI argument parsing ──
const args = process.argv.slice(2);
let inputFile = null;
let outputFile = null;
let skipTailwind = false;
let fromStdin = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '-o' || args[i] === '--output') { outputFile = args[++i]; }
  else if (args[i] === '--no-tailwind') { skipTailwind = true; }
  else if (args[i] === '--stdin') { fromStdin = true; }
  else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
stitch-convert — Convert Stitch/modern React to investMTG format

Usage:
  node tools/stitch-convert.js <input.jsx> [-o output.js] [--no-tailwind]
  cat input.jsx | node tools/stitch-convert.js --stdin

Options:
  -o, --output <file>   Write output to file instead of stdout
  --no-tailwind         Skip Tailwind class mapping
  --stdin               Read input from stdin
  -h, --help            Show this help
`);
    process.exit(0);
  }
  else if (!inputFile) { inputFile = args[i]; }
}

// ── Load Tailwind mapping ──
let tailwindMap = {};
const mapFile = path.join(__dirname, 'tailwind-to-investmtg.json');
if (!skipTailwind && fs.existsSync(mapFile)) {
  try {
    tailwindMap = JSON.parse(fs.readFileSync(mapFile, 'utf-8'));
  } catch (e) {
    console.error('[stitch-convert] Warning: Could not parse tailwind mapping file:', e.message);
  }
}

/**
 * Map a Tailwind className string to investMTG CSS classes.
 * Known Tailwind utilities are replaced; unknown ones are kept as comments.
 */
function mapTailwindClasses(classStr) {
  if (!classStr || skipTailwind) return classStr;

  const classes = classStr.trim().split(/\s+/);
  const mapped = [];
  const unmapped = [];

  for (const cls of classes) {
    if (tailwindMap[cls]) {
      // Direct mapping exists
      const mappedVal = tailwindMap[cls];
      if (!mapped.includes(mappedVal)) mapped.push(mappedVal);
    } else if (cls.startsWith('hover:') || cls.startsWith('focus:') || cls.startsWith('active:') || cls.startsWith('sm:') || cls.startsWith('md:') || cls.startsWith('lg:')) {
      // State/responsive variants — skip (handled in CSS)
      unmapped.push(cls);
    } else {
      unmapped.push(cls);
    }
  }

  let result = mapped.join(' ');
  if (unmapped.length > 0) {
    result += (result ? ' ' : '') + '/* tw: ' + unmapped.join(' ') + ' */';
  }
  return result || classStr;
}

// ── Babel transform ──
function transformCode(source, filename) {
  // Step 1: Babel transforms (JSX, arrows, destructuring, block scoping)
  const babelResult = babel.transformSync(source, {
    filename: filename || 'input.jsx',
    presets: [],
    plugins: [
      ['@babel/plugin-transform-react-jsx', {
        pragma: 'h',
        pragmaFrag: 'React.Fragment',
      }],
      '@babel/plugin-transform-arrow-functions',
      '@babel/plugin-transform-destructuring',
      ['@babel/plugin-transform-block-scoping', { throwIfClosureRequired: false }],
    ],
    sourceType: 'module',
    retainLines: true,
  });

  let code = babelResult.code;

  // Step 2: Remove all Babel polyfill helper functions in one pass
  // These functions (_slicedToArray, _arrayWithHoles, etc.) appear at the top as a block
  code = code.replace(/^(function _(slicedToArray|nonIterableRest|unsupportedIterableToArray|arrayLikeToArray|iterableToArrayLimit|arrayWithHoles)[\s\S]*?\n)+/m, '');

  // Step 2b: Clean up _slicedToArray calls to simple array access
  // Pattern: var _useState = useState(x), _useState2 = _slicedToArray(_useState, 2), y = _useState2[0], z = _useState2[1];
  let refCounter = 0;
  code = code.replace(
    /var (\w+) = (useState|React\.useState)\(([^)]*)\),\s*\w+ = _slicedToArray\(\1, 2\),\s*(\w+) = \w+\[0\],\s*(\w+) = \w+\[1\];/g,
    function(match, tmpVar, fn, init, getter, setter) {
      refCounter++;
      const refName = refCounter === 1 ? 'ref' : 'ref' + refCounter;
      return 'var ' + refName + ' = ' + fn + '(' + init + ');\nvar ' + getter + ' = ' + refName + '[0], ' + setter + ' = ' + refName + '[1];';
    }
  );

  // Step 2c: Replace remaining const/let with var
  code = code.replace(/\b(const|let)\s+/g, 'var ');

  // Step 3: Add `var h = React.createElement;` at the top if not present
  if (code.includes('h(') && !code.includes('var h = React.createElement')) {
    // Insert after the last import statement
    const importEnd = code.lastIndexOf('import ');
    if (importEnd >= 0) {
      const lineEnd = code.indexOf('\n', importEnd);
      code = code.slice(0, lineEnd + 1) + 'var h = React.createElement;\n' + code.slice(lineEnd + 1);
    } else {
      code = "var h = React.createElement;\n" + code;
    }
  }

  // Step 4: Replace `export default function X` with `export function X`
  code = code.replace(/export\s+default\s+function\s+/g, 'export function ');
  // Replace `export default var X` pattern
  code = code.replace(/export\s+default\s+var\s+/g, 'export var ');

  // Step 5: Map Tailwind className values
  if (!skipTailwind && Object.keys(tailwindMap).length > 0) {
    // Match className: "..." or className: '...'
    code = code.replace(/className:\s*["']([^"']+)["']/g, function(match, classStr) {
      const mapped = mapTailwindClasses(classStr);
      return "className: '" + mapped + "'";
    });
  }

  // Step 6: Fix function parameter destructuring to use props
  // Pattern: var ComponentName = function ({ prop1, prop2 }) {
  // → function ComponentName(props) { var prop1 = props.prop1; var prop2 = props.prop2;
  code = code.replace(
    /var (\w+) = function\s*\(\{\s*([^}]+)\}\)/g,
    function(match, name, params) {
      const props = params.split(',').map(p => p.trim()).filter(Boolean);
      const assignments = props.map(p => {
        const clean = p.split('=')[0].trim(); // handle defaults
        return '  var ' + clean + ' = props.' + clean + ';';
      }).join('\n');
      // The function body's opening { is already in the source, so we just replace the signature
      return 'function ' + name + '(props) {\n' + assignments + '\n';
    }
  );
  // Clean up leftover `{ ` from the destructured param block
  code = code.replace(/(function \w+\(props\) \{[\s\S]*?)\{(\s*var ref)/g, '$1$2');

  // Step 6b: Fix common useState patterns that Babel destructuring missed
  // Pattern: var _React$useState = React.useState(x), val = _React$useState[0], setVal = _React$useState[1];
  // → var ref = React.useState(x); var val = ref[0], setVal = ref[1];
  code = code.replace(
    /var (_React\$useState\d*) = React\.useState\(([^)]*)\),\s*(\w+) = \1\[0\],\s*(\w+) = \1\[1\];/g,
    function(match, tmpVar, init, getter, setter) {
      const refName = 'ref' + (tmpVar.match(/\d+/)?.[0] || '');
      return 'var ' + refName + ' = React.useState(' + init + ');\nvar ' + getter + ' = ' + refName + '[0], ' + setter + ' = ' + refName + '[1];';
    }
  );

  // Step 7: Add file header comment
  const header = '/* Converted from Stitch output by stitch-convert.js */\n';
  if (!code.startsWith('/*')) {
    code = header + code;
  }

  return code;
}

// ── Main ──
async function main() {
  let source;

  if (fromStdin) {
    source = fs.readFileSync('/dev/stdin', 'utf-8');
  } else if (inputFile) {
    if (!fs.existsSync(inputFile)) {
      console.error('[stitch-convert] File not found:', inputFile);
      process.exit(1);
    }
    source = fs.readFileSync(inputFile, 'utf-8');
  } else {
    console.error('[stitch-convert] No input file specified. Use --help for usage.');
    process.exit(1);
  }

  try {
    const result = transformCode(source, inputFile);

    if (outputFile) {
      fs.writeFileSync(outputFile, result, 'utf-8');
      console.error('[stitch-convert] Written to:', outputFile);
    } else {
      process.stdout.write(result);
    }
  } catch (err) {
    console.error('[stitch-convert] Transform error:', err.message);
    if (err.loc) {
      console.error('  at line', err.loc.line, 'column', err.loc.column);
    }
    process.exit(1);
  }
}

main();
