/**
 * Cronômetro & Temporizador de Alta Precisão
 * Lógica modular, precisa e sem drift temporal.
 */

(() => {
  'use strict';

  /* ==========================================================
     SINTETIZADOR DE ÁUDIO (Web Audio API)
     ========================================================== */
  class SoundEffects {
    constructor() {
      this.enabled = true;
      this.audioCtx = null;
    }

    initContext() {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
    }

    playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.15) {
      if (!this.enabled) return;
      try {
        this.initContext();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(gainVal, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
      } catch (err) {
        console.warn('Áudio não disponível no navegador:', err);
      }
    }

    startBeep() {
      this.playTone(880, 'sine', 0.12, 0.2); // Nota Lá (A5)
    }

    pauseBeep() {
      this.playTone(440, 'triangle', 0.15, 0.15); // Nota Lá (A4)
    }

    lapBeep() {
      this.playTone(1046.5, 'sine', 0.08, 0.15); // Nota Dó (C6)
    }

    resetBeep() {
      this.playTone(330, 'sine', 0.15, 0.12); // Nota Mi (E4)
    }

    timerCompleteAlarm() {
      if (!this.enabled) return;
      let count = 0;
      const interval = setInterval(() => {
        this.playTone(987.77, 'square', 0.15, 0.25); // B5
        setTimeout(() => this.playTone(1318.51, 'sine', 0.2, 0.25), 180); // E6
        count++;
        if (count >= 4) clearInterval(interval);
      }, 500);
    }
  }

  const sound = new SoundEffects();

  /* ==========================================================
     NOTIFICAÇÕES TOAST
     ========================================================== */
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  /* ==========================================================
     FORMATADORES DE TEMPO
     ========================================================== */
  function padZero(num, size = 2) {
    return String(Math.floor(num)).padStart(size, '0');
  }

  function formatTimeComponents(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 10); // Centésimos de segundo (00 a 99)

    return {
      hours: padZero(hours),
      minutes: padZero(minutes),
      seconds: padZero(seconds),
      millis: padZero(millis),
      hasHours: hours > 0
    };
  }

  function formatFullTimeString(ms) {
    const { hours, minutes, seconds, millis, hasHours } = formatTimeComponents(ms);
    if (hasHours) {
      return `${hours}:${minutes}:${seconds}.${millis}`;
    }
    return `${minutes}:${seconds}.${millis}`;
  }

  /* ==========================================================
     MÓDULO DO CRONÔMETRO (STOPWATCH)
     ========================================================== */
  class Stopwatch {
    constructor() {
      this.isRunning = false;
      this.startTime = 0;
      this.elapsedTime = 0;
      this.lastLapTime = 0;
      this.laps = [];
      this.animationFrameId = null;

      // Elementos do DOM
      this.hoursEl = document.getElementById('sw-hours');
      this.minutesEl = document.getElementById('sw-minutes');
      this.secondsEl = document.getElementById('sw-seconds');
      this.millisEl = document.getElementById('sw-millis');
      this.statusEl = document.getElementById('sw-status');
      this.ringProgressEl = document.getElementById('stopwatch-ring-progress');
      
      this.btnToggle = document.getElementById('btn-sw-toggle');
      this.btnToggleText = document.getElementById('sw-toggle-text');
      this.playIcon = document.getElementById('sw-play-icon');
      this.pauseIcon = document.getElementById('sw-pause-icon');
      this.btnLap = document.getElementById('btn-sw-lap');
      this.btnReset = document.getElementById('btn-sw-reset');

      // Seção de Voltas
      this.lapsCountEl = document.getElementById('laps-count');
      this.lapsSummaryEl = document.getElementById('laps-summary');
      this.statBestEl = document.getElementById('stat-best');
      this.statWorstEl = document.getElementById('stat-worst');
      this.statAvgEl = document.getElementById('stat-avg');
      this.emptyLapsMsg = document.getElementById('empty-laps-msg');
      this.lapsTable = document.getElementById('laps-table');
      this.lapsTbody = document.getElementById('laps-tbody');
      this.btnCopyLaps = document.getElementById('btn-copy-laps');
      this.btnExportCsv = document.getElementById('btn-export-csv');

      this.circumference = 2 * Math.PI * 125; // 785.398

      this.initEvents();
    }

    initEvents() {
      this.btnToggle.addEventListener('click', () => this.toggle());
      this.btnLap.addEventListener('click', () => this.recordLap());
      this.btnReset.addEventListener('click', () => this.reset());
      this.btnCopyLaps.addEventListener('click', () => this.copyLaps());
      this.btnExportCsv.addEventListener('click', () => this.exportCsv());
    }

    toggle() {
      if (this.isRunning) {
        this.pause();
      } else {
        this.start();
      }
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      this.startTime = performance.now() - this.elapsedTime;

      // Atualiza interface do botão
      this.btnToggle.classList.remove('btn-start');
      this.btnToggle.classList.add('btn-pause');
      this.btnToggleText.textContent = 'Pausar';
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');

      this.btnLap.disabled = false;
      this.btnReset.disabled = false;

      this.statusEl.textContent = 'Em Execução';
      this.statusEl.className = 'status-badge running';
      this.ringProgressEl.classList.add('running');

      sound.startBeep();

      this.tick();
    }

    pause() {
      if (!this.isRunning) return;
      this.isRunning = false;
      cancelAnimationFrame(this.animationFrameId);

      this.btnToggle.classList.remove('btn-pause');
      this.btnToggle.classList.add('btn-start');
      this.btnToggleText.textContent = 'Continuar';
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');

      this.btnLap.disabled = true;

      this.statusEl.textContent = 'Pausado';
      this.statusEl.className = 'status-badge paused';
      this.ringProgressEl.classList.remove('running');

      sound.pauseBeep();
    }

    reset() {
      this.pause();
      this.elapsedTime = 0;
      this.lastLapTime = 0;
      this.laps = [];

      this.btnToggleText.textContent = 'Iniciar';
      this.btnLap.disabled = true;
      this.btnReset.disabled = true;

      this.statusEl.textContent = 'Pronto';
      this.statusEl.className = 'status-badge';

      this.updateDisplay(0);
      this.updateProgressRing(0);
      this.renderLaps();

      sound.resetBeep();
    }

    tick() {
      if (!this.isRunning) return;
      this.elapsedTime = performance.now() - this.startTime;
      this.updateDisplay(this.elapsedTime);
      this.updateProgressRing(this.elapsedTime);

      this.animationFrameId = requestAnimationFrame(() => this.tick());
    }

    updateDisplay(ms) {
      const { hours, minutes, seconds, millis, hasHours } = formatTimeComponents(ms);

      if (hasHours) {
        this.hoursEl.textContent = `${hours}:`;
        this.hoursEl.classList.remove('hide-zero');
      } else {
        this.hoursEl.classList.add('hide-zero');
      }

      this.minutesEl.textContent = minutes;
      this.secondsEl.textContent = seconds;
      this.millisEl.textContent = millis;
    }

    updateProgressRing(ms) {
      // O anel completa uma volta a cada 60 segundos
      const secondsInCycle = (ms % 60000) / 1000;
      const progress = secondsInCycle / 60;
      const offset = this.circumference - (progress * this.circumference);
      this.ringProgressEl.style.strokeDashoffset = offset;
    }

    recordLap() {
      if (!this.isRunning) return;

      const currentTotal = this.elapsedTime;
      const lapDuration = currentTotal - this.lastLapTime;
      this.lastLapTime = currentTotal;

      const lapNumber = this.laps.length + 1;
      this.laps.push({
        number: lapNumber,
        duration: lapDuration,
        total: currentTotal
      });

      sound.lapBeep();
      this.renderLaps();
    }

    renderLaps() {
      const count = this.laps.length;
      this.lapsCountEl.textContent = count;

      if (count === 0) {
        this.emptyLapsMsg.classList.remove('hidden');
        this.lapsTable.classList.add('hidden');
        this.lapsSummaryEl.classList.add('hidden');
        this.btnCopyLaps.disabled = true;
        this.btnExportCsv.disabled = true;
        this.lapsTbody.innerHTML = '';
        return;
      }

      this.emptyLapsMsg.classList.add('hidden');
      this.lapsTable.classList.remove('hidden');
      this.lapsSummaryEl.classList.remove('hidden');
      this.btnCopyLaps.disabled = false;
      this.btnExportCsv.disabled = false;

      // Calcular melhor, pior e média
      let minDuration = Infinity;
      let maxDuration = -Infinity;
      let totalDurationSum = 0;

      this.laps.forEach(l => {
        if (l.duration < minDuration) minDuration = l.duration;
        if (l.duration > maxDuration) maxDuration = l.duration;
        totalDurationSum += l.duration;
      });

      const avgDuration = totalDurationSum / count;

      this.statBestEl.textContent = formatFullTimeString(minDuration);
      this.statWorstEl.textContent = count > 1 ? formatFullTimeString(maxDuration) : '-';
      this.statAvgEl.textContent = formatFullTimeString(avgDuration);

      // Renderizar linhas (mais recente no topo)
      let html = '';
      for (let i = this.laps.length - 1; i >= 0; i--) {
        const lap = this.laps[i];
        let rowClass = '';
        let badgeHtml = '';

        if (count > 1) {
          if (lap.duration === minDuration) {
            rowClass = 'best-lap';
            badgeHtml = '<span class="lap-badge best">Mais Rápida</span>';
          } else if (lap.duration === maxDuration) {
            rowClass = 'worst-lap';
            badgeHtml = '<span class="lap-badge worst">Mais Lenta</span>';
          }
        }

        html += `
          <tr class="${rowClass}">
            <td>#${padZero(lap.number)} ${badgeHtml}</td>
            <td>+${formatFullTimeString(lap.duration)}</td>
            <td>${formatFullTimeString(lap.total)}</td>
          </tr>
        `;
      }

      this.lapsTbody.innerHTML = html;
    }

    copyLaps() {
      if (this.laps.length === 0) return;
      let text = `--- HISTÓRICO DE VOLTAS (${this.laps.length} voltas) ---\n\n`;
      this.laps.forEach(lap => {
        text += `Volta ${padZero(lap.number)}: +${formatFullTimeString(lap.duration)} (Total: ${formatFullTimeString(lap.total)})\n`;
      });
      text += `\nMelhor Volta: ${this.statBestEl.textContent}\nMédia: ${this.statAvgEl.textContent}`;

      navigator.clipboard.writeText(text).then(() => {
        showToast('Voltas copiadas com sucesso!');
      }).catch(() => {
        showToast('Erro ao copiar voltas.');
      });
    }

    exportCsv() {
      if (this.laps.length === 0) return;
      let csv = 'Volta,Tempo da Volta,Tempo Acumulado\n';
      this.laps.forEach(lap => {
        csv += `${lap.number},"${formatFullTimeString(lap.duration)}","${formatFullTimeString(lap.total)}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `cronometro_voltas_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('Arquivo CSV baixado com sucesso!');
    }
  }

  /* ==========================================================
     MÓDULO DO TEMPORIZADOR (COUNTDOWN TIMER)
     ========================================================== */
  class Timer {
    constructor() {
      this.isRunning = false;
      this.initialDurationMs = 5 * 60 * 1000; // 5 minutos padrão
      this.remainingTimeMs = this.initialDurationMs;
      this.endTime = 0;
      this.animationFrameId = null;

      // Elementos do DOM
      this.hoursEl = document.getElementById('tm-hours');
      this.minutesEl = document.getElementById('tm-minutes');
      this.secondsEl = document.getElementById('tm-seconds');
      this.statusEl = document.getElementById('tm-status');
      this.ringProgressEl = document.getElementById('timer-ring-progress');

      this.inputHours = document.getElementById('timer-input-hours');
      this.inputMinutes = document.getElementById('timer-input-minutes');
      this.inputSeconds = document.getElementById('timer-input-seconds');
      this.customInputsWrapper = document.getElementById('custom-inputs-wrapper');
      this.presetsContainer = document.getElementById('timer-presets');

      this.btnToggle = document.getElementById('btn-tm-toggle');
      this.btnToggleText = document.getElementById('tm-toggle-text');
      this.playIcon = document.getElementById('tm-play-icon');
      this.pauseIcon = document.getElementById('tm-pause-icon');
      this.btnReset = document.getElementById('btn-tm-reset');

      this.circumference = 2 * Math.PI * 125; // 785.398

      this.initEvents();
      this.updateDisplay(this.remainingTimeMs);
      this.updateProgressRing(1);
    }

    initEvents() {
      this.btnToggle.addEventListener('click', () => this.toggle());
      this.btnReset.addEventListener('click', () => this.reset());

      // Presets
      this.presetsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.preset-btn');
        if (!btn || this.isRunning) return;

        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const seconds = parseInt(btn.dataset.seconds, 10);
        this.setCustomTime(seconds);
      });

      // Inputs Customizados
      const handleInputChange = () => {
        if (this.isRunning) return;
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));

        const h = Math.max(0, parseInt(this.inputHours.value, 10) || 0);
        const m = Math.max(0, Math.min(59, parseInt(this.inputMinutes.value, 10) || 0));
        const s = Math.max(0, Math.min(59, parseInt(this.inputSeconds.value, 10) || 0));

        const totalSec = (h * 3600) + (m * 60) + s;
        if (totalSec > 0) {
          this.initialDurationMs = totalSec * 1000;
          this.remainingTimeMs = this.initialDurationMs;
          this.updateDisplay(this.remainingTimeMs);
          this.updateProgressRing(1);
        }
      };

      [this.inputHours, this.inputMinutes, this.inputSeconds].forEach(inp => {
        inp.addEventListener('input', handleInputChange);
        inp.addEventListener('blur', () => {
          inp.value = Math.max(0, parseInt(inp.value, 10) || 0);
        });
      });
    }

    setCustomTime(totalSeconds) {
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;

      this.inputHours.value = h;
      this.inputMinutes.value = m;
      this.inputSeconds.value = s;

      this.initialDurationMs = totalSeconds * 1000;
      this.remainingTimeMs = this.initialDurationMs;

      this.statusEl.textContent = 'Temporizador';
      this.statusEl.className = 'status-badge';

      this.updateDisplay(this.remainingTimeMs);
      this.updateProgressRing(1);
    }

    toggle() {
      if (this.isRunning) {
        this.pause();
      } else {
        this.start();
      }
    }

    start() {
      if (this.isRunning) return;
      if (this.remainingTimeMs <= 0) {
        this.remainingTimeMs = this.initialDurationMs;
      }

      this.isRunning = true;
      this.endTime = performance.now() + this.remainingTimeMs;

      this.btnToggle.classList.remove('btn-start');
      this.btnToggle.classList.add('btn-pause');
      this.btnToggleText.textContent = 'Pausar';
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');

      this.statusEl.textContent = 'Contando';
      this.statusEl.className = 'status-badge running';
      this.ringProgressEl.classList.add('running');

      this.disableInputs(true);
      sound.startBeep();

      this.tick();
    }

    pause() {
      if (!this.isRunning) return;
      this.isRunning = false;
      cancelAnimationFrame(this.animationFrameId);

      this.remainingTimeMs = Math.max(0, this.endTime - performance.now());

      this.btnToggle.classList.remove('btn-pause');
      this.btnToggle.classList.add('btn-start');
      this.btnToggleText.textContent = 'Continuar';
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');

      this.statusEl.textContent = 'Pausado';
      this.statusEl.className = 'status-badge paused';
      this.ringProgressEl.classList.remove('running');

      sound.pauseBeep();
    }

    reset() {
      this.pause();
      this.remainingTimeMs = this.initialDurationMs;

      this.btnToggleText.textContent = 'Iniciar';
      this.statusEl.textContent = 'Temporizador';
      this.statusEl.className = 'status-badge';

      this.disableInputs(false);
      this.updateDisplay(this.remainingTimeMs);
      this.updateProgressRing(1);

      sound.resetBeep();
    }

    tick() {
      if (!this.isRunning) return;
      const now = performance.now();
      this.remainingTimeMs = Math.max(0, this.endTime - now);

      this.updateDisplay(this.remainingTimeMs);
      const ratio = this.initialDurationMs > 0 ? this.remainingTimeMs / this.initialDurationMs : 0;
      this.updateProgressRing(ratio);

      if (this.remainingTimeMs <= 0) {
        this.complete();
        return;
      }

      this.animationFrameId = requestAnimationFrame(() => this.tick());
    }

    complete() {
      this.isRunning = false;
      cancelAnimationFrame(this.animationFrameId);

      this.btnToggle.classList.remove('btn-pause');
      this.btnToggle.classList.add('btn-start');
      this.btnToggleText.textContent = 'Iniciar';
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');

      this.statusEl.textContent = 'Tempo Esgotado!';
      this.statusEl.className = 'status-badge finished';
      this.ringProgressEl.classList.remove('running');
      this.disableInputs(false);

      sound.timerCompleteAlarm();
      showToast('⏰ O tempo do temporizador acabou!');
    }

    disableInputs(disabled) {
      this.inputHours.disabled = disabled;
      this.inputMinutes.disabled = disabled;
      this.inputSeconds.disabled = disabled;
      document.querySelectorAll('.preset-btn').forEach(b => b.disabled = disabled);
    }

    updateDisplay(ms) {
      const { hours, minutes, seconds } = formatTimeComponents(ms);
      this.hoursEl.textContent = hours;
      this.minutesEl.textContent = minutes;
      this.secondsEl.textContent = seconds;
    }

    updateProgressRing(ratio) {
      const offset = this.circumference * (1 - ratio);
      this.ringProgressEl.style.strokeDashoffset = offset;
    }
  }

  /* ==========================================================
     GERENCIAMENTO DE ABAS & ATALHOS GLOBAIS
     ========================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    const stopwatch = new Stopwatch();
    const timer = new Timer();

    const tabStopwatch = document.getElementById('tab-stopwatch');
    const tabTimer = document.getElementById('tab-timer');
    const stopwatchSection = document.getElementById('stopwatch-section');
    const timerSection = document.getElementById('timer-section');
    const btnSoundToggle = document.getElementById('btn-sound-toggle');
    const iconSoundOn = document.getElementById('icon-sound-on');
    const iconSoundOff = document.getElementById('icon-sound-off');

    let activeTab = 'stopwatch';

    function switchTab(targetTab) {
      if (targetTab === activeTab) return;
      activeTab = targetTab;

      if (targetTab === 'stopwatch') {
        tabStopwatch.classList.add('active');
        tabStopwatch.setAttribute('aria-selected', 'true');
        tabTimer.classList.remove('active');
        tabTimer.setAttribute('aria-selected', 'false');

        stopwatchSection.classList.add('active');
        timerSection.classList.remove('active');
      } else {
        tabTimer.classList.add('active');
        tabTimer.setAttribute('aria-selected', 'true');
        tabStopwatch.classList.remove('active');
        tabStopwatch.setAttribute('aria-selected', 'false');

        timerSection.classList.add('active');
        stopwatchSection.classList.remove('active');
      }
    }

    tabStopwatch.addEventListener('click', () => switchTab('stopwatch'));
    tabTimer.addEventListener('click', () => switchTab('timer'));

    // Controle de Som
    btnSoundToggle.addEventListener('click', () => {
      sound.enabled = !sound.enabled;
      if (sound.enabled) {
        btnSoundToggle.classList.add('active');
        btnSoundToggle.querySelector('span').textContent = 'Som Ativado';
        iconSoundOn.classList.remove('hidden');
        iconSoundOff.classList.add('hidden');
        sound.startBeep();
      } else {
        btnSoundToggle.classList.remove('active');
        btnSoundToggle.querySelector('span').textContent = 'Som Mudo';
        iconSoundOn.classList.add('hidden');
        iconSoundOff.classList.remove('hidden');
      }
    });

    // Atalhos de Teclado
    window.addEventListener('keydown', (e) => {
      // Ignorar se o usuário estiver digitando em campos de entrada
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      const key = e.key.toLowerCase();

      if (e.code === 'Space') {
        e.preventDefault();
        if (activeTab === 'stopwatch') {
          stopwatch.toggle();
        } else {
          timer.toggle();
        }
      } else if (key === 'l') {
        if (activeTab === 'stopwatch') {
          stopwatch.recordLap();
        }
      } else if (key === 'r') {
        if (activeTab === 'stopwatch') {
          stopwatch.reset();
        } else {
          timer.reset();
        }
      } else if (key === 't') {
        switchTab(activeTab === 'stopwatch' ? 'timer' : 'stopwatch');
      }
    });
  });
})();
