// src/controllers/scorm.controller.js
const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const db = require('../db');
const PaqueteGenerado = require('../models/paquete_generado.model');
const {
  buildManifestXml,
  buildManifestXml2004,
  normalizeRelativePath,
  resolveArchivoPath,
  ensureFileExists,
  validateScormData,
} = require('../services/scorm12');

const CONTENT_PREFIX = 'content';
const WRAPPER_DIR = '_wrappers';
const ENABLE_SCO_WRAPPER = String(process.env.SCORM_WRAP_SCO || 'true').toLowerCase() === 'true';
const WRAPPER_AUTO_COMPLETE = String(process.env.SCORM_WRAP_AUTO_COMPLETE || 'true').toLowerCase() === 'true';
const WRAPPER_STATIC_MIN_SECONDS = Number.parseInt(process.env.SCORM_WRAP_MIN_SECONDS || '180', 10);
const WRAPPER_MEDIA_RATIO = Number.parseFloat(process.env.SCORM_WRAP_MEDIA_RATIO || '0.85');
const WRAPPER_COMMIT_INTERVAL = Number.parseInt(process.env.SCORM_WRAP_COMMIT_INTERVAL || '60000', 10);
const WRAPPER_ALLOW_HTML = String(process.env.SCORM_WRAP_HTML || 'true').toLowerCase() === 'true';

