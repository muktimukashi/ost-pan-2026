const starterTracks = [
  { title: "Mars Semut (Opener)", src: "Mars Semut (Opener).mp3", source: "Folder lokal" },
  { title: "Mars Semut (Saxophone)", src: "Mars Semut (Saxophone).mp3", source: "Folder lokal" }
];

const audio = document.getElementById("audio");
const playBtn = document.getElementById("play-btn");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const progress = document.getElementById("progress");
const currentTimeEl = document.getElementById("current-time");
const durationEl = document.getElementById("duration");
const titleEl = document.getElementById("track-title");
const metaEl = document.getElementById("track-meta");
const playlistEl = document.getElementById("playlist");
const pulseOrb = document.getElementById("pulse-orb");
const canvas = document.getElementById("spectrum");
const ctx = canvas.getContext("2d");

let playlist = [...starterTracks];
let currentIndex = 0;
let isPlaying = false;
let audioContext;
let analyser;
let sourceNode;
let dataArray;
let animationFrameId;

function formatTime(time) {
  if (!Number.isFinite(time)) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderPlaylist() {
  playlistEl.innerHTML = "";

  playlist.forEach((track, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `track-item${index === currentIndex ? " active" : ""}`;
    item.innerHTML = `
      <span class="track-index">${String(index + 1).padStart(2, "0")}</span>
      <span>
        <span class="track-name">${track.title}</span>
        <span class="track-source">${track.source}</span>
      </span>
      <span class="track-status">${index === currentIndex ? (isPlaying ? "Playing" : "Ready") : "Queue"}</span>
    `;

    item.addEventListener("click", () => {
      loadTrack(index);
      playCurrentTrack();
    });

    playlistEl.appendChild(item);
  });
}

function loadTrack(index) {
  currentIndex = index;
  const track = playlist[currentIndex];

  audio.src = track.src;
  titleEl.textContent = track.title;
  metaEl.textContent = `${track.source} - soundtrack resmi PAN Performa Anak Negeri 2026`;
  progress.value = 0;
  currentTimeEl.textContent = "0:00";
  durationEl.textContent = "0:00";
  renderPlaylist();
}

function updatePlayButton() {
  playBtn.textContent = isPlaying ? "Pause" : "Play";
}

async function ensureAudioGraph() {
  if (!audioContext) {
    audioContext = new window.AudioContext();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    sourceNode = audioContext.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
  }

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }
}

async function playCurrentTrack() {
  try {
    await ensureAudioGraph();
    await audio.play();
    isPlaying = true;
    updatePlayButton();
    drawSpectrum();
  } catch (error) {
    metaEl.textContent = "Browser menahan autoplay. Klik play lagi untuk mulai audio.";
    console.error(error);
  }
}

function pauseCurrentTrack() {
  audio.pause();
  isPlaying = false;
  updatePlayButton();
}

function togglePlayback() {
  if (!audio.src) {
    loadTrack(currentIndex);
  }

  if (audio.paused) {
    playCurrentTrack();
    return;
  }

  pauseCurrentTrack();
}

function goToTrack(index) {
  const safeIndex = (index + playlist.length) % playlist.length;
  loadTrack(safeIndex);
  playCurrentTrack();
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawSpectrum() {
  if (!analyser) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(102, 179, 255, 0.95)");
  gradient.addColorStop(0.52, "rgba(124, 240, 200, 0.92)");
  gradient.addColorStop(1, "rgba(255, 214, 107, 0.8)");

  const barWidth = Math.max(4, width / dataArray.length - 2);
  let x = 0;
  let total = 0;

  for (let i = 0; i < dataArray.length; i += 1) {
    const rawValue = dataArray[i];
    const easedValue = (rawValue / 255) ** 1.45;
    const barHeight = Math.max(6, easedValue * (height - 22));
    const radius = Math.min(12, barWidth / 2);
    const y = height - barHeight;

    total += rawValue;
    ctx.fillStyle = gradient;
    roundRect(x, y, barWidth, barHeight, radius);
    x += barWidth + 2;
  }

  const average = total / dataArray.length / 255;
  pulseOrb.style.transform = `scale(${1 + average * 0.55})`;
  pulseOrb.style.boxShadow = `0 0 ${18 + average * 44}px rgba(124, 240, 200, ${0.14 + average * 0.3})`;

  if (!audio.paused) {
    animationFrameId = requestAnimationFrame(drawSpectrum);
  }
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

playBtn.addEventListener("click", togglePlayback);
prevBtn.addEventListener("click", () => goToTrack(currentIndex - 1));
nextBtn.addEventListener("click", () => goToTrack(currentIndex + 1));

audio.addEventListener("loadedmetadata", () => {
  durationEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("timeupdate", () => {
  if (!Number.isFinite(audio.duration) || audio.duration === 0) return;
  progress.value = (audio.currentTime / audio.duration) * 100;
  currentTimeEl.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("play", () => {
  isPlaying = true;
  updatePlayButton();
  drawSpectrum();
});

audio.addEventListener("pause", () => {
  isPlaying = false;
  updatePlayButton();
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
});

audio.addEventListener("ended", () => {
  goToTrack(currentIndex + 1);
});

progress.addEventListener("input", () => {
  if (!Number.isFinite(audio.duration) || audio.duration === 0) return;
  audio.currentTime = (Number(progress.value) / 100) * audio.duration;
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
loadTrack(0);
renderPlaylist();
