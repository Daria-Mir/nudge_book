// ==========================================
// 1. WEB AUDIO API - PAGE FLIP SYNTHESIS
// ==========================================
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playPageFlipSound() {
  try {
    initAudioContext();
    const bufferSize = audioCtx.sampleRate * 0.4;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noiseSource = audioCtx.createBufferSource();
    noiseSource.buffer = buffer;
    
    const filterBand = audioCtx.createBiquadFilter();
    filterBand.type = 'bandpass';
    filterBand.Q.value = 3;
    filterBand.frequency.setValueAtTime(1800, audioCtx.currentTime);
    filterBand.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.35);
    
    const filterLow = audioCtx.createBiquadFilter();
    filterLow.type = 'lowpass';
    filterLow.frequency.setValueAtTime(4000, audioCtx.currentTime);
    filterLow.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.35);
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
    
    noiseSource.connect(filterBand);
    filterBand.connect(filterLow);
    filterLow.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    noiseSource.start();
  } catch (e) {
    console.warn("Web Audio API not supported:", e);
  }
}

// Play sound on click of specific navigation items or interactive elements
document.addEventListener('DOMContentLoaded', () => {
  const clickables = document.querySelectorAll('.btn-ink, .btn-ink-outline, .share-action-btn, .compact-play-btn, .mindmap-node');
  clickables.forEach(el => {
    el.addEventListener('click', () => {
      playPageFlipSound();
    });
  });
});


// ==========================================
// 2. TOAST NOTIFICATION UTILITY
// ==========================================
function showToast(message) {
  const toast = document.getElementById('share-toast-notify');
  const toastText = document.getElementById('toast-text');
  if (!toast || !toastText) return;
  
  toastText.textContent = message;
  toast.classList.add('active');
  
  setTimeout(() => {
    toast.classList.remove('active');
  }, 4000);
}


// ==========================================
// 3. CANVAS-BASED SHAREABLE QUOTE CARDS ENGINE
// ==========================================
function generateQuoteCardBlob(text, author, callback) {
  const canvas = document.getElementById('share-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Draw paper background
  ctx.fillStyle = '#fdfbf7';
  ctx.fillRect(0, 0, 1080, 1080);
  
  // Paper grain noise
  ctx.fillStyle = 'rgba(44, 37, 30, 0.012)';
  for (let i = 0; i < 40000; i++) {
    const x = Math.random() * 1080;
    const y = Math.random() * 1080;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  
  // Ink Borders
  ctx.strokeStyle = '#2c251e';
  ctx.lineWidth = 5;
  ctx.strokeRect(40, 40, 1000, 1000);
  
  ctx.strokeStyle = '#6b6359';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([12, 8]);
  ctx.strokeRect(60, 60, 960, 960);
  ctx.setLineDash([]);
  
  // Quotes marks
  ctx.fillStyle = 'rgba(158, 42, 43, 0.07)';
  ctx.font = '320px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('“', 540, 280);
  
  // Quote text
  ctx.fillStyle = '#2c251e';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  const maxWidth = 760;
  
  for (let n = 0; n < words.length; n++) {
    let testLine = currentLine + words[n] + ' ';
    let metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      lines.push(currentLine.trim());
      currentLine = words[n] + ' ';
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine.trim());
  
  const lineHeight = 75;
  const totalTextHeight = lines.length * lineHeight;
  let startY = 530 - (totalTextHeight / 2);
  
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], 540, startY + (i * lineHeight));
  }
  
  // Divider
  const dividerY = startY + totalTextHeight + 40;
  ctx.strokeStyle = 'rgba(107, 99, 89, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(350, dividerY);
  ctx.bezierCurveTo(450, dividerY - 8, 630, dividerY + 8, 730, dividerY);
  ctx.stroke();
  
  // Author
  ctx.fillStyle = '#9e2a2b';
  ctx.font = 'italic 42px Georgia, serif';
  ctx.fillText(author, 540, dividerY + 70);
  
  // Footer
  ctx.fillStyle = '#6b6359';
  ctx.font = '16px monospace';
  ctx.letterSpacing = '3px';
  ctx.fillText('NUDGE BOOK CLUB PRESENTATION', 540, 930);
  
  canvas.toBlob(callback, 'image/png');
}

