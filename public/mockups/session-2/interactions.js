/* Treinoway mockups · interações compartilhadas · Concept 2 */
(function () {
  const RESTS_TARGET = '3-rest-timer.html';
  const ACTIVE_TARGET = '1-focus-set.html';
  const EDIT_TARGET = '4-editing-completed.html';
  const OVERVIEW_TARGET = '5-overview.html';
  const SKIP_TARGET = '7-skip.html';

  if (window.lucide) window.lucide.createIcons();

  // Top-bar back (chevron-left) & close (x) → overview
  document.querySelectorAll('.icon-btn').forEach(btn => {
    const icon = btn.querySelector('[data-lucide]');
    const name = icon?.getAttribute('data-lucide');
    if (name === 'chevron-left' || name === 'x') {
      btn.style.cursor = 'pointer';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        location.href = OVERVIEW_TARGET;
      });
    }
  });

  // Toast
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

  document.querySelectorAll('.video-btn, .play-btn, .child-video-mini, .dock-thumb, .next-thumb').forEach(el => {
    if (el.closest('a')) return;
    el.style.cursor = 'pointer';
    el.addEventListener('click', openVideoModal);
  });

  // Steppers ± (increment/decrement numeric values)
  document.querySelectorAll('.stepper').forEach(stepper => {
    const valEl = stepper.querySelector('.stepper-value');
    if (!valEl) return;
    const labelText = (stepper.querySelector('.stepper-label')?.textContent || '').toLowerCase();
    const isWeight = labelText.includes('carga') || labelText.includes('kg') || labelText.includes('peso');
    const step = isWeight ? 2.5 : 1;
    let val = parseFloat(valEl.textContent.replace(',', '.')) || 0;
    const btns = stepper.querySelectorAll('.step-btn');
    btns.forEach((b, i) => {
      b.addEventListener('click', (e) => {
        e.preventDefault();
        const isMinus = i === 0;
        val += isMinus ? -step : step;
        if (val < 0) val = 0;
        if (isWeight) {
          valEl.textContent = Number.isInteger(val) ? val.toString() : val.toFixed(1).replace('.', ',');
        } else {
          valEl.textContent = Math.round(val).toString();
        }
        valEl.style.transform = 'scale(1.08)';
        valEl.style.transition = 'transform .15s ease';
        setTimeout(() => { valEl.style.transform = 'scale(1)'; }, 150);
      });
    });
  });

  // Timed stepper (00:45 mm:ss)
  document.querySelectorAll('.timed-stepper').forEach(st => {
    const valEl = st.querySelector('.timed-value');
    if (!valEl) return;
    let [m, s] = valEl.textContent.split(':').map(n => parseInt(n, 10));
    let total = m * 60 + s;
    st.querySelectorAll('.step-btn').forEach(b => {
      const txt = b.textContent.trim();
      const match = txt.match(/([−\-+])(\d+)s/);
      if (!match) return;
      const delta = (match[1] === '+' ? 1 : -1) * parseInt(match[2], 10);
      b.addEventListener('click', (e) => {
        e.preventDefault();
        total = Math.max(0, total + delta);
        const mm = String(Math.floor(total / 60)).padStart(2, '0');
        const ss = String(total % 60).padStart(2, '0');
        valEl.textContent = `${mm}:${ss}`;
      });
    });
  });

  // Toggle A1/A2
  document.querySelectorAll('.superset-toggle').forEach(toggle => {
    const opts = toggle.querySelectorAll('.toggle-opt');
    opts.forEach(opt => {
      opt.addEventListener('click', () => {
        opts.forEach(o => o.classList.remove('toggle-opt--active'));
        opt.classList.add('toggle-opt--active');
      });
    });
  });

  // Set pills: done pill → editing; active pill = already active
  document.querySelectorAll('.set-pill--done').forEach(pill => {
    pill.style.cursor = 'pointer';
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = EDIT_TARGET;
    });
  });

  // Confirm button (Concluir série / Concluir A2) → rest timer
  document.querySelectorAll('.confirm-btn:not(.confirm-btn--save)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = RESTS_TARGET;
    });
  });

  // Save (editing completed)
  document.querySelectorAll('.confirm-btn--save').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toast('Série atualizada');
      setTimeout(() => { location.href = ACTIVE_TARGET; }, 600);
    });
  });

  // Timed start cronômetro
  document.querySelectorAll('.timed-start').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toast('Cronômetro iniciado');
    });
  });

  // Rest sheet fullscreen: rest-btn --primary (Pausar) toggle
  document.querySelectorAll('.rest-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const label = btn.textContent.trim();
      if (label.toLowerCase().includes('pular')) {
        e.preventDefault();
        location.href = ACTIVE_TARGET;
      } else if (label.includes('15s') || label.toLowerCase().includes('pausa')) {
        toast(label);
      }
    });
  });
  // Fallback skip link (outside fullscreen)
  document.querySelectorAll('.rest-stage .obs-btn').forEach(el => {
    el.addEventListener('click', (e) => {
      const txt = el.textContent.trim();
      if (txt.toLowerCase().includes('pular')) {
        e.preventDefault();
        location.href = ACTIVE_TARGET;
      }
    });
  });

  // Skip sheet: reason chips + cancel + confirm
  document.querySelectorAll('.reason-grid').forEach(grid => {
    const chips = grid.querySelectorAll('.reason-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('reason-chip--selected'));
        chip.classList.add('reason-chip--selected');
      });
    });
  });
  document.querySelectorAll('.skip-cancel').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      history.length > 1 ? history.back() : (location.href = ACTIVE_TARGET);
    });
  });
  document.querySelectorAll('.skip-confirm').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = OVERVIEW_TARGET;
    });
  });

  // Obs / dock cards / ex-rows → navegar
  document.querySelectorAll('.ex-row, .ss-group').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      location.href = ACTIVE_TARGET;
    });
  });
  document.querySelectorAll('.dock-card').forEach(card => {
    if (card.tagName === 'A') return;
    card.style.cursor = 'pointer';
    card.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      location.href = ACTIVE_TARGET;
    });
  });

  // Ghost-like obs buttons without target → toast
  document.querySelectorAll('.obs-btn, .rest-edit').forEach(el => {
    if (el.tagName === 'A' || el.closest('a')) return;
    el.addEventListener('click', (e) => {
      const txt = el.textContent.trim().replace(/\s+/g, ' ');
      if (txt && !e.defaultPrevented) toast(txt);
    });
  });

  // Dock "Ver tudo" → overview
  document.querySelectorAll('.dock-label a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      location.href = OVERVIEW_TARGET;
    });
  });
})();
