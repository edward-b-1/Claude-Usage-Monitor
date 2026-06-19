const content = document.getElementById('content');

document.getElementById('refreshBtn').addEventListener('click', () => {
  window.electronAPI.requestRefresh();
});

document.getElementById('closeBtn').addEventListener('click', () => {
  window.electronAPI.closeWindow();
});

function colorFor(_pct) {
  return '#4a90d9';
}

// Resize the window so its height matches the rendered content (titlebar +
// however many meter rows are currently shown). Measured after layout settles.
function resizeToContent() {
  requestAnimationFrame(() => {
    const titlebar = document.querySelector('.titlebar');
    const rows = content.children;
    let inner = 0;
    if (rows.length) {
      const first = rows[0].getBoundingClientRect();
      const last = rows[rows.length - 1].getBoundingClientRect();
      inner = last.bottom - first.top;
    }
    const cs = getComputedStyle(content);
    const padding = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const total = Math.ceil(titlebar.offsetHeight + padding + inner);
    window.electronAPI.resizeWindow(total);
  });
}

function formatReset(iso) {
  if (!iso) return '';
  const diff = new Date(iso) - new Date();
  if (diff < 0) return 'resetting soon';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `resets in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const m = mins % 60;
  if (hours < 24) return `resets in ${hours}h ${m}m`;
  const days = Math.floor(hours / 24);
  return `resets in ${days}d ${hours % 24}h`;
}

function makeRow(label, pct, subtext) {
  const row = document.createElement('div');
  row.className = 'row';

  const rowTop = document.createElement('div');
  rowTop.className = 'row-top';

  const labelEl = document.createElement('span');
  labelEl.className = 'label';
  labelEl.textContent = label;

  const barWrap = document.createElement('div');
  barWrap.className = 'bar-wrap';

  const barFill = document.createElement('div');
  barFill.className = 'bar-fill';
  barFill.style.width = `${pct}%`;
  barFill.style.backgroundColor = colorFor(pct);

  const pctEl = document.createElement('span');
  pctEl.className = 'pct';
  pctEl.textContent = `${pct}%`;

  barWrap.appendChild(barFill);
  rowTop.appendChild(labelEl);
  rowTop.appendChild(barWrap);
  rowTop.appendChild(pctEl);

  const subtextEl = document.createElement('div');
  subtextEl.className = 'subtext';
  subtextEl.textContent = subtext;

  row.appendChild(rowTop);
  row.appendChild(subtextEl);
  return row;
}

window.electronAPI.onUsageUpdate(({ usage }) => {
  content.innerHTML = '';

  if (usage.five_hour) {
    const u = usage.five_hour.utilization;
    content.appendChild(makeRow('5h', u, formatReset(usage.five_hour.resets_at)));
  }

  if (usage.seven_day) {
    const u = usage.seven_day.utilization;
    content.appendChild(makeRow('7d', u, formatReset(usage.seven_day.resets_at)));
  }

  // Promotional allowance (e.g. free £15/mo) — the legacy `extra_usage` ledger.
  if (usage.extra_usage?.is_enabled) {
    const eu = usage.extra_usage;
    const u = Math.round(eu.utilization);
    const sym = currencySymbol(eu.currency);
    const used = (eu.used_credits / 100).toFixed(2);
    const limit = (eu.monthly_limit / 100).toFixed(2);
    content.appendChild(makeRow(sym || '£', u, `${sym}${used} / ${sym}${limit} monthly`));
  }

  // Voluntary extra spend against a cap — the newer `spend` ledger.
  if (usage.spend?.enabled) {
    const sp = usage.spend;
    const exp = sp.used?.exponent ?? 2;
    const sym = currencySymbol(sp.used?.currency);
    const used = ((sp.used?.amount_minor ?? 0) / 10 ** exp).toFixed(2);
    const u = Math.round(sp.percent ?? 0);
    const subtext = sp.limit != null
      ? `${sym}${used} / ${sym}${(sp.limit / 10 ** exp).toFixed(2)} monthly`
      : `${sym}${used} spent`;
    content.appendChild(makeRow(sym || '$', u, subtext));
  }

  resizeToContent();
});

function currencySymbol(code) {
  if (code === 'GBP') return '£';
  if (code === 'USD') return '$';
  if (code === 'EUR') return '€';
  return code ? code + ' ' : '';
}

window.electronAPI.onError((msg) => {
  content.innerHTML = '';
  const err = document.createElement('div');
  err.className = 'error';
  err.textContent = msg;
  content.appendChild(err);
  resizeToContent();
});
