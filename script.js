const revealItems = document.querySelectorAll(".reveal");
const toast = document.querySelector(".toast");
const hero = document.querySelector(".hero");
const manTrack = document.querySelector(".hero__man-track");
const heroVisual = document.querySelector(".hero__visual");
const heroFade = document.querySelector(".hero__fade");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach((item) => observer.observe(item));

if (hero && !reduceMotion.matches) {
  let ticking = false;

  const updateHeroMotion = () => {
    const heroRect = hero.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, -heroRect.top / heroRect.height));

    if (manTrack) {
      const manShift = progress * 88;
      manTrack.style.setProperty("--man-scroll-x", `${manShift.toFixed(1)}px`);
    }

    if (heroVisual) {
      const parallaxShift = progress * 62;
      heroVisual.style.setProperty("--hero-parallax-y", `${parallaxShift.toFixed(1)}px`);
    }

    if (heroFade) {
      const fadeOpacity = 0.08 + progress * 0.92;
      heroFade.style.setProperty("--hero-fade-opacity", fadeOpacity.toFixed(3));
    }

    ticking = false;
  };

  const requestHeroUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateHeroMotion);
  };

  updateHeroMotion();
  window.addEventListener("scroll", requestHeroUpdate, { passive: true });
  window.addEventListener("resize", requestHeroUpdate);
}

const numbersStack = document.querySelector(".numbers-stack");
const numbersSticky = numbersStack?.querySelector(".numbers-stack__sticky");
const numbersMan = numbersStack?.querySelector(".numbers-stack__man");
const stackCards = Array.from(numbersStack?.querySelectorAll("[data-stack-card]") || []);

if (numbersStack && numbersSticky && stackCards.length && !reduceMotion.matches) {
  let stackTicking = false;
  let tabletProgress = 0;
  let tabletTouchY = 0;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const mix = (from, to, progress) => from + (to - from) * progress;
  const easeOut = (progress) => 1 - Math.pow(1 - progress, 3);
  const isTabletStack = () =>
    window.innerWidth >= 700 &&
    window.innerWidth <= 1100 &&
    window.innerHeight >= 900;
  const isFourKStack = () => window.innerWidth >= 1800;
  const isControlledStack = () => isTabletStack() || isFourKStack();

  const setStackHeight = () => {
    const stickyHeight = numbersSticky.getBoundingClientRect().height || window.innerHeight;
    if (isControlledStack()) {
      numbersStack.style.height = `${stickyHeight}px`;
      return;
    }
    const travelPerCard = Math.max(480, stickyHeight * 0.78);
    numbersStack.style.height = `${stickyHeight + travelPerCard * (stackCards.length - 1)}px`;
  };

  const updateNumbersStack = () => {
    const sectionRect = numbersStack.getBoundingClientRect();
    const viewportHeight = numbersSticky.getBoundingClientRect().height || window.innerHeight;
    const scrollDistance = Math.max(1, numbersStack.offsetHeight - viewportHeight);
    const progress = isControlledStack()
      ? tabletProgress
      : clamp(-sectionRect.top / scrollDistance);
    const cardStyles = getComputedStyle(numbersStack);
    const headerHeight = parseFloat(cardStyles.getPropertyValue("--stack-header-height")) || 76;
    const stackGap = Math.min(44, headerHeight * 0.58);
    const steps = stackCards.length - 1;
    const entranceY = Math.max(500, viewportHeight * 0.78);

    stackCards.forEach((card, index) => {
      if (index === 0) {
        card.style.transform = "translate3d(0, 0, 0) rotate(0deg)";
        card.style.zIndex = "1";
        return;
      }

      const localProgress = easeOut(clamp(progress * steps - (index - 1)));
      const direction = index % 2 === 0 ? 1 : -1;
      const x = mix(direction * 72, 0, localProgress);
      const y = mix(entranceY + index * 55, index * stackGap, localProgress);
      const rotation = mix(direction * 5.5, 0, localProgress);

      card.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotation.toFixed(2)}deg)`;
      card.style.zIndex = String(index + 1);
    });

    if (numbersMan) {
      const manX = mix(-10, 12, progress);
      numbersMan.style.transform = `translate3d(${manX.toFixed(2)}px, 0, 0)`;
    }

    stackTicking = false;
  };

  const requestStackUpdate = () => {
    if (stackTicking) return;
    stackTicking = true;
    window.requestAnimationFrame(updateNumbersStack);
  };

  const refreshNumbersStack = () => {
    setStackHeight();
    requestStackUpdate();
  };

  const updateTabletProgress = (delta) => {
    if (!isControlledStack()) return false;
    const nextProgress = clamp(tabletProgress + delta / 1900);
    if (nextProgress === tabletProgress) return false;
    tabletProgress = nextProgress;
    requestStackUpdate();
    return true;
  };

  numbersStack.addEventListener("wheel", (event) => {
    if (updateTabletProgress(event.deltaY)) event.preventDefault();
  }, { passive: false });

  numbersStack.addEventListener("touchstart", (event) => {
    tabletTouchY = event.touches[0]?.clientY || 0;
  }, { passive: true });

  numbersStack.addEventListener("touchmove", (event) => {
    const currentY = event.touches[0]?.clientY || tabletTouchY;
    const delta = tabletTouchY - currentY;
    tabletTouchY = currentY;
    if (updateTabletProgress(delta * 2.4)) event.preventDefault();
  }, { passive: false });

  refreshNumbersStack();
  window.addEventListener("scroll", requestStackUpdate, { passive: true });
  window.addEventListener("resize", refreshNumbersStack);
}

document.querySelectorAll("[data-form]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    form.reset();
    toast.classList.add("is-visible");
    window.setTimeout(() => toast.classList.remove("is-visible"), 3500);
  });
});
