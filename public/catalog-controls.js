/* Native GET forms remain usable without JavaScript. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const admin = document.body.classList.contains('admin-body');
  const controls = [];
  let opened;
  const chevron = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const check = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  document.querySelectorAll('[data-custom-select], .admin-body select').forEach(select => {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';
    select.before(wrapper);
    wrapper.append(select);
    const label = document.querySelector(`label[for="${select.id}"]`);
    if (!label) return;
    label.id ||= `${select.id}-label`;
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = `${select.id}-trigger`;
    trigger.className = 'select-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-labelledby', label.id);
    const value = document.createElement('span');
    value.className = 'select-value';
    const arrow = document.createElement('span');
    arrow.className = 'select-chevron';
    arrow.innerHTML = chevron;
    trigger.append(value, arrow);
    const popup = document.createElement('div');
    popup.id = `${select.id}-options`;
    popup.className = 'select-options t-dropdown';
    popup.dataset.origin = 'top-left';
    popup.setAttribute('role', 'listbox');
    popup.setAttribute('aria-labelledby', label.id);
    popup.hidden = true;
    trigger.setAttribute('aria-controls', popup.id);
    let active = select.selectedIndex;
    let closing;
    let typed = '';
    let typedTimer;
    let options = [];
    function buildOptions() {
    popup.replaceChildren();
    options = [...select.options].map((option, index) => {
      const row = document.createElement('div');
      row.className = 'select-option';
      row.id = `${select.id}-option-${index}`;
      row.setAttribute('role', 'option');
      const text = document.createElement('span');
      const tick = document.createElement('span');
      tick.className = 'select-check';
      tick.innerHTML = check;
      row.append(text, tick);
      row.addEventListener('pointermove', () => highlight(index));
      row.addEventListener('pointerdown', event => event.preventDefault());
      row.addEventListener('click', () => choose(index));
      popup.append(row);
      return { option, row, text };
    });
    }
    buildOptions();
    wrapper.append(trigger, popup);
    select.hidden = true;
    label.htmlFor = trigger.id;
    select.form?.querySelector('.page-size-submit')?.setAttribute('hidden', '');

    function sync() {
      trigger.disabled = select.matches(':disabled');
      value.textContent = select.selectedOptions[0]?.textContent || '';
      options.forEach(({ option, row, text }) => {
        text.textContent = option.textContent;
        row.setAttribute('aria-selected', String(option.selected));
      });
    }
    function highlight(index) {
      active = Math.max(0, Math.min(options.length - 1, index));
      options.forEach(({ row }, i) => row.classList.toggle('is-highlighted', i === active));
      trigger.setAttribute('aria-activedescendant', options[active].row.id);
      options[active].row.scrollIntoView({ block: 'nearest' });
    }
    function close() {
      clearTimeout(closing);
      trigger.setAttribute('aria-expanded', 'false');
      trigger.removeAttribute('aria-activedescendant');
      popup.classList.remove('is-open');
      popup.classList.add('is-closing');
      popup.inert = true;
      if (opened === control) opened = undefined;
      const finish = () => { popup.hidden = true; popup.classList.remove('is-closing'); };
      const duration = admin || reducedMotion.matches ? 0 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dropdown-close-dur')) || 150;
      if (duration) closing = setTimeout(finish, duration);
      else finish();
    }
    function open(index = select.selectedIndex) {
      if (select.matches(':disabled')) return;
      if (opened && opened !== control) opened.close();
      clearTimeout(closing);
      popup.classList.remove('is-closing');
      popup.hidden = false;
      popup.inert = false;
      const rect = trigger.getBoundingClientRect();
      const upward = innerHeight - rect.bottom < Math.min(popup.scrollHeight, 240) + 12 && rect.top > innerHeight - rect.bottom;
      wrapper.classList.toggle('is-upward', upward);
      popup.dataset.origin = upward ? 'bottom-left' : 'top-left';
      trigger.setAttribute('aria-expanded', 'true');
      void popup.offsetWidth;
      popup.classList.add('is-open');
      opened = control;
      highlight(index);
    }
    function choose(index) {
      const previous = select.value;
      select.selectedIndex = index;
      sync();
      close();
      trigger.focus({ preventScroll: true });
      if (select.value !== previous) select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const control = { close, sync, wrapper };
    controls.push(control);
    trigger.addEventListener('click', () => trigger.getAttribute('aria-expanded') === 'true' ? close() : open());
    trigger.addEventListener('keydown', event => {
      const isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'Escape') { if(isOpen){event.preventDefault();close();} return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        if (!isOpen) open();
        highlight(event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : active + (event.key === 'ArrowDown' ? 1 : -1));
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (isOpen) choose(active); else open();
      } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        clearTimeout(typedTimer);
        typed += event.key.toLocaleLowerCase();
        typedTimer = setTimeout(() => { typed = ''; }, 650);
        const index = options.findIndex(({ option }) => option.textContent.trim().toLocaleLowerCase().startsWith(typed));
        if (!isOpen) open();
        if (index >= 0) highlight(index);
      }
    });
    select.addEventListener('change', sync);
    new MutationObserver(() => { buildOptions(); sync(); }).observe(select, { childList: true, subtree: true });
    if (select.form?.hasAttribute('data-page-size')) select.addEventListener('change', () => select.form.requestSubmit());
    sync();
  });
  document.addEventListener('pointerdown', event => {
    if (opened && !opened.wrapper.contains(event.target)) opened.close();
  });
  document.addEventListener('tractorpart:language', () => controls.forEach(control => control.sync()));
  reducedMotion.addEventListener('change', () => { if(reducedMotion.matches) opened?.close(); });
})();
