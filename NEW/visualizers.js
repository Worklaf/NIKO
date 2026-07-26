// ========================================
// 🎵 ВИЗУАЛИЗАТОРЫ + МОБИЛЬНАЯ ВЕРСИЯ
// ========================================

const visualizerTypes = [
  { id: 'circular', name: '⭕ Circular Spectrum' },
  { id: 'radial', name: '🌈 Radial Spectrum' },
  { id: 'neon', name: '💫 Neon Circle' },
  { id: 'golden', name: '🔶 Golden Wave' },
  { id: 'nebula', name: '🌌 Nebula' },
  { id: 'aurora', name: '🌠 Aurora' },
  { id: 'bubbles', name: '🫧 Bubbles' },
  { id: 'dna', name: '🧬 Music DNA' },
  { id: 'laser', name: '⚡ Laser Show' },
  { id: 'rain', name: '💦 Particle Rain' },
  { id: 'tunnel', name: '🚀 Cyber Tunnel' }
];

let visualizerActive = false;
let visualizerFullscreen = false;
let visualizerType = 'circular';
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationId = null;
let rotation = 0;
let particles = [];
let bubbles = [];
let dnaPoints = [];
let auroras = [];
let lasers = [];
let raindrops = [];
let nebulaParticles = [];
let time = 0;
let touchStartX = 0;
let touchEndX = 0;

const neonColors = {
  cyan: '#00E5FF',
  pink: '#FF00E5',
  purple: '#9D00FF',
  orange: '#FF9D00',
  yellow: '#FFFF00',
  green: '#00FF9D',
  blue: '#0066FF'
};

function createDotIndicators() {
  const dotsContainer = document.getElementById('visualizer-dots');
  if (!dotsContainer) return;
  
  dotsContainer.innerHTML = '';
  
  visualizerTypes.forEach((viz, index) => {
    const dot = document.createElement('div');
    dot.className = 'viz-dot';
    dot.dataset.type = viz.id;
    if (viz.id === visualizerType) {
      dot.classList.add('active');
    }
    
    dot.addEventListener('click', () => {
      changeVisualizerType(viz.id);
    });
    
    dotsContainer.appendChild(dot);
  });
}

function updateIndicators() {
  const nameIndicator = document.getElementById('visualizer-name-indicator');
  if (nameIndicator) {
    const vizInfo = visualizerTypes.find(v => v.id === visualizerType);
    nameIndicator.textContent = vizInfo ? vizInfo.name : 'Visualizer';
  }
  
  const dots = document.querySelectorAll('.viz-dot');
  dots.forEach(dot => {
    dot.classList.toggle('active', dot.dataset.type === visualizerType);
  });
}

function nextVisualizer() {
  const currentIndex = visualizerTypes.findIndex(v => v.id === visualizerType);
  const nextIndex = (currentIndex + 1) % visualizerTypes.length;
  changeVisualizerType(visualizerTypes[nextIndex].id);
}

function prevVisualizer() {
  const currentIndex = visualizerTypes.findIndex(v => v.id === visualizerType);
  const prevIndex = (currentIndex - 1 + visualizerTypes.length) % visualizerTypes.length;
  changeVisualizerType(visualizerTypes[prevIndex].id);
}

function handleTouchStart(e) {
  touchStartX = e.touches[0].clientX;
}

function handleTouchMove(e) {
  touchEndX = e.touches[0].clientX;
}

function handleTouchEnd() {
  const swipeThreshold = 80;
  
  if (touchStartX - touchEndX > swipeThreshold) {
    nextVisualizer();
  } else if (touchEndX - touchStartX > swipeThreshold) {
    prevVisualizer();
  }
  
  touchStartX = 0;
  touchEndX = 0;
}

function initSwipeNavigation() {
  const fullscreenDiv = document.getElementById('visualizer-fullscreen');
  if (!fullscreenDiv) return;
  
  fullscreenDiv.addEventListener('touchstart', handleTouchStart, false);
  fullscreenDiv.addEventListener('touchmove', handleTouchMove, false);
  fullscreenDiv.addEventListener('touchend', handleTouchEnd, false);
  
  const prevBtn = document.getElementById('viz-prev-btn');
  const nextBtn = document.getElementById('viz-next-btn');
  
  if (prevBtn) prevBtn.addEventListener('click', prevVisualizer);
  if (nextBtn) nextBtn.addEventListener('click', nextVisualizer);
}

