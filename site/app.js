(function () {
  "use strict";

  const config = window.EVENT_CONFIG || {};
  const storageKey = "birthdayFashionParty:rsvps";
  const latestResponseKey = "birthdayFashionParty:latestResponseId";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function applyConfig() {
    $$("[data-config]").forEach((element) => {
      const key = element.dataset.config;
      if (Object.prototype.hasOwnProperty.call(config, key)) {
        element.textContent = config[key] || "";
      }
    });
    document.title = `${config.eventTitle || "House of Pochi"} | ${config.birthdayPerson || "Confirmación"}`;
    $("#year").textContent = new Date().getFullYear();
  }

  function getResponses() {
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || [];
    } catch (error) {
      return [];
    }
  }

  function saveResponses(responses) {
    localStorage.setItem(storageKey, JSON.stringify(responses));
  }

  async function fetchResponses(passcode) {
    const url = passcode ? `/api/rsvps?passcode=${encodeURIComponent(passcode)}` : "/api/rsvps";
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("No se pudieron cargar las inscripciones.");
    const payload = await response.json();
    return payload.responses || [];
  }

  async function saveResponseToApi(response) {
    const apiResponse = await fetch("/api/rsvps", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(response)
    });
    if (!apiResponse.ok) throw new Error("No se pudo guardar la inscripcion.");
    const payload = await apiResponse.json();
    return payload.response;
  }

  async function getLatestResponse() {
    const latestId = localStorage.getItem(latestResponseKey);
    if (!latestId) return null;
    try {
      const responses = await fetchResponses(config.adminPasscode);
      return responses.find((response) => response.id === latestId) || null;
    } catch (error) {
      return getResponses().find((response) => response.id === latestId) || null;
    }
  }

  function updateCountdown() {
    const countdown = $("#countdown");
    if (!countdown) return;

    const target = new Date(config.eventDateISO || config.date);
    if (Number.isNaN(target.getTime())) {
      countdown.textContent = "COUNTDOWN DATE NOT CONFIGURED.";
      return;
    }

    const diff = target.getTime() - Date.now();
    if (diff <= 0) {
      countdown.textContent = "THE ISSUE HAS CLOSED.";
      countdown.classList.add("closed");
      return;
    }

    const seconds = Math.floor(diff / 1000);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    const values = {
      days,
      hours,
      minutes,
      seconds: remainingSeconds
    };

    Object.entries(values).forEach(([key, value]) => {
      const node = $(`[data-time="${key}"]`, countdown);
      if (node) node.textContent = String(value).padStart(2, "0");
    });
  }

  function setError(name, message) {
    const target = $(`[data-error-for="${name}"]`);
    if (target) target.textContent = message || "";
  }

  function clearErrors(form) {
    $$(".error", form).forEach((node) => {
      node.textContent = "";
    });
  }

  function validateForm(form) {
    clearErrors(form);
    let valid = true;
    const data = new FormData(form);
    const requiredText = ["fullName", "email", "phone", "costume"];

    requiredText.forEach((name) => {
      const value = String(data.get(name) || "").trim();
      if (!value) {
        setError(name, "Este campo es obligatorio.");
        valid = false;
      }
    });

    const email = String(data.get("email") || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("email", "Ingresa un correo válido.");
      valid = false;
    }

    const guests = Number(data.get("guests"));
    if (!Number.isInteger(guests) || guests < 0) {
      setError("guests", "Usa un número igual o mayor a cero.");
      valid = false;
    }

    if (!data.get("attendance")) {
      setError("attendance", "Selecciona una opción.");
      valid = false;
    }

    if (!data.get("dressAgreement")) {
      setError("dressAgreement", "Debes aceptar esta condición para continuar.");
      valid = false;
    }

    return valid;
  }

  function formToResponse(form, existing) {
    const data = new FormData(form);
    return {
      id: existing ? existing.id : `rsvp-${Date.now()}`,
      fullName: String(data.get("fullName") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      attendance: String(data.get("attendance") || ""),
      costume: String(data.get("costume") || "").trim(),
      guests: Number(data.get("guests") || 0),
      comments: String(data.get("comments") || "").trim(),
      dressAgreement: Boolean(data.get("dressAgreement")),
      updatedAt: new Date().toISOString()
    };
  }

  function fillForm(form, response) {
    if (!response) return;
    form.fullName.value = response.fullName || "";
    form.email.value = response.email || "";
    form.phone.value = response.phone || "";
    form.costume.value = response.costume || "";
    form.guests.value = response.guests || 0;
    form.comments.value = response.comments || "";
    form.dressAgreement.checked = Boolean(response.dressAgreement);
    $$('input[name="attendance"]', form).forEach((input) => {
      input.checked = input.value === response.attendance;
    });
    $("#edit-response").hidden = false;
  }

  function showConfirmation(response) {
    const summary = $("#confirmation-summary");
    summary.innerHTML = "";
    const lines = [
      ["Nombre", response.fullName],
      ["Asistencia", response.attendance],
      ["Disfraz", response.costume],
      ["Acompañantes", String(response.guests)]
    ];

    lines.forEach(([label, value]) => {
      const p = document.createElement("p");
      p.textContent = `${label}: ${value}`;
      summary.appendChild(p);
    });

    const dialog = $("#confirmation");
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      alert("Tu nombre está en la lista.");
    }
  }

  async function handleRsvp() {
    const form = $("#rsvp-form");
    if (!form) return;

    fillForm(form, await getLatestResponse());

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!validateForm(form)) return;

      const response = formToResponse(form, await getLatestResponse());
      let savedResponse = response;
      try {
        savedResponse = await saveResponseToApi(response);
      } catch (error) {
        const responses = getResponses();
        const index = responses.findIndex((item) => item.id === response.id);
        if (index >= 0) {
          responses[index] = response;
        } else {
          responses.push(response);
        }
        saveResponses(responses);
      }
      localStorage.setItem(latestResponseKey, savedResponse.id);
      $("#edit-response").hidden = false;
      showConfirmation(savedResponse);
    });

    $("#edit-response").addEventListener("click", () => {
      form.scrollIntoView({ behavior: "smooth", block: "center" });
      form.fullName.focus();
    });

    $("#close-confirmation").addEventListener("click", () => {
      $("#confirmation").close();
    });
  }

  function handleAdmin() {
    const form = $("#admin-form");
    const output = $("#admin-output");
    if (!form || !output) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const passcode = String(new FormData(form).get("admin-passcode") || "");
      if (passcode !== config.adminPasscode) {
        output.textContent = "Clave incorrecta.";
        return;
      }

      try {
        const responses = await fetchResponses(passcode);
        if (!responses.length) {
          output.textContent = "No hay inscripciones guardadas en el contenedor.";
          return;
        }
        output.textContent = JSON.stringify(responses, null, 2);
      } catch (error) {
        const responses = getResponses();
        if (!responses.length) {
          output.textContent = "No hay inscripciones en la API ni en este navegador.";
          return;
        }
        output.textContent = `API no disponible. Fallback local del navegador:\n${JSON.stringify(responses, null, 2)}`;
        return;
      }
    });
  }

  function handleReveal() {
    const revealItems = $$(".reveal, .reveal-text");
    if (!("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  function handleCursor() {
    const cursor = $(".cursor-dot");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!cursor || !finePointer) return;

    window.addEventListener("pointermove", (event) => {
      cursor.style.left = `${event.clientX}px`;
      cursor.style.top = `${event.clientY}px`;
      cursor.style.opacity = "1";
    });

    $$("a, button, input, textarea").forEach((element) => {
      element.addEventListener("pointerenter", () => {
        cursor.style.width = "34px";
        cursor.style.height = "34px";
      });
      element.addEventListener("pointerleave", () => {
        cursor.style.width = "18px";
        cursor.style.height = "18px";
      });
    });
  }

  function handleParallax() {
    const art = $(".cover-art");
    const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!art || !motionAllowed) return;

    window.addEventListener(
      "scroll",
      () => {
        const offset = Math.min(window.scrollY * 0.08, 54);
        art.style.transform = `translateY(${offset}px)`;
      },
      { passive: true }
    );
  }

  function handleGiftPopup() {
    const dialog = $("#gift-popup");
    const closeButton = $("#close-gift-popup");
    const acceptButton = $("#accept-gift-popup");
    const storageKey = "birthdayFashionParty:giftPopupSeen";
    if (!dialog || !closeButton || !acceptButton) return;

    const closePopup = () => {
      sessionStorage.setItem(storageKey, "true");
      if (dialog.open) dialog.close();
    };

    closeButton.addEventListener("click", closePopup);
    acceptButton.addEventListener("click", closePopup);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closePopup();
    });

    if (sessionStorage.getItem(storageKey) === "true") return;

    window.setTimeout(() => {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    }, 650);
  }

  document.addEventListener("DOMContentLoaded", () => {
    applyConfig();
    updateCountdown();
    setInterval(updateCountdown, 1000);
    handleRsvp();
    handleAdmin();
    handleReveal();
    handleCursor();
    handleParallax();
    handleGiftPopup();
  });
})();
