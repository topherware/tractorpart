// Keep the original file for re-editing; only the approved crop is uploaded.
window.TractorPartPhotoEditor = (() => {
  const dialog = document.getElementById('photo-crop-dialog');
  if (!dialog) return null;
  const canvas = dialog.querySelector('canvas');
  const context = canvas.getContext('2d');
  const slider = dialog.querySelector('input[type=range]');
  const output = dialog.querySelector('output');
  const apply = dialog.querySelector('[data-crop-apply]');
  const states = new WeakMap();
  const pointers = new Map();
  const translate = value => window.TractorPartAdminI18n?.translate(value) || value;
  let current = null, busy = false, previousOverflow;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function message(input, text) {
    const error = input.closest('form').querySelector('[data-error="image"]');
    if (error) error.textContent = translate(text);
    input.dataset.invalidPhoto = text ? 'true' : 'false';
  }
  async function decode(file) {
    if (file.size > 5 * 1024 * 1024 || !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('file');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const png = [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
    const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP';
    if (!(file.type === 'image/jpeg' ? jpeg : file.type === 'image/png' ? png : webp)) throw new Error('file');
    // Reject animated originals before the canvas flattens them to one frame.
    if (png || webp) {
      const view = new DataView(bytes.buffer);
      for (let pos = png ? 8 : 12; pos + 8 <= bytes.length;) {
        const size = view.getUint32(png ? pos : pos + 4, !png);
        const tag = String.fromCharCode(...bytes.slice(png ? pos + 4 : pos, png ? pos + 8 : pos + 4));
        if (tag === 'acTL' || tag === 'ANIM' || tag === 'ANMF') throw new Error('animated');
        pos += size + (png ? 12 : 8 + size % 2);
      }
    }
    let image;
    if (typeof createImageBitmap === 'function') image = await createImageBitmap(file, { imageOrientation: 'from-image' });
    else {
      const url = URL.createObjectURL(file);
      try { image = new Image(); image.src = url; await image.decode(); }
      finally { URL.revokeObjectURL(url); }
    }
    if (!image.width || !image.height || image.width * image.height > 40000000) {
      image.close?.(); throw new Error('size');
    }
    return image;
  }
  function dimensions() {
    const scale = current.zoom / Math.min(current.image.width, current.image.height);
    return { width: current.image.width * scale, height: current.image.height * scale };
  }
  function paint() {
    if (!current) return;
    const { width, height } = dimensions();
    const dx = Math.max(0, (width - 1) / 2), dy = Math.max(0, (height - 1) / 2);
    current.x = clamp(current.x, .5 - dx, .5 + dx);
    current.y = clamp(current.y, .5 - dy, .5 + dy);
    context.fillStyle = '#fff'; context.fillRect(0, 0, 640, 640);
    context.drawImage(current.image, (current.x - width / 2) * 640, (current.y - height / 2) * 640, width * 640, height * 640);
    slider.value = String(current.zoom);
    output.textContent = Math.round(current.zoom * 100) + '%';
  }
  function zoom(value, anchor = {x:.5,y:.5}) {
    if (!current || busy) return;
    const next = clamp(value, current.minZoom, 4), ratio = next / current.zoom;
    current.x = anchor.x - (anchor.x - current.x) * ratio;
    current.y = anchor.y - (anchor.y - current.y) * ratio;
    current.zoom = next; paint();
  }
  function location(event) {
    const box = canvas.getBoundingClientRect();
    return { x:(event.clientX-box.left)/box.width, y:(event.clientY-box.top)/box.height };
  }
  function restoreSelection(input, state) {
    input.value = '';
    input.required = state.required && !state.file;
    if (state.file && typeof DataTransfer === 'function') {
      try { const data = new DataTransfer(); data.items.add(state.file); input.files = data.files; input.required = state.required; } catch {}
    }
  }
  function finish(approved = false) {
    if (!current) return;
    const { input, state, image } = current;
    if (!approved) restoreSelection(input, state);
    message(input, ''); image.close?.(); current = null; pointers.clear();
    busy = false; apply.disabled = false;
    dialog.querySelectorAll('[data-crop-cancel]').forEach(button => button.disabled = false);
    if (dialog.open) dialog.close();
    document.documentElement.style.overflow = previousOverflow;
    (state.file ? state.edit : input).focus();
  }
  async function open(input, file, savedPose = null) {
    const state = states.get(input);
    if (current) finish();
    const token = ++state.token;
    input.dataset.invalidPhoto = 'true';
    try {
      const image = await decode(file);
      if (token !== state.token) { image.close?.(); return; }
      const minZoom = Math.min(image.width,image.height) / Math.max(image.width,image.height);
      current = { input, state, file, image, minZoom, x:.5, y:.5, zoom:1, ...savedPose };
      slider.min = String(minZoom);
      dialog.querySelector('[data-crop-error]').hidden = true;
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal(); paint(); slider.focus();
    } catch {
      restoreSelection(input, state);
      message(input, 'Gunakan JPG, PNG, atau WebP asli maksimal 5 MB. Foto bergerak tidak didukung.');
    }
  }
  dialog.querySelectorAll('[data-crop-cancel]').forEach(button => button.addEventListener('click', () => finish()));
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy) finish(); });
  dialog.addEventListener('close', () => { if (current) finish(); });
  slider.addEventListener('input', () => zoom(Number(slider.value)));
  for (const [selector, full] of [['[data-crop-fit]',true],['[data-crop-fill]',false]]) {
    dialog.querySelector(selector).addEventListener('click', () => {
      if (!current || busy) return;
      current.x = current.y = .5; current.zoom = full ? current.minZoom : 1; paint();
    });
  }
  canvas.addEventListener('wheel', event => {
    event.preventDefault(); if (current) zoom(current.zoom * Math.exp(-event.deltaY * .002), location(event));
  }, { passive:false });
  canvas.addEventListener('pointerdown', event => {
    if (!current || busy || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault(); canvas.focus(); pointers.set(event.pointerId, location(event)); canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!current || busy || !pointers.has(event.pointerId)) return;
    event.preventDefault(); const old = [...pointers.values()];
    const previous = pointers.get(event.pointerId), next = location(event);
    pointers.set(event.pointerId, next);
    if (pointers.size === 1) { current.x += next.x-previous.x; current.y += next.y-previous.y; }
    else if (pointers.size === 2) {
      const updated = [...pointers.values()];
      const distance = pair => Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
      const midpoint = pair => ({x:(pair[0].x+pair[1].x)/2,y:(pair[0].y+pair[1].y)/2});
      const before = midpoint(old), after = midpoint(updated);
      const nextZoom = clamp(current.zoom * distance(updated) / Math.max(distance(old),.001), current.minZoom, 4);
      const ratio = nextZoom/current.zoom;
      current.x = after.x-(before.x-current.x)*ratio; current.y = after.y-(before.y-current.y)*ratio; current.zoom = nextZoom;
    }
    paint();
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name, event => pointers.delete(event.pointerId));
  canvas.addEventListener('keydown', event => {
    if (!current || busy) return;
    const delta = event.shiftKey ? .1 : .025;
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault();
      current.x += event.key==='ArrowLeft' ? -delta : event.key==='ArrowRight' ? delta : 0;
      current.y += event.key==='ArrowUp' ? -delta : event.key==='ArrowDown' ? delta : 0;
      paint();
    } else if (['+','=','-'].includes(event.key)) { event.preventDefault(); zoom(current.zoom + (event.key==='-' ? -.1 : .1)); }
  });
  apply.addEventListener('click', async () => {
    if (!current || busy) return;
    busy = true; apply.disabled = true;
    dialog.querySelectorAll('[data-crop-cancel]').forEach(button => button.disabled = true);
    const session = current;
    try {
      const size = Math.max(1,Math.min(1400,Math.round(Math.min(session.image.width,session.image.height)/session.zoom)));
      const crop = document.createElement('canvas'); crop.width = crop.height = size;
      const result = crop.getContext('2d'), {width,height} = dimensions();
      result.fillStyle = '#fff'; result.fillRect(0,0,size,size);
      result.drawImage(session.image,(session.x-width/2)*size,(session.y-height/2)*size,width*size,height*size);
      const blob = await new Promise(resolve => crop.toBlob(resolve,'image/webp',.84));
      if (!blob || blob.type !== 'image/webp' || blob.size > 3*1024*1024) throw new Error('export');
      const state = session.state;
      if (state.url) URL.revokeObjectURL(state.url);
      state.file = session.file; state.blob = blob; state.pose = {x:session.x,y:session.y,zoom:session.zoom};
      state.url = URL.createObjectURL(blob); state.edit.hidden = false;
      state.preview.src = state.url; state.preview.hidden = false;
      if (state.empty) state.empty.hidden = true;
      session.input.required = false;
      finish(true); session.input.dispatchEvent(new Event('input',{bubbles:true}));
    } catch {
      const error = dialog.querySelector('[data-crop-error]');
      error.textContent = translate('Foto belum dapat diproses. Coba lagi.'); error.hidden = false;
      busy = false; apply.disabled = false;
      dialog.querySelectorAll('[data-crop-cancel]').forEach(button => button.disabled = false);
    }
  });
  document.querySelectorAll('[data-photo][data-crop]').forEach(input => {
    if (input.matches(':disabled')) return;
    const field = input.parentElement;
    const edit = document.createElement('button');
    edit.type = 'button'; edit.className = 'button photo-crop-edit'; edit.textContent = 'Atur Foto'; edit.hidden = true;
    input.after(edit);
    const state = {required:input.required,preview:field.querySelector('[data-preview]'),empty:field.querySelector('[data-preview-empty]'),edit,token:0};
    states.set(input,state);
    input.addEventListener('change', () => { if (input.files[0]) open(input,input.files[0]); });
    edit.addEventListener('click', () => { if (state.file) open(input,state.file,state.pose); });
  });
  window.TractorPartAdminI18n?.refresh();
  return {
    handles: input => states.has(input),
    prepare(form,data) {
      for (const input of form.querySelectorAll('[data-photo][data-crop]')) {
        const state = states.get(input);
        if (input.dataset.invalidPhoto === 'true' || (input.files[0] && !state?.blob)) {
          const error = new Error(translate('Atur foto dan pilih Gunakan Foto sebelum menyimpan.'));
          error.errors = {image:error.message}; throw error;
        }
        if (state?.blob) data.set(input.name,state.blob,'photo.webp');
      }
    },
    reset(form) {
      for (const input of form.querySelectorAll('[data-photo][data-crop]')) {
        const state = states.get(input); if (!state) continue;
        input.value = ''; input.required = state.required;
        state.file = state.blob = state.pose = null; state.edit.hidden = true;
        // Leave the saved preview visible until this page is replaced.
      }
    }
  };
})();