function initVisualizerParticles(canvas) {
  if (visualizerType === 'bubbles' && bubbles.length === 0) {
    for (let i = 0; i < 50; i++) {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 30 + 10,
        speed: Math.random() * 1 + 0.2,
        color: `hsl(${Math.random() * 60 + 180}, 100%, 70%)`,
        amplitude: Math.random() * 20 + 5
      });
    }
  }
  
  if (visualizerType === 'dna' && dnaPoints.length === 0) {
    for (let i = 0; i < 30; i++) {
      dnaPoints.push({
        y: i * 20,
        amplitude: 80,
        speed: 0.1,
        offset: i * 0.2
      });
    }
  }
  
  if (visualizerType === 'aurora' && auroras.length === 0) {
    for (let i = 0; i < 5; i++) {
      auroras.push({
        baseY: canvas.height - (i+1) * (canvas.height / 6),
        amplitude: 40 + i * 15,
        speed: 0.5 + i * 0.1,
        color: i % 2 === 0 ? '#00ff99' : '#00ccff'
      });
    }
  }
  
  if (visualizerType === 'laser' && lasers.length === 0) {
    for (let i = 0; i < 10; i++) {
      lasers.push({
        startX: Math.random() * canvas.width,
        startY: Math.random() * canvas.height,
        length: Math.random() * 200 + 100,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.05 + 0.02,
        width: Math.random() * 5 + 2,
        color: `hsl(${Math.random() * 60 + 180}, 100%, 60%)`
      });
    }
  }
  
  if (visualizerType === 'rain' && raindrops.length === 0) {
    for (let i = 0; i < 200; i++) {
      raindrops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 10 + 5,
        color: `hsla(${Math.random() * 60 + 180}, 100%, 70%, 0.8)`
      });
    }
  }

  if (visualizerType === 'nebula' && nebulaParticles.length === 0) {
    for (let i = 0; i < 100; i++) {
      nebulaParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 0.5 + 0.2,
        color: `rgb(${100 + Math.random() * 155}, ${Math.random() * 100}, ${200 + Math.random() * 55})`
      });
    }
  }
}

