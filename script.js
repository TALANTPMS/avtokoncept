const preloader = document.querySelector("[data-preloader]");
const videoFallback = document.querySelector("[data-video-fallback]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const coarsePointer = window.matchMedia("(pointer: coarse)");
const staticMediaLayout = window.matchMedia(
  "(max-width: 680px), (max-width: 1100px) and (pointer: coarse)",
);
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const phase = (progress, start, end) =>
  clamp((progress - start) / (end - start), 0, 1);

let updateFrame = 0;
let resizeFrame = 0;
let activeModal = null;
let modalTrigger = null;
const modalHistory = [];

function waitForMedia(element) {
  if (element.tagName === "IMG") {
    if (element.loading === "lazy") {
      return Promise.resolve();
    }

    return element.complete
      ? Promise.resolve()
      : new Promise((resolve) => {
          element.addEventListener("load", resolve, { once: true });
          element.addEventListener("error", resolve, { once: true });
        });
  }

  if (element.tagName === "VIDEO") {
    if (staticMediaLayout.matches) {
      return Promise.resolve();
    }

    return element.readyState >= 1
      ? Promise.resolve()
      : new Promise((resolve) => {
          element.addEventListener("loadedmetadata", resolve, { once: true });
          element.addEventListener("error", resolve, { once: true });
        });
  }

  return Promise.resolve();
}

async function revealSite() {
  const media = [...document.querySelectorAll("img, video")];
  const fontsReady = document.fonts?.ready || Promise.resolve();
  const minimumDelay = new Promise((resolve) => window.setTimeout(resolve, 650));
  const maximumDelay = new Promise((resolve) => window.setTimeout(resolve, 3600));
  const assetsReady = Promise.all([
    fontsReady,
    ...media.map((element) => waitForMedia(element)),
  ]);

  await Promise.all([
    minimumDelay,
    Promise.race([assetsReady, maximumDelay]),
  ]);

  document.body.classList.remove("is-loading");
  document.body.classList.add("is-ready");
  scheduleUpdate();

  window.setTimeout(() => preloader?.remove(), 1300);
}

const scenes = [...document.querySelectorAll("[data-scroll-stage]")].map(
  (stage, index) => {
    const video = stage.querySelector("[data-scroll-video]");
    return {
      index,
      stage,
      video,
      duration: 0,
      targetTime: 0,
      lastSeekAt: 0,
      seekQueued: false,
    };
  },
);

function requestSceneSeek(scene, force = false) {
  const { video } = scene;
  if (
    !video ||
    !scene.duration ||
    video.readyState < 2 ||
    staticMediaLayout.matches ||
    reducedMotion.matches
  ) {
    return;
  }

  const delta = scene.targetTime - video.currentTime;
  const threshold = coarsePointer.matches ? 0.035 : 1 / 90;
  if (Math.abs(delta) <= threshold) {
    return;
  }

  const interval = coarsePointer.matches ? 52 : 20;
  const elapsed = performance.now() - scene.lastSeekAt;
  if (!force && (video.seeking || elapsed < interval)) {
    scene.seekQueued = true;
    return;
  }

  scene.seekQueued = false;
  scene.lastSeekAt = performance.now();

  try {
    video.currentTime = clamp(scene.targetTime, 0, scene.duration - 0.001);
  } catch {
    scene.seekQueued = true;
  }
}

function initializeScene(scene) {
  const { video } = scene;
  if (!video) return;

  scene.duration = Number.isFinite(video.duration) ? video.duration : 0;
  video.pause();

  if (scene.index === 0 && videoFallback) {
    videoFallback.hidden = true;
  }

  scheduleUpdate();
}

function configureSceneMedia(scene) {
  const { video } = scene;
  if (!video) return;

  if (staticMediaLayout.matches) {
    video.preload = "none";
    video.pause();
    return;
  }

  video.preload = "auto";
  if (video.readyState >= 1) {
    initializeScene(scene);
  } else {
    video.load();
  }
}

scenes.forEach((scene) => {
  const { video } = scene;
  if (!video) return;

  video.addEventListener("loadedmetadata", () => initializeScene(scene));
  video.addEventListener("durationchange", () => initializeScene(scene));
  video.addEventListener("loadeddata", scheduleUpdate);
  video.addEventListener("seeked", () => {
    if (scene.seekQueued) {
      window.requestAnimationFrame(() => requestSceneSeek(scene, true));
    }
  });
  video.addEventListener("error", () => {
    if (scene.index === 0 && videoFallback) {
      videoFallback.hidden = false;
    }
  });

  configureSceneMedia(scene);
});

staticMediaLayout.addEventListener("change", () => {
  scenes.forEach(configureSceneMedia);
  scheduleResize();
});

function updateProgress() {
  scenes.forEach((scene) => {
    const rect = scene.stage.getBoundingClientRect();
    const viewportHeight =
      scene.stage.firstElementChild?.getBoundingClientRect().height ||
      window.innerHeight;
    const scrollDistance = Math.max(scene.stage.offsetHeight - viewportHeight, 1);
    const progress = clamp(-rect.top / scrollDistance, 0, 1);

    scene.stage.style.setProperty("--progress", progress.toFixed(4));

    if (scene.stage.matches("[data-offer-stage]")) {
      const title = phase(progress, 0.03, 0.15);
      const leadOneIntro = phase(progress, 0.12, 0.23);
      const leadOneExit = 1 - phase(progress, 0.28, 0.37);
      const finalComposition = phase(progress, 0.38, 0.49);
      const leadOne = Math.max(
        leadOneIntro * leadOneExit,
        finalComposition,
      );
      const leadTwo = phase(progress, 0.29, 0.4);

      scene.stage.style.setProperty(
        "--offer-bg",
        phase(progress, 0, 0.12).toFixed(4),
      );
      scene.stage.style.setProperty("--offer-title", title.toFixed(4));
      scene.stage.style.setProperty(
        "--offer-lead-one",
        leadOne.toFixed(4),
      );
      scene.stage.style.setProperty(
        "--offer-lead-two",
        leadTwo.toFixed(4),
      );
      scene.stage.style.setProperty(
        "--offer-final",
        finalComposition.toFixed(4),
      );
      scene.stage.style.setProperty(
        "--offer-route",
        phase(progress, 0.42, 0.88).toFixed(4),
      );
      scene.stage.style.setProperty(
        "--offer-card-1",
        phase(progress, 0.45, 0.58).toFixed(4),
      );
      scene.stage.style.setProperty(
        "--offer-card-2",
        phase(progress, 0.55, 0.68).toFixed(4),
      );
      scene.stage.style.setProperty(
        "--offer-card-3",
        phase(progress, 0.65, 0.78).toFixed(4),
      );
      scene.stage.style.setProperty(
        "--offer-card-4",
        phase(progress, 0.75, 0.88).toFixed(4),
      );
      scene.stage.style.setProperty(
        "--offer-scroll",
        (1 - phase(progress, 0.72, 0.88)).toFixed(4),
      );
    }

    if (scene.stage.matches("[data-fleet-stage]")) {
      const slides = [...scene.stage.querySelectorAll("[data-fleet-slide]")];
      const slidePosition = progress * Math.max(slides.length - 1, 1);
      const activeIndex = clamp(
        Math.round(slidePosition),
        0,
        slides.length - 1,
      );

      scene.stage.style.setProperty(
        "--fleet-progress",
        progress.toFixed(5),
      );
      scene.stage.style.setProperty(
        "--fleet-title",
        phase(progress, 0, 0.045).toFixed(4),
      );

      slides.forEach((slide, slideIndex) => {
        const offset = slidePosition - slideIndex;
        const proximity = clamp(1 - Math.abs(offset), 0, 1);
        slide.style.setProperty("--fleet-offset", offset.toFixed(4));
        slide.style.setProperty(
          "--fleet-proximity",
          proximity.toFixed(4),
        );
      });

      const current = scene.stage.querySelector("[data-fleet-current]");
      if (current) {
        current.textContent = String(activeIndex + 1).padStart(2, "0");
      }

      scene.stage
        .querySelectorAll(".fleet-scene__dots i")
        .forEach((dot, dotIndex) => {
          dot.classList.toggle("is-active", dotIndex === activeIndex);
        });
    }

    if (scene.stage.matches("[data-metrics-stage]")) {
      const cardTwo = phase(progress, 0.16, 0.36);
      const cardThree = phase(progress, 0.38, 0.58);
      const cardFour = phase(progress, 0.6, 0.8);
      const activeIndex =
        progress < 0.26 ? 0 : progress < 0.48 ? 1 : progress < 0.7 ? 2 : 3;

      scene.stage.style.setProperty(
        "--metrics-title",
        phase(progress, 0.02, 0.12).toFixed(4),
      );
      scene.stage.style.setProperty(
        "--metric-1",
        phase(progress, 0.09, 0.18).toFixed(4),
      );
      scene.stage.style.setProperty("--metric-2", cardTwo.toFixed(4));
      scene.stage.style.setProperty("--metric-3", cardThree.toFixed(4));
      scene.stage.style.setProperty("--metric-4", cardFour.toFixed(4));
      scene.stage.style.setProperty(
        "--metrics-cta",
        phase(progress, 0.82, 0.94).toFixed(4),
      );
      scene.stage.style.setProperty(
        "--metrics-card-progress",
        (activeIndex / 3).toFixed(4),
      );

      const current = scene.stage.querySelector("[data-metrics-current]");
      if (current) {
        current.textContent = String(activeIndex + 1).padStart(2, "0");
      }
    }

    if (scene.index === 0) {
      document.documentElement.style.setProperty(
        "--progress",
        progress.toFixed(4),
      );
    }

    if (scene.duration) {
      scene.targetTime = Math.min(
        scene.duration * progress,
        Math.max(scene.duration - 0.001, 0),
      );
      requestSceneSeek(scene);
    }
  });
}

function scheduleUpdate() {
  if (updateFrame) return;

  updateFrame = window.requestAnimationFrame(() => {
    updateFrame = 0;
    updateProgress();
  });
}

function scheduleResize() {
  if (resizeFrame) return;

  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0;
    scheduleUpdate();
  });
}

