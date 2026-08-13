<<<<<<< HEAD:ps/supabase.js
const SUPABASE_URL = 'https://hefqocrvzqbozxcetrzi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_UPKs3iMs4JeDG2it2sCj7w_-8k_iOmq';

// A biblioteca importada via CDN expõe o objeto 'supabase' globalmente
// que contém a função createClient.
if (typeof supabase === 'undefined') {
    console.error('Supabase library not loaded! Check your internet connection or CDN link.');
}
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

window.supabase = _supabase;

// Utilitários Globais
window.utils = {
    // Máscara de dinheiro: ao digitar 2 -> 0.02, 5 -> 0.25, 0 -> 2.50
    applyMoneyMask(input) {
        if (!input || input.dataset.maskApplied) return;
        input.dataset.maskApplied = 'true';

        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (!value) {
                e.target.value = '';
                return;
            }
            const numericValue = parseInt(value) / 100;
            e.target.value = numericValue.toFixed(2);

            // Dispara um evento de change para que outros scripts possam reagir se necessário
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Formata o valor inicial se existir
        if (input.value) {
            const val = input.value.toString().replace(',', '.');
            const initialValue = parseFloat(val);
            if (!isNaN(initialValue)) {
                input.value = initialValue.toFixed(2);
            }
        }
    },

    initMoneyInputs() {
        document.querySelectorAll('.money-input').forEach(input => {
            this.applyMoneyMask(input);
        });
    },

    /**
     * Exibe um popup customizado (Informativo ou Pergunta)
     * @param {Object} options - { title, message, type: 'info'|'confirm', onConfirm, onCancel }
     */
    showAlert({ title, message, type = 'info', onConfirm, onCancel }) {
        // Remove qualquer alerta existente
        const existing = document.getElementById('global-alert-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'global-alert-overlay';
        overlay.className = 'modal-overlay';

        const isConfirm = type === 'confirm';

        overlay.innerHTML = `
            <div class="alert-card">
                <h2>${title.replace(' ', ' <span>')}</span></h2>
                <p>${message}</p>
                <div class="alert-actions">
                    ${isConfirm ? `<button class="btn-secondary" id="alert-cancel">Cancelar</button>` : ''}
                    <button class="btn-primary" id="alert-ok">${isConfirm ? 'Confirmar' : 'Entendido'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const btnOk = overlay.querySelector('#alert-ok');
        const btnCancel = overlay.querySelector('#alert-cancel');

        btnOk.onclick = () => {
            overlay.remove();
            if (onConfirm) onConfirm();
        };

        if (btnCancel) {
            btnCancel.onclick = () => {
                overlay.remove();
                if (onCancel) onCancel();
            };
        }
    },

    /**
     * Comprime uma imagem base64 para WebP e garante que fique abaixo de um tamanho máximo
     * @param {string} base64Str - Imagem original
     * @param {number} maxKb - Tamanho máximo em KB
     * @returns {Promise<string>} - Imagem comprimida em base64
     */
    async compressImage(base64Str, maxKb = 200) {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Redimensiona se for muito grande (opcional, mas ajuda na compressão)
                const maxDim = 1200;
                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height *= maxDim / width;
                        width = maxDim;
                    } else {
                        width *= maxDim / height;
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                let quality = 0.8;
                let result = canvas.toDataURL('image/webp', quality);

                // Ajusta qualidade iterativamente para caber no limite
                while (result.length * 0.75 > maxKb * 1024 && quality > 0.1) {
                    quality -= 0.1;
                    result = canvas.toDataURL('image/webp', quality);
                }

                resolve(result);
            };
        });
    }
};
=======
const SUPABASE_URL = 'https://hefqocrvzqbozxcetrzi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_UPKs3iMs4JeDG2it2sCj7w_-8k_iOmq';

// A biblioteca importada via CDN expõe o objeto 'supabase' globalmente
// que contém a função createClient.
if (typeof supabase === 'undefined') {
    console.error('Supabase library not loaded! Check your internet connection or CDN link.');
}
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

window.supabase = _supabase;

// Utilitários Globais
window.utils = {
    // Máscara de dinheiro: ao digitar 2 -> 0.02, 5 -> 0.25, 0 -> 2.50
    applyMoneyMask(input) {
        if (!input || input.dataset.maskApplied) return;
        input.dataset.maskApplied = 'true';

        input.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (!value) {
                e.target.value = '';
                return;
            }
            const numericValue = parseInt(value) / 100;
            e.target.value = numericValue.toFixed(2);

            // Dispara um evento de change para que outros scripts possam reagir se necessário
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });

        // Formata o valor inicial se existir
        if (input.value) {
            const val = input.value.toString().replace(',', '.');
            const initialValue = parseFloat(val);
            if (!isNaN(initialValue)) {
                input.value = initialValue.toFixed(2);
            }
        }
    },

    initMoneyInputs() {
        document.querySelectorAll('.money-input').forEach(input => {
            this.applyMoneyMask(input);
        });
    },

    /**
     * Exibe um popup customizado (Informativo ou Pergunta)
     * @param {Object} options - { title, message, type: 'info'|'confirm', onConfirm, onCancel }
     */
    showAlert({ title, message, type = 'info', onConfirm, onCancel }) {
        // Remove qualquer alerta existente
        const existing = document.getElementById('global-alert-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'global-alert-overlay';
        overlay.className = 'modal-overlay';

        const isConfirm = type === 'confirm';

        overlay.innerHTML = `
            <div class="alert-card">
                <h2>${title.replace(' ', ' <span>')}</span></h2>
                <p>${message}</p>
                <div class="alert-actions">
                    ${isConfirm ? `<button class="btn-secondary" id="alert-cancel">Cancelar</button>` : ''}
                    <button class="btn-primary" id="alert-ok">${isConfirm ? 'Confirmar' : 'Entendido'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const btnOk = overlay.querySelector('#alert-ok');
        const btnCancel = overlay.querySelector('#alert-cancel');

        btnOk.onclick = () => {
            overlay.remove();
            if (onConfirm) onConfirm();
        };

        if (btnCancel) {
            btnCancel.onclick = () => {
                overlay.remove();
                if (onCancel) onCancel();
            };
        }
    }
};
>>>>>>> 5e21ac9a8408cf132a049eb2730d818cf0f8132f:printsystem/supabase.js