function initAudioVisualizer() {
  const canvas = document.getElementById('audio-visualizer');
  if (!canvas) {
    return;
  }
  
  const ctx = canvas.getContext('2d');
  
  canvas.width = Math.min(window.innerWidth * 0.9, 1000);
  canvas.height = Math.min(window.innerHeight * 0.6, 600);
  
  if (!audioContext || audioContext.state === 'closed') {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.85;
      
      const bufferLength = analyser.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
      
      if (wavesurfer && wavesurfer.getMediaElement) {
        try {
          const mediaElement = wavesurfer.getMediaElement();
          const source = audioContext.createMediaElementSource(mediaElement);
          source.connect(analyser);
          analyser.connect(audioContext.destination);
        } catch (e) {}
      }
    } catch (e) {}
  } else {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }
  
  initVisualizerParticles(canvas);
  
  function draw() {
    if (!visualizerActive) return;
    
    time += 0.01;
    rotation += 0.005;
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    switch (visualizerType) {
      case 'circular':
        drawCircularSpectrum(ctx, centerX, centerY);
        break;
      case 'radial':
        drawRadialSpectrum(ctx, centerX, centerY);
        break;
      case 'neon':
        drawNeonCircle(ctx, centerX, centerY);
        break;
      case 'golden':
        drawGoldenWave(ctx, centerX, centerY);
        break;
      case 'nebula':
        drawNebula(ctx, centerX, centerY);
        break;
      case 'aurora':
        drawAurora(ctx, centerX, centerY);
        break;
      case 'bubbles':
        drawBubbles(ctx, centerX, centerY);
        break;
      case 'dna':
        drawMusicDNA(ctx, centerX, centerY);
        break;
      case 'laser':
        drawLaserShow(ctx, centerX, centerY);
        break;
      case 'rain':
        drawParticleRain(ctx, centerX, centerY);
        break;
      case 'tunnel':
        drawCyberTunnel(ctx, centerX, centerY);
        break;
    }
  }

  function drawCircularSpectrum(ctx, centerX, centerY) {
    const radius = Math.min(canvas.width, canvas.height) * 0.3;
    const bars = 180;
    const barWidth = 3;
    
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 2);
    bgGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
    bgGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const avgBass = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const pulseRadius = radius * 0.25 + (avgBass / 255) * 20;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    
    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2;
      
      const freqIndex = Math.floor(i / bars * dataArray.length * 0.8);
      const value = dataArray[freqIndex] || 0;
      const barHeight = (value / 255) * (radius * 0.7);
      
      const hue = (i / bars) * 360;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = barWidth;
      ctx.lineCap = 'round';
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.shadowBlur = 10;
      ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      ctx.stroke();
      
      if (value > 200) {
        ctx.beginPath();
        ctx.arc(x2, y2, barWidth + 1, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${hue}, 100%, 80%)`;
        ctx.shadowBlur = 15;
        ctx.fill();
      }
    }
    
    for (let ring = 0; ring < 3; ring++) {
      const ringRadius = radius * (1 + ring * 0.1) + Math.sin(Date.now() * 0.001) * 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - ring * 0.03})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
  }

  function drawRadialSpectrum(ctx, centerX, centerY) {
    const outerRadius = Math.min(canvas.width, canvas.height) * 0.4;
    const innerRadius = outerRadius * 0.2;
    const bars = 240;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2 + rotation;
      
      const freqIndex = Math.floor((i / bars) * dataArray.length * 0.8);
      const value = dataArray[freqIndex] || 0;
      const lineLength = innerRadius + (value / 255) * (outerRadius - innerRadius);
      
      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * lineLength;
      const y2 = centerY + Math.sin(angle) * lineLength;
      
      const hue = (i / bars) * 360;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 5;
      ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.shadowBlur = 0;
  }

  function drawNeonCircle(ctx, centerX, centerY) {
    const radius = Math.min(canvas.width, canvas.height) * 0.25;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255;
    const trebleAvg = dataArray.slice(80, 120).reduce((a, b) => a + b, 0) / 40 / 255;
    
    const barCount = 64;
    const barWidth = canvas.width / barCount;
    const barMaxHeight = canvas.height * 0.15;
    
    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i] / 255;
      const barHeight = value * barMaxHeight;
      
      const gradient = ctx.createLinearGradient(0, centerY + radius, 0, centerY + radius + barHeight);
      gradient.addColorStop(0, 'rgba(255, 50, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 150, 0, 0.4)');
      
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(255, 100, 0, 0.8)';
      ctx.fillRect(i * barWidth, centerY + radius, barWidth - 1, barHeight);
    }
    
    for (let i = 0; i < barCount; i++) {
      const value = dataArray[barCount + i] / 255;
      const barHeight = value * barMaxHeight;
      
      const gradient = ctx.createLinearGradient(0, centerY - radius - barHeight, 0, centerY - radius);
      gradient.addColorStop(0, 'rgba(100, 0, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 150, 255, 0.8)');
      
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(50, 100, 255, 0.8)';
      ctx.fillRect(i * barWidth, centerY - radius - barHeight, barWidth - 1, barHeight);
    }
    
    const circleGradient = ctx.createLinearGradient(
      centerX - radius, centerY, centerX + radius, centerY
    );
    circleGradient.addColorStop(0, neonColors.cyan);
    circleGradient.addColorStop(0.5, neonColors.purple);
    circleGradient.addColorStop(1, neonColors.pink);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.9, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = circleGradient;
    ctx.lineWidth = 3 + bassAvg * 5;
    ctx.shadowBlur = 20 + trebleAvg * 20;
    ctx.shadowColor = neonColors.cyan;
    ctx.stroke();
    
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * (1 + i * 0.1), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - i * 0.05})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5 + bassAvg * 10, 0, Math.PI * 2);
    ctx.fillStyle = neonColors.cyan;
    ctx.shadowBlur = 30;
    ctx.shadowColor = neonColors.cyan;
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }

  function drawGoldenWave(ctx, centerX, centerY) {
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const goldColors = ['#FFD700', '#FFC125', '#B8860B', '#CD7F32', '#DAA520'];
    
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.lineWidth = 1;
    
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      const freqIndex = Math.floor(x / canvas.width * dataArray.length * 0.8);
      const value = dataArray[freqIndex] / 255;
      
      const y = centerY + 
               Math.sin(x * 0.01 + time * 2) * 30 + 
               Math.sin(x * 0.02 - time * 3) * 20 +
               (value - 0.5) * 80;
               
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, goldColors[0]);
    gradient.addColorStop(0.3, goldColors[1]);
    gradient.addColorStop(0.6, goldColors[2]);
    gradient.addColorStop(0.8, goldColors[3]);
    gradient.addColorStop(1, goldColors[4]);
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = goldColors[0];
    ctx.stroke();
    
    const barCount = 64;
    const barWidth = canvas.width / barCount;
    const barMaxHeight = canvas.height * 0.3;
    
    for (let i = 0; i < barCount; i++) {
      const value = dataArray[i] / 255;
      const barHeight = value * barMaxHeight;
      
      ctx.beginPath();
      ctx.moveTo(i * barWidth, centerY - barHeight / 2);
      ctx.lineTo(i * barWidth, centerY + barHeight / 2);
      ctx.strokeStyle = `rgba(255, 215, 0, ${value * 0.7})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 3;
      ctx.shadowColor = goldColors[0];
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
  }

  function drawNebula(ctx, centerX, centerY) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 1.5 + 0.5;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
      ctx.fill();
    }
    
    nebulaParticles.forEach((p, index) => {
      p.x += Math.sin(time * 0.5 + index) * p.speed;
      p.y += Math.cos(time * 0.3 + index) * p.speed;
      
      if (p.x < -20) p.x = canvas.width + 20;
      if (p.x > canvas.width + 20) p.x = -20;
      if (p.y < -20) p.y = canvas.height + 20;
      if (p.y > canvas.height + 20) p.y = -20;
      
      const freqIndex = Math.floor((index / nebulaParticles.length) * dataArray.length);
      const value = dataArray[freqIndex] / 255;
      
      const size = p.size + value * 10;
      
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3);
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(0.5, p.color.replace(')', ', 0.5)').replace('rgb', 'rgba'));
      gradient.addColorStop(1, p.color.replace(')', ', 0)').replace('rgb', 'rgba'));
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    });
    
    const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255;
    const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 150 + bassAvg * 100);
    glow.addColorStop(0, 'rgba(157, 0, 255, 0.4)');
    glow.addColorStop(0.5, 'rgba(157, 0, 255, 0.1)');
    glow.addColorStop(1, 'rgba(157, 0, 255, 0)');
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, 250, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();
  }

  function drawAurora(ctx, centerX, centerY) {
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#000520');
    bgGradient.addColorStop(1, '#001233');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 0.5;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
      ctx.fill();
    }
    
    const moonRadius = 40;
    const moonGradient = ctx.createRadialGradient(
      canvas.width * 0.8, canvas.height * 0.2, 0,
      canvas.width * 0.8, canvas.height * 0.2, moonRadius
    );
    moonGradient.addColorStop(0, 'rgba(255, 255, 240, 1)');
    moonGradient.addColorStop(0.8, 'rgba(255, 255, 220, 0.9)');
    moonGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
    
    ctx.beginPath();
    ctx.arc(canvas.width * 0.8, canvas.height * 0.2, moonRadius, 0, Math.PI * 2);
    ctx.fillStyle = moonGradient;
    ctx.shadowBlur = 30;
    ctx.shadowColor = 'rgba(255, 255, 200, 0.8)';
    ctx.fill();
    ctx.shadowBlur = 0;
    
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.7);
    
    for (let x = 0; x < canvas.width; x += 50) {
      const height = canvas.height * 0.7 - Math.abs(Math.sin(x * 0.01)) * canvas.height * 0.2;
      ctx.lineTo(x, height);
    }
    
    ctx.lineTo(canvas.width, canvas.height * 0.7);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#000';
    ctx.fill();
    
    auroras.forEach((aurora, index) => {
      ctx.beginPath();
      
      const freqStart = Math.floor(index * dataArray.length / auroras.length);
      const freqEnd = Math.floor((index + 1) * dataArray.length / auroras.length);
      const avgFreq = Array.from(dataArray.slice(freqStart, freqEnd))
                      .reduce((sum, value) => sum + value, 0) / (freqEnd - freqStart) / 255;
      
      const amplitude = aurora.amplitude * (1 + avgFreq * 2);
      
      for (let x = 0; x < canvas.width; x += 5) {
        const wave1 = Math.sin(x * 0.01 + time * aurora.speed) * amplitude;
        const wave2 = Math.sin(x * 0.02 - time * aurora.speed * 0.7) * amplitude * 0.5;
        const y = aurora.baseY + wave1 + wave2;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      const gradient = ctx.createLinearGradient(0, aurora.baseY - amplitude * 2, 0, aurora.baseY + amplitude * 2);
      
      if (index % 2 === 0) {
        gradient.addColorStop(0, 'rgba(0, 255, 153, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 153, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 255, 153, 0)');
      } else {
        gradient.addColorStop(0, 'rgba(0, 204, 255, 0)');
        gradient.addColorStop(0.5, 'rgba(0, 204, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 204, 255, 0)');
      }
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 20 + avgFreq * 30;
      ctx.shadowBlur = 30;
      ctx.shadowColor = aurora.color;
      ctx.stroke();
      ctx.shadowBlur = 0;
    });
  }

  function drawBubbles(ctx, centerX, centerY) {
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#000f33');
    bgGradient.addColorStop(1, '#000510');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255;
    
    bubbles.forEach((bubble, index) => {
      bubble.y -= bubble.speed;
      
      if (bubble.y < -bubble.radius * 2) {
        bubble.y = canvas.height + bubble.radius;
        bubble.x = Math.random() * canvas.width;
      }
      
      bubble.x += Math.sin(time * 0.5 + index) * 1.5;
      
      const freqIndex = Math.floor((index / bubbles.length) * dataArray.length);
      const value = dataArray[freqIndex] / 255;
      
      const radius = bubble.radius * (1 + value * 0.5);
      
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, radius, 0, Math.PI * 2);
      
      const gradient = ctx.createRadialGradient(
        bubble.x - radius * 0.3, bubble.y - radius * 0.3, radius * 0.1,
        bubble.x, bubble.y, radius
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      gradient.addColorStop(0.5, bubble.color.replace('70%', '40%'));
      gradient.addColorStop(1, bubble.color.replace('70%', '10%'));
      
      ctx.fillStyle = gradient;
      ctx.shadowBlur = 15;
      ctx.shadowColor = bubble.color;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(bubble.x - radius * 0.3, bubble.y - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(bubble.x + radius * 0.1, bubble.y + radius * 0.1, radius * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
    });
    
    ctx.shadowBlur = 0;
    
    const glowGradient = ctx.createRadialGradient(
      centerX, canvas.height + 50, 0,
      centerX, canvas.height + 50, canvas.height
    );
    glowGradient.addColorStop(0, 'rgba(0, 200, 255, 0.3)');
    glowGradient.addColorStop(0.5, 'rgba(0, 100, 255, 0.1)');
    glowGradient.addColorStop(1, 'rgba(0, 50, 200, 0)');
    
    ctx.beginPath();
    ctx.arc(centerX, canvas.height + 50, canvas.height, 0, Math.PI * 2);
    ctx.fillStyle = glowGradient;
    ctx.fill();
  }

  function drawMusicDNA(ctx, centerX, centerY) {
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    bgGradient.addColorStop(0, '#1a0030');
    bgGradient.addColorStop(1, '#002050');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const dnaSpeed = time * 1.5;
    
    for (let i = 0; i < dnaPoints.length; i++) {
      const freqIndex = Math.floor(i / dnaPoints.length * dataArray.length * 0.8);
      const value = dataArray[freqIndex] / 255;
      
      const amplitude = dnaPoints[i].amplitude * (1 + value * 0.5);
      
      const y = (dnaPoints[i].y + time * 50) % canvas.height;
      
      const leftX = centerX + Math.sin(dnaSpeed + dnaPoints[i].offset) * amplitude;
      const rightX = centerX + Math.sin(dnaSpeed + dnaPoints[i].offset + Math.PI) * amplitude;
      
      const connectionGradient = ctx.createLinearGradient(leftX, y, rightX, y);
      connectionGradient.addColorStop(0, 'rgba(255, 50, 100, 0.8)');
      connectionGradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.8)');
      connectionGradient.addColorStop(1, 'rgba(50, 255, 200, 0.8)');
      
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(rightX, y);
      ctx.strokeStyle = connectionGradient;
      ctx.lineWidth = 3 + value * 5;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(leftX, y, 6 + value * 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 200, 255, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(rightX, y, 6 + value * 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 50, 200, 0.8)';
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(255, 50, 200, 0.8)';
      ctx.fill();

      if (i > 0) {
        const prevY = (dnaPoints[i-1].y + time * 50) % canvas.height;
        
        if (Math.abs(y - prevY) < 40) {
          const prevLeftX = centerX + Math.sin(dnaSpeed + dnaPoints[i-1].offset) * amplitude;
          const prevRightX = centerX + Math.sin(dnaSpeed + dnaPoints[i-1].offset + Math.PI) * amplitude;
          
          ctx.beginPath();
          ctx.moveTo(leftX, y);
          ctx.lineTo(prevLeftX, prevY);
          ctx.strokeStyle = 'rgba(0, 200, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(rightX, y);
          ctx.lineTo(prevRightX, prevY);
          ctx.strokeStyle = 'rgba(255, 50, 200, 0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, dnaPoints[0].amplitude * 2, 0, Math.PI * 2);
    const glowGradient = ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, dnaPoints[0].amplitude * 3
    );
    glowGradient.addColorStop(0, 'rgba(100, 100, 255, 0.1)');
    glowGradient.addColorStop(0.5, 'rgba(100, 50, 200, 0.05)');
    glowGradient.addColorStop(1, 'rgba(50, 0, 100, 0)');
    
    ctx.fillStyle = glowGradient;
    ctx.fill();
    
    ctx.shadowBlur = 0;
  }

  function drawLaserShow(ctx, centerX, centerY) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255;
    
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 50 + 20;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(50, 50, 80, ${Math.random() * 0.05})`;
      ctx.fill();
    }
    
    lasers.forEach((laser, index) => {
      const freqIndex = Math.floor((index / lasers.length) * dataArray.length * 0.8);
      const value = dataArray[freqIndex] / 255;
      
      laser.angle += laser.speed + value * 0.1;
      
      const endX = laser.startX + Math.cos(laser.angle) * (laser.length + value * 100);
      const endY = laser.startY + Math.sin(laser.angle) * (laser.length + value * 100);
      
      ctx.beginPath();
      ctx.moveTo(laser.startX, laser.startY);
      ctx.lineTo(endX, endY);
      
      ctx.lineWidth = laser.width * (1 + value * 2);
      ctx.strokeStyle = laser.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = laser.color;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(laser.startX, laser.startY, laser.width * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
      
      if (Math.random() > 0.5) {
        ctx.beginPath();
        ctx.arc(endX, endY, laser.width * (1 + Math.random() * 3), 0, Math.PI * 2);
        ctx.fillStyle = laser.color.replace('60%', '80%');
        ctx.fill();
      }
      
      if (Math.random() > 0.99) {
        laser.startX = Math.random() * canvas.width;
        laser.startY = Math.random() * canvas.height;
      }
    });
    
    for (let i = 0; i < 5; i++) {
      if (Math.random() > 0.7) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const radius = Math.random() * 30 + 10 + bassAvg * 30;
        
        const smokeGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        smokeGradient.addColorStop(0, 'rgba(150, 150, 150, 0.2)');
        smokeGradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
        
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = smokeGradient;
        ctx.fill();
      }
    }
    
    ctx.shadowBlur = 0;
  }

  function drawParticleRain(ctx, centerX, centerY) {
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#000510');
    bgGradient.addColorStop(1, '#002050');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const bassAvg = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10 / 255;
    
    raindrops.forEach((drop, index) => {
      const freqIndex = Math.floor((index / raindrops.length) * dataArray.length);
      const value = dataArray[freqIndex] / 255;
      
      const speed = drop.speed * (1 + value * 0.5);
      
      drop.y += speed;
      
      if (drop.y > canvas.height) {
        drop.y = -10;
        drop.x = Math.random() * canvas.width;
      }
      
      const size = drop.size * (1 + value * 0.5);
      
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y - size);
      ctx.bezierCurveTo(
        drop.x - size, drop.y - size/2,
        drop.x - size, drop.y,
        drop.x, drop.y + size
      );
      ctx.bezierCurveTo(
        drop.x + size, drop.y,
        drop.x + size, drop.y - size/2,
        drop.x, drop.y - size
      );
      
      const dropGradient = ctx.createLinearGradient(drop.x, drop.y - size, drop.x, drop.y + size);
      dropGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
      dropGradient.addColorStop(1, drop.color);
      
      ctx.fillStyle = dropGradient;
      ctx.shadowBlur = 10;
      ctx.shadowColor = drop.color;
      ctx.fill();
    });
    
    const reflectionGradient = ctx.createLinearGradient(0, canvas.height - 100, 0, canvas.height);
    reflectionGradient.addColorStop(0, 'rgba(0, 100, 200, 0)');
    reflectionGradient.addColorStop(1, 'rgba(0, 100, 200, 0.2)');
    
    ctx.fillStyle = reflectionGradient;
    ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
    
    for (let i = 0; i < 5; i++) {
      const waveY = canvas.height - 10 - i * 5;
      const amplitude = 3 + i + bassAvg * 10;
      
      ctx.beginPath();
      
      for (let x = 0; x < canvas.width; x += 5) {
        const y = waveY + Math.sin(x * 0.02 + time * (1 + i * 0.5)) * amplitude;
        
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.strokeStyle = `rgba(100, 200, 255, ${0.2 - i * 0.03})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
  }

  function drawCyberTunnel(ctx, centerX, centerY) {
    const radius = Math.min(canvas.width, canvas.height) * 0.3;
    const bars = 90;
    const barWidth = 4;
    
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 3);
    bgGradient.addColorStop(0, 'rgba(20, 0, 40, 1)');
    bgGradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const avgBass = dataArray.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
    const pulseRadius = radius * 0.25 + (avgBass / 255) * 30;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
    ctx.fillStyle = neonColors.pink;
    ctx.shadowBlur = 30;
    ctx.shadowColor = neonColors.pink;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2 + rotation * -1;
      const freqIndex = Math.floor(i / bars * dataArray.length * 0.5);
      const value = dataArray[freqIndex] || 0;
      const barHeight = (value / 255) * (radius * 0.8);
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = barWidth;
      ctx.strokeStyle = neonColors.cyan;
      
      if (value > 150) {
        ctx.strokeStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
      }
      
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    
    for (let ring = 1; ring <= 4; ring++) {
      const ringRadius = radius * (0.3 + ring * 0.15);
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.3 - ring * 0.05})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    const rayCount = 8;
    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + rotation * 2;
      const freqIndex = Math.floor(i / rayCount * dataArray.length * 0.3);
      const value = dataArray[freqIndex] / 255;
      
      if (value > 0.5) {
        const rayLength = radius * 1.5 * value;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * rayLength,
          centerY + Math.sin(angle) * rayLength
        );
        
        ctx.strokeStyle = `rgba(255, 0, 229, ${value * 0.5})`;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = neonColors.pink;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }
  }

  draw();
}