function formatPhone(value) {
  const rawValue = String(value);
  let digits = rawValue.replace(/\D/g, "");
  const hasCountryPrefix =
    /^\s*\+?[78](?:\D|$)/.test(rawValue) || digits.length === 11;

  if (hasCountryPrefix && /^[78]/.test(digits)) {
    digits = digits.slice(1);
  }

  const national = digits.slice(0, 10);
  if (!national.length) return "";

  let result = "+7";

  if (national.length) result += ` (${national.slice(0, 3)}`;
  if (national.length >= 3) result += ")";
  if (national.length > 3) result += ` ${national.slice(3, 6)}`;
  if (national.length > 6) result += `-${national.slice(6, 8)}`;
  if (national.length > 8) result += `-${national.slice(8, 10)}`;

  return result;
}

function isValidPhone(value) {
  const digits = String(value).replace(/\D/g, "");
  const national =
    digits.length === 11 && /^[78]/.test(digits) ? digits.slice(1) : digits;

  return (
    national.length === 10 &&
    /^[3-9]/.test(national) &&
    !/^(\d)\1{9}$/.test(national)
  );
}

document.querySelectorAll("[data-phone]").forEach((input) => {
  input.addEventListener("input", () => {
    input.value = formatPhone(input.value);
    input.setCustomValidity("");
  });

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    input.value = formatPhone(event.clipboardData?.getData("text") || "");
    input.setCustomValidity("");
  });

  input.addEventListener("keydown", (event) => {
    if (
      event.key === "Backspace" &&
      input.selectionStart === input.selectionEnd &&
      (input.selectionStart || 0) <= 4
    ) {
      event.preventDefault();
      input.value = "";
    }
  });
});

function appendTrackingData(formData, form) {
  const params = new URLSearchParams(window.location.search);
  formData.set("form_name", form.dataset.formName || "Форма на сайте");
  formData.set("page_url", window.location.href);

  ["utm_source", "utm_medium", "utm_campaign"].forEach((key) => {
    formData.set(key, params.get(key) || "");
  });
}

document.querySelectorAll("[data-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const phone = form.querySelector("[data-phone]");
    const consent = form.querySelector('[name="personal_data_consent"]');
    const consentLabel = consent?.closest(".form-consent");
    const status = form.querySelector(".form-status");
    const submitButton = form.querySelector('button[type="submit"]');

    status?.classList.remove("is-success");
    if (status) status.textContent = "";
    consentLabel?.classList.remove("is-invalid");

    if (phone && !isValidPhone(phone.value)) {
      phone.setCustomValidity("Введите корректный российский номер телефона.");
      phone.reportValidity();
      return;
    }

    if (!consent?.checked) {
      consentLabel?.classList.add("is-invalid");
      if (status) {
        status.textContent =
          "Подтвердите согласие на обработку персональных данных.";
      }
      consent?.focus();
      return;
    }

    const formData = new FormData(form);
    appendTrackingData(formData, form);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.label = submitButton.textContent;
      submitButton.textContent = "Отправляем…";
    }

    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
        body: formData,
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Не удалось отправить заявку.");
      }

      sessionStorage.setItem(
        "autokonceptLeadName",
        String(formData.get("name") || "").trim(),
      );
      window.location.href = "./thank-you.html";
    } catch (error) {
      if (status) {
        status.textContent =
          error instanceof Error
            ? error.message
            : "Не удалось отправить заявку. Попробуйте ещё раз.";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.label || "Получить";
      }
    }
  });
});

