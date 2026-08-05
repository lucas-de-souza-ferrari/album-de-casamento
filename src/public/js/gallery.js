(() => {
  const config = window.ALBUM_CONFIG || { lastSeq: 0, canModerate: false, modToken: '' };
  const POLL_MS = 6000;

  const grid = document.getElementById('gallery-grid');
  const emptyState = document.getElementById('empty-state');
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');

  let lastSeq = config.lastSeq || 0;

  function buildCard(photo) {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.dataset.seq = String(photo.seq);
    card.dataset.id = photo.id;

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = 'Foto enviada por convidado';
    img.src = `/thumbnails/${photo.thumbnailFilename}`;
    card.appendChild(img);

    if (photo.guestName || photo.message) {
      const caption = document.createElement('div');
      caption.className = 'gallery-caption';

      if (photo.guestName) {
        const name = document.createElement('p');
        name.className = 'guest-name';
        name.textContent = photo.guestName; // textContent: nunca innerHTML com dado do convidado
        caption.appendChild(name);
      }

      if (photo.message) {
        const message = document.createElement('p');
        message.className = 'message';
        message.textContent = photo.message;
        caption.appendChild(message);
      }

      card.appendChild(caption);
    }

    if (config.canModerate) {
      const hideBtn = document.createElement('button');
      hideBtn.type = 'button';
      hideBtn.className = 'hide-btn';
      hideBtn.textContent = 'Ocultar';
      hideBtn.dataset.hideId = photo.id;
      card.appendChild(hideBtn);
    }

    return card;
  }

  function attachCardHandlers(card) {
    const img = card.querySelector('img');
    if (img) {
      img.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightbox.showModal();
      });
    }

    const hideBtn = card.querySelector('.hide-btn');
    if (hideBtn) {
      hideBtn.addEventListener('click', async () => {
        hideBtn.disabled = true;
        try {
          const res = await fetch(`/api/photos/${hideBtn.dataset.hideId}/hide?mod=${encodeURIComponent(config.modToken)}`, {
            method: 'PATCH',
          });
          if (res.ok) card.remove();
          else hideBtn.disabled = false;
        } catch {
          hideBtn.disabled = false;
        }
      });
    }
  }

  grid.querySelectorAll('.gallery-card').forEach(attachCardHandlers);

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) lightbox.close();
  });

  async function poll() {
    try {
      const res = await fetch(`/api/photos?afterSeq=${lastSeq}&limit=24`);
      if (!res.ok) return;
      const data = await res.json();
      const photos = data.photos || [];

      if (photos.length > 0 && emptyState) emptyState.remove();

      // API retorna em ordem crescente (mais antigas primeiro); a galeria
      // mostra mais novas no topo, entao inserimos nessa mesma ordem no inicio.
      photos.forEach((photo) => {
        const card = buildCard(photo);
        attachCardHandlers(card);
        grid.insertBefore(card, grid.firstChild);
        lastSeq = Math.max(lastSeq, photo.seq);
      });
    } catch {
      // falha de rede pontual: tenta de novo no proximo ciclo
    }
  }

  setInterval(poll, POLL_MS);
})();
