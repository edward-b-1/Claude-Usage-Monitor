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

  if (usage.extra_usage?.is_enabled) {
    const eu = usage.extra_usage;
    const u = Math.round(eu.utilization);
    const sym = eu.currency === 'GBP' ? '£' : eu.currency + ' ';
    const used = (eu.used_credits / 100).toFixed(2);
    const limit = (eu.monthly_limit / 100).toFixed(2);
    content.appendChild(makeRow('£', u, `${sym}${used} / ${sym}${limit} monthly`));
  }
});

window.electronAPI.onError((msg) => {
  content.innerHTML = '';
  const err = document.createElement('div');
  err.className = 'error';
  err.textContent = msg;
  content.appendChild(err);
});
