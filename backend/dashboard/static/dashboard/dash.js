// REMAL dashboard: small enhancements on top of plain forms. Every page still works without this file.
(() => {
  const $ = (s, el = document) => el.querySelector(s)
  const $$ = (s, el = document) => [...el.querySelectorAll(s)]
  const csrf = () => document.cookie.match(/csrftoken=([^;]+)/)?.[1] || $('[name=csrfmiddlewaretoken]')?.value || ''

  function toast(text, error = false) {
    let box = $('.toasts')
    if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); document.body.append(box) }
    const t = document.createElement('div')
    t.className = `toast${error ? ' error' : ''}`
    t.textContent = text
    box.append(t)
    setTimeout(() => t.remove(), 5200)
  }

  // ------------------------------------------------ confirm before deleting
  $$('form[data-confirm]').forEach((f) => f.addEventListener('submit', (e) => { if (!confirm(f.dataset.confirm)) e.preventDefault() }))

  // ------------------------------------------------ filters apply as soon as they change
  $$('form[data-autosubmit] select').forEach((s) => s.addEventListener('change', () => s.form.submit()))

  // ------------------------------------------------ show / hide a product from the grid
  $$('form[data-toggle]').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault()
    const card = f.closest('.pitem'), btn = $('button', f)
    btn.disabled = true
    try {
      const res = await fetch(f.action, { method: 'POST', headers: { 'X-CSRFToken': csrf(), 'X-Requested-With': 'fetch' } })
      if (!res.ok) throw new Error(res.status)
      const { visible } = await res.json()
      card.classList.toggle('off', !visible)
      btn.title = visible ? 'إخفاء من الموقع' : 'إظهار في الموقع'
      btn.innerHTML = visible ? EYE : EYE_OFF
      const badges = $('.badges', card)
      $$('.badge', badges).filter((b) => b.textContent === 'مخفي').forEach((b) => b.remove())
      if (!visible) badges.insertAdjacentHTML('afterbegin', '<span class="badge">مخفي</span>')
      toast(visible ? 'أصبح المنتج ظاهراً في الموقع.' : 'أُخفي المنتج من الموقع.')
    } catch { toast('تعذّر الحفظ. تحقّق من الاتصال وحاول مجدداً.', true) }
    btn.disabled = false
  }))
  const svg = (d) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`
  const EYE = svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>')
  const EYE_OFF = svg('<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.700 9.700 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>')

  // ------------------------------------------------ language tabs
  $$('[data-langs]').forEach((box) => {
    const tabs = $$('[data-tab]', box), panes = $$('[data-pane]', box)
    tabs.forEach((b) => b.addEventListener('click', () => {
      tabs.forEach((x) => x.classList.toggle('on', x === b))
      panes.forEach((p) => p.classList.toggle('on', p.dataset.pane === b.dataset.tab))
      $('input, textarea', panes.find((p) => p.dataset.pane === b.dataset.tab))?.focus({ preventScroll: true })
    }))
    const marks = () => panes.forEach((p, i) => { $('.ok', tabs[i]).hidden = !$('input, textarea', p)?.value.trim() })
    box.addEventListener('input', marks)
    marks()
  })

  // ------------------------------------------------ unsaved changes
  $$('form[data-dirty]').forEach((form) => {
    const state = $('[data-state]', form)
    let dirty = false, sending = false
    const mark = () => {
      if (dirty) return
      dirty = true
      if (state) state.textContent = 'تغييرات غير محفوظة'
    }
    form.addEventListener('input', mark)
    form.addEventListener('change', mark)
    form.addEventListener('photos-changed', mark)
    form.addEventListener('submit', () => { sending = true })
    addEventListener('beforeunload', (e) => { if (dirty && !sending) e.preventDefault() })
  })

  // ------------------------------------------------ drag to reorder (mouse, or a long press on touch screens)
  function sortable(list, { item, handle, onEnd }) {
    let dragged = null, timer = 0, start = null, moved = false
    const begin = (el, e) => {
      dragged = el
      el.classList.add('dragging')
      list.setPointerCapture?.(e.pointerId)
      navigator.vibrate?.(10)
    }
    list.addEventListener('pointerdown', (e) => {
      const h = e.target.closest(handle), el = e.target.closest(item)
      if (!h || !el || e.target.closest('button') || e.button > 0) return
      start = { x: e.clientX, y: e.clientY, el, touch: e.pointerType !== 'mouse' }
      moved = false
      if (start.touch) timer = setTimeout(() => begin(el, e), 260)
    })
    list.addEventListener('pointermove', (e) => {
      if (!start) return
      const far = Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6
      if (!dragged) {
        if (start.touch && far) { clearTimeout(timer); start = null }  // the finger is scrolling the page
        else if (!start.touch && far) begin(start.el, e)
        return
      }
      e.preventDefault()
      moved = true
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(item)
      if (!over || over === dragged || over.parentNode !== list) return
      const items = $$(item, list)
      list.insertBefore(dragged, items.indexOf(dragged) < items.indexOf(over) ? over.nextSibling : over)
    })
    const end = () => {
      clearTimeout(timer)
      start = null
      if (!dragged) return
      dragged.classList.remove('dragging')
      dragged = null
      if (moved) onEnd()
    }
    list.addEventListener('pointerup', end)
    list.addEventListener('pointercancel', end)
    list.addEventListener('touchmove', (e) => { if (dragged) e.preventDefault() }, { passive: false })
    list.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }, true)
    list.addEventListener('dragstart', (e) => e.preventDefault())  // the browser's own image dragging
  }

  // brands and categories: the order is saved straight away
  $$('[data-sortable]').forEach((list) => sortable(list, {
    item: 'li', handle: '.grip',
    onEnd: async () => {
      try {
        const res = await fetch(list.dataset.sortable, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() },
          body: JSON.stringify({ ids: $$('li', list).map((li) => li.dataset.id) }),
        })
        if (!res.ok) throw new Error(res.status)
        toast('تم حفظ الترتيب.')
      } catch { toast('تعذّر حفظ الترتيب. حدّث الصفحة وحاول مجدداً.', true) }
    },
  }))

  // ------------------------------------------------ brand logo preview
  $$('[data-logo]').forEach((box) => {
    const input = $('input[type=file]', box), frame = $('.lg', box)
    input.addEventListener('change', () => {
      const f = input.files[0]
      if (f) frame.innerHTML = `<img src="${URL.createObjectURL(f)}" alt="">`
    })
  })

  // ------------------------------------------------ product photos and live preview
  const form = $('#product-form')
  if (!form) return
  const drop = $('[data-drop]', form), input = $('input[type=file]', drop), grid = $('[data-photos]', form)
  const files = new Map()  // key -> File, for photos picked on this visit
  let seq = 0
  const MAX = 15 * 1024 * 1024

  // Photos straight from a phone camera are large; shrink them here so they upload fast. The server re-encodes anyway.
  async function shrink(file) {
    const plain = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    if (plain && (file.size < 1.8 * 1024 * 1024 || file.type !== 'image/jpeg')) return file
    try {
      const img = await createImageBitmap(file, { imageOrientation: 'from-image' })
      const scale = Math.min(1, 2400 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * scale)
      c.height = Math.round(img.height * scale)
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
      const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9))
      if (!blob || (plain && blob.size >= file.size)) return file
      return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
    } catch { return plain ? file : null }
  }

  async function add(list) {
    for (const raw of list) {
      if (!raw.type.startsWith('image/') && !/\.(jpe?g|png|webp|heic)$/i.test(raw.name)) { toast(`${raw.name}: ليس صورة.`, true); continue }
      const f = await shrink(raw)
      if (!f) { toast(`${raw.name}: صيغة غير مدعومة، استخدم JPG أو PNG.`, true); continue }
      if (f.size > MAX) { toast(`${raw.name}: أكبر من 15 ميغابايت.`, true); continue }
      const key = String(++seq)
      files.set(key, f)
      const d = document.createElement('div')
      d.className = 'photo'
      d.dataset.new = key
      d.innerHTML = `<img src="${URL.createObjectURL(f)}" alt=""><button type="button" class="x" title="حذف الصورة">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button>`
      grid.append(d)
    }
    changed()
  }

  function changed(initial = false) {
    $$('.badge', grid).forEach((b) => b.remove())
    $('.photo', grid)?.insertAdjacentHTML('beforeend', '<span class="badge cp">الغلاف</span>')
    if (initial !== true) form.dispatchEvent(new Event('photos-changed'))
    preview()
  }

  input.addEventListener('change', () => { const picked = [...input.files]; input.value = ''; add(picked) })
  for (const el of [drop, grid]) {
    el.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); drop.classList.add('over') } })
    el.addEventListener('dragleave', () => drop.classList.remove('over'))
    el.addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); drop.classList.remove('over'); add(e.dataTransfer.files) })
  }
  grid.addEventListener('click', (e) => {
    const x = e.target.closest('.x')
    if (!x) return
    const photo = x.closest('.photo')
    if (photo.dataset.new) files.delete(photo.dataset.new)
    photo.remove()
    changed()
  })
  sortable(grid, { item: '.photo', handle: '.photo', onEnd: changed })
  changed(true)

  // what is sent: the photos in their order, and the new files in that same order
  form.addEventListener('submit', () => {
    const dt = new DataTransfer()
    const layout = $$('.photo', grid).map((p) => {
      if (p.dataset.id) return p.dataset.id
      dt.items.add(files.get(p.dataset.new))
      return `new-${dt.files.length - 1}`
    })
    input.files = dt.files
    form.elements.layout.value = layout.join(',')
    $$('.savebar .btn', form).forEach((b) => b.setAttribute('aria-busy', 'true'))
    const state = $('[data-state]', form)
    if (state) state.textContent = dt.files.length ? 'جارٍ رفع الصور والحفظ…' : 'جارٍ الحفظ…'
  })

  function preview() {
    const v = (id) => form.elements[id]?.value.trim() || ''
    const brand = $('input[name=brand]:checked', form)
    $('[data-pv-name]').textContent = v('name_ar') || 'اسم المنتج'
    $('#title').textContent = v('name_ar') || $('#title').dataset.empty || $('#title').textContent
    $('[data-pv-brand]').textContent = brand?.dataset.name || ''
    $('[data-pv-meta]').textContent = [v('family_ar'), v('size')].filter(Boolean).join(' · ')
    const cover = $('.photo img', grid), ph = $('[data-pv-ph]')
    if (cover) ph.innerHTML = `<img src="${cover.src}" alt="">`
    else ph.innerHTML = ''
  }
  $('#title').dataset.empty = $('#title').textContent
  form.addEventListener('input', preview)
  form.addEventListener('change', preview)
})()
