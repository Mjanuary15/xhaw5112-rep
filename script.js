// Mobile navigation
const menuBtn = document.getElementById("menuBtn");
const mainNav = document.getElementById("mainNav");

if (menuBtn && mainNav) {
  menuBtn.addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });
}

// ---------- Formspree + validation helpers ----------
const FORMSPREE_URL = "https://formspree.io/f/mnppwgge";

// Accepts South African numbers: 0712345678, 071 234 5678, +27 71 234 5678, 27712345678
function isValidPhone(value) {
  const cleaned = value.replace(/[\s\-()]/g, "");
  return /^(?:\+?27|0)\d{9}$/.test(cleaned);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function getErrorEl(input) {
  let el = input.parentElement.querySelector(".error-msg");
  if (!el) {
    el = document.createElement("span");
    el.className = "error-msg";
    input.parentElement.appendChild(el);
  }
  return el;
}

function setError(input, message) {
  getErrorEl(input).textContent = message;
  input.classList.add("invalid");
}

function clearError(input) {
  getErrorEl(input).textContent = "";
  input.classList.remove("invalid");
}

function validateRequired(input, label) {
  if (!input.value.trim()) {
    setError(input, `Please enter your ${label}.`);
    return false;
  }
  clearError(input);
  return true;
}

function validateEmailField(input) {
  if (!input.value.trim()) {
    setError(input, "Please enter your email address.");
    return false;
  }
  if (!isValidEmail(input.value)) {
    setError(input, "Please enter a valid email address, e.g. you@example.com.");
    return false;
  }
  clearError(input);
  return true;
}

function validatePhoneField(input, required) {
  if (!input.value.trim()) {
    if (required) {
      setError(input, "Please enter your phone number.");
      return false;
    }
    clearError(input);
    return true;
  }
  if (!isValidPhone(input.value)) {
    setError(input, "Enter a valid SA phone number, e.g. 071 000 0000 or +27 71 000 0000.");
    return false;
  }
  clearError(input);
  return true;
}

function showStatus(type, message) {
  const status = document.getElementById("formStatus");
  if (!status) return;
  status.className = "form-status " + type;
  status.textContent = message;
}

async function sendToFormspree(form, extraFields = {}) {
  const data = new FormData(form);
  Object.entries(extraFields).forEach(([key, value]) => data.set(key, value));

  const response = await fetch(FORMSPREE_URL, {
    method: "POST",
    body: data,
    headers: { Accept: "application/json" }
  });

  if (response.ok) return;

  let message = "Something went wrong. Please try again.";
  try {
    const json = await response.json();
    if (json.errors && json.errors.length) {
      message = json.errors.map(e => e.message).join(", ");
    }
  } catch (e) { /* keep default message */ }
  throw new Error(message);
}

function attachLiveValidation(input, validator) {
  input.addEventListener("blur", validator);
  input.addEventListener("input", () => {
    if (input.classList.contains("invalid")) validator();
  });
}

async function handleSubmit(form, validators, extraFieldsFn, successMessage, onSuccess) {
  const status = document.getElementById("formStatus");
  if (status) status.className = "form-status";

  // Run every validator so all errors show at once
  const results = validators.map(fn => fn());
  if (results.includes(false)) {
    showStatus("error", "Please fix the highlighted fields and try again.");
    const firstInvalid = form.querySelector(".invalid");
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  try {
    await sendToFormspree(form, extraFieldsFn ? extraFieldsFn() : {});
    showStatus("success", successMessage);
    form.reset();
    if (onSuccess) onSuccess();
  } catch (err) {
    const offline = err instanceof TypeError;
    showStatus("error", offline
      ? "Could not reach the server. Please check your internet connection and try again."
      : err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// ---------- Contact form ----------
const contactForm = document.getElementById("contactForm");

if (contactForm) {
  const nameEl = document.getElementById("contactName");
  const emailEl = document.getElementById("contactEmail");
  const phoneEl = document.getElementById("contactPhone");
  const messageEl = document.getElementById("contactMessage");

  const vName = () => validateRequired(nameEl, "name");
  const vEmail = () => validateEmailField(emailEl);
  const vPhone = () => validatePhoneField(phoneEl, false);
  const vMessage = () => validateRequired(messageEl, "message");

  attachLiveValidation(nameEl, vName);
  attachLiveValidation(emailEl, vEmail);
  attachLiveValidation(phoneEl, vPhone);
  attachLiveValidation(messageEl, vMessage);

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSubmit(
      contactForm,
      [vName, vEmail, vPhone, vMessage],
      null,
      "Thank you! Your enquiry has been sent. We'll be in touch soon."
    );
  });
}

// ---------- Booking / quotation calculator ----------
const bookingForm = document.getElementById("bookingForm");
const checkboxes = document.querySelectorAll('input[type="checkbox"][data-price]');

function money(value) {
  return "R" + value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function updateQuote() {
  const selected = [...checkboxes].filter(box => box.checked);
  const subtotal = selected.reduce((sum, box) => sum + Number(box.dataset.price), 0);
  const count = selected.length;

  let discountRate = 0;
  if (count === 2) discountRate = 0.05;
  else if (count === 3) discountRate = 0.10;
  else if (count > 3) discountRate = 0.15;

  const discountAmount = subtotal * discountRate;
  const discountedAmount = subtotal - discountAmount;
  const vat = discountedAmount * 0.15;
  const total = discountedAmount + vat;

  const selectedItems = document.getElementById("selectedItems");
  const subtotalEl = document.getElementById("subtotal");
  const discountEl = document.getElementById("discount");
  const vatEl = document.getElementById("vat");
  const totalEl = document.getElementById("total");
  const message = document.getElementById("discountMessage");

  if (!selectedItems) return;

  if (selected.length === 0) {
    selectedItems.innerHTML = "<p>No bookings selected yet.</p>";
  } else {
    selectedItems.innerHTML = selected.map(box =>
      `<div class="selected-item"><span>${box.value}</span><strong>${money(Number(box.dataset.price))}</strong></div>`
    ).join("");
  }

  subtotalEl.textContent = money(subtotal);
  discountEl.textContent = "-" + money(discountAmount);
  vatEl.textContent = money(vat);
  totalEl.textContent = money(total);

  if (count === 0) message.textContent = "Select bookings to unlock discounts.";
  else if (count === 1) message.textContent = "Add 1 more booking to unlock 5% off.";
  else if (count === 2) message.textContent = "5% discount unlocked! Add one more for 10% off.";
  else if (count === 3) message.textContent = "10% discount unlocked! Add another for the maximum 15% off.";
  else message.textContent = "15% maximum discount unlocked!";
}

checkboxes.forEach(box => box.addEventListener("change", () => {
  updateQuote();
  const selectionError = document.getElementById("selectionError");
  if (selectionError && [...checkboxes].some(b => b.checked)) selectionError.textContent = "";
}));

if (bookingForm) {
  const nameEl = document.getElementById("name");
  const phoneEl = document.getElementById("phone");
  const emailEl = document.getElementById("email");
  const selectionError = document.getElementById("selectionError");

  const vName = () => validateRequired(nameEl, "full name");
  const vPhone = () => validatePhoneField(phoneEl, true);
  const vEmail = () => validateEmailField(emailEl);
  const vSelection = () => {
    const any = [...checkboxes].some(b => b.checked);
    selectionError.textContent = any ? "" : "Please select at least one package or experience.";
    return any;
  };

  attachLiveValidation(nameEl, vName);
  attachLiveValidation(phoneEl, vPhone);
  attachLiveValidation(emailEl, vEmail);

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSubmit(
      bookingForm,
      [vName, vPhone, vEmail, vSelection],
      () => {
        const selected = [...checkboxes].filter(box => box.checked);
        return {
          bookings: selected.map(b => `${b.value} (${money(Number(b.dataset.price))})`).join(", "),
          subtotal: document.getElementById("subtotal").textContent,
          discount: document.getElementById("discount").textContent,
          vat: document.getElementById("vat").textContent,
          total: document.getElementById("total").textContent
        };
      },
      "Thank you! Your booking request and quotation have been sent. We'll contact you to confirm.",
      () => updateQuote()
    );
  });

  const params = new URLSearchParams(window.location.search);
  const item = params.get("item");
  if (item) {
    const matching = [...checkboxes].find(box => box.value === item);
    if (matching) matching.checked = true;
    updateQuote();
  }
}
