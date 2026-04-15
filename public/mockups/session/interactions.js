/* Treinoway mockups · interações compartilhadas · Concept 1 */
(function () {
  const RESTS_TARGET = '4-rest-timer.html';
  const ACTIVE_TARGET = '1-active-set.html';
  const EDIT_TARGET = '2-completed-set.html';
  const OVERVIEW_TARGET = '0-overview.html';
  const SKIP_TARGET = '7-skip.html';

  // Capture icon names BEFORE Lucide replaces <i> elements
  document.querySelectorAll('.icon-btn').forEach(btn => {
    const icon = btn.querySelector('[data-lucide]');
    const name = icon && icon.getAttribute('data-lucide');
    if (name === 'chevron-left' || name === 'x') {
      btn.dataset.nav = 'back';
    }
  });

  // Lucide icons
  if (window.lucide) window.lucide.createIcons();

  // Top-bar back (chevron-left) & close (x) → overview
  document.querySelectorAll('.icon-btn[data-nav="back"]').forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = OVERVIEW_TARGET;
    });
  });

  // Toast util
  function toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
      position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: #1C1C1E; color: #fff; padding: 12px 20px; border-radius: 999px;
      font: 600 13px 'Open Sans', sans-serif; z-index: 99999;
      opacity: 0; transition: all .2s ease; box-shadow: 0 10px 30px rgba(0,0,0,.3);`;
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => t.remove(), 200);
    }, 1800);
  }

  // Video modal
  function openVideoModal(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (document.getElementById('video-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'video-modal-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(14,11,20,.88); z-index: 99999;
      display: flex; align-items: center; justify-content: center; padding: 20px;
      animation: fadeIn .2s ease;`;
    overlay.innerHTML = `
      <style>@keyframes fadeIn{from{opacity:0}to{opacity:1}}</style>
      <div style="position:relative;width:100%;max-width:720px;aspect-ratio:16/9;background:#000;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);">
        <iframe src="https://www.youtube.com/embed/Ew-xKqEaCWU?autoplay=1&rel=0" frameborder="0" allow="autoplay; fullscreen" allowfullscreen style="width:100%;height:100%;border:0;"></iframe>
        <button aria-label="Fechar" style="position:absolute;top:12px;right:12px;width:40px;height:40px;border:0;border-radius:50%;background:rgba(255,255,255,.95);display:grid;place-items:center;cursor:pointer;font-size:18px;font-weight:600;">✕</button>
      </div>`;
    overlay.querySelector('button').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  }

  // Video triggers
  document.querySelectorAll('.play-btn, .video-thumb, .child-video-mini, .next-thumb, .dock-thumb, .video-btn').forEach(el => {
    if (el.closest('a')) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', openVideoModal);
  });

  // Reason chips (radio)
  document.querySelectorAll('.reason-grid').forEach(grid => {
    const chips = grid.querySelectorAll('.reason-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('reason-chip--selected'));
        chip.classList.add('reason-chip--selected');
      });
    });
  });

  // Active set → check btn navegates to rest timer
  document.querySelectorAll('.set-row--active .check-btn').forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = RESTS_TARGET;
    });
  });

  // Superset check on A2 (active child) → rest timer
  document.querySelectorAll('.superset-child .check-btn').forEach(btn => {
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = RESTS_TARGET;
    });
  });

  // Completed set pencil / row → editing screen
  document.querySelectorAll('.pencil-btn').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      if (el.closest('a')) return;
      e.preventDefault();
      e.stopPropagation();
      location.href = EDIT_TARGET;
    });
  });
  document.querySelectorAll('.set-row--completed').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      location.href = EDIT_TARGET;
    });
  });

  // Rest timer: scrim / pular → back to active
  document.querySelectorAll('.scrim, .timer-skip').forEach(el => {
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = ACTIVE_TARGET;
    });
  });

  // Rest timer ±15s / Pausar — toast
  document.querySelectorAll('.timer-ctrl').forEach(el => {
    el.addEventListener('click', () => {
      const label = el.textContent.trim();
      if (label.includes('15s') || label.toLowerCase().includes('pausa') || label.toLowerCase().includes('retom')) toast(label);
    });
  });

  // Skip sheet: cancel → back; confirm → overview
  document.querySelectorAll('.skip-cancel').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); history.length > 1 ? history.back() : (location.href = ACTIVE_TARGET); });
  });
  document.querySelectorAll('.skip-confirm').forEach(el => {
    el.addEventListener('click', (e) => { e.preventDefault(); location.href = OVERVIEW_TARGET; });
  });

  // Editing completed: Cancelar/Desfazer → back; Salvar (confirm) → back
  document.querySelectorAll('.confirm-btn--save').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      toast('Série atualizada');
      setTimeout(() => { location.href = ACTIVE_TARGET; }, 600);
    });
  });

  // Fallback: obs/ghost buttons without href → toast
  document.querySelectorAll('.ghost-btn, .obs-btn, .ov-jump-btn, .end-btn, .rest-edit, .rest-btn').forEach(el => {
    if (el.tagName === 'A' || el.closest('a')) return;
    if (el.classList.contains('skip-cancel') || el.classList.contains('skip-confirm')) return;
    if (el.classList.contains('confirm-btn--save')) return;
    el.addEventListener('click', (e) => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt && !e.defaultPrevented) toast(txt);
    });
  });

  // Overview cards → navigate to active set
  document.querySelectorAll('.ov-card--now, .ov-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      location.href = ACTIVE_TARGET;
    });
  });

  // Next card / upcoming row → active set
  document.querySelectorAll('.next-card, .upcoming-item').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      location.href = ACTIVE_TARGET;
    });
  });
})();