function downloadQuoteCardPNG(quoteId, text, author) {
  generateQuoteCardBlob(text, author, (blob) => {
    const link = document.createElement('a');
    link.download = `nudge_quote_${quoteId}.png`;
    link.href = URL.createObjectURL(blob);
    link.click();
  });
}


// ==========================================
// 4. MULTI-PLATFORM SHARING LOGIC
// ==========================================
function shareQuote(quoteId, text, author, platform) {
  const pageUrl = window.location.href;
  const shareText = `"${text}" — ${author} (Shared from Nudge Book Club Summary)`;
  
  if (platform === 'instagram') {
    // 1. Download card PNG
    downloadQuoteCardPNG(quoteId, text, author);
    // 2. Show helper Toast
    showToast("📸 Quote Card downloaded! Post this PNG on Instagram.");
  }
  
  else if (platform === 'linkedin') {
    // 1. Copy quote + link to clipboard
    const fullTextForClip = `${shareText}\n\nRead the summary at: ${pageUrl}`;
    navigator.clipboard.writeText(fullTextForClip).then(() => {
      // 2. Open LinkedIn share dialog in a popup
      const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`;
      window.open(shareUrl, '_blank', 'width=600,height=500');
      // 3. Show Toast
      showToast("💼 Copied quote to clipboard & opened LinkedIn!");
    }).catch(err => {
      console.warn("Clipboard failed:", err);
    });
  }
  
  else if (platform === 'substack') {
    // Substack style Blockquote markdown template
    const substackMarkdown = `> "${text}"\n>\n> — *${author}* (Shared from Nudge Book Club: ${pageUrl})`;
    navigator.clipboard.writeText(substackMarkdown).then(() => {
      showToast("✍️ Blockquote copied! Paste directly into Substack Writer.");
    }).catch(err => {
      console.warn("Clipboard failed:", err);
    });
  }
}


// ==========================================
// 5. SCROLL-DRAWING DOODLES INTERSECTION OBSERVER
// ==========================================
const scrollDoodles = document.querySelectorAll('.doodle-container');
if (scrollDoodles.length > 0) {
  const doodleOptions = {
    root: null,
    threshold: 0.1,
    rootMargin: "0px 0px -40px 0px"
  };
  
  const doodleObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('draw');
      }
    });
  }, doodleOptions);
  
  scrollDoodles.forEach(doodle => {
    doodleObserver.observe(doodle);
  });
}


// ==========================================
// 6. SCROLL HIGHLIGHT NARRATIVE OBSERVER
// ==========================================
const actSections = document.querySelectorAll('.act-container');
if (actSections.length > 0) {
  const observerOptions = {
    root: null,
    threshold: 0.2,
    rootMargin: "0px 0px -60px 0px"
  };

  const actObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const highlighters = entry.target.querySelectorAll('.highlight-trigger');
        highlighters.forEach((hl, idx) => {
          setTimeout(() => {
            hl.classList.add('active');
          }, idx * 250);
        });
        
        if (!entry.target.dataset.playedSound) {
          playPageFlipSound();
          entry.target.dataset.playedSound = 'true';
        }
      }
    });
  }, observerOptions);

  actSections.forEach(act => {
    actObserver.observe(act);
  });
}


// ==========================================
// 7. INTEGRATED TAPE PLAYERS
// ==========================================

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

const actsConfig = {
  'act-1': {
    player: document.getElementById('player-act1'),
    select: document.getElementById('select-act1'),
    playBtn: document.getElementById('play-act1'),
    speedBtn: document.getElementById('speed-act1'),
    progress: document.getElementById('progress-act1'),
    time: document.getElementById('time-act1'),
    title: document.getElementById('title-act1'),
    audio: document.getElementById('audio-act1')
  },
  'act-2': {
    player: document.getElementById('player-act2'),
    select: document.getElementById('select-act2'),
    playBtn: document.getElementById('play-act2'),
    speedBtn: document.getElementById('speed-act2'),
    progress: document.getElementById('progress-act2'),
    time: document.getElementById('time-act2'),
    title: document.getElementById('title-act2'),
    audio: document.getElementById('audio-act2')
  },
  'act-3': {
    player: document.getElementById('player-act3'),
    select: document.getElementById('select-act3'),
    playBtn: document.getElementById('play-act3'),
    speedBtn: document.getElementById('speed-act3'),
    progress: document.getElementById('progress-act3'),
    time: document.getElementById('time-act3'),
    title: document.getElementById('title-act3'),
    audio: document.getElementById('audio-act3')
  },
  'act-4': {
    player: document.getElementById('player-act4'),
    select: document.getElementById('select-act4'),
    playBtn: document.getElementById('play-act4'),
    speedBtn: document.getElementById('speed-act4'),
    progress: document.getElementById('progress-act4'),
    time: document.getElementById('time-act4'),
    title: document.getElementById('title-act4'),
    audio: document.getElementById('audio-act4')
  },
  'act-5': {
    player: document.getElementById('player-act5'),
    select: document.getElementById('select-act5'),
    playBtn: document.getElementById('play-act5'),
    speedBtn: document.getElementById('speed-act5'),
    progress: document.getElementById('progress-act5'),
    time: document.getElementById('time-act5'),
    title: document.getElementById('title-act5'),
    audio: document.getElementById('audio-act5')
  }
};

// Global pause to make sure only one player plays at a time
function pauseAllPlayers(exceptActId = null) {
  Object.keys(actsConfig).forEach(actId => {
    if (actId !== exceptActId) {
      const config = actsConfig[actId];
      if (config.audio) {
        config.audio.pause();
      }
      if (config.playBtn) {
        config.playBtn.textContent = "PLAY";
      }
      if (config.player) {
        config.player.classList.remove('playing');
      }
    }
  });
}

function loadTrackInAct(actId, partNum, autoplay = false) {
  const config = actsConfig[actId];
  if (!config || !config.audio) return;
  
  // Update select value
  config.select.value = partNum;
  
  const selectedOption = config.select.options[config.select.selectedIndex];
  if (!selectedOption) return;
  
  const title = selectedOption.text;
  const duration = parseInt(selectedOption.dataset.duration) || 180;
  
  config.title.textContent = title;
  config.time.textContent = `0:00 / ${formatTime(duration)}`;
  config.progress.value = 0;
  
  // Set the audio src locally
  const expectedSrc = `podcast_parts/part_${partNum}.m4a`;
  const currentSrc = config.audio.getAttribute('src');
  if (currentSrc !== expectedSrc) {
    config.audio.src = expectedSrc;
    config.audio.load();
  }
  
  if (autoplay) {
    playActAudio(actId);
  }
}

function playActAudio(actId) {
  initAudioContext();
  pauseAllPlayers(actId);
  
  const config = actsConfig[actId];
  if (!config || !config.audio) return;
  
  config.audio.play().then(() => {
    config.playBtn.textContent = "PAUSE";
    config.player.classList.add('playing');
  }).catch(err => {
    console.warn("Playback error:", err);
  });
}

function pauseActAudio(actId) {
  const config = actsConfig[actId];
  if (!config || !config.audio) return;
  
  config.audio.pause();
  config.playBtn.textContent = "PLAY";
  config.player.classList.remove('playing');
}

// Set up listeners for each Act Player
Object.keys(actsConfig).forEach(actId => {
  const config = actsConfig[actId];
  if (!config.player || !config.audio) return;
  
  // Dropdown Change listener
  config.select.addEventListener('change', () => {
    loadTrackInAct(actId, config.select.value, false);
  });
  
  // Play Button listener
  config.playBtn.addEventListener('click', () => {
    if (!config.audio.paused) {
      pauseActAudio(actId);
    } else {
      playActAudio(actId);
    }
  });
  
  // Speed Button listener
  if (config.speedBtn) {
    config.speedBtn.addEventListener('click', () => {
      let currentSpeed = parseFloat(config.speedBtn.dataset.speed) || 1.0;
      let nextSpeed = 1.0;
      if (currentSpeed === 1.0) nextSpeed = 1.5;
      else if (currentSpeed === 1.5) nextSpeed = 2.0;
      else nextSpeed = 1.0;
      
      config.speedBtn.dataset.speed = nextSpeed.toFixed(1);
      config.speedBtn.textContent = nextSpeed.toFixed(1) + "x";
      
      config.audio.playbackRate = nextSpeed;
    });
  }

  // Ensure playback rate matches selected speed when audio starts playing
  config.audio.addEventListener('play', () => {
    if (config.speedBtn) {
      const speed = parseFloat(config.speedBtn.dataset.speed) || 1.0;
      config.audio.playbackRate = speed;
    }
  });
  
  // Progress bar scrubbing
  config.progress.addEventListener('input', () => {
    if (config.audio.duration) {
      const time = (config.progress.value / 100) * config.audio.duration;
      config.audio.currentTime = time;
    }
  });
  
  // Sync local audio progress
  config.audio.addEventListener('timeupdate', () => {
    if (config.audio.duration) {
      const pct = (config.audio.currentTime / config.audio.duration) * 100;
      config.progress.value = pct;
      config.time.textContent = `${formatTime(config.audio.currentTime)} / ${formatTime(config.audio.duration)}`;
    }
  });
  
  // Track ended
  config.audio.addEventListener('ended', () => {
    const currentIdx = config.select.selectedIndex;
    if (currentIdx < config.select.options.length - 1) {
      config.select.selectedIndex = currentIdx + 1;
      loadTrackInAct(actId, config.select.value, true);
    } else {
      pauseActAudio(actId);
    }
  });
  
  // Load initial track metadata
  loadTrackInAct(actId, config.select.value, false);
});


// ==========================================
// 8. SVG MINDMAP CLICK TRIGGERS
// ==========================================
const mindmapNodes = document.querySelectorAll('.mindmap-node.sub');
mindmapNodes.forEach(node => {
  node.addEventListener('click', () => {
    const actContainer = node.closest('.act-container');
    const actId = actContainer.id;
    const partNum = node.dataset.part;
    const highlightId = node.dataset.highlight;
    
    const svg = node.closest('svg');
    svg.querySelectorAll('.mindmap-node.sub').forEach(el => el.classList.remove('active'));
    node.classList.add('active');
    
    playPageFlipSound();
    
    actContainer.querySelectorAll('.highlight-trigger').forEach(el => el.classList.remove('active'));
    const highlightTarget = document.getElementById(highlightId);
    if (highlightTarget) {
      highlightTarget.classList.add('active');
      highlightTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    if (partNum) {
      loadTrackInAct(actId, partNum, true);
    }
  });
});


// ==========================================
// 8a. YOUTUBE VIDEO PLAY LOGIC (GLOBAL)
// ==========================================
window.playYoutubeVideo = function(containerId, videoId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;
  
  const cover = container.querySelector('.video-thumbnail-cover');
  if (cover) {
    cover.style.display = 'none';
  }
  container.appendChild(iframe);
};


// ==========================================
// 8b. TABLE OF CONTENTS LEDGER CLICK NAVIGATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const tocLinks = document.querySelectorAll('.toc-link');
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const actId = link.getAttribute('data-act');
      const partNum = link.getAttribute('data-part');
      const highlightId = link.getAttribute('data-highlight');
      
      // Play flip sound
      playPageFlipSound();
      
      // Scroll to Act Container
      const actContainer = document.getElementById(actId);
      if (actContainer) {
        actContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        // Highlight corresponding trigger
        if (highlightId) {
          actContainer.querySelectorAll('.highlight-trigger').forEach(trigger => {
            trigger.classList.remove('active');
          });
          const hlTarget = document.getElementById(highlightId);
          if (hlTarget) {
            hlTarget.classList.add('active');
          }
        }
        
        // Highlight matching SVG node
        if (partNum) {
          const svg = actContainer.querySelector('.svg-mindmap');
          if (svg) {
            svg.querySelectorAll('.mindmap-node.sub').forEach(node => {
              if (node.getAttribute('data-part') === partNum) {
                node.classList.add('active');
              } else {
                node.classList.remove('active');
              }
            });
          }
        }
      }
      
      // Load and autoplay the track in the corresponding act player
      if (actId && partNum) {
        loadTrackInAct(actId, partNum, true);
      }
    });
  });
});


// ==========================================
// 9. ORIGINAL REFERENCE PNG MODAL LIGHTBOX
// ==========================================
const openFullMindmapBtn = document.getElementById('open-full-mindmap');
const mindmapModal = document.getElementById('mindmap-modal');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalMindmapImg = document.getElementById('modal-mindmap-img');
const modalPanBody = document.getElementById('modal-pan-body');

const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomResetBtn = document.getElementById('zoom-reset-btn');
const zoomLevelIndicator = document.getElementById('zoom-level-indicator');

let zoomScale = 0.5;
let isDragging = false;
let startX = 0, startY = 0;
let scrollLeft = 0, scrollTop = 0;

function updateZoom() {
  modalMindmapImg.style.transform = `scale(${zoomScale})`;
  zoomLevelIndicator.textContent = `${Math.round(zoomScale * 100)}%`;
}

if (openFullMindmapBtn && mindmapModal) {
  openFullMindmapBtn.addEventListener('click', (e) => {
    e.preventDefault();
    mindmapModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    zoomScale = 0.4;
    updateZoom();
    setTimeout(() => {
      modalPanBody.scrollLeft = (modalMindmapImg.clientWidth * zoomScale - modalPanBody.clientWidth) / 2;
      modalPanBody.scrollTop = (modalMindmapImg.clientHeight * zoomScale - modalPanBody.clientHeight) / 2;
    }, 100);
  });

  const closeModal = () => {
    mindmapModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  modalCloseBtn.addEventListener('click', closeModal);
  mindmapModal.addEventListener('click', (e) => {
    if (e.target === mindmapModal) closeModal();
  });

  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomScale = Math.min(zoomScale + 0.15, 3.0);
    updateZoom();
  });

  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomScale = Math.max(zoomScale - 0.15, 0.15);
    updateZoom();
  });

  zoomResetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomScale = 0.4;
    updateZoom();
    modalPanBody.scrollLeft = (modalMindmapImg.clientWidth * zoomScale - modalPanBody.clientWidth) / 2;
    modalPanBody.scrollTop = (modalMindmapImg.clientHeight * zoomScale - modalPanBody.clientHeight) / 2;
  });

  modalPanBody.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.pageX - modalPanBody.offsetLeft;
    startY = e.pageY - modalPanBody.offsetTop;
    scrollLeft = modalPanBody.scrollLeft;
    scrollTop = modalPanBody.scrollTop;
  });

  modalPanBody.addEventListener('mouseleave', () => { isDragging = false; });
  modalPanBody.addEventListener('mouseup', () => { isDragging = false; });
  modalPanBody.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - modalPanBody.offsetLeft;
    const y = e.pageY - modalPanBody.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    modalPanBody.scrollLeft = scrollLeft - walkX;
    modalPanBody.scrollTop = scrollTop - walkY;
  });

  modalPanBody.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomScale = Math.min(zoomScale + 0.05, 3.0);
    } else {
      zoomScale = Math.max(zoomScale - 0.05, 0.15);
    }
    updateZoom();
  }, { passive: false });
}
