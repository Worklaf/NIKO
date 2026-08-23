/* =========================================================================
   genre-ui-fix.js — починка выпадающего списка жанров
   -------------------------------------------------------------------------
   Зачем: если в index.html осталась СТАРАЯ разметка (без обёртки
   .custom-genre-panel), то со новым styles.css список жанров:
     • всегда открыт и не сворачивается (нет правила display:none),
     • на ПК идёт в одну узкую колонку (панель не может стать шире фильтра).

   Этот файл сам достраивает нужную структуру, ничего править руками не надо:

       .custom-genre-dropdown
         ├── .custom-genre-trigger
         └── .custom-genre-panel          ← создаётся, если её нет
               ├── input.genre-search     ← создаётся, если его нет
               └── .custom-genre-options   (#custom-genre-options)

   Подключать ОДИН раз, ПОСЛЕ genres.js и после основного скрипта страницы:
       <script src="genre-ui-fix.js"></script>
   ========================================================================= */

(function () {
  function ensureGenrePanel() {
    const options = document.getElementById('custom-genre-options');
    if (!options) return;

    options.classList.add('custom-genre-options');

    const dropdown = options.closest('.custom-genre-dropdown') || options.parentElement;
    if (dropdown) dropdown.classList.add('custom-genre-dropdown');

    /* 1. обёртка-панель */
    let panel = options.closest('.custom-genre-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'custom-genre-panel';
      options.parentNode.insertBefore(panel, options);
      panel.appendChild(options);
    }

    /* 2. строка поиска внутри панели */
    let search = document.getElementById('genre-search');
    if (!search) {
      search = document.createElement('input');
      search.type = 'text';
      search.id = 'genre-search';
      search.className = 'genre-search';
      search.autocomplete = 'off';
      search.placeholder = (typeof t === 'function' && t('searchGenre')) || 'Szukaj gatunku…';
    }
    if (search.parentElement !== panel) panel.insertBefore(search, options);

    /* 3. сообщение «ничего не найдено» */
    if (!document.getElementById('genre-search-empty')) {
      const empty = document.createElement('div');
      empty.id = 'genre-search-empty';
      empty.className = 'genre-search-empty';
      empty.textContent = 'Nic nie znaleziono';
      options.appendChild(empty);
    }

    /* 4. фильтрация по строке поиска (только если её ещё нет) */
    if (typeof window.applyGenreSearch !== 'function') {
      window.applyGenreSearch = function () {
        const q = (document.getElementById('genre-search')?.value || '')
          .trim().toLowerCase();
        const box = document.getElementById('custom-genre-options');
        if (!box) return;
        let shown = 0;

        box.querySelectorAll('.custom-genre-option').forEach(opt => {
          if (opt.classList.contains('all-genres')) {
            opt.style.display = q ? 'none' : '';   // «Все жанры» скрываем при поиске
            return;
          }
          const hay = opt.dataset.search ||
            (opt.querySelector('.genre-label')?.textContent || '').toLowerCase();
          const ok = !q || hay.indexOf(q) > -1;
          opt.style.display = ok ? '' : 'none';
          if (ok) shown++;
        });

        const empty = document.getElementById('genre-search-empty');
        if (empty) empty.style.display = (q && shown === 0) ? 'block' : 'none';
      };
    }

    if (!search.dataset.bound) {
      search.dataset.bound = '1';
      search.addEventListener('input', () => window.applyGenreSearch());
      search.addEventListener('click', (e) => e.stopPropagation());
      search.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        search.value = '';
        window.applyGenreSearch();
        document.querySelector('.custom-genre-dropdown')?.classList.remove('open');
      });
    }

    /* 5. страховка: список закрыт при загрузке страницы */
    dropdown?.classList.remove('open');

    /* 6. панель не должна уезжать за правый край экрана */
    if (dropdown && !dropdown.dataset.fitBound) {
      dropdown.dataset.fitBound = '1';
      const fitPanel = () => {
        if (!dropdown.classList.contains('open')) return;
        panel.style.left = '0px';
        if (window.innerWidth < 881) return;      // на телефоне панель и так по ширине колонки
        const r = panel.getBoundingClientRect();
        const overflow = r.right - (window.innerWidth - 12);
        if (overflow > 0) panel.style.left = (-Math.min(overflow, r.left - 12)) + 'px';
      };
      new MutationObserver(fitPanel)
        .observe(dropdown, { attributes: true, attributeFilter: ['class'] });
      window.addEventListener('resize', fitPanel);
      window.fitGenrePanel = fitPanel;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureGenrePanel);
  } else {
    ensureGenrePanel();
  }
  /* ещё раз после отрисовки треков — список жанров строится асинхронно */
  setTimeout(ensureGenrePanel, 1200);

  window.ensureGenrePanel = ensureGenrePanel;
})();