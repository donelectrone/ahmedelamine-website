/* =========================================
   CRUMBLEIVABLE — script.js
   Full rewrite: duplicates, real cookies, i18n, animation
   ========================================= */

// =========================================
// COOKIE DATA — real menu from owner
// =========================================
const COOKIES = [
  {
    name:  "the og",
    desc:  "classic chocolate chip cookie",
    price: 350,
    emoji: "🍪"
  },
  {
    name:  "rainbow chip",
    desc:  "m&ms cookie",
    price: 400,
    emoji: "🌈"
  },
  {
    name:  "kookinder",
    desc:  "kinder cookie",
    price: 400,
    emoji: "🍫"
  },
  {
    name:  "buenookie",
    desc:  "bueno cookie",
    price: 400,
    emoji: "🤎"
  },
  {
    name:  "cookulos",
    desc:  "lotus biscoff cookie",
    price: 400,
    emoji: "🧡"
  },
  {
    name:  "cookistachio",
    desc:  "pistachio cookie",
    price: 450,
    emoji: "💚"
  },
  {
    name:  "cookamissu",
    desc:  "tiramisu cookie",
    price: 400,
    emoji: "☕"
  },
  {
    name:  "oreookie",
    desc:  "oreo cookie",
    price: 400,
    emoji: "⚫"
  },
  {
    name:  "snookie",
    desc:  "salted caramel & peanuts",
    price: 350,
    emoji: "🥜"
  },
  {
    name:  "jumeirah cookie",
    desc:  "dubai chocolate cookie",
    price: 450,
    emoji: "✨"
  },
  {
    name:  "strawberry shortcookie",
    desc:  "strawberry and cream cookie",
    price: 450,
    emoji: "🍓"
  },
  {
    name:  "velvookie",
    desc:  "red velvet and cream cheese cookie",
    price: 450,
    emoji: "❤️"
  }
];

const DELIVERY_FEE = 300;
const BOX_SIZE = 3; // exact number of cookies per box — no more, no less

// =========================================
// STATE
// =========================================
// selected = [{index, qty}] — track which cookies + how many
let selected = {}; // key = cookie index, value = count
let selectedTotal = 0;

let cart = []; // [{cookies:[{name,desc,price,emoji,qty}], total}]