function toggleVisualizerFullscreen() {
  visualizerFullscreen = !visualizerFullscreen;
  
  const fullscreenDiv = document.getElementById('visualizer-fullscreen');
  const container = document.querySelector('.container');
  const btn = document.getElementById('mini-visualizer');
  
  if (visualizerFullscreen) {
    if (!fullscreenDiv) {
  console.warn('visualizer-fullscreen not found');
  return;
}
fullscreenDiv.style.display = 'flex';
if (container) container.style.display = 'none';
if (btn) btn.classList.add('active');
    
    visualizerActive = true;
    
    createDotIndicators();
    initSwipeNavigation();
    updateIndicators();
    
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const titleEl = document.getElementById('visualizer-track-title');
    if (titleEl && currentTrackIndex >= 0) {
      titleEl.textContent = globalTracks[currentTrackIndex]?.title || 'Track';
    }
    
    initAudioVisualizer();
  } else {
    fullscreenDiv.style.display = 'none';
    container.style.display = 'block';
    btn.classList.remove('active');
    
    visualizerActive = false;
    
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }
  
  localStorage.setItem('visualizerFullscreen', visualizerFullscreen);
}
window.toggleVisualizerFullscreen = toggleVisualizerFullscreen;

function changeVisualizerType(type) {
  visualizerType = type;
  
  bubbles = [];
  dnaPoints = [];
  auroras = [];
  lasers = [];
  raindrops = [];
  nebulaParticles = [];
  rotation = 0;
  time = 0;
  
  updateIndicators();
  
  localStorage.setItem('visualizerType', type);
  
  if (visualizerActive) {
    if (animationId) cancelAnimationFrame(animationId);
    initAudioVisualizer();
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const savedType = localStorage.getItem('visualizerType') || 'circular';
  visualizerType = savedType;
  
  document.getElementById('visualizer-close')?.addEventListener('click', () => {
    toggleVisualizerFullscreen();
  });
  
  window.addEventListener('resize', () => {
    if (visualizerFullscreen) {
      initAudioVisualizer();
    }
  });
});