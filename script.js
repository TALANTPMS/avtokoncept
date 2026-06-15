const fallback = document.querySelector("[data-video-fallback]");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
const seekThreshold = isTouchDevice ? 1 / 30 : 1 / 60;
const seekInterval = isTouchDevice ? 48 : 24;
let animationFrame = 0;

const scenes = [...document.querySelectorAll("[data-scroll-stage]")].map((stage) => {
  const video = stage.querySelector("[data-scroll-video]");
  return {
    stage,
    video,
    duration: 0,
    progress: 0,
    targetTime: 0,
    lastSeekAt: 0,
    seekTimer: 0,
    settleTimer: 0,
  };
});

function queueSeek(scene, delay) {
  if (scene.seekTimer) {
    return;
  }

  scene.seekTimer = window.setTimeout(() => {
    scene.seekTimer = 0;
    seekToTarget(scene);
  }, delay);
}

function seekToTarget(scene) {
  if (
    !scene.duration ||
    scene.video.readyState < 2 ||
    Math.abs(scene.video.currentTime - scene.targetTime) < seekThreshold
  ) {
    return;
  }

  if (scene.video.seeking === true) {
    queueSeek(scene, seekInterval);
    return;
  }

  const elapsed = performance.now() - scene.lastSeekAt;

  if (elapsed < seekInterval) {
    queueSeek(scene, seekInterval - elapsed);
    return;
  }

  try {
    scene.lastSeekAt = performance.now();
    scene.video.currentTime = scene.targetTime;
  } catch {}
}

function settleSeek(scene) {
  scene.settleTimer = 0;

  if (
    !scene.duration ||
    scene.video.readyState < 2 ||
    Math.abs(scene.video.currentTime - scene.targetTime) < seekThreshold
  ) {
    return;
  }

  try {
    scene.video.currentTime = scene.targetTime;
  } catch {}

  scene.settleTimer = window.setTimeout(() => settleSeek(scene), 120);
}

scenes.forEach((scene, index) => {
  const { video } = scene;
  const initialize = () => {
    scene.duration = Number.isFinite(video.duration) ? video.duration : 0;
    video.pause();

    if (index === 0 && fallback) {
      fallback.hidden = true;
    }

    updateProgress();
  };

  const primeDecoder = () => {
    const playAttempt = video.play();

    if (playAttempt) {
      playAttempt
        .then(() => {
          video.pause();
          updateProgress();
        })
        .catch(() => {
          video.pause();
        });
    }
  };

  video.addEventListener("durationchange", initialize);
  video.addEventListener("loadeddata", updateProgress);
  video.addEventListener("canplay", primeDecoder, { once: true });
  video.addEventListener("seeked", () => {
    window.requestAnimationFrame(() => seekToTarget(scene));
  });
  video.addEventListener("error", () => {
    if (index === 0 && fallback) {
      fallback.hidden = false;
    }
  });

  if (video.readyState >= 1) {
    initialize();
  } else {
    video.addEventListener("loadedmetadata", initialize, { once: true });
  }
});

function updateProgress() {
  scenes.forEach((scene, index) => {
    if (!scene.video) {
      return;
    }

    const stageTop = scene.stage.getBoundingClientRect().top;
    const pinnedHeight =
      scene.stage.firstElementChild?.offsetHeight || window.innerHeight;
    const scrollDistance = Math.max(
      scene.stage.offsetHeight - pinnedHeight,
      1,
    );

    scene.progress = clamp(-stageTop / scrollDistance, 0, 1);
    scene.stage.style.setProperty("--progress", scene.progress.toFixed(4));

    if (index === 0) {
      document.documentElement.style.setProperty(
        "--progress",
        scene.progress.toFixed(4),
      );
    }

    if (scene.duration && scene.video.readyState >= 2) {
      const lastFrameTime = Math.max(scene.duration - 0.001, 0);
      scene.targetTime = Math.min(
        scene.duration * scene.progress,
        lastFrameTime,
      );
      seekToTarget(scene);
      window.clearTimeout(scene.settleTimer);
      scene.settleTimer = window.setTimeout(() => settleSeek(scene), 120);
    }
  });
}

function scheduleUpdate() {
  if (animationFrame) {
    return;
  }

  animationFrame = window.requestAnimationFrame(() => {
    animationFrame = 0;
    updateProgress();
  });
}

window.addEventListener("scroll", scheduleUpdate, { passive: true });
window.addEventListener("resize", scheduleUpdate, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleUpdate, {
  passive: true,
});

updateProgress();