// =========================================
// I18N
// =========================================
const TRANSLATIONS = {
  en: {
    choose_lang: "choose your language",
    nav_build: "build a box",
    nav_cart: "cart",
    nav_order: "order",
    hero_badge: "✦ handcrafted in oran ✦",
    hero_cta: "build your box",
    hero_notice: "📅 orders placed today are ready for pickup tomorrow",
    stat_flavors: "flavors",
    stat_per_box: "per box",
    stat_homemade: "homemade",
    scroll_hint: "scroll to explore",
    builder_tag: "✦ the builder",
    builder_title: "curate your perfect box",
    builder_sub: "pick exactly 3 cookies per box — mix, match, or duplicate!",
    current_box: "your current box:",
    add_box_disabled: "select 3 cookies to continue",
    add_box_hint: "exactly 3 per box — because 1 is sad and 2 gets eaten too fast! 😄",
    cart_tag: "✦ your order",
    cart_title: "your boxes",
    cart_sub: "review what you've built before checking out.",
    cart_empty: "no boxes yet — start building above!",
    subtotal: "subtotal",
    add_delivery: "add delivery (+300 DA)",
    total: "total",
    proceed_checkout: "proceed to checkout",
    checkout_tag: "✦ almost there",
    checkout_title: "complete your order",
    checkout_sub: "fill in your details and we'll confirm via whatsapp.",
    checkout_no_cart: "add at least one box before checking out.",
    netlify_note: "📧 your order goes directly to crumbleivable. we'll reach out via whatsapp within the hour to confirm!",
    label_name: "full name *",
    label_phone: "phone number *",
    label_address: "address *",
    label_delivery_method: "delivery method *",
    delivery_opt: "delivery",
    delivery_desc: "we come to you",
    pickup_opt: "pickup",
    pickup_desc: "come grab your box",
    label_notes: "notes",
    optional: "(optional)",
    submit_btn: "place my order 🍪",
    success_title: "order received!",
    success_body: "thank you! we'll whatsapp you within the hour to confirm your delicious order.",
    new_order_btn: "start a new order",
    box_word: "box",
    selection_label: (n, max) => `${n}/${max} selected`,
    add_btn_ready: () => `add this box to cart →`,
    add_btn_need_more: (remaining) => `pick ${remaining} more cookie${remaining > 1 ? 's' : ''}`,
    toast_box_added: (n) => `box ${n} added! 🎉`,
    toast_box_removed: "box removed.",
    toast_need_more: () => `pick exactly 3 cookies first!`,
    toast_max_reached: "a box holds exactly 3 cookies 🍪",
  },
  fr: {
    choose_lang: "choisissez votre langue",
    nav_build: "créer une boîte",
    nav_cart: "panier",
    nav_order: "commander",
    hero_badge: "✦ fait maison à oran ✦",
    hero_cta: "créer ma boîte",
    hero_notice: "📅 les commandes du jour sont prêtes le lendemain",
    stat_flavors: "saveurs",
    stat_per_box: "par boîte",
    stat_homemade: "fait maison",
    scroll_hint: "défiler pour explorer",
    builder_tag: "✦ le configurateur",
    builder_title: "composez votre boîte idéale",
    builder_sub: "choisissez exactement 3 cookies — mix, assortiment, ou doublons !",
    current_box: "votre boîte en cours :",
    add_box_disabled: "sélectionnez 3 cookies pour continuer",
    add_box_hint: "exactement 3 par boîte — parce que 1 c'est triste et 2 ça se mange trop vite ! 😄",
    cart_tag: "✦ votre commande",
    cart_title: "vos boîtes",
    cart_sub: "vérifiez ce que vous avez créé avant de commander.",
    cart_empty: "aucune boîte — commencez à créer ci-dessus !",
    subtotal: "sous-total",
    add_delivery: "ajouter la livraison (+300 DA)",
    total: "total",
    proceed_checkout: "passer à la commande",
    checkout_tag: "✦ presque là",
    checkout_title: "finaliser la commande",
    checkout_sub: "remplissez vos informations et on vous confirme par whatsapp.",
    checkout_no_cart: "ajoutez au moins une boîte avant de commander.",
    netlify_note: "📧 votre commande est envoyée directement à crumbleivable. on vous contacte via whatsapp dans l'heure !",
    label_name: "nom complet *",
    label_phone: "numéro de téléphone *",
    label_address: "adresse *",
    label_delivery_method: "mode de livraison *",
    delivery_opt: "livraison",
    delivery_desc: "on vient chez vous",
    pickup_opt: "récupération",
    pickup_desc: "venez chercher votre boîte",
    label_notes: "notes",
    optional: "(facultatif)",
    submit_btn: "passer ma commande 🍪",
    success_title: "commande reçue !",
    success_body: "merci ! on vous contacte via whatsapp dans l'heure pour confirmer.",
    new_order_btn: "nouvelle commande",
    box_word: "boîte",
    selection_label: (n, max) => `${n}/${max} sélectionnés`,
    add_btn_ready: () => `ajouter cette boîte au panier →`,
    add_btn_need_more: (remaining) => `choisissez encore ${remaining} cookie${remaining > 1 ? 's' : ''}`,
    toast_box_added: (n) => `boîte ${n} ajoutée ! 🎉`,
    toast_box_removed: "boîte supprimée.",
    toast_need_more: () => `choisissez exactement 3 cookies d'abord !`,
    toast_max_reached: "une boîte contient exactement 3 cookies 🍪",
  },
  ar: {
    choose_lang: "اختر لغتك",
    nav_build: "شكّل علبتك", // Build your box
    nav_cart: "السلة",
    nav_order: "الطلب",
    hero_badge: "✦ صُنع بحب في وهران ✦", // Handcrafted with love in Oran
    hero_cta: "شكّل علبتك", // Build your box
    hero_notice: "📅 الطلبات المؤكدة اليوم، جاهزة للاستلام غداً",
    stat_flavors: "نكهة",
    stat_per_box: "في العلبة", // Per box (using Oulba)
    stat_homemade: "صنع منزلي",
    scroll_hint: "اسحب لاكتشاف المزيد",
    builder_tag: "✦ التشكيلة",
    builder_title: "اصنع علبتك المثالية",
    builder_sub: "اختر 3 حبات كوكيز بالضبط للعلبة — شكّل، نوّع، أو ضاعف نكهتك المفضلة!",
    current_box: "علبتك الحالية:",
    add_box_disabled: "اختر 3 حبات للمتابعة",
    add_box_hint: "بالضبط 3 حبات في العلبة — لأن حبة وحدة ما تكفيش، وزوج يكملو بالخف! 😄", // Algerian touch: "Ma tekfish", "Yekemlou bel khaf"
    cart_tag: "✦ طلبيتك",
    cart_title: "علبك", // Your boxes
    cart_sub: "راجع تشكيلتك قبل تأكيد الطلب.",
    cart_empty: "السلة فارغة — ابدأ بتشكيل علبتك الفوق!",
    subtotal: "المجموع الفرعي",
    add_delivery: "إضافة خدمة التوصيل (+300 دج)",
    total: "المجموع الإجمالي",
    proceed_checkout: "متابعة الطلب",
    checkout_tag: "✦ خطوة أخيرة",
    checkout_title: "تأكيد الطلبية",
    checkout_sub: "أدخل معلوماتك وراح نأكدو معاك في الواتساب.",
    checkout_no_cart: "أضف علبة واحدة على الأقل قبل الطلب.",
    netlify_note: "📧 طلبيتك توصلنا مباشرة. راح نتواصلو معاك في الواتساب في أقل من ساعة للتأكيد!",
    label_name: "الاسم واللقب *",
    label_phone: "رقم الهاتف (واتساب) *", // Specify WhatsApp
    label_address: "العنوان بالتفصيل *",
    label_delivery_method: "طريقة الاستلام *",
    delivery_opt: "توصيل",
    delivery_desc: "نجيبوها حتى لعندك", // We bring it to you
    pickup_opt: "استلام",
    pickup_desc: "أرواح تدي علبتك", // Come get your box
    label_notes: "ملاحظات",
    optional: "(اختياري)",
    submit_btn: "تأكيد الطلبية 🍪",
    success_title: "وصلتنا طلبيتك!",
    success_body: "يعطيك الصحة! راح نبعثولك ميساج في الواتساب في أقرب وقت باش نأكدو الطلبية.",
    new_order_btn: "طلب جديد",
    box_word: "علبة", // Box
    selection_label: (n, max) => `تم اختيار ${n} من ${max}`,
    add_btn_ready: () => `أضف هذه العلبة للسلة ←`, // Arrow direction swapped for RTL
    add_btn_need_more: (remaining) => `خصك تزيد ${remaining} حبات كوكيز`, // Algerian touch: "Khassak tzid"
    toast_box_added: (n) => `تمت إضافة العلبة ${n}! 🎉`,
    toast_box_removed: "تم حذف العلبة.",
    toast_need_more: () => `لازم تختار 3 حبات كوكيز بالضبط!`,
    toast_max_reached: "العلبة ترفد 3 حبات كوكيز بالضبط 🍪", // Algerian touch: "Terfed"
  }
};

