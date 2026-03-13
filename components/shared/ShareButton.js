/* shared/ShareButton.js — Global share button with Web Share API + clipboard fallback */
import React from 'react';
import { ShareIcon, CopyIcon, LinkIcon } from './Icons.js';
import { showToast } from './Toast.js';
var h = React.createElement;

/**
 * ShareButton — works everywhere:
 *   - Mobile/PWA: uses navigator.share (native share sheet)
 *   - Desktop: shows a small dropdown with Copy Link + Copy Text
 *
 * Props:
 *   title  — share title (e.g. card name)
 *   text   — share body text (e.g. "Ragavan — $75.00 on investMTG")
 *   url    — URL to share (defaults to current page)
 *   className — optional extra class
 *   size   — 'sm' | 'md' (default 'md')
 *   label  — button label text (default 'Share')
 */
export function ShareButton(props) {
  var title = props.title || 'investMTG';
  var text = props.text || '';
  var url = props.url || window.location.href;
  var size = props.size || 'md';
  var label = props.label !== undefined ? props.label : 'Share';
  var className = props.className || '';

  var ref = React.useState(false);
  var showMenu = ref[0], setShowMenu = ref[1];
  var menuRef = React.useRef(null);

  /* Close menu on outside click */
  React.useEffect(function() {
    if (!showMenu) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, [showMenu]);

  function handleShare() {
    /* Try native Web Share API first (mobile + some desktop browsers) */
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: url }).catch(function(err) {
        /* User cancelled — not an error */
        if (err.name !== 'AbortError') {
          console.error('[investMTG] Share failed:', err);
        }
      });
      return;
    }
    /* Desktop fallback — show copy menu */
    setShowMenu(!showMenu);
  }

  function copyLink() {
    navigator.clipboard.writeText(url).then(function() {
      showToast('Link copied to clipboard', 'success');
    }).catch(function() {
      fallbackCopy(url);
    });
    setShowMenu(false);
  }

  function copyText() {
    var full = text + (text ? '\n' : '') + url;
    navigator.clipboard.writeText(full).then(function() {
      showToast('Copied to clipboard', 'success');
    }).catch(function() {
      fallbackCopy(full);
    });
    setShowMenu(false);
  }

  function fallbackCopy(str) {
    try {
      var textarea = document.createElement('textarea');
      textarea.value = str;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Copied to clipboard', 'success');
    } catch (e) {
      showToast('Could not copy — try manually', 'error');
    }
  }

  var btnClass = 'btn btn-ghost share-btn';
  if (size === 'sm') btnClass += ' btn-sm share-btn--sm';
  if (className) btnClass += ' ' + className;

  return h('div', { className: 'share-wrap', ref: menuRef },
    h('button', {
      className: btnClass,
      onClick: handleShare,
      title: 'Share',
      'aria-label': 'Share'
    },
      h(ShareIcon, null),
      label ? ' ' + label : null
    ),
    /* Desktop dropdown fallback */
    showMenu ? h('div', { className: 'share-menu' },
      h('button', { className: 'share-menu-item', onClick: copyLink },
        h(LinkIcon, null), ' Copy link'
      ),
      text ? h('button', { className: 'share-menu-item', onClick: copyText },
        h(CopyIcon, null), ' Copy with details'
      ) : null
    ) : null
  );
}
