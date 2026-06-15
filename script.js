const fallback = document.querySelector("[data-video-fallback]");

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function getViewportHeight() {
  return window.visualViewport?.height || window.innerHeight;
}

const scenes = [...document.querySelectorAll("[data-scroll-stage]")].map((stage) => {
  const video = stage.querySelector("[data-scroll-video]");
  return {
    stage,
    video,
    duration: 0,
    progress: 0,
  };
});

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
  const viewportHeight = getViewportHeight();

  scenes.forEach((scene, index) => {
    if (!scene.video) {
      return;
    }

    const stageTop = scene.stage.getBoundingClientRect().top;
    const scrollDistance = Math.max(scene.stage.offsetHeight - viewportHeight, 1);

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
      const nextTime = Math.min(scene.duration * scene.progress, lastFrameTime);

      if (Math.abs(scene.video.currentTime - nextTime) > 0.008) {
        scene.video.currentTime = nextTime;
      }
    }
  });
}

window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress, { passive: true });
window.visualViewport?.addEventListener("resize", updateProgress, { passive: true });

updateProgress();