let currentLang = 'en';

function t(key, ...args) {
  const val = TRANSLATIONS[currentLang]?.[key] ?? TRANSLATIONS.en[key];
  return typeof val === 'function' ? val(...args) : (val ?? key);
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val) el.textContent = val;
  });
  // RTL for Arabic
  document.body.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
  // Update dynamic text
  updateSelectionUI();
  updateAddBoxBtn();
}

// =========================================
// COOKIE BITE HERO ANIMATION — loops forever
// Sequence per loop:
//   0.0s  — full cookie visible, pause
//   1.2s  — wobble (bite happens)
//   1.7s  — switch to bitten image
//   2.2s  — text letters appear one by one (shaky)
//   4.5s  — hold completed name
//   5.5s  — fade everything out, reset, repeat
// =========================================
function runHeroAnimation() {
  const full         = document.getElementById('cookieFull');
  const bitten       = document.getElementById('cookieBitten');
  const logoTextAnim = document.getElementById('logoTextAnim');
  const letters      = logoTextAnim ? logoTextAnim.querySelectorAll('.logo-letter') : [];

  if (!full || !bitten || !logoTextAnim) return;

  function resetState() {
    // Reset images
    full.classList.remove('hidden', 'wobble');
    bitten.classList.add('hidden');
    // Reset letters — remove class so animation can be re-added
    letters.forEach(l => {
      l.classList.remove('shake-in');
      l.style.opacity = '0';
    });
    logoTextAnim.classList.add('hidden');
	logoTextAnim.style.opacity = '0';
	logoTextAnim.style.transition = '';
	logoTextAnim.style.visibility = 'hidden';
  }

  function runOneLoop() {
    resetState();

    // Step 1: Show full cookie (already visible after reset) — wait 1.2s
    setTimeout(() => {
      full.classList.add('wobble');
    }, 1200);

    // Step 2: Switch to bitten
    setTimeout(() => {
      full.classList.add('hidden');
      bitten.classList.remove('hidden');
    }, 1700);

    // Step 3: Reveal text letter by letter with shaky animation
    setTimeout(() => {
      logoTextAnim.style.visibility = 'visible';
      logoTextAnim.style.opacity = '1';
      logoTextAnim.classList.remove('hidden');
      // Force reflow per letter so CSS animation re-fires each loop
      letters.forEach(l => {
        l.classList.remove('shake-in');
        void l.offsetWidth; // triggers reflow after class removal
        l.classList.add('shake-in');
      });
    }, 2200);

    // Step 4: After all letters settle, hold for a moment then fade out
    // 13 letters × 80ms delay + ~450ms animation ≈ 1490ms total reveal
    // Hold 1s after last letter = 2200 + 1490 + 1000 = 4690ms → start fade at ~4800ms
    setTimeout(() => {
      logoTextAnim.style.transition = 'opacity 0.5s ease';
      logoTextAnim.style.opacity = '0';
    }, 4800);

    // Step 5: Full fade — restart loop after 5.5s total
    setTimeout(() => {
      runOneLoop();
    }, 5600);
  }

  runOneLoop();
}

