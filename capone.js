/*
 * Capital One Offers - Android/Desktop Exporter
 * Repository: nalexiou/mybookmarklets
 * File: capone.js (plain JavaScript; no "javascript:" prefix or URL encoding)
 * Operates only in the signed-in capitaloneoffers.com page.
 */
(() => {
  'use strict';

  if (!/(^|\.)capitaloneoffers\.com$/i.test(location.hostname)) {
    alert('Open https://capitaloneoffers.com first, then run the bookmarklet.');
    return;
  }

  // Starting the bookmarklet a second time resets the previous instance.
  if (typeof window.__capitalOneOffersExport?.close === 'function') {
    window.__capitalOneOffersExport.close();
  }
  document.getElementById('ov-export-style')?.remove();
  document.getElementById('ov-overlay')?.remove();

  let active = true;
  let complete = false;
  let offers = [];
  let sortBy = 'none';
  let clickCount = 0;
  let loading = false;
  let renderedCount = 0;
  let renderedDefault = false;
  let lastVisibleCount = 0;
  let manualDownloadUrl = '';

  const offerByTile = new WeakMap();
  const offerById = new Map();

  const style = document.createElement('style');
  style.id = 'ov-export-style';
  style.textContent = `
    #ov-overlay {position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;
      justify-content:center;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      background:rgba(2,6,23,.45)}
    #ov-overlay * {box-sizing:border-box}
    #ov-overlay .ov-modal {width:94vw;max-width:1050px;max-height:91vh;background:#1e293b;
      border-radius:18px;box-shadow:0 25px 80px rgba(0,0,0,.55);display:flex;
      flex-direction:column;overflow:hidden;color:#fff}
    #ov-overlay .ov-header {padding:17px 20px;background:rgba(59,130,246,.15);
      border-bottom:1px solid rgba(255,255,255,.1);display:flex;flex-wrap:wrap;gap:14px;
      align-items:center;justify-content:space-between}
    #ov-overlay .ov-title {margin:0 0 5px;font-size:21px;font-weight:700;letter-spacing:-.4px}
    #ov-overlay .ov-stats {display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;
      color:rgba(255,255,255,.75)}
    #ov-overlay .ov-status {padding:5px 9px;border-radius:20px;font-weight:600;
      color:#fff;background:#3b82f6}
    #ov-overlay .ov-controls {display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    #ov-overlay .ov-search,#ov-overlay .ov-select {padding:9px 10px;border-radius:9px;
      border:1px solid rgba(255,255,255,.18);background:#334155;color:#fff;
      font-size:12px;outline:none}
    #ov-overlay .ov-search {width:165px;max-width:38vw}
    #ov-overlay .ov-search::placeholder {color:#cbd5e1}
    #ov-overlay .ov-select {max-width:180px}
    #ov-overlay .ov-select option {color:#fff;background:#1e293b}
    #ov-overlay .ov-btn {padding:9px 12px;border-radius:9px;border:0;background:#3b82f6;
      color:#fff;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}
    #ov-overlay .ov-export {background:#059669}
    #ov-overlay .ov-copy {background:#475569}
    #ov-overlay .ov-retry {background:#b45309}
    #ov-overlay .ov-manual {background:#7c3aed;text-decoration:none;display:inline-block}
    #ov-overlay .ov-manual[hidden] {display:none}
    #ov-overlay .ov-btn:disabled {cursor:not-allowed;opacity:.42}
    #ov-overlay .ov-close {width:34px;height:34px;border-radius:50%;background:#475569;
      color:#fff;border:0;font-size:20px;cursor:pointer}
    #ov-overlay .ov-table-wrap {flex:1;overflow:auto}
    #ov-overlay .ov-table {width:100%;min-width:640px;border-collapse:collapse}
    #ov-overlay th {position:sticky;top:0;z-index:1;padding:13px 15px;text-align:left;
      background:#111827;color:#cbd5e1;text-transform:uppercase;letter-spacing:.4px;font-size:10px}
    #ov-overlay td {padding:12px 15px;border-bottom:1px solid rgba(255,255,255,.07);
      font-size:12px;vertical-align:middle}
    #ov-overlay tbody tr:hover {background:rgba(59,130,246,.12)}
    #ov-overlay .ov-merchant {display:flex;align-items:center;gap:11px;min-width:170px}
    #ov-overlay .ov-logo {width:38px;height:38px;border-radius:8px;object-fit:contain;
      background:#fff;flex-shrink:0}
    #ov-overlay .ov-name {font-weight:650;font-size:13px;overflow-wrap:anywhere}
    #ov-overlay .ov-badge {display:inline-block;padding:6px 9px;border-radius:7px;
      background:#2563eb;font-weight:700;white-space:nowrap}
    #ov-overlay .ov-fixed {background:#059669}
    #ov-overlay .ov-muted {color:#94a3b8}
    @media(max-width:600px) {
      #ov-overlay .ov-modal {width:98vw;max-height:94vh;border-radius:12px}
      #ov-overlay .ov-header {padding:12px;gap:9px}
      #ov-overlay .ov-title {font-size:18px}
      #ov-overlay .ov-controls {width:100%}
      #ov-overlay .ov-search {flex:1;min-width:120px}
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'ov-overlay';
  overlay.innerHTML = `
    <section class="ov-modal" role="dialog" aria-label="Capital One Offers">
      <header class="ov-header">
        <div>
          <h1 class="ov-title">Capital One Offers</h1>
          <div class="ov-stats">
            <span id="ov-count">0 offers</span>
            <span id="ov-clicks">0 clicks</span>
            <span id="ov-status" class="ov-status">Loading...</span>
          </div>
        </div>
        <div class="ov-controls">
          <input id="ov-search" class="ov-search" placeholder="Search merchants..." aria-label="Search offers">
          <select id="ov-sort" class="ov-select" aria-label="Sort offers">
            <option value="none">Default order</option>
            <option value="fixed_desc">Fixed miles: high to low</option>
            <option value="fixed_asc">Fixed miles: low to high</option>
            <option value="mult_desc">X miles: high to low</option>
            <option value="mult_asc">X miles: low to high</option>
            <option value="merchant_asc">Merchant A-Z</option>
          </select>
          <button id="ov-export" class="ov-btn ov-export" disabled>Export All CSV</button>
          <button id="ov-copy" class="ov-btn ov-copy" disabled>Copy CSV</button>
          <button id="ov-retry" class="ov-btn ov-retry" hidden>Retry loading</button>
          <a id="ov-manual" class="ov-btn ov-manual" hidden>Alternate download</a>
          <button id="ov-close" class="ov-close" aria-label="Close">&times;</button>
        </div>
      </header>
      <div class="ov-table-wrap">
        <table class="ov-table">
          <thead><tr><th>Merchant</th><th>Reward</th><th>Channel / Type</th>
            <th style="text-align:center">Action</th></tr></thead>
          <tbody id="ov-tbody"></tbody>
        </table>
      </div>
    </section>`;
  document.body.appendChild(overlay);

  const one = (selector) => overlay.querySelector(selector);
  const tableBody = one('#ov-tbody');
  const count = one('#ov-count');
  const clicks = one('#ov-clicks');
  const status = one('#ov-status');
  const search = one('#ov-search');
  const sort = one('#ov-sort');
  const exportButton = one('#ov-export');
  const copyButton = one('#ov-copy');
  const retryButton = one('#ov-retry');
  const manualLink = one('#ov-manual');

  function close() {
    active = false;
    if (manualDownloadUrl) URL.revokeObjectURL(manualDownloadUrl);
    overlay.remove();
    style.remove();
    if (window.__capitalOneOffersExport?.close === close) {
      delete window.__capitalOneOffersExport;
    }
    window.removeEventListener('keydown', onKeydown);
  }
  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }
  window.addEventListener('keydown', onKeydown);
  one('#ov-close').addEventListener('click', close);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  window.__capitalOneOffersExport = { close };

  function setStatus(message, state = 'loading') {
    if (!active) return;
    status.textContent = message;
    status.style.background = state === 'done' ? '#059669'
      : state === 'warning' ? '#b45309' : '#3b82f6';
  }

  function getDomain(imageUrl) {
    if (!imageUrl) return '';
    try {
      const url = new URL(imageUrl, location.href);
      return (url.searchParams.get('domain') || '').trim();
    } catch {
      return '';
    }
  }

  function getOfferLink(tile) {
    const link = tile.querySelector('a[href]');
    if (!link) return '';
    try {
      const url = new URL(link.getAttribute('href'), location.href);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function parseReward(raw) {
    const fixedMatch = raw.match(/([\d,]+)\s*miles\b/i);
    const multMatch = raw.match(/(\d+(?:\.\d+)?)\s*[x\u00d7](?=\s|$|[^a-z0-9])/i);
    const fixed = fixedMatch ? Number(fixedMatch[1].replace(/,/g, '')) : null;
    const multiplier = multMatch ? Number(multMatch[1]) : null;
    return {
      fixed,
      multiplier,
      type: fixed !== null ? 'Fixed miles'
        : multiplier !== null ? 'Multiplier' : 'Other'
    };
  }

  function parseOffer(outer, index) {
    const tile = outer.classList.contains('standard-tile')
      ? outer : outer.querySelector('.standard-tile') || outer;
    const img = tile.querySelector('img');
    const imageUrl = img?.currentSrc || img?.src || img?.getAttribute('data-src') || '';
    const domain = getDomain(imageUrl);
    const alt = (img?.getAttribute('alt') || '').trim();
    const merchant = alt && !/^(logo|image|merchant logo)$/i.test(alt)
      ? alt : domain || 'Unknown';
    const channel = (tile.querySelector('h2')?.textContent || '').trim();
    const rewardText = (tile.querySelector('div.font-semibold')?.textContent
      || tile.querySelector('[class*="font-semibold"]')?.textContent || '').trim();
    const reward = parseReward(rewardText);
    return {
      index,
      merchant,
      domain,
      imageUrl,
      rewardText,
      fixed: reward.fixed,
      multiplier: reward.multiplier,
      rewardType: reward.type,
      channel,
      details: (tile.innerText || tile.textContent || '').replace(/\s+/g, ' ').trim(),
      offerLink: getOfferLink(tile),
      element: outer
    };
  }

  function syncOffers() {
    let tiles = document.querySelectorAll('[data-testid^="feed-tile-"]');
    if (!tiles.length) tiles = document.querySelectorAll('.standard-tile');
    let added = 0;
    let revised = false;
    for (const tile of tiles) {
      const id = tile.getAttribute('data-testid');
      let offer = offerByTile.get(tile) || (id ? offerById.get(id) : null);
      if (offer) {
        if (offer.element !== tile) {
          offer.element = tile;
          offerByTile.set(tile, offer);
        }
        if (offer.merchant === 'Unknown' && !offer.rewardText) {
          Object.assign(offer, parseOffer(tile, offer.index));
          revised = true;
        }
        continue;
      }
      offer = parseOffer(tile, offers.length);
      offers.push(offer);
      offerByTile.set(tile, offer);
      if (id) offerById.set(id, offer);
      added++;
    }
    if (added || revised) {
      if (revised) renderedDefault = false;
      render();
    } else {
      updateCount();
    }
    return added;
  }

  function updateCount(shown = null) {
    if (!active) return;
    if (shown !== null) lastVisibleCount = shown;
    else shown = search.value.trim() ? lastVisibleCount : offers.length;
    count.textContent = offers.length.toLocaleString() + ' offers'
      + (shown !== offers.length ? ' (' + shown.toLocaleString() + ' shown)' : '');
    clicks.textContent = clickCount.toLocaleString() + ' clicks';
  }

  function sortedAndFiltered() {
    const query = search.value.trim().toLowerCase();
    const result = offers.filter((offer) => !query || [
      offer.merchant, offer.domain, offer.channel, offer.rewardText, offer.details
    ].some((value) => String(value || '').toLowerCase().includes(query)));
    const numericSort = (field, descending) => result.sort((a, b) => {
      if (a[field] === null && b[field] === null) return a.index - b.index;
      if (a[field] === null) return 1;
      if (b[field] === null) return -1;
      return (descending ? b[field] - a[field] : a[field] - b[field]) || a.index - b.index;
    });
    switch (sortBy) {
      case 'fixed_desc': numericSort('fixed', true); break;
      case 'fixed_asc': numericSort('fixed', false); break;
      case 'mult_desc': numericSort('multiplier', true); break;
      case 'mult_asc': numericSort('multiplier', false); break;
      case 'merchant_asc':
        result.sort((a, b) => a.merchant.localeCompare(b.merchant) || a.index - b.index);
        break;
    }
    return result;
  }

  function invokeReactOrClick(element) {
    const reactKey = Object.keys(element).find((key) => key.startsWith('__reactProps$'));
    const handler = reactKey && element[reactKey]?.onClick;
    if (typeof handler === 'function') {
      try {
        handler({
          type: 'click', target: element, currentTarget: element,
          bubbles: true, cancelable: true,
          preventDefault() {}, stopPropagation() {},
          isDefaultPrevented: () => false,
          isPropagationStopped: () => false,
          persist() {}
        });
        return;
      } catch (error) {
        console.warn('React click handler failed; trying native click:', error);
      }
    }
    element.click();
  }

  function openOffer(offer) {
    overlay.style.zIndex = '1';
    const clickable = offer.element.closest('[role="button"]')
      || offer.element.querySelector('[role="button"]')
      || offer.element;
    invokeReactOrClick(clickable);
  }

  function makeRow(offer) {
    const row = document.createElement('tr');
    const merchantCell = document.createElement('td');
    const merchantWrap = document.createElement('div');
    merchantWrap.className = 'ov-merchant';
    if (offer.imageUrl) {
      const image = document.createElement('img');
      image.className = 'ov-logo';
      image.src = offer.imageUrl;
      image.alt = '';
      image.onerror = () => image.remove();
      merchantWrap.appendChild(image);
    }
    const merchantName = document.createElement('span');
    merchantName.className = 'ov-name';
    merchantName.textContent = offer.merchant;
    merchantWrap.appendChild(merchantName);
    merchantCell.appendChild(merchantWrap);

    const rewardCell = document.createElement('td');
    const rewardBadge = document.createElement('span');
    rewardBadge.className = 'ov-badge' + (offer.fixed !== null ? ' ov-fixed' : '');
    if (offer.fixed !== null) rewardBadge.textContent = offer.fixed.toLocaleString() + ' miles';
    else if (offer.multiplier !== null) rewardBadge.textContent = offer.multiplier + 'X';
    else {
      rewardBadge.className = 'ov-muted';
      rewardBadge.textContent = offer.rewardText || '-';
    }
    rewardCell.appendChild(rewardBadge);

    const channelCell = document.createElement('td');
    channelCell.textContent = offer.channel || '-';
    const actionCell = document.createElement('td');
    actionCell.style.textAlign = 'center';
    const openButton = document.createElement('button');
    openButton.className = 'ov-btn';
    openButton.textContent = 'Open';
    openButton.addEventListener('click', () => openOffer(offer));
    actionCell.appendChild(openButton);
    row.append(merchantCell, rewardCell, channelCell, actionCell);
    return row;
  }

  function render() {
    if (!active) return;
    const defaultMode = !search.value.trim() && sortBy === 'none';
    if (defaultMode && renderedDefault && renderedCount <= offers.length) {
      if (renderedCount < offers.length) {
        const fragment = document.createDocumentFragment();
        for (let i = renderedCount; i < offers.length; i++) {
          fragment.appendChild(makeRow(offers[i]));
        }
        tableBody.appendChild(fragment);
        renderedCount = offers.length;
      }
      updateCount();
      return;
    }
    const visible = sortedAndFiltered();
    const fragment = document.createDocumentFragment();
    for (const offer of visible) fragment.appendChild(makeRow(offer));
    tableBody.replaceChildren(fragment);
    renderedDefault = defaultMode;
    renderedCount = defaultMode ? offers.length : 0;
    updateCount(visible.length);
  }
  search.addEventListener('input', render);
  sort.addEventListener('change', () => {
    sortBy = sort.value;
    render();
  });

  function csvCell(value) {
    let text = value === null || value === undefined ? '' : String(value);
    // Prevent CSV-formula execution when a file is opened in a spreadsheet app.
    if (/^\s*[=+@\-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function makeCSV() {
    const columns = [
      'Merchant', 'Merchant domain', 'Reward', 'Reward type',
      'Fixed miles', 'Miles multiplier', 'Channel / Type',
      'Offer details', 'Offer URL', 'Logo URL'
    ];
    const lines = [columns.map(csvCell).join(',')];
    for (const offer of offers) {
      lines.push([
        offer.merchant, offer.domain, offer.rewardText, offer.rewardType,
        offer.fixed, offer.multiplier, offer.channel, offer.details,
        offer.offerLink, offer.imageUrl
      ].map(csvCell).join(','));
    }
    return lines.join('\r\n');
  }

  function prepareAlternateDownload(file) {
    if (manualDownloadUrl) URL.revokeObjectURL(manualDownloadUrl);
    manualDownloadUrl = URL.createObjectURL(file);
    manualLink.href = manualDownloadUrl;
    manualLink.download = file.name;
    manualLink.target = '_blank';
    manualLink.rel = 'noopener';
    manualLink.hidden = false;
  }

  function exportAllCSV() {
    if (!complete || !offers.length) return;
    const filename = 'capital-one-offers-' + new Date().toISOString().slice(0, 10) + '.csv';
    const file = new File(['\uFEFF', makeCSV()], filename, { type: 'text/csv;charset=utf-8' });
    prepareAlternateDownload(file);
    const isAppleMobile = /iPad|iPhone|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isAppleMobile && typeof navigator.share === 'function'
      && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      setStatus('Choose Save to Files in the share sheet (' + offers.length + ')', 'done');
      try {
        navigator.share({ files: [file], title: filename }).then(() => {
          setStatus('Share sheet closed; check Files for your CSV', 'done');
        }).catch((error) => {
          if (error?.name === 'AbortError') {
            setStatus('Share canceled; tap Export All CSV to retry', 'warning');
          } else {
            console.warn('CSV sharing failed:', error);
            setStatus('Share unavailable; tap Alternate download', 'warning');
          }
        });
      } catch (error) {
        console.warn('CSV share request failed:', error);
        setStatus('Share unavailable; tap Alternate download', 'warning');
      }
      return;
    }

    if (!isAppleMobile) {
      const link = document.createElement('a');
      link.href = manualDownloadUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus('Download requested; check Downloads or tap Alternate download', 'done');
    } else {
      setStatus('Tap Alternate download to save the CSV (' + offers.length + ')', 'warning');
    }
  }

  async function copyCSV() {
    if (!complete || !offers.length) return;
    const csv = makeCSV();
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(csv);
      } else {
        const helper = document.createElement('textarea');
        helper.value = csv;
        helper.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(helper);
        helper.select();
        const worked = document.execCommand('copy');
        helper.remove();
        if (!worked) throw new Error('Copy not supported');
      }
      setStatus('Copied all ' + offers.length + ' offers', 'done');
    } catch {
      setStatus('Copy blocked: use Export All CSV', 'warning');
    }
  }
  exportButton.addEventListener('click', exportAllCSV);
  copyButton.addEventListener('click', copyCSV);

  function finish(message, state = 'done') {
    if (!active) return;
    syncOffers();
    complete = true;
    exportButton.disabled = offers.length === 0;
    copyButton.disabled = offers.length === 0;
    retryButton.hidden = state !== 'warning';
    setStatus(message + ' (' + offers.length.toLocaleString() + ' offers)', state);
  }

  function findMoreButton() {
    return Array.from(document.querySelectorAll('button')).find((button) =>
      !overlay.contains(button) && /view\s+more\s+offers/i.test(button.textContent || ''));
  }
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function waitForButtonOrCompletion() {
    let missingMs = 0;
    let disabledMs = 0;
    let seenCount = offers.length;
    while (active) {
      syncOffers();
      const button = findMoreButton();
      if (button && !button.disabled) return button;
      if (offers.length !== seenCount) {
        seenCount = offers.length;
        missingMs = 0;
        disabledMs = 0;
      }
      if (!button) {
        missingMs += 700;
        if (missingMs >= 6300) {
          if (!offers.length) throw new Error('No offer cards found on the page');
          return null;
        }
        setStatus('Checking for more offers... ' + offers.length.toLocaleString() + ' loaded');
      } else {
        missingMs = 0;
        disabledMs += 700;
        if (disabledMs >= 90000) {
          throw new Error('View More Offers remained disabled for 90 seconds');
        }
        setStatus('Waiting for site to finish loading... ' + offers.length.toLocaleString() + ' loaded');
      }
      await pause(700);
    }
    return null;
  }

  async function waitForGrowth(before) {
    for (let elapsed = 0; active && elapsed < 15000; elapsed += 500) {
      await pause(500);
      syncOffers();
      if (offers.length > before) {
        await pause(650);
        syncOffers();
        return true;
      }
    }
    return false;
  }

  async function loadAllOffers() {
    if (loading || !active) return;
    loading = true;
    complete = false;
    retryButton.hidden = true;
    exportButton.disabled = true;
    copyButton.disabled = true;
    let noGrowthClicks = 0;
    const maxClicks = 1000;
    try {
      await pause(500);
      while (active) {
        syncOffers();
        const button = await waitForButtonOrCompletion();
        if (!active) return;
        if (!button) {
          finish('Complete - no more View More Offers button');
          return;
        }
        if (clickCount >= maxClicks) {
          finish('Stopped at safety limit; export or retry', 'warning');
          return;
        }
        const before = offers.length;
        clickCount++;
        updateCount();
        setStatus('Loading: ' + offers.length.toLocaleString()
          + ' offers, ' + clickCount + ' clicks');
        invokeReactOrClick(button);
        const grew = await waitForGrowth(before);
        if (!active) return;
        if (grew) {
          noGrowthClicks = 0;
          setStatus('Loading: ' + offers.length.toLocaleString()
            + ' offers, ' + clickCount + ' clicks');
          continue;
        }
        if (!findMoreButton()) {
          const next = await waitForButtonOrCompletion();
          if (!active) return;
          if (!next) {
            finish('Complete - no more offers available');
            return;
          }
        }
        noGrowthClicks++;
        if (noGrowthClicks >= 3) {
          finish('Stalled: clicks rose but offer count did not. Retry or export available offers', 'warning');
          return;
        }
        setStatus('No new cards after click ' + clickCount
          + '; retrying (' + noGrowthClicks + '/3)', 'warning');
        await pause(2000);
      }
    } catch (error) {
      console.error('Capital One Offers loading:', error);
      finish('Loading issue: ' + error.message + '; retry or export', 'warning');
    } finally {
      loading = false;
    }
  }

  retryButton.addEventListener('click', () => {
    if (!loading) loadAllOffers();
  });
  syncOffers();
  setStatus('Loading: ' + offers.length.toLocaleString() + ' offers, 0 clicks');
  loadAllOffers();
})();
