/**
 * Custom EditorJS Image Tool con supporto a dimensione (S/M/L/Auto)
 * e allineamento (sinistra / centro / destra) con text-wrapping.
 *
 * Dati salvati nel blocco:
 *   { file: { url }, caption, size, align }
 *
 * size:  'piccola' | 'media' | 'grande' | 'originale'
 * align: 'left' | 'center' | 'right'
 */

interface ImageBlockData {
  file: { url: string } | null;
  caption: string;
  size: 'piccola' | 'media' | 'grande' | 'originale';
  align: 'left' | 'center' | 'right';
}

interface ToolConfig {
  uploadUrl: string;
  getToken: () => string;
}

export default class CustomImageTool {

  // ── Static ──────────────────────────────────────────────────────────────────

  static get toolbox() {
    return {
      title: 'Immagine',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="15" viewBox="0 0 336 276">
               <path d="M291 150V79c0-19-15-34-34-34H79c-19 0-34 15-34 34v42l67-44 81 72 56-29 42 22zm0
               79-100-67-49 33-67-44-98 69v30c0 19 15 34 34 34h178c19 0 34-15 34-34v-21zM181
               95c0 16-13 29-29 29s-29-13-29-29 13-29 29-29 29 13 29 29z"/>
             </svg>`,
    };
  }

  static get isReadOnlySupported() { return true; }

  // ── CSS injection (una volta sola) ──────────────────────────────────────────

  private static stylesInjected = false;

  private static injectStyles(): void {
    if (CustomImageTool.stylesInjected) return;
    CustomImageTool.stylesInjected = true;

    const style = document.createElement('style');
    style.id = 'custom-image-tool-styles';
    style.textContent = `

/* ── Upload UI ── */
.cit-upload-area {
  border: 2px dashed #cbd5e1;
  border-radius: 10px;
  padding: 28px 20px;
  text-align: center;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.cit-upload-btn {
  display: inline-block;
  background: #1e40af;
  color: #fff;
  padding: 9px 22px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
}
.cit-upload-btn:hover { background: #1d4ed8; }

.cit-url-row {
  display: flex;
  gap: 6px;
  width: 100%;
  max-width: 420px;
}

.cit-url-input {
  flex: 1;
  padding: 7px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  color: #1e293b;
  background: #fff;
}
.cit-url-input:focus { border-color: #1e40af; }

.cit-url-btn {
  background: #475569;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.15s;
}
.cit-url-btn:hover { background: #334155; }

/* ── Loading / Error ── */
.cit-loading,
.cit-error {
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 14px;
  text-align: center;
}
.cit-loading { background: #f1f5f9; color: #475569; }
.cit-error   { background: #fef2f2; color: #991b1b; }

.cit-retry-btn {
  background: none;
  border: 1px solid #fca5a5;
  color: #991b1b;
  border-radius: 5px;
  padding: 3px 10px;
  margin-left: 8px;
  font-size: 12px;
  cursor: pointer;
}

/* ── Layout row (editor preview per left/right) ── */
.cit-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.cit-text-hint {
  flex: 1;
  min-height: 90px;
  border: 1.5px dashed #cbd5e1;
  border-radius: 8px;
  background: repeating-linear-gradient(
    -45deg,
    #f8fafc,
    #f8fafc 6px,
    #f1f5f9 6px,
    #f1f5f9 12px
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 13px;
  font-style: italic;
  pointer-events: none;
  user-select: none;
  border-radius: 8px;
}

/* ── Figure / Image ── */
.cit-figure {
  position: relative;
  display: inline-block;
  max-width: 100%;
  margin: 0;
}

.cit-img {
  display: block;
  border-radius: 8px;
  max-width: 100%;
}

.cit-caption-input {
  display: block;
  width: 100%;
  margin-top: 6px;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  background: transparent;
  font-size: 13px;
  color: #64748b;
  padding: 3px 4px;
  outline: none;
  text-align: center;
}
.cit-caption-input:focus { border-bottom-color: #1e40af; }
.cit-caption-input::placeholder { color: #94a3b8; font-style: italic; }

.cit-remove-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(15,23,42,0.55);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s;
}
.cit-figure:hover .cit-remove-btn { opacity: 1; }

/* ── Tunes panel ── */
.cit-settings-panel {
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
}

.cit-settings-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: #94a3b8;
  font-weight: 600;
  padding: 0 6px;
}

.cit-settings-row {
  display: flex;
  gap: 4px;
  padding: 0 4px;
  flex-wrap: wrap;
}

.cit-tune-btn {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 5px;
  padding: 4px 10px;
  font-size: 13px;
  cursor: pointer;
  color: #334155;
  transition: background 0.12s, border-color 0.12s;
  line-height: 1.4;
}
.cit-tune-btn:hover { background: #e2e8f0; }
.cit-tune-active {
  background: #1e40af !important;
  border-color: #1e40af !important;
  color: #fff !important;
}

    `;
    document.head.appendChild(style);
  }

  // ── Instance ─────────────────────────────────────────────────────────────────

  private data: ImageBlockData;
  private config: ToolConfig;
  private wrapper!: HTMLDivElement;
  private captionInput!: HTMLInputElement;

  constructor({ data, config }: { data: Partial<ImageBlockData>; config?: ToolConfig; api?: unknown; readOnly?: boolean }) {
    CustomImageTool.injectStyles();

    this.data = {
      file:    data?.file    ?? null,
      caption: data?.caption ?? '',
      size:    (data?.size  as ImageBlockData['size'])  ?? 'originale',
      align:   (data?.align as ImageBlockData['align']) ?? 'center',
    };
    this.config = config ?? { uploadUrl: '', getToken: () => '' };
  }

  // ── EditorJS API ─────────────────────────────────────────────────────────────

  render(): HTMLElement {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'cit-wrapper';

    if (this.data.file?.url) {
      this.renderImage();
    } else {
      this.renderUploadUI();
    }
    return this.wrapper;
  }

  renderSettings(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'cit-settings-panel';

    // ── Dimensione ──
    const sizeTitle = document.createElement('span');
    sizeTitle.className = 'cit-settings-title';
    sizeTitle.textContent = 'Dimensione';
    panel.appendChild(sizeTitle);

    const sizeRow = document.createElement('div');
    sizeRow.className = 'cit-settings-row';

    const sizes: { label: string; value: ImageBlockData['size'] }[] = [
      { label: 'S',    value: 'piccola'  },
      { label: 'M',    value: 'media'    },
      { label: 'L',    value: 'grande'   },
      { label: 'Auto', value: 'originale' },
    ];

    sizes.forEach(({ label, value }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.className = 'cit-tune-btn' + (this.data.size === value ? ' cit-tune-active' : '');
      btn.addEventListener('click', () => {
        this.data.size = value;
        sizeRow.querySelectorAll<HTMLButtonElement>('.cit-tune-btn')
          .forEach(b => b.classList.remove('cit-tune-active'));
        btn.classList.add('cit-tune-active');
        const img = this.wrapper.querySelector<HTMLImageElement>('.cit-img');
        if (img) this.applySize(img);
      });
      sizeRow.appendChild(btn);
    });
    panel.appendChild(sizeRow);

    // ── Posizione ──
    const alignTitle = document.createElement('span');
    alignTitle.className = 'cit-settings-title';
    alignTitle.textContent = 'Posizione';
    panel.appendChild(alignTitle);

    const alignRow = document.createElement('div');
    alignRow.className = 'cit-settings-row';

    const aligns: { icon: string; title: string; value: ImageBlockData['align'] }[] = [
      { icon: '⬅', title: 'Sinistra — il testo avvolge a destra', value: 'left'   },
      { icon: '↔', title: 'Centro',                                value: 'center' },
      { icon: '➡', title: 'Destra — il testo avvolge a sinistra',  value: 'right'  },
    ];

    aligns.forEach(({ icon, title, value }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = icon;
      btn.title = title;
      btn.className = 'cit-tune-btn' + (this.data.align === value ? ' cit-tune-active' : '');
      btn.addEventListener('click', () => {
        this.data.align = value;
        alignRow.querySelectorAll<HTMLButtonElement>('.cit-tune-btn')
          .forEach(b => b.classList.remove('cit-tune-active'));
        btn.classList.add('cit-tune-active');
        if (this.data.file?.url) this.applyAlign();
      });
      alignRow.appendChild(btn);
    });
    panel.appendChild(alignRow);

    return panel;
  }

  save(): ImageBlockData {
    return {
      file:    this.data.file,
      caption: this.captionInput?.value ?? this.data.caption ?? '',
      size:    this.data.size  ?? 'originale',
      align:   this.data.align ?? 'center',
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private renderUploadUI(): void {
    this.wrapper.innerHTML = '';

    const area = document.createElement('div');
    area.className = 'cit-upload-area';

    // File button
    const label = document.createElement('label');
    label.className = 'cit-upload-btn';
    label.textContent = '↑ Carica immagine';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/jpg,image/png,image/webp';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.uploadFile(file);
    });
    label.appendChild(fileInput);
    area.appendChild(label);

    // URL row
    const urlRow = document.createElement('div');
    urlRow.className = 'cit-url-row';

    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.placeholder = 'Oppure incolla URL immagine…';
    urlInput.className = 'cit-url-input';

    const urlBtn = document.createElement('button');
    urlBtn.type = 'button';
    urlBtn.textContent = 'Usa URL';
    urlBtn.className = 'cit-url-btn';
    urlBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (url) {
        this.data.file = { url };
        this.renderImage();
      }
    });

    urlRow.appendChild(urlInput);
    urlRow.appendChild(urlBtn);
    area.appendChild(urlRow);

    this.wrapper.appendChild(area);
  }

  private async uploadFile(file: File): Promise<void> {
    this.wrapper.innerHTML = '<div class="cit-loading">⏳ Caricamento immagine…</div>';

    const formData = new FormData();
    formData.append('image', file);

    try {
      const headers: HeadersInit = {};
      if (this.config?.getToken) {
        headers['Authorization'] = `Bearer ${this.config.getToken()}`;
      }

      const res = await fetch(this.config.uploadUrl, {
        method: 'POST',
        headers,
        body: formData,
      });
      const json = await res.json();

      if (json.success === 1 && json.file?.url) {
        this.data.file = { url: json.file.url };
        this.renderImage();
      } else {
        this.showError('Upload fallito — riprova');
      }
    } catch {
      this.showError('Errore di rete — riprova');
    }
  }

  private showError(msg: string): void {
    this.wrapper.innerHTML =
      `<div class="cit-error">${msg} <button class="cit-retry-btn">↩ Riprova</button></div>`;
    this.wrapper.querySelector('.cit-retry-btn')
      ?.addEventListener('click', () => this.renderUploadUI());
  }

  private renderImage(): void {
    this.wrapper.innerHTML = '';
    this.wrapper.style.cssText = 'display:block;';

    const figure = document.createElement('figure');
    figure.className = 'cit-figure';

    const img = document.createElement('img');
    img.src = this.data.file!.url;
    img.className = 'cit-img';
    img.alt = this.data.caption ?? '';
    this.applySize(img);
    figure.appendChild(img);

    this.captionInput = document.createElement('input');
    this.captionInput.type = 'text';
    this.captionInput.placeholder = 'Aggiungi didascalia…';
    this.captionInput.value = this.data.caption ?? '';
    this.captionInput.className = 'cit-caption-input';
    figure.appendChild(this.captionInput);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'cit-remove-btn';
    removeBtn.type = 'button';
    removeBtn.title = 'Rimuovi immagine';
    removeBtn.textContent = '✕';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.data.file = null;
      this.data.caption = '';
      this.renderUploadUI();
    });
    figure.appendChild(removeBtn);

    if (this.data.align === 'center') {
      figure.style.cssText = 'display:block; margin:0 auto;';
      this.wrapper.appendChild(figure);
    } else {
      // Anteprima flex: immagine + area tratteggiata che indica dove va il testo
      const row = document.createElement('div');
      row.className = 'cit-row';
      if (this.data.align === 'right') {
        row.style.flexDirection = 'row-reverse';
      }

      const hint = document.createElement('div');
      hint.className = 'cit-text-hint';
      hint.textContent = this.data.align === 'left'
        ? '→  Il testo scorrerà qui'
        : 'Il testo scorrerà qui  ←';

      row.appendChild(figure);
      row.appendChild(hint);
      this.wrapper.appendChild(row);

      // ✕ sempre visibile quando floated (non affidarsi all'hover)
      removeBtn.style.opacity = '1';
    }
  }

  private applyAlign(): void {
    // Re-render con il nuovo allineamento invece di mutare il DOM parzialmente
    if (this.data.file?.url) {
      this.renderImage();
    }
  }

  private applySize(img: HTMLImageElement): void {
    img.style.cssText = 'display:block; border-radius:8px;';

    switch (this.data.size) {
      case 'piccola':
        img.style.maxWidth = '240px';
        img.style.width    = 'auto';
        break;
      case 'media':
        img.style.maxWidth = '480px';
        img.style.width    = '100%';
        break;
      case 'grande':
        img.style.maxWidth = '800px';
        img.style.width    = '100%';
        break;
      default: // 'originale'
        img.style.maxWidth = '100%';
        img.style.width    = 'auto';
    }
  }
}