function getFocusableElements(container) {
  return [
    ...container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ].filter((element) => !element.hidden);
}

function closeModal() {
  if (!activeModal) return;

  const closingTrigger = modalTrigger;
  activeModal.hidden = true;

  const previous = modalHistory.pop();
  if (previous) {
    activeModal = previous.modal;
    modalTrigger = previous.trigger;
    activeModal.hidden = false;
    closingTrigger?.focus();
    return;
  }

  document.body.classList.remove("is-modal-open");
  activeModal = null;
  modalTrigger = null;
  closingTrigger?.focus();
}

function openModal(id, trigger) {
  const modal = document.getElementById(id);
  if (!modal) return;

  if (activeModal && activeModal !== modal) {
    modalHistory.push({
      modal: activeModal,
      trigger: modalTrigger,
    });
    activeModal.hidden = true;
  }

  activeModal = modal;
  modalTrigger = trigger;
  modal.hidden = false;
  document.body.classList.add("is-modal-open");
  getFocusableElements(modal)[0]?.focus();
}

document.querySelectorAll("[data-modal-open]").forEach((button) => {
  button.addEventListener("click", () =>
    openModal(button.dataset.modalOpen, button),
  );
});

document.querySelectorAll("[data-modal-close]").forEach((button) => {
  button.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (!activeModal) return;

  if (event.key === "Escape") {
    closeModal();
    return;
  }

  if (event.key !== "Tab") return;

  const focusable = getFocusableElements(activeModal);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

function preventHangingPrepositions(root = document.body) {
  const excluded = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT"]);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];

  while (walker.nextNode()) {
    const parent = walker.currentNode.parentElement;
    if (parent && !excluded.has(parent.tagName)) nodes.push(walker.currentNode);
  }

  nodes.forEach((node) => {
    node.nodeValue = node.nodeValue.replace(
      /(^|[\s(«„])((?:в|и|к|с|у|о|на|по|за|для|при|без|под|над))\s+(?=\S)/giu,
      "$1$2\u00a0",
    );
  });
}

function setupReveals() {
  const elements = document.querySelectorAll("[data-reveal]");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 },
  );

  elements.forEach((element) => observer.observe(element));
}

document.querySelectorAll("[data-current-year]").forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

window.addEventListener("scroll", scheduleUpdate, { passive: true });
window.addEventListener("resize", scheduleResize, { passive: true });
window.addEventListener("orientationchange", scheduleResize, { passive: true });

preventHangingPrepositions();
setupReveals();
scheduleUpdate();
revealSite();