const sanitizeFilename = (value) => {
  const base = String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return base || 'recurso';
};

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const buildScoWrapperHtml = ({ title, courseTitle, entryPath, tracking, coverPath }) => {
  const safeTitle = escapeHtml(title || 'Contenido');
  const safeCourse = escapeHtml(courseTitle || '');
  const coverLiteral = coverPath ? JSON.stringify(coverPath) : 'null';
  const entryLiteral = JSON.stringify(entryPath || '');
  const minSeconds = Number.isFinite(tracking?.minSeconds)
    ? tracking.minSeconds
    : Number.isFinite(WRAPPER_STATIC_MIN_SECONDS)
      ? WRAPPER_STATIC_MIN_SECONDS
      : 180;
  const mediaRatio = Number.isFinite(tracking?.mediaRatio)
    ? tracking.mediaRatio
    : Number.isFinite(WRAPPER_MEDIA_RATIO)
      ? WRAPPER_MEDIA_RATIO
      : 0.85;
  const commitInterval = Number.isFinite(WRAPPER_COMMIT_INTERVAL) ? WRAPPER_COMMIT_INTERVAL : 30000;
  const autoComplete = tracking?.autoComplete !== undefined ? tracking.autoComplete : WRAPPER_AUTO_COMPLETE;
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #eff3f8;
        --ink: #0f172a;
        --muted: #64748b;
        --nav: #0b1630;
        --nav-2: #0f1f3f;
        --accent: #22c55e;
        --accent-2: #06b6d4;
        --card: #ffffff;
        --line: #e2e8f0;
        --shadow: 0 26px 70px rgba(15, 23, 42, 0.18);
        --radius: 18px;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Trebuchet MS", "Segoe UI", Arial, sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at 15% 0%, rgba(6, 182, 212, 0.12) 0%, transparent 45%),
          radial-gradient(circle at 85% 10%, rgba(34, 197, 94, 0.10) 0%, transparent 50%),
          #eff3f8;
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 18px 26px;
        background: linear-gradient(120deg, var(--nav) 0%, var(--nav-2) 60%, var(--nav) 100%);
        color: #f8fafc;
        position: sticky;
        top: 0;
        z-index: 10;
        box-shadow: 0 14px 30px rgba(2, 6, 23, 0.35);
      }
      .course { display: flex; align-items: center; gap: 16px; }
      .course-avatar {
        width: 54px;
        height: 54px;
        border-radius: 16px;
        background: linear-gradient(135deg, #22c55e, #06b6d4);
        color: #0b1a33;
        display: grid;
        place-items: center;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
        box-shadow: inset 0 0 0 2px rgba(15, 23, 42, 0.2), 0 10px 22px rgba(6, 182, 212, 0.3);
        overflow: hidden;
      }
      .course-avatar img { width: 100%; height: 100%; object-fit: cover; display: none; }
      .course-titles h1 { font-size: 18px; margin: 0; font-weight: 700; letter-spacing: 0.2px; }
      .course-titles small { display: block; font-size: 12px; color: #cbd5f5; }
      header button {
        background: var(--accent);
        color: #052e16;
        border: none;
        padding: 10px 18px;
        border-radius: 999px;
        font-weight: 800;
        cursor: pointer;
        box-shadow: 0 8px 20px rgba(34, 197, 94, 0.35);
      }
      header button:disabled { opacity: 0.6; cursor: not-allowed; box-shadow: none; }
      .header-actions { display: flex; align-items: center; gap: 16px; }
      .header-buttons { display: flex; align-items: center; gap: 10px; }
      .header-buttons .ghost {
        background: rgba(148, 163, 184, 0.15);
        color: #f8fafc;
        border: 1px solid rgba(148, 163, 184, 0.4);
        box-shadow: none;
      }
      .progress {
        min-width: 190px;
        display: grid;
        gap: 6px;
        font-size: 12px;
        color: #e2e8f0;
      }
      .progress-meta {
        display: flex;
        justify-content: space-between;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .progress-bar {
        height: 8px;
        background: rgba(148, 163, 184, 0.25);
        border-radius: 999px;
        overflow: hidden;
      }
      .progress-bar span {
        display: block;
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #22c55e, #06b6d4);
        transition: width 0.4s ease;
      }
      .progress-status { color: #cbd5f5; }
      .progress-time { color: #94a3b8; }

      .hero {
        margin: 20px auto 0;
        width: min(1200px, 94vw);
        background: linear-gradient(120deg, rgba(255,255,255,0.94), rgba(255,255,255,0.88));
        border: 1px solid rgba(226, 232, 240, 0.8);
        border-radius: 22px;
        padding: 18px;
        box-shadow: var(--shadow);
        display: grid;
        grid-template-columns: 220px minmax(0, 1fr);
        gap: 18px;
        align-items: center;
      }
      .hero-cover {
        width: 100%;
        height: 130px;
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(6, 182, 212, 0.16), rgba(34, 197, 94, 0.15));
        border: 1px solid rgba(226, 232, 240, 0.8);
        overflow: hidden;
        display: grid;
        place-items: center;
      }
      .hero-cover img { width: 100%; height: 100%; object-fit: cover; display: none; }
      .hero-info h2 { margin: 0 0 6px; font-size: 20px; }
      .hero-info p { margin: 0; color: var(--muted); font-size: 14px; }
      .hero-meta { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
      .pill {
        background: #f1f5f9;
        border: 1px solid var(--line);
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 12px;
        color: #1f2937;
      }

      .frame-wrap { padding: 20px 0 32px; display: grid; place-items: center; }
      .content-card {
        width: min(1200px, 94vw);
        background: var(--card);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        padding: 20px;
        border: 1px solid var(--line);
      }
      .content-meta {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto auto;
        align-items: center;
        gap: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--line);
        margin-bottom: 12px;
      }
      .content-meta strong { font-size: 15px; }
      .content-tag { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; padding: 5px 12px; border-radius: 999px; background: #e2e8f0; color: #1e293b; }
      .content-actions { display: flex; gap: 8px; flex-wrap: wrap; }
      .content-actions a {
        text-decoration: none;
        font-size: 12px;
        padding: 7px 12px;
        border-radius: 999px;
        border: 1px solid #cbd5f5;
        color: #0f172a;
        background: #f8fafc;
      }
      .content-actions button {
        font-size: 12px;
        padding: 7px 12px;
        border-radius: 999px;
        border: 1px solid #cbd5f5;
        color: #0f172a;
        background: #f8fafc;
        cursor: pointer;
      }
      .content-actions a.primary { background: var(--accent); color: #052e16; border-color: transparent; }
      .viewer {
        background: #f8fafc;
        border-radius: 16px;
        padding: 14px;
        border: 1px solid var(--line);
      }
      iframe, video, audio, img {
        width: 100%;
        border: none;
        border-radius: 14px;
        background: #ffffff;
      }
      iframe { height: calc(100vh - 340px); }
      video { height: calc(100vh - 340px); background: #ffffff; }
      img { max-height: calc(100vh - 340px); object-fit: contain; background: #ffffff; }
      audio { background: #ffffff; }
      .file-card {
        padding: 28px;
        background: #fff;
        border-radius: 14px;
        border: 1px dashed #cbd5f5;
        text-align: center;
      }
      .file-card h3 { margin: 0 0 8px; color: #0f172a; }
      .file-card p { margin: 0 0 12px; color: var(--muted); }
      .status { font-size: 12px; color: #94a3b8; }

      body.reading header { box-shadow: none; }
      body.reading .hero { display: none; }
      body.reading .frame-wrap { padding-top: 10px; }
      body.reading .content-card { width: min(1400px, 98vw); }
      body.reading .viewer { padding: 0; background: #fff; }
      body.reading iframe { height: 88vh; }
      body.fullscreen header { position: static; box-shadow: none; }
      body.fullscreen .hero { display: none; }
      body.fullscreen .frame-wrap { padding: 0; }
      body.fullscreen .content-card {
        width: 100vw;
        border-radius: 0;
        min-height: 100vh;
        box-shadow: none;
        border: none;
      }
      body.fullscreen .viewer { padding: 0; border: none; }
      body.fullscreen iframe,
      body.fullscreen video,
      body.fullscreen img { height: calc(100vh - 96px); }

      @media (max-width: 980px) {
        .hero {
          grid-template-columns: 1fr;
          text-align: center;
        }
        .hero-cover {
          height: 160px;
        }
        .hero-meta {
          justify-content: center;
        }
        .content-meta {
          grid-template-columns: 1fr;
          justify-items: start;
        }
        .content-actions {
          width: 100%;
        }
        .content-actions a,
        .content-actions button {
          flex: 1 1 auto;
          text-align: center;
        }
        .header-actions {
          width: 100%;
          flex-direction: column;
          align-items: stretch;
        }
        .header-buttons {
          width: 100%;
        }
        .header-buttons button {
          flex: 1 1 auto;
        }
        .progress {
          width: 100%;
        }
        iframe,
        video {
          height: 60vh;
        }
      }

      @media (max-width: 640px) {
        header {
          flex-direction: column;
          align-items: flex-start;
        }
        header button {
          width: 100%;
        }
        .course {
          width: 100%;
        }
        .content-card {
          padding: 14px;
        }
        .viewer {
          padding: 10px;
        }
        iframe,
        video {
          height: 55vh;
        }
      }
    </style>
  </head>
  <body>
    <header>
      <div class="course">
        <div class="course-avatar" id="course-avatar">
          <span id="course-initials">SC</span>
          <img id="course-cover" alt="Portada del curso">
        </div>
        <div class="course-titles">
          <h1>${safeCourse || safeTitle}</h1>
          <small id="scorm-status">SCORM no inicializado</small>
        </div>
      </div>
      <div class="header-actions">
        <div class="progress">
          <div class="progress-meta">
            <span>Progreso</span>
            <span id="progress-value">0%</span>
          </div>
          <div class="progress-bar"><span id="progress-fill"></span></div>
          <div class="progress-meta">
            <span class="progress-status" id="progress-status">Sin iniciar</span>
            <span class="progress-time" id="progress-time">00:00:00</span>
          </div>
        </div>
        <div class="header-buttons">
          <button type="button" id="fullscreen-toggle" class="ghost">Pantalla completa</button>
          <button type="button" id="scorm-complete">Finalizar</button>
        </div>
      </div>
    </header>
    <section class="hero">
      <div class="hero-cover" id="hero-cover">
        <img id="hero-cover-img" alt="Portada del curso">
        <span id="hero-cover-initials"></span>
      </div>
      <div class="hero-info">
        <h2>${safeCourse || safeTitle}</h2>
        <p>Contenido e-learning premium con seguimiento SCORM.</p>
        <div class="hero-meta">
          <span class="pill" id="hero-type">SCO</span>
          <span class="pill">SCORM ${safeCourse ? 'Activo' : 'Contenido'}</span>
        </div>
      </div>
    </section>

    <div class="frame-wrap">
      <div class="content-card">
        <div class="content-meta">
          <strong id="content-title">${safeTitle}</strong>
          <div class="content-actions">
            <a id="open-link" class="primary" target="_blank" rel="noreferrer">Abrir</a>
            <a id="download-link" download>Descargar</a>
            <button type="button" id="reading-toggle">Modo lectura</button>
          </div>
          <span class="content-tag" id="content-type">SCO</span>
        </div>
        <div class="viewer" id="viewer">
          <iframe id="scorm-frame" title="${safeTitle}" loading="lazy"></iframe>
        </div>
      </div>
    </div>
    <script>
      (function () {
        var entrySrc = ${entryLiteral};
        var iframe = document.getElementById('scorm-frame');
        iframe.src = entrySrc;
        var avatarEl = document.getElementById('course-avatar');
        var statusEl = document.getElementById('scorm-status');
        var contentTypeEl = document.getElementById('content-type');
        var contentTitleEl = document.getElementById('content-title');
        var progressFill = document.getElementById('progress-fill');
        var progressValueEl = document.getElementById('progress-value');
        var progressStatusEl = document.getElementById('progress-status');
        var progressTimeEl = document.getElementById('progress-time');
        var fullscreenToggle = document.getElementById('fullscreen-toggle');

        function getInitials(text) {
          var value = String(text || '').trim();
          if (!value) return 'SC';
          var parts = value.split(/\s+/).slice(0, 2);
          return parts.map(function (p) { return p.charAt(0); }).join('').toUpperCase();
        }

        var initialsEl = document.getElementById('course-initials');
        var coverEl = document.getElementById('course-cover');
        if (initialsEl) {
          initialsEl.textContent = getInitials(${JSON.stringify(safeCourse || safeTitle)});
        }
        if (coverEl && ${coverLiteral}) {
          coverEl.src = ${coverLiteral};
          coverEl.style.display = 'block';
          if (initialsEl) initialsEl.style.display = 'none';
        }

        var heroCover = document.getElementById('hero-cover-img');
        var heroCoverInitials = document.getElementById('hero-cover-initials');
        if (heroCoverInitials) {
          heroCoverInitials.textContent = getInitials(${JSON.stringify(safeCourse || safeTitle)});
        }
        if (heroCover && ${coverLiteral}) {
          heroCover.src = ${coverLiteral};
          heroCover.style.display = 'block';
          if (heroCoverInitials) heroCoverInitials.style.display = 'none';
        }

        function findApi(win) {
          var max = 7;
          while (win && max > 0) {
            if (win.API_1484_11) return { api: win.API_1484_11, is2004: true };
            if (win.API) return { api: win.API, is2004: false };
            if (win.parent && win.parent !== win) {
              win = win.parent;
            } else {
              break;
            }
            max--;
          }
          return { api: null, is2004: false };
        }

        function createProxy(api) {
          if (!api) return null;
          return {
            LMSInitialize: function (arg) { return api.LMSInitialize ? api.LMSInitialize(arg) : 'false'; },
            LMSGetValue: function (key) { return api.LMSGetValue ? api.LMSGetValue(key) : ''; },
            LMSSetValue: function (key, value) { return api.LMSSetValue ? api.LMSSetValue(key, value) : 'false'; },
            LMSCommit: function (arg) { return api.LMSCommit ? api.LMSCommit(arg) : 'false'; },
            LMSFinish: function (arg) { return api.LMSFinish ? api.LMSFinish(arg) : 'false'; },
            LMSGetLastError: function () { return api.LMSGetLastError ? api.LMSGetLastError() : '0'; },
            LMSGetErrorString: function (code) { return api.LMSGetErrorString ? api.LMSGetErrorString(code) : ''; },
            LMSGetDiagnostic: function (code) { return api.LMSGetDiagnostic ? api.LMSGetDiagnostic(code) : ''; },
            Initialize: function (arg) { return api.Initialize ? api.Initialize(arg) : 'false'; },
            GetValue: function (key) { return api.GetValue ? api.GetValue(key) : ''; },
            SetValue: function (key, value) { return api.SetValue ? api.SetValue(key, value) : 'false'; },
            Commit: function (arg) { return api.Commit ? api.Commit(arg) : 'false'; },
            Terminate: function (arg) { return api.Terminate ? api.Terminate(arg) : 'false'; },
            GetLastError: function () { return api.GetLastError ? api.GetLastError() : '0'; },
            GetErrorString: function (code) { return api.GetErrorString ? api.GetErrorString(code) : ''; },
            GetDiagnostic: function (code) { return api.GetDiagnostic ? api.GetDiagnostic(code) : ''; },
          };
        }

        function formatScorm12Time(totalSeconds) {
          var safe = Math.max(0, Math.floor(totalSeconds || 0));
          var hours = String(Math.floor(safe / 3600)).padStart(2, '0');
          var minutes = String(Math.floor((safe % 3600) / 60)).padStart(2, '0');
          var seconds = String(safe % 60).padStart(2, '0');
          return hours + ':' + minutes + ':' + seconds;
        }

        function formatScorm2004Duration(totalSeconds) {
          var safe = Math.max(0, Math.floor(totalSeconds || 0));
          if (!safe) return 'PT0S';
          var hours = Math.floor(safe / 3600);
          var minutes = Math.floor((safe % 3600) / 60);
          var seconds = safe % 60;
          var value = 'PT';
          if (hours) value += hours + 'H';
          if (minutes) value += minutes + 'M';
          if (seconds || (!hours && !minutes)) value += seconds + 'S';
          return value;
        }

        function formatDisplayTime(totalSeconds) {
          return formatScorm12Time(totalSeconds);
        }

        function parseProgressValue(raw) {
          if (raw === null || raw === undefined) return null;
          if (typeof raw === 'number' && isFinite(raw)) {
            return Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw));
          }
          var value = String(raw || '').trim();
          if (!value) return null;
          if (value.endsWith('%')) {
            var pct = parseFloat(value.slice(0, -1));
            if (!isFinite(pct)) return null;
            return Math.max(0, Math.min(1, pct / 100));
          }
          var num = parseFloat(value);
          if (!isFinite(num)) return null;
          return Math.max(0, Math.min(1, num > 1 ? num / 100 : num));
        }

        function updateProgressUi(value, statusLabel) {
          var safe = Math.max(0, Math.min(1, value || 0));
          var percent = Math.round(safe * 100);
          if (progressFill) progressFill.style.width = percent + '%';
          if (progressValueEl) progressValueEl.textContent = percent + '%';
          if (statusLabel && progressStatusEl) {
            progressStatusEl.textContent = statusLabel;
          }
        }

        function updateTimer() {
          var seconds = Math.floor((Date.now() - start) / 1000);
          if (progressTimeEl) {
            progressTimeEl.textContent = formatDisplayTime(seconds);
          }
        }

        function updateFullscreenState() {
          var isFullscreen = !!document.fullscreenElement;
          document.body.classList.toggle('fullscreen', isFullscreen);
          if (fullscreenToggle) {
            fullscreenToggle.textContent = isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa';
          }
        }

        var apiInfo = findApi(window);
        var api = apiInfo.api;
        var is2004 = apiInfo.is2004;
        var start = Date.now();
        var finishBtn = document.getElementById('scorm-complete');
        var autoComplete = ${autoComplete ? 'true' : 'false'};
        var minSeconds = ${minSeconds};
        var mediaRatio = ${mediaRatio};
        var commitInterval = ${commitInterval};
        var completionSet = false;

        function setStatus(text) {
          if (statusEl) statusEl.textContent = text;
        }

        function setSessionTime() {
          var seconds = Math.floor((Date.now() - start) / 1000);
          if (!api) return;
          if (is2004) {
            api.SetValue('cmi.session_time', formatScorm2004Duration(seconds));
          } else {
            api.LMSSetValue('cmi.core.session_time', formatScorm12Time(seconds));
          }
          updateTimer();
        }

        function setProgress(value) {
          var safe = Math.max(0, Math.min(1, value || 0));
          updateProgressUi(safe);
          if (!api) return;
          if (is2004) {
            api.SetValue('cmi.progress_measure', String(safe.toFixed(3)));
          } else {
            api.LMSSetValue('cmi.core.lesson_location', String(Math.round(safe * 100)) + '%');
          }
        }

        function getStatus() {
          if (!api) return '';
          if (is2004) {
            return api.GetValue('cmi.completion_status') || api.GetValue('cmi.success_status') || '';
          }
          return api.LMSGetValue('cmi.core.lesson_status') || '';
        }

        function updateProgressFromApi() {
          if (!api) return;
          var progress = null;
          var statusText = '';
          if (is2004) {
            progress = parseProgressValue(api.GetValue('cmi.progress_measure'));
            statusText = api.GetValue('cmi.completion_status') || api.GetValue('cmi.success_status') || '';
            if (progress === null) {
              progress = parseProgressValue(api.GetValue('cmi.score.scaled'));
            }
          } else {
            progress = parseProgressValue(api.LMSGetValue('cmi.core.lesson_location'));
            statusText = api.LMSGetValue('cmi.core.lesson_status') || '';
            if (progress === null) {
              progress = parseProgressValue(api.LMSGetValue('cmi.core.score.raw'));
            }
          }
          if (progress !== null) {
            updateProgressUi(progress);
          }
          if (statusText && progressStatusEl) {
            progressStatusEl.textContent = statusText;
          }
        }

        function setCompleted() {
          if (!api || completionSet) return;
          var current = String(getStatus() || '').toLowerCase();
          if (current && current !== 'not attempted' && current !== 'unknown') {
            completionSet = true;
            return;
          }
          if (is2004) {
            api.SetValue('cmi.completion_status', 'completed');
            var success = api.GetValue('cmi.success_status');
            if (!success || success === 'unknown') {
              api.SetValue('cmi.success_status', 'passed');
            }
            api.Commit('');
          } else {
            api.LMSSetValue('cmi.core.lesson_status', 'completed');
            api.LMSCommit('');
          }
          completionSet = true;
          if (progressStatusEl) {
            progressStatusEl.textContent = 'completed';
          }
        }

        function maybeAutoCompleteByTime() {
          if (!autoComplete || minSeconds < 0) return;
          var seconds = Math.floor((Date.now() - start) / 1000);
          var progress = minSeconds > 0 ? Math.min(1, seconds / minSeconds) : 0;
          setProgress(progress);
          if (seconds >= minSeconds) {
            setCompleted();
          }
        }

        function finish() {
          if (!api) return;
          setSessionTime();
          maybeAutoCompleteByTime();
          setCompleted();
          if (is2004) {
            api.SetValue('cmi.exit', 'normal');
            api.Commit('');
            api.Terminate('');
          } else {
            api.LMSSetValue('cmi.core.exit', '');
            api.LMSCommit('');
            api.LMSFinish('');
          }
          setStatus('Sesion finalizada');
          finishBtn.disabled = true;
        }

        if (api) {
          var proxy = createProxy(api);
          if (proxy) {
            window.API = proxy;
            window.API_1484_11 = proxy;
          }
          if (is2004) {
            api.Initialize('');
          } else {
            api.LMSInitialize('');
          }
          setStatus('SCORM inicializado');
          if (progressStatusEl) progressStatusEl.textContent = 'En curso';
          updateProgressFromApi();
        } else {
          setStatus('API SCORM no encontrada');
          if (progressStatusEl) progressStatusEl.textContent = 'Sin API';
          finishBtn.disabled = true;
        }

        var frameWrap = document.getElementById('viewer');
        var openLink = document.getElementById('open-link');
        var downloadLink = document.getElementById('download-link');
        var readingToggle = document.getElementById('reading-toggle');
        if (openLink) openLink.href = entrySrc;
        if (downloadLink) downloadLink.href = entrySrc;
        var heroType = document.getElementById('hero-type');

        var entryLower = String(entrySrc || '').toLowerCase();
        var cleanPath = entryLower.split('#')[0].split('?')[0];
        var ext = cleanPath.includes('.') ? cleanPath.slice(cleanPath.lastIndexOf('.') + 1) : '';
        var isVideo = ['mp4', 'webm', 'm4v', 'mpg', 'mpeg'].includes(ext);
        var isAudio = ['mp3', 'wav'].includes(ext);
        var isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext);
        var isPdf = ext === 'pdf';
        var isPpt = ['ppt', 'pptx'].includes(ext);
        var isDoc = ['doc', 'docx'].includes(ext);
        var isXls = ['xls', 'xlsx', 'csv'].includes(ext);
        var mediaEl = null;

        if (frameWrap && (isVideo || isAudio || isImage || isPdf)) {
          frameWrap.innerHTML = '';
          if (isVideo) {
            var video = document.createElement('video');
            video.controls = true;
            video.src = entrySrc;
            frameWrap.appendChild(video);
            mediaEl = video;
            if (contentTypeEl) contentTypeEl.textContent = 'Video';
            if (heroType) heroType.textContent = 'Video';
          } else if (isAudio) {
            var audio = document.createElement('audio');
            audio.controls = true;
            audio.src = entrySrc;
            frameWrap.appendChild(audio);
            mediaEl = audio;
            if (contentTypeEl) contentTypeEl.textContent = 'Audio';
            if (heroType) heroType.textContent = 'Audio';
          } else if (isImage) {
            var img = document.createElement('img');
            img.src = entrySrc;
            img.alt = ${JSON.stringify(safeTitle)};
            frameWrap.appendChild(img);
            if (contentTypeEl) contentTypeEl.textContent = 'Imagen';
            if (heroType) heroType.textContent = 'Imagen';
          } else {
            var pdfFrame = document.createElement('iframe');
            var pdfSrc = entrySrc;
            if (pdfSrc.indexOf('#') === -1) {
              pdfSrc = pdfSrc + '#toolbar=0&navpanes=0&statusbar=0&view=FitH';
            }
            pdfFrame.src = pdfSrc;
            pdfFrame.title = ${JSON.stringify(safeTitle)};
            frameWrap.appendChild(pdfFrame);
            if (contentTypeEl) contentTypeEl.textContent = 'PDF';
            if (heroType) heroType.textContent = 'PDF';
          }
        } else if (frameWrap && (isPpt || isDoc || isXls)) {
          frameWrap.innerHTML = '';
          if (contentTypeEl) {
            contentTypeEl.textContent = isPpt ? 'Presentacion' : isDoc ? 'Documento' : 'Hoja de calculo';
          }
          if (heroType) {
            heroType.textContent = isPpt ? 'Presentacion' : isDoc ? 'Documento' : 'Hoja de calculo';
          }
          var card = document.createElement('div');
          card.className = 'file-card';
          var title = document.createElement('h3');
          title.textContent = 'Vista previa no disponible';
          var info = document.createElement('p');
          info.textContent = 'Descarga o abre el archivo para verlo en tu dispositivo.';
          card.appendChild(title);
          card.appendChild(info);
          frameWrap.appendChild(card);
        } else if (frameWrap && ext && !['html', 'htm'].includes(ext)) {
          frameWrap.innerHTML = '';
          if (contentTypeEl) contentTypeEl.textContent = 'Archivo';
          if (heroType) heroType.textContent = 'Archivo';
          var cardGeneric = document.createElement('div');
          cardGeneric.className = 'file-card';
          var titleGeneric = document.createElement('h3');
          titleGeneric.textContent = 'Contenido listo para descargar';
          var infoGeneric = document.createElement('p');
          infoGeneric.textContent = 'Este tipo de archivo se entrega para descarga.';
          cardGeneric.appendChild(titleGeneric);
          cardGeneric.appendChild(infoGeneric);
          frameWrap.appendChild(cardGeneric);
        }

        if (readingToggle) {
          readingToggle.addEventListener('click', function () {
            if (document.body.classList.contains('reading')) {
              document.body.classList.remove('reading');
              readingToggle.textContent = 'Modo lectura';
            } else {
              document.body.classList.add('reading');
              readingToggle.textContent = 'Salir lectura';
            }
          });
        }

        if (fullscreenToggle) {
          fullscreenToggle.addEventListener('click', function () {
            if (document.fullscreenElement) {
              document.exitFullscreen && document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
            }
          });
          document.addEventListener('fullscreenchange', updateFullscreenState);
          updateFullscreenState();
        }

        if (mediaEl && autoComplete) {
          mediaEl.addEventListener('timeupdate', function () {
            if (!mediaEl.duration || !isFinite(mediaEl.duration)) return;
            var progress = mediaEl.currentTime / mediaEl.duration;
            setProgress(progress);
            if (progress >= mediaRatio) {
              setCompleted();
            }
          });
          mediaEl.addEventListener('ended', function () {
            setCompleted();
          });
        }

        finishBtn.addEventListener('click', finish);
        updateTimer();
        setInterval(updateTimer, 1000);
        if (api) {
          setInterval(updateProgressFromApi, 5000);
        }
        if (commitInterval > 0) {
          setInterval(function () {
            if (!api) return;
            setSessionTime();
            maybeAutoCompleteByTime();
            if (is2004) {
              api.Commit('');
            } else {
              api.LMSCommit('');
            }
          }, commitInterval);
        }
        window.addEventListener('beforeunload', function () {
          if (!api) return;
          setSessionTime();
          maybeAutoCompleteByTime();
          if (is2004) {
            api.Commit('');
          } else {
            api.LMSCommit('');
          }
        });
        document.addEventListener('visibilitychange', function () {
          if (document.visibilityState === 'hidden') {
            if (!api) return;
            setSessionTime();
            maybeAutoCompleteByTime();
            if (is2004) {
              api.Commit('');
            } else {
              api.LMSCommit('');
            }
          }
        });
      })();
    </script>
  </body>
</html>`;
};

const buildScoWrapper = (recurso, courseInfo = {}) => {
  const originalHref = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
  if (!originalHref) return null;
  const ext = path.extname(originalHref).toLowerCase();
  if ((ext === '.html' || ext === '.htm') && !WRAPPER_ALLOW_HTML) {
    return null;
  }
  let tracking = {
    autoComplete: WRAPPER_AUTO_COMPLETE,
    minSeconds: WRAPPER_STATIC_MIN_SECONDS,
    mediaRatio: WRAPPER_MEDIA_RATIO,
  };
  if (recurso.parametros) {
    try {
      const parsed =
        typeof recurso.parametros === 'string' ? JSON.parse(recurso.parametros) : recurso.parametros;
      if (typeof parsed?.auto_complete === 'boolean') {
        tracking.autoComplete = parsed.auto_complete;
      }
      if (Number.isFinite(Number(parsed?.min_seconds))) {
        tracking.minSeconds = Math.max(0, Number(parsed.min_seconds));
      }
      if (Number.isFinite(Number(parsed?.media_ratio))) {
        const ratio = Number(parsed.media_ratio);
        tracking.mediaRatio = Math.min(0.99, Math.max(0.5, ratio));
      }
    } catch (err) {
      // ignore invalid JSON
    }
  }
  const baseName = sanitizeFilename(
    recurso.identificador || path.basename(originalHref, path.extname(originalHref))
  );
  const uniqueSuffix = recurso.id_recurso ? `_${recurso.id_recurso}` : '';
  const wrapperRel = path.posix.join(WRAPPER_DIR, `${baseName}${uniqueSuffix}.html`);
  const relativeEntry = path.posix.relative(path.posix.dirname(wrapperRel), originalHref);
  const coverRel = courseInfo.coverPath
    ? path.posix.relative(path.posix.dirname(wrapperRel), courseInfo.coverPath)
    : null;
  const html = buildScoWrapperHtml({
    title: recurso.titulo || recurso.identificador || 'Contenido',
    courseTitle: courseInfo.courseTitle || '',
    entryPath: relativeEntry,
    tracking,
    coverPath: coverRel,
  });
  return { wrapperRel, html, originalHref };
};

const validarProyecto = async (req, res) => {
  try {
    const { id_proyecto } = req.params;

    const [manifestRows] = await db.query(
      'SELECT * FROM manifest WHERE id_proyecto = ?',
      [id_proyecto]
    );
    if (manifestRows.length > 1) {
      return res
        .status(400)
        .json({ mensaje: 'Existe mas de un manifest para el proyecto' });
    }
    const manifest = manifestRows[0];
    if (!manifest) {
      return res.status(400).json({ mensaje: 'No existe manifest para el proyecto' });
    }

    const [proyectoRows] = await db.query(
      'SELECT * FROM proyecto_scorm WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const proyecto = proyectoRows[0] || null;

    const [metadataRows] = await db.query(
      'SELECT * FROM proyecto_metadata WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const metadata = metadataRows[0] || null;

    const [orgRows] = await db.query(
      'SELECT * FROM organizacion WHERE id_manifest = ?',
      [manifest.id_manifest]
    );
    if (!orgRows.length) {
      return res.status(400).json({ mensaje: 'No existen organizaciones en el manifest' });
    }

    const [itemsRows] = await db.query(
      'SELECT i.*, r.identificador AS recurso_identificador FROM item i LEFT JOIN recurso r ON i.id_recurso = r.id_recurso WHERE i.id_organizacion IN (?)',
      [orgRows.map((o) => o.id_organizacion)]
    );

    const [recursosRows] = await db.query(
      `SELECT r.*, a.nombre_fisico, a.ruta
       FROM recurso r
       INNER JOIN archivo a ON r.id_archivo = a.id_archivo
       WHERE r.id_manifest = ?`,
      [manifest.id_manifest]
    );
    if (!recursosRows.length) {
      return res.status(400).json({ mensaje: 'No existen recursos para el manifest' });
    }

    const [archivosRows] = await db.query(
      'SELECT * FROM archivo WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const [modulosRows] = await db.query('SELECT * FROM modulo WHERE id_proyecto = ?', [id_proyecto]);
    const [leccionesRows] = await db.query(
      'SELECT l.* FROM leccion l INNER JOIN modulo m ON l.id_modulo = m.id_modulo WHERE m.id_proyecto = ?',
      [id_proyecto]
    );

    const errores = validateScormData({
      manifest,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosRows,
      archivos: archivosRows,
      modulos: modulosRows,
      lecciones: leccionesRows,
    });

    const baseDir = path.resolve(__dirname, '..');
    const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');

    const resourceErrors = [];
    const hasSco = recursosRows.some((recurso) => (recurso.scorm_type || 'sco') === 'sco');
    if (!hasSco) {
      resourceErrors.push('El manifest no contiene recursos tipo SCO');
    }

    for (const recurso of recursosRows) {
      const filePath = resolveArchivoPath(recurso.ruta, uploadDir);
      const zipPathName = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        resourceErrors.push(`Archivo o ruta invalida para recurso: ${recurso.identificador}`);
      }
    }

    for (const archivo of archivosRows) {
      const filePath = resolveArchivoPath(archivo.ruta, uploadDir);
      const zipPathName = normalizeRelativePath(archivo.ruta || archivo.nombre_fisico);
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        resourceErrors.push(`Archivo o ruta invalida: ${archivo.nombre_fisico}`);
      }
    }

    const warnings = [];
    if (!metadata) {
      warnings.push('Proyecto sin metadata');
    } else {
      if (!metadata.autor_principal) {
        warnings.push('Metadata sin autor principal');
      }
      if (!metadata.entidad_publicadora) {
        warnings.push('Metadata sin entidad publicadora');
      }
      if (!metadata.idioma) {
        warnings.push('Metadata sin idioma');
      }
    }
    if (!proyecto || !proyecto.titulo) {
      warnings.push('Proyecto sin titulo');
    }

    const runtimeWarnings = [];
    for (const recurso of recursosRows) {
      const scormType = (recurso.scorm_type || 'sco').toLowerCase();
      if (scormType !== 'sco') continue;
      const filePath = resolveArchivoPath(recurso.ruta, uploadDir);
      if (!filePath || !ensureFileExists(filePath)) continue;
      const ext = path.extname(filePath).toLowerCase();
      if (!['.html', '.htm', '.js'].includes(ext)) continue;
      const contenido = await fs.promises.readFile(filePath, 'utf8').catch(() => '');
      if (!contenido) continue;
      const has12 = /LMSInitialize\s*\(/.test(contenido);
      const has2004 = /[^a-zA-Z]Initialize\s*\(/.test(contenido);
      if (has12 && has2004) {
        runtimeWarnings.push(`SCO mezcla APIs 1.2 y 2004: ${recurso.identificador}`);
      }
      if (!has12 && !has2004) {
        runtimeWarnings.push(`SCO sin llamadas SCORM detectadas: ${recurso.identificador}`);
      }
    }

    const allErrors = [...errores, ...resourceErrors];
    return res.json({
      valido: allErrors.length === 0,
      errores: allErrors,
      warnings: [...warnings, ...runtimeWarnings],
    });
  } catch (err) {
    console.error('Error al validar SCORM:', err);
    return res.status(500).json({ mensaje: 'Error al validar SCORM' });
  }
};

const auditarProyecto = async (req, res) => {
  try {
    const { id_proyecto } = req.params;

    const [manifestRows] = await db.query(
      'SELECT * FROM manifest WHERE id_proyecto = ?',
      [id_proyecto]
    );
    if (manifestRows.length > 1) {
      return res
        .status(400)
        .json({ mensaje: 'Existe mas de un manifest para el proyecto' });
    }
    const manifest = manifestRows[0];
    if (!manifest) {
      return res.status(400).json({ mensaje: 'No existe manifest para el proyecto' });
    }

    const [proyectoRows] = await db.query(
      'SELECT * FROM proyecto_scorm WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const proyecto = proyectoRows[0] || null;

    const [metadataRows] = await db.query(
      'SELECT * FROM proyecto_metadata WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const metadata = metadataRows[0] || null;

    const [orgRows] = await db.query(
      'SELECT * FROM organizacion WHERE id_manifest = ?',
      [manifest.id_manifest]
    );
    if (!orgRows.length) {
      return res.status(400).json({ mensaje: 'No existen organizaciones en el manifest' });
    }

    const [itemsRows] = await db.query(
      'SELECT i.*, r.identificador AS recurso_identificador FROM item i LEFT JOIN recurso r ON i.id_recurso = r.id_recurso WHERE i.id_organizacion IN (?)',
      [orgRows.map((o) => o.id_organizacion)]
    );

    const [recursosRows] = await db.query(
      `SELECT r.*, a.nombre_fisico, a.ruta
       FROM recurso r
       INNER JOIN archivo a ON r.id_archivo = a.id_archivo
       WHERE r.id_manifest = ?`,
      [manifest.id_manifest]
    );
    if (!recursosRows.length) {
      return res.status(400).json({ mensaje: 'No existen recursos para el manifest' });
    }

    const [archivosRows] = await db.query(
      'SELECT * FROM archivo WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const [modulosRows] = await db.query('SELECT * FROM modulo WHERE id_proyecto = ?', [id_proyecto]);
    const [leccionesRows] = await db.query(
      'SELECT l.* FROM leccion l INNER JOIN modulo m ON l.id_modulo = m.id_modulo WHERE m.id_proyecto = ?',
      [id_proyecto]
    );

    const errores = validateScormData({
      manifest,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosRows,
      archivos: archivosRows,
      modulos: modulosRows,
      lecciones: leccionesRows,
    });

    const baseDir = path.resolve(__dirname, '..');
    const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');

    const resourceErrors = [];
    const hasSco = recursosRows.some((recurso) => (recurso.scorm_type || 'sco') === 'sco');
    if (!hasSco) {
      resourceErrors.push('El manifest no contiene recursos tipo SCO');
    }

    for (const recurso of recursosRows) {
      const filePath = resolveArchivoPath(recurso.ruta, uploadDir);
      const zipPathName = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        resourceErrors.push(`Archivo o ruta invalida para recurso: ${recurso.identificador}`);
      }
    }

    const warnings = [];
    if (!metadata) {
      warnings.push('Proyecto sin metadata');
    } else {
      if (!metadata.autor_principal) {
        warnings.push('Metadata sin autor principal');
      }
      if (!metadata.entidad_publicadora) {
        warnings.push('Metadata sin entidad publicadora');
      }
      if (!metadata.idioma) {
        warnings.push('Metadata sin idioma');
      }
    }
    if (!proyecto || !proyecto.titulo) {
      warnings.push('Proyecto sin titulo');
    }

    if (proyecto?.version_scorm && String(proyecto.version_scorm).startsWith('2004')) {
      const hasSequencing = itemsRows.some(
        (item) => item.sequencing_xml || item.navigation_xml
      );
      if (!hasSequencing) {
        warnings.push('Proyecto SCORM 2004 sin reglas de secuenciacion');
      }
    }

    const allErrors = [...errores, ...resourceErrors];
    return res.json({
      valido: allErrors.length === 0,
      errores: allErrors,
      warnings,
    });
  } catch (err) {
    console.error('Error al auditar SCORM:', err);
    return res.status(500).json({ mensaje: 'Error al auditar SCORM' });
  }
};

const generarPaquete12 = async (req, res) => {
  try {
    const { id_proyecto } = req.params;
    let responded = false;
    let hasError = false;

    const [manifestRows] = await db.query(
      'SELECT * FROM manifest WHERE id_proyecto = ?',
      [id_proyecto]
    );
    if (manifestRows.length > 1) {
      return res
        .status(400)
        .json({ mensaje: 'Existe mas de un manifest para el proyecto' });
    }
    const manifest = manifestRows[0];
    if (!manifest) {
      return res.status(400).json({ mensaje: 'No existe manifest para el proyecto' });
    }

    const [proyectoRows] = await db.query(
      'SELECT * FROM proyecto_scorm WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const proyecto = proyectoRows[0] || null;

    const [metadataRows] = await db.query(
      'SELECT * FROM proyecto_metadata WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const metadata = metadataRows[0] || null;

    const [orgRows] = await db.query(
      'SELECT * FROM organizacion WHERE id_manifest = ?',
      [manifest.id_manifest]
    );
    if (!orgRows.length) {
      return res.status(400).json({ mensaje: 'No existen organizaciones en el manifest' });
    }

    const [itemsRows] = await db.query(
      'SELECT i.*, r.identificador AS recurso_identificador FROM item i LEFT JOIN recurso r ON i.id_recurso = r.id_recurso WHERE i.id_organizacion IN (?)',
      [orgRows.map((o) => o.id_organizacion)]
    );

    const [recursosRows] = await db.query(
      `SELECT r.*, a.nombre_fisico, a.ruta
       FROM recurso r
       INNER JOIN archivo a ON r.id_archivo = a.id_archivo
       WHERE r.id_manifest = ?`,
      [manifest.id_manifest]
    );
    if (!recursosRows.length) {
      return res.status(400).json({ mensaje: 'No existen recursos para el manifest' });
    }

    const [archivosRows] = await db.query(
      'SELECT * FROM archivo WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const [modulosRows] = await db.query('SELECT * FROM modulo WHERE id_proyecto = ?', [id_proyecto]);
    const [leccionesRows] = await db.query(
      'SELECT l.* FROM leccion l INNER JOIN modulo m ON l.id_modulo = m.id_modulo WHERE m.id_proyecto = ?',
      [id_proyecto]
    );

    const validationErrors = validateScormData({
      manifest,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosRows,
      archivos: archivosRows,
      modulos: modulosRows,
      lecciones: leccionesRows,
    });
    if (validationErrors.length) {
      return res.status(400).json({
        mensaje: 'Datos SCORM invalidos',
        errores: validationErrors,
      });
    }

    const courseInfo = {
      courseTitle: proyecto?.titulo || metadata?.descripcion_detallada || '',
      coverPath: metadata?.portada_ruta ? normalizeRelativePath(metadata.portada_ruta) : null,
    };

    const wrapperFiles = [];
    const recursosForManifest = recursosRows.map((recurso) => {
      if (!ENABLE_SCO_WRAPPER) return recurso;
      const scormType = (recurso.scorm_type || 'sco').toLowerCase();
      if (scormType !== 'sco') return recurso;
      const wrapper = buildScoWrapper(recurso, courseInfo);
      if (!wrapper) return recurso;
      wrapperFiles.push(wrapper);
      return {
        ...recurso,
        href: wrapper.wrapperRel,
        extra_files: [wrapper.originalHref],
      };
    });

    const manifestXml = buildManifestXml({
      manifest,
      proyecto,
      metadata,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosForManifest,
      archivos: archivosRows,
    });

    const baseDir = path.resolve(__dirname, '..');
    const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');
    const packageDir = process.env.PACKAGE_DIR || path.join(baseDir, 'packages');
    await fs.promises.mkdir(packageDir, { recursive: true });

    const zipName = `scorm_${id_proyecto}_${Date.now()}.zip`;
    const zipPath = path.join(packageDir, zipName);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      if (hasError || responded) {
        return;
      }
      const id_paquete = await PaqueteGenerado.crear({
        id_proyecto,
        ruta_zip: zipPath,
        version_scorm: '1.2',
        lms_destino: null,
      });

      responded = true;
      res.setHeader('X-Paquete-Id', String(id_paquete));
      return res.download(zipPath, zipName);
    });

    archive.on('error', (err) => {
      console.error('Error al generar zip:', err);
      if (responded) {
        return;
      }
      hasError = true;
      responded = true;
      return res.status(500).json({ mensaje: 'Error al generar paquete' });
    });

    archive.pipe(output);
    archive.append(manifestXml, { name: 'imsmanifest.xml' });

    const added = new Set();

    for (const recurso of recursosRows) {
      const filePath = resolveArchivoPath(recurso.ruta, uploadDir);
      const recursoPath = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
      const zipPathName = recursoPath
        ? path.posix.join(CONTENT_PREFIX, recursoPath)
        : null;
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        hasError = true;
        archive.abort();
        output.destroy();
        await fs.promises.unlink(zipPath).catch(() => {});
        if (!responded) {
          responded = true;
          return res.status(400).json({
            mensaje: `Archivo o ruta invalida para recurso: ${recurso.identificador}`,
          });
        }
        return;
      }
      if (!added.has(zipPathName)) {
        archive.file(filePath, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    for (const archivo of archivosRows) {
      const filePath = resolveArchivoPath(archivo.ruta, uploadDir);
      const archivoPath = normalizeRelativePath(archivo.ruta || archivo.nombre_fisico);
      const zipPathName = archivoPath
        ? path.posix.join(CONTENT_PREFIX, archivoPath)
        : null;
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        hasError = true;
        archive.abort();
        output.destroy();
        await fs.promises.unlink(zipPath).catch(() => {});
        if (!responded) {
          responded = true;
          return res.status(400).json({
            mensaje: `Archivo o ruta invalida: ${archivo.nombre_fisico}`,
          });
        }
        return;
      }
      if (!added.has(zipPathName)) {
        archive.file(filePath, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    for (const wrapper of wrapperFiles) {
      const zipPathName = path.posix.join(CONTENT_PREFIX, wrapper.wrapperRel);
      if (!added.has(zipPathName)) {
        archive.append(wrapper.html, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    archive.finalize();
  } catch (err) {
    console.error('Error al generar paquete SCORM 1.2:', err);
    return res.status(500).json({ mensaje: 'Error al generar paquete SCORM' });
  }
};

const generarPaquete2004 = async (req, res) => {
  try {
    const { id_proyecto } = req.params;
    let responded = false;
    let hasError = false;

    const [manifestRows] = await db.query(
      'SELECT * FROM manifest WHERE id_proyecto = ?',
      [id_proyecto]
    );
    if (manifestRows.length > 1) {
      return res
        .status(400)
        .json({ mensaje: 'Existe mas de un manifest para el proyecto' });
    }
    const manifest = manifestRows[0];
    if (!manifest) {
      return res.status(400).json({ mensaje: 'No existe manifest para el proyecto' });
    }

    const [proyectoRows] = await db.query(
      'SELECT * FROM proyecto_scorm WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const proyecto = proyectoRows[0] || null;

    const [metadataRows] = await db.query(
      'SELECT * FROM proyecto_metadata WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const metadata = metadataRows[0] || null;

    const [orgRows] = await db.query(
      'SELECT * FROM organizacion WHERE id_manifest = ?',
      [manifest.id_manifest]
    );
    if (!orgRows.length) {
      return res.status(400).json({ mensaje: 'No existen organizaciones en el manifest' });
    }

    const [itemsRows] = await db.query(
      'SELECT i.*, r.identificador AS recurso_identificador FROM item i LEFT JOIN recurso r ON i.id_recurso = r.id_recurso WHERE i.id_organizacion IN (?)',
      [orgRows.map((o) => o.id_organizacion)]
    );

    const [recursosRows] = await db.query(
      `SELECT r.*, a.nombre_fisico, a.ruta
       FROM recurso r
       INNER JOIN archivo a ON r.id_archivo = a.id_archivo
       WHERE r.id_manifest = ?`,
      [manifest.id_manifest]
    );
    if (!recursosRows.length) {
      return res.status(400).json({ mensaje: 'No existen recursos para el manifest' });
    }

    const [archivosRows] = await db.query(
      'SELECT * FROM archivo WHERE id_proyecto = ?',
      [id_proyecto]
    );
    const [modulosRows] = await db.query('SELECT * FROM modulo WHERE id_proyecto = ?', [id_proyecto]);
    const [leccionesRows] = await db.query(
      'SELECT l.* FROM leccion l INNER JOIN modulo m ON l.id_modulo = m.id_modulo WHERE m.id_proyecto = ?',
      [id_proyecto]
    );

    const validationErrors = validateScormData({
      manifest,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosRows,
      archivos: archivosRows,
      modulos: modulosRows,
      lecciones: leccionesRows,
    });
    if (validationErrors.length) {
      return res.status(400).json({
        mensaje: 'Datos SCORM invalidos',
        errores: validationErrors,
      });
    }

    const courseInfo = {
      courseTitle: proyecto?.titulo || metadata?.descripcion_detallada || '',
      coverPath: metadata?.portada_ruta ? normalizeRelativePath(metadata.portada_ruta) : null,
    };

    const wrapperFiles = [];
    const recursosForManifest = recursosRows.map((recurso) => {
      if (!ENABLE_SCO_WRAPPER) return recurso;
      const scormType = (recurso.scorm_type || 'sco').toLowerCase();
      if (scormType !== 'sco') return recurso;
      const wrapper = buildScoWrapper(recurso, courseInfo);
      if (!wrapper) return recurso;
      wrapperFiles.push(wrapper);
      return {
        ...recurso,
        href: wrapper.wrapperRel,
        extra_files: [wrapper.originalHref],
      };
    });

    const manifestXml = buildManifestXml2004({
      manifest,
      proyecto,
      metadata,
      organizaciones: orgRows,
      items: itemsRows,
      recursos: recursosForManifest,
      archivos: archivosRows,
    });

    const baseDir = path.resolve(__dirname, '..');
    const uploadDir = process.env.UPLOAD_DIR || path.join(baseDir, 'uploads');
    const packageDir = process.env.PACKAGE_DIR || path.join(baseDir, 'packages');
    await fs.promises.mkdir(packageDir, { recursive: true });

    const zipName = `scorm2004_${id_proyecto}_${Date.now()}.zip`;
    const zipPath = path.join(packageDir, zipName);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', async () => {
      if (hasError || responded) {
        return;
      }
      const id_paquete = await PaqueteGenerado.crear({
        id_proyecto,
        ruta_zip: zipPath,
        version_scorm: '2004_4th',
        lms_destino: null,
      });

      responded = true;
      res.setHeader('X-Paquete-Id', String(id_paquete));
      return res.download(zipPath, zipName);
    });

    archive.on('error', (err) => {
      console.error('Error al generar zip:', err);
      if (responded) {
        return;
      }
      hasError = true;
      responded = true;
      return res.status(500).json({ mensaje: 'Error al generar paquete' });
    });

    archive.pipe(output);
    archive.append(manifestXml, { name: 'imsmanifest.xml' });

    const added = new Set();

    for (const recurso of recursosRows) {
      const filePath = resolveArchivoPath(recurso.ruta, uploadDir);
      const recursoPath = normalizeRelativePath(recurso.href || recurso.nombre_fisico);
      const zipPathName = recursoPath
        ? path.posix.join(CONTENT_PREFIX, recursoPath)
        : null;
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        hasError = true;
        archive.abort();
        output.destroy();
        await fs.promises.unlink(zipPath).catch(() => {});
        if (!responded) {
          responded = true;
          return res.status(400).json({
            mensaje: `Archivo o ruta invalida para recurso: ${recurso.identificador}`,
          });
        }
        return;
      }
      if (!added.has(zipPathName)) {
        archive.file(filePath, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    for (const archivo of archivosRows) {
      const filePath = resolveArchivoPath(archivo.ruta, uploadDir);
      const archivoPath = normalizeRelativePath(archivo.ruta || archivo.nombre_fisico);
      const zipPathName = archivoPath
        ? path.posix.join(CONTENT_PREFIX, archivoPath)
        : null;
      if (!filePath || !ensureFileExists(filePath) || !zipPathName) {
        hasError = true;
        archive.abort();
        output.destroy();
        await fs.promises.unlink(zipPath).catch(() => {});
        if (!responded) {
          responded = true;
          return res.status(400).json({
            mensaje: `Archivo o ruta invalida: ${archivo.nombre_fisico}`,
          });
        }
        return;
      }
      if (!added.has(zipPathName)) {
        archive.file(filePath, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    for (const wrapper of wrapperFiles) {
      const zipPathName = path.posix.join(CONTENT_PREFIX, wrapper.wrapperRel);
      if (!added.has(zipPathName)) {
        archive.append(wrapper.html, { name: zipPathName });
        added.add(zipPathName);
      }
    }

    archive.finalize();
  } catch (err) {
    console.error('Error al generar paquete SCORM 2004:', err);
    return res.status(500).json({ mensaje: 'Error al generar paquete SCORM' });
  }
};

module.exports = {
  validarProyecto,
  auditarProyecto,
  generarPaquete12,
  generarPaquete2004,
};