// =========================================
// INIT
// =========================================
document.addEventListener('DOMContentLoaded', () => {
  loadCart();
  renderCookieGrid();
  renderCart();
  bindEvents();
  bindLangButtons();
  runHeroAnimation();
  updateSelectionUI();
  updateAddBoxBtn();
});

// =========================================
// LANGUAGE
// =========================================
function bindLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentLang = btn.dataset.lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyTranslations();
      renderCookieGrid();
      renderCart();
    });
  });
}

// =========================================
// SELECTION — supports duplicates
// =========================================
function getSelectedTotal() {
  return Object.values(selected).reduce((s, v) => s + v, 0);
}

function addOne(index) {
  if (getSelectedTotal() >= BOX_SIZE) {
    showToast(t('toast_max_reached'), 'error');
    return;
  }
  selected[index] = (selected[index] || 0) + 1;
  updateSelectionUI();
  updatePills();
  updateAddBoxBtn();
  renderCookieGrid();
}

function removeOne(index) {
  if (!selected[index]) return;
  selected[index]--;
  if (selected[index] <= 0) delete selected[index];
  updateSelectionUI();
  updatePills();
  updateAddBoxBtn();
  renderCookieGrid();
}

function updateSelectionUI() {
  const n = getSelectedTotal();
  const pct = Math.min((n / BOX_SIZE) * 100, 100);
  document.getElementById('selectionBarFill').style.width = pct + '%';
  document.getElementById('selectionText').textContent = t('selection_label', n, BOX_SIZE);
}

function updateAddBoxBtn() {
  const n = getSelectedTotal();
  const btn = document.getElementById('addBoxBtn');
  const label = document.getElementById('addBoxLabel');
  if (n === BOX_SIZE) {
    btn.disabled = false;
    label.textContent = t('add_btn_ready');
  } else {
    btn.disabled = true;
    label.textContent = n === 0
      ? t('add_box_disabled')
      : t('add_btn_need_more', BOX_SIZE - n);
  }
}

function updatePills() {
  const wrap = document.getElementById('selectedPillsWrap');
  const pills = document.getElementById('selectedPills');
  const total = getSelectedTotal();

  if (total === 0) {
    wrap.style.display = 'none';
    pills.innerHTML = '';
    return;
  }
  wrap.style.display = 'block';
  pills.innerHTML = Object.entries(selected).map(([idx, qty]) => {
    const c = COOKIES[idx];
    return `<div class="pill">
      ${c.emoji} ${c.name} ${qty > 1 ? `×${qty}` : ''}
      <button class="pill-remove" data-idx="${idx}" title="remove">×</button>
    </div>`;
  }).join('');

  pills.querySelectorAll('.pill-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeOne(+btn.dataset.idx);
    });
  });
}

// =========================================
// COOKIE GRID
// =========================================
function renderCookieGrid() {
  const grid = document.getElementById('cookieGrid');
  grid.innerHTML = COOKIES.map((c, i) => {
    const qty = selected[i] || 0;
    const isSelected = qty > 0;
    return `
    <div
      class="cookie-card${isSelected ? ' selected' : ''}"
      data-index="${i}"
      role="group"
      aria-label="${c.name}"
    >
      <div class="cookie-img-wrap">
        <span class="cookie-emoji-big">${c.emoji}</span>
      </div>
      <div class="cookie-count-badge">${qty}</div>
      <div class="cookie-qty-controls">
        <button class="qty-btn qty-minus" data-index="${i}" aria-label="remove one ${c.name}">−</button>
        <span class="qty-display">${qty}</span>
        <button class="qty-btn qty-plus" data-index="${i}" aria-label="add one ${c.name}">+</button>
      </div>
      <div class="cookie-info">
        <div class="cookie-name">${c.name}</div>
        <div class="cookie-desc">${c.desc}</div>
        <div class="cookie-price">${c.price} DA</div>
      </div>
    </div>`;
  }).join('');

  // Bind controls
  grid.querySelectorAll('.qty-plus').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); addOne(+btn.dataset.index); });
  });
  grid.querySelectorAll('.qty-minus').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); removeOne(+btn.dataset.index); });
  });
  // Clicking card body adds one
  grid.querySelectorAll('.cookie-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.qty-btn')) return;
      addOne(+card.dataset.index);
    });
  });
}

// =========================================
// CART
// =========================================
function addBox() {
  const total = getSelectedTotal();
  if (total !== BOX_SIZE) {
    showToast(t('toast_need_more'), 'error');
    return;
  }

  const cookies = Object.entries(selected).map(([idx, qty]) => ({
    ...COOKIES[idx],
    qty
  }));
  const price = cookies.reduce((s, c) => s + c.price * c.qty, 0);
  cart.push({ cookies, total: price });
  saveCart();

  selected = {};
  updateSelectionUI();
  updatePills();
  updateAddBoxBtn();
  renderCookieGrid();
  renderCart();

  showToast(t('toast_box_added', cart.length), 'success');
  setTimeout(() => {
    document.getElementById('cart').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 300);
}

function removeBox(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
  showToast(t('toast_box_removed'));
}

function renderCart() {
  const cartEmpty   = document.getElementById('cartEmpty');
  const cartBoxes   = document.getElementById('cartBoxes');
  const cartSummary = document.getElementById('cartSummary');
  const noCart      = document.getElementById('checkoutNoCart');
  const chkForm     = document.getElementById('checkoutForm');

  if (cart.length === 0) {
    cartEmpty.classList.remove('hidden');
    cartBoxes.innerHTML = '';
    cartSummary.classList.add('hidden');
    noCart.classList.remove('hidden');
    chkForm.classList.add('hidden');
    return;
  }

  cartEmpty.classList.add('hidden');
  cartSummary.classList.remove('hidden');
  noCart.classList.add('hidden');
  chkForm.classList.remove('hidden');

  cartBoxes.innerHTML = cart.map((box, bi) => `
    <div class="cart-box">
      <div class="cart-box-left">
        <div class="cart-box-title">
          🍪 ${t('box_word')} ${bi + 1}
          <span class="box-badge">${box.total} DA</span>
        </div>
        <ul class="cart-cookie-list">
          ${box.cookies.map(c => `
            <li class="cart-cookie-item">
              <span>${c.emoji} ${c.name}${c.qty > 1 ? ` ×${c.qty}` : ''}</span>
              <span class="c-price">${c.price * c.qty} DA</span>
            </li>
          `).join('')}
        </ul>
      </div>
      <button class="remove-box-btn" data-index="${bi}" aria-label="remove box ${bi+1}" title="remove">✕</button>
    </div>
  `).join('');

  cartBoxes.querySelectorAll('.remove-box-btn').forEach(btn => {
    btn.addEventListener('click', () => removeBox(+btn.dataset.index));
  });

  updateTotals();
  updateFormPreview();
}

function updateTotals() {
  const subtotal = cart.reduce((s, b) => s + b.total, 0);
  const delivery = document.getElementById('deliveryToggle').checked ? DELIVERY_FEE : 0;
  const total = subtotal + delivery;
  document.getElementById('subtotalDisplay').textContent = `${subtotal} DA`;
  document.getElementById('deliveryDisplay').textContent = delivery ? `+${delivery} DA` : '0 DA';
  document.getElementById('totalDisplay').textContent = `${total} DA`;
}

// =========================================
// ORDER SUMMARY
// =========================================
function generateOrderSummary() {
  const delivery = document.getElementById('deliveryToggle').checked ? DELIVERY_FEE : 0;
  const subtotal = cart.reduce((s, b) => s + b.total, 0);
  const total = subtotal + delivery;
  const method = document.querySelector('input[name="delivery-method"]:checked')?.value || 'pickup';

  const boxLines = cart.map((box, bi) => {
    const items = box.cookies.map(c =>
      `${c.name}${c.qty > 1 ? ` x${c.qty}` : ''} (${c.price * c.qty} DA)`
    ).join(', ');
    return `Box ${bi+1}: ${items}`;
  }).join(' | ');

  return `${boxLines} | Delivery: ${delivery > 0 ? delivery + ' DA' : 'No'} | Method: ${method} | Subtotal: ${subtotal} DA | TOTAL: ${total} DA`;
}

function updateFormPreview() {
  const preview = document.getElementById('formOrderPreview');
  if (!preview || cart.length === 0) return;

  const delivery = document.getElementById('deliveryToggle').checked ? DELIVERY_FEE : 0;
  const subtotal = cart.reduce((s, b) => s + b.total, 0);
  const total = subtotal + delivery;

  const boxLines = cart.map((box, bi) => {
    const items = box.cookies.map(c =>
      `${c.emoji} ${c.name}${c.qty > 1 ? ` ×${c.qty}` : ''} (${c.price * c.qty} DA)`
    ).join(', ');
    return `<div><strong>${t('box_word')} ${bi+1}:</strong> ${items}</div>`;
  }).join('');

  preview.innerHTML = `
    <div style="margin-bottom:8px;font-weight:800;font-size:.78rem;color:var(--accent);text-transform:uppercase;letter-spacing:.08em;">order summary</div>
    ${boxLines}
    ${delivery ? `<div>🚚 delivery fee: +${delivery} DA</div>` : ''}
    <div class="preview-total">total: ${total} DA</div>
  `;
}

// =========================================
// PERSIST
// =========================================
function saveCart() {
  try { localStorage.setItem('crumbleivable_cart', JSON.stringify(cart)); } catch {}
}
function loadCart() {
  try {
    const s = localStorage.getItem('crumbleivable_cart');
    if (s) cart = JSON.parse(s);
  } catch {}
}

// =========================================
// EVENTS
// =========================================
function bindEvents() {
  document.getElementById('addBoxBtn').addEventListener('click', addBox);

  document.getElementById('deliveryToggle').addEventListener('change', () => {
    updateTotals();
    updateFormPreview();
  });

  document.querySelectorAll('input[name="delivery-method"]').forEach(r => {
    r.addEventListener('change', updateFormPreview);
  });

  // ---- FORM SUBMIT ----
  // ⚠️  WHY ORDERS WERE FAILING:
  // The previous version caught ALL errors and silently showed success.
  // On local/non-Netlify environments the fetch to "/" fails (404).
  // Fix: we properly POST as URLSearchParams to "/" — Netlify intercepts this.
  // On non-Netlify (local preview), we show a clear dev notice instead of fake success.
  const form = document.getElementById('orderForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (cart.length === 0) {
        showToast(t('toast_need_more', MIN_BOX), 'error');
        return;
      }

      const name    = document.getElementById('customerName').value.trim();
      const phone   = document.getElementById('customerPhone').value.trim();
      const address = document.getElementById('customerAddress').value.trim();

      if (!name || !phone || !address) {
        showToast('please fill in all required fields ✏️', 'error');
        return;
      }

      // Inject full order summary before submit
      document.getElementById('orderSummaryInput').value = generateOrderSummary();

      const submitBtn = document.getElementById('submitBtn');
      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'sending...';

      try {
        const formData = new FormData(form);
        const body = new URLSearchParams(formData).toString();

        const res = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body
        });

        if (res.ok) {
          showSuccess();
        } else {
          // Non-200: likely local dev (no Netlify), inform user
          submitBtn.disabled = false;
          submitBtn.querySelector('span').textContent = t('submit_btn');
          showToast('⚠️ deploy to netlify for forms to work — or contact us directly!', 'error');
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.querySelector('span').textContent = t('submit_btn');
        showToast('⚠️ network error — please deploy to netlify!', 'error');
      }
    });
  }

  // New order
  const newOrderBtn = document.getElementById('newOrderBtn');
  if (newOrderBtn) {
    newOrderBtn.addEventListener('click', () => {
      selected = {};
      cart = [];
      saveCart();
      document.getElementById('successMessage').classList.add('hidden');
      document.getElementById('orderForm').classList.remove('hidden');
      document.getElementById('orderForm').reset();
      updateSelectionUI();
      updatePills();
      updateAddBoxBtn();
      renderCookieGrid();
      renderCart();
      document.getElementById('home').scrollIntoView({ behavior: 'smooth' });
    });
  }
}

function generateOrderNumber() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const key = `crumbleivable_order_counter_${yy}${mm}${dd}`;
  const count = (parseInt(localStorage.getItem(key) || '0') + 1);
  localStorage.setItem(key, count);
  return `${yy}${mm}${dd}${String(count).padStart(4, '0')}`;
}

function showSuccess() {
  const orderNumber = generateOrderNumber();
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();
  const method = document.querySelector('input[name="delivery-method"]:checked')?.value || 'pickup';
  const notes = document.getElementById('customerNotes').value.trim();
  const delivery = document.getElementById('deliveryToggle').checked ? DELIVERY_FEE : 0;
  const subtotal = cart.reduce((s, b) => s + b.total, 0);
  const total = subtotal + delivery;

  // Build a human-readable order breakdown for WhatsApp
  const boxLines = cart.map((box, bi) =>
    `📦 box ${bi + 1}: ` + box.cookies.map(c =>
      `${c.name}${c.qty > 1 ? ` ×${c.qty}` : ''} (${c.price * c.qty} DA)`
    ).join(', ')
  ).join('\n');

  const waText = encodeURIComponent(
    `🍪 *crumbleivable — order #${orderNumber}*\n\n` +
    `👤 *name:* ${name}\n` +
    `📞 *phone:* ${phone}\n` +
    `📍 *address:* ${address}\n` +
    `🚗 *method:* ${method}\n` +
    (notes ? `📝 *notes:* ${notes}\n` : '') +
    `\n${boxLines}\n\n` +
    (delivery ? `🚚 *delivery fee:* ${delivery} DA\n` : '') +
    `💰 *total: ${total} DA*\n\n` +
    `_sent via crumbleivable.com_`
  );

  const bakerPhone = '213668994400'; // ← replace with real number
  const waUrl = `https://wa.me/${bakerPhone}?text=${waText}`;

  // Inject summary into hidden field before Netlify already submitted,
  // but keep a copy here too just in case
  document.getElementById('orderSummaryInput').value = generateOrderSummary();

  // Clear cart
  cart = [];
  saveCart();

  // Show success screen
  document.getElementById('orderForm').classList.add('hidden');
  document.getElementById('successMessage').classList.remove('hidden');

  // Open WhatsApp after short delay so user sees the success screen first
  setTimeout(() => window.open(waUrl, '_blank'), 800);
}

// =========================================
// TOAST
// =========================================
let toastTimer;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3200);
}
