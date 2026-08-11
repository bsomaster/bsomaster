const catalog = {
    items: [],
    profiles: [],
    globalCosts: [],
    currentItem: null,
    currentDetailItem: null,
    currentDetailPrices: null,
    currentDetailPhotos: [],
    currentPhotoIndex: 0,
    cropper: null,
    croppingIndex: null,

    async init() {
        this.setupEventListeners();

        // 1. Inicia o carregamento dos itens imediatamente
        if (document.getElementById('catalog-list')) {
            this.renderCatalog(true); // Mostra esqueleto ou msg de carregando
            await this.loadItems();
            this.renderCatalog();
        }

        // 2. Carrega detalhes se estiver na página de item
        if (window.location.pathname.includes('/printsystem/meucatalogo/item/')) {
            await this.initDetailPage();
        }

        if (window.location.pathname.includes('/printsystem/meucatalogo/additem/')) {
            this.initSaveItemPage();
        }

        // 3. Carrega dependências em background (Pressets e Custos)
        this.loadDependencies();
    },

    async loadItems() {
        if (!window.user) return;
        try {
            // Busca apenas os campos necessários para a grade (otimiza tráfego de dados)
            const { data } = await window.supabase
                .from('catalog')
                .select('id, name, unit_price, wholesale_price, is_public, photos')
                .eq('user_id', window.user.id)
                .order('created_at', { ascending: false });

            this.items = data || [];
        } catch (err) {
            console.error("Erro ao carregar itens:", err);
        }
    },

    async loadDependencies() {
        // Tenta pegar do cache primeiro
        const cachedProfiles = sessionStorage.getItem('ps_profiles');
        const cachedCosts = sessionStorage.getItem('ps_global_costs');

        if (cachedProfiles && cachedCosts) {
            this.profiles = JSON.parse(cachedProfiles);
            this.globalCosts = JSON.parse(cachedCosts);
            return;
        }

        const [pRes, gRes] = await Promise.all([
            window.supabase.from('pressets').select('*').eq('user_id', window.user.id),
            window.supabase.from('global_costs').select('*').eq('user_id', window.user.id)
        ]);

        this.profiles = (pRes.data || []).map(p => ({
            id: p.id, name: p.name, saleMargin: p.sale_margin, retailMargin: p.retail_margin,
            materialPerWeight: p.material_per_weight, laborPerHour: p.labor_per_hour,
            energyPerHour: p.energy_per_hour, maintenancePerHour: p.maintenance_per_hour,
            customFields: p.custom_fields || []
        }));
        this.globalCosts = gRes.data || [];

        // Salva no cache de sessão
        sessionStorage.setItem('ps_profiles', JSON.stringify(this.profiles));
        sessionStorage.setItem('ps_global_costs', JSON.stringify(this.globalCosts));
    },

    renderCatalog(isLoading = false, itemsToRender = null) {
        const container = document.getElementById('catalog-list');
        if (!container) return;

        if (isLoading) {
            container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-top: 2rem;">Buscando seus itens...</p>';
            return;
        }

        const items = itemsToRender || this.items;

        if (items.length === 0) {
            container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); margin-top: 2rem;">${itemsToRender ? 'Nenhum item encontrado para sua busca.' : 'Seu catálogo está vazio.'}</p>`;
            return;
        }

        // Renderiza usando os preços já calculados no banco
        container.innerHTML = items.map(item => {
            const mainPhoto = (item.photos && item.photos.length > 0) ? item.photos[0] : null;
            return `
                <div class="catalog-item-card" onclick="location.href='/printsystem/meucatalogo/item/?id=${item.id}'" style="cursor: pointer;">
                    <div style="position: absolute; top: 10px; left: 10px; z-index: 15; display: flex; gap: 0.5rem;">
                        <button class="btn-icon" onclick="event.stopPropagation(); catalog.toggleVisibility('${item.id}', ${item.is_public})" title="${item.is_public ? 'Tornar Privado' : 'Tornar Público'}" style="width: 32px; height: 32px; background: ${item.is_public ? 'var(--accent-success)' : 'rgba(0,0,0,0.5)'}; border: none;">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                                <path d="${item.is_public ? 'M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17M12,4.5C7,4.5 2.73,7.61 1,12C2.73,16.39 7,19.5 12,19.5C17,19.5 21.27,16.39 23,12C21.27,7.61 17,4.5 12,4.5Z' : 'M11.83,9L15,12.17V12A3,3 0 0,0 12,9M2,4.27L5.11,7.39C3.1,8.5 1.45,10.13 1,12C2.73,16.39 7,19.5 12,19.5C13.55,19.5 15.03,19.2 16.38,18.66L19.73,22L21,20.73L3.27,3L2,4.27M12,17A5,5 0 0,1 7,12C7,11.23 7.18,10.5 7.5,9.86L10.56,12.92C10.74,14.07 11.66,14.96 12.82,15.11L14.15,17.44C13.47,17.8 12.75,18 12,18V17M12,7A5,5 0 0,1 17,12C17,12.75 16.8,13.47 16.44,14.15L18.66,16.38C19.2,15.03 19.5,13.55 19.5,12C17.77,7.61 13.5,4.5 8.5,4.5C7.75,4.5 7.03,4.6 6.32,4.78L8.89,7.25C9.84,7.1 10.87,7 12,7Z'}" />
                            </svg>
                        </button>
                    </div>
                    <button class="btn-delete-item" onclick="event.stopPropagation(); catalog.deleteItem('${item.id}')" title="Excluir">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19V4M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" /></svg>
                    </button>
                    <div class="catalog-item-photo">${mainPhoto ? `<img src="${mainPhoto}" loading="lazy">` : 'Sem Foto'}</div>
                    <div class="catalog-item-info">
                        <div class="catalog-item-name">${item.name}</div>
                        <div class="catalog-item-prices">
                            <div class="catalog-price-row"><span>Unitário:</span><strong>R$ ${(item.unit_price || 0).toFixed(2)}</strong></div>
                            <div class="catalog-price-row retail"><span>Atacado:</span><strong>R$ ${(item.wholesale_price || 0).toFixed(2)}</strong></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    filterCatalog(query) {
        const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const filtered = this.items.filter(item =>
            item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(cleanQuery)
        );
        this.renderCatalog(false, filtered);
    },

    async initDetailPage() {
        const id = new URLSearchParams(window.location.search).get('id');
        if (!id) { location.href = '/printsystem/meucatalogo/'; return; }

        // Garantir que as dependências (custos e perfis) estejam carregadas ANTES do item
        await this.loadDependencies();

        // Busca o item completo com descrição e todas as fotos
        const { data: item } = await window.supabase.from('catalog').select('*').eq('id', id).single();

        if (!item) {
            window.utils.showAlert({
                title: 'Item não encontrado',
                message: 'O item solicitado não existe ou foi removido.',
                onConfirm: () => location.href = '/printsystem/meucatalogo/'
            });
            return;
        }

        this.openItemDetail(item);
    },

    // ... Resto das funções (confirmSave, handlePhotoSelect, cropper, etc) permanecem iguais ...
    setupEventListeners() {
        const btnCancelSave = document.getElementById('btn-cancel-save');
        if (btnCancelSave) btnCancelSave.onclick = () => location.href = '/printsystem/';
        const btnConfirmSave = document.getElementById('btn-confirm-save');
        if (btnConfirmSave) btnConfirmSave.onclick = () => this.confirmSave();
        const photoInput = document.getElementById('save-item-photo');
        if (photoInput) photoInput.onchange = (e) => this.handlePhotoSelect(e);
        const btnEditPhoto = document.getElementById('btn-edit-photo');
        if (btnEditPhoto) btnEditPhoto.onclick = () => { if (this.currentItem && this.currentItem.photos.length > 0) this.openCropper(this.currentItem.photos[0], 0); };
        const btnCancelCrop = document.getElementById('btn-cancel-crop');
        if (btnCancelCrop) btnCancelCrop.onclick = () => this.closeCropper();
        const btnConfirmCrop = document.getElementById('btn-confirm-crop');
        if (btnConfirmCrop) btnConfirmCrop.onclick = () => this.confirmCrop();
        const btnBackToCatalog = document.getElementById('btn-back-to-catalog');
        if (btnBackToCatalog) btnBackToCatalog.onclick = () => location.href = '/printsystem/meucatalogo/';
        const mainImage = document.getElementById('detail-item-photo');
        if (mainImage) { mainImage.style.cursor = 'zoom-in'; mainImage.onclick = () => this.openImageViewer(); }
        const catalogSearch = document.getElementById('catalog-search');
        if (catalogSearch) {
            catalogSearch.addEventListener('input', (e) => this.filterCatalog(e.target.value));
        }

        const btnRealizar = document.getElementById('btn-realizar-venda');
        if (btnRealizar) {
            btnRealizar.onclick = () => {
                const id = new URLSearchParams(window.location.search).get('id');
                location.href = `/vendas/nova/?id=${id}`;
            };
        }
        this.setupCarouselDrag();
    },

    setupCarouselDrag() {
        const carousel = document.getElementById('detail-item-carousel');
        if (!carousel) return;
        let isDown = false, startX, scrollLeft;
        carousel.onmousedown = (e) => { isDown = true; carousel.classList.add('dragging'); startX = e.pageX - carousel.offsetLeft; scrollLeft = carousel.scrollLeft; };
        carousel.onmouseleave = () => { isDown = false; carousel.classList.remove('dragging'); };
        carousel.onmouseup = () => { isDown = false; carousel.classList.remove('dragging'); };
        carousel.onmousemove = (e) => { if (!isDown) return; e.preventDefault(); const x = e.pageX - carousel.offsetLeft; const walk = (x - startX) * 2; carousel.scrollLeft = scrollLeft - walk; };
    },

    initSaveItemPage() {
        const storedData = localStorage.getItem('printsystem_current_calc');
        if (!storedData) { location.href = '/printsystem/'; return; }
        this.currentItem = JSON.parse(storedData);
        this.currentItem.photos = [];

        // Formata para exibição (aceita tanto número quanto string antiga)
        const format = (val) => {
            if (typeof val === 'number') return `R$ ${val.toFixed(2)}`;
            return val; // Já está formatado como string
        };

        document.getElementById('save-item-single-price-text').innerText = format(this.currentItem.singlePrice);
        document.getElementById('save-item-retail-price-text').innerText = format(this.currentItem.retailPrice);
        this.renderSaveGallery();
    },

    handlePhotoSelect(event) {
        const files = Array.from(event.target.files);
        let processed = 0;
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const base64 = e.target.result;
                if (this.currentItem.photos.length === 0 && processed === 0) { this.currentItem.photos.push(base64); this.openCropper(base64, 0); }
                else { this.currentItem.photos.push(base64); }
                processed++;
                if (processed === files.length) { this.renderSaveGallery(); event.target.value = ''; }
            };
            reader.readAsDataURL(file);
        });
    },

    renderSaveGallery() {
        const gallery = document.getElementById('save-item-gallery'), mainPreview = document.getElementById('photo-preview-img'), placeholder = document.getElementById('photo-placeholder'), editBtn = document.getElementById('btn-edit-photo');
        if (!gallery) return;
        if (this.currentItem.photos.length > 0) {
            mainPreview.src = this.currentItem.photos[0]; mainPreview.classList.remove('hidden'); placeholder.classList.add('hidden'); editBtn.classList.remove('hidden');
            gallery.innerHTML = this.currentItem.photos.map((photo, index) => `<div class="gallery-thumb ${index === 0 ? 'active' : ''}" onclick="catalog.openCropper('${photo}', ${index})"><img src="${photo}">${index === 0 ? '<span class="main-photo-badge">Principal</span>' : ''}<button class="btn-remove-thumb" onclick="event.stopPropagation(); catalog.removePhoto(${index})">&times;</button></div>`).join('');
        } else {
            mainPreview.src = ''; mainPreview.classList.add('hidden'); placeholder.classList.remove('hidden'); editBtn.classList.add('hidden'); gallery.innerHTML = '';
        }
    },

    removePhoto(index) { this.currentItem.photos.splice(index, 1); this.renderSaveGallery(); },
    openCropper(imageSrc, index) { this.croppingIndex = index; const modal = document.getElementById('cropper-modal'), image = document.getElementById('cropper-image'); image.src = imageSrc; modal.classList.remove('hidden'); if (this.cropper) this.cropper.destroy(); this.cropper = new Cropper(image, { aspectRatio: 1, viewMode: 1, dragMode: 'move', autoCropArea: 1, restore: false, guides: true, center: true, highlight: false, cropBoxMovable: true, cropBoxResizable: true, toggleDragModeOnDblclick: false }); },
    closeCropper() { document.getElementById('cropper-modal').classList.add('hidden'); if (this.cropper) { this.cropper.destroy(); this.cropper = null; } this.croppingIndex = null; },
    confirmCrop() { if (!this.cropper || this.croppingIndex === null) return; const canvas = this.cropper.getCroppedCanvas({ width: 800, height: 800 }); this.currentItem.photos[this.croppingIndex] = canvas.toDataURL('image/jpeg', 0.9); this.renderSaveGallery(); this.closeCropper(); },

    async confirmSave() {
        const name = document.getElementById('save-item-name').value.trim();
        const description = document.getElementById('save-item-description').value.trim();
        if (!name) {
            window.utils.showAlert({ title: 'Campo Obrigatório', message: 'Por favor, insira o nome do item para salvar.' });
            return;
        }

        const parseCurrency = (val) => {
            if (typeof val === 'number') return val;
            if (!val) return 0;
            // Se for string, remove "R$ ", remove pontos de milhar e troca vírgula decimal por ponto
            let clean = val.replace('R$ ', '').trim();
            if (clean.includes(',')) {
                clean = clean.replace(/\./g, '').replace(',', '.');
            }
            return parseFloat(clean) || 0;
        };

        const newItem = {
            id: crypto.randomUUID(),
            user_id: window.user.id,
            name: name,
            description: description,
            weight: parseFloat(this.currentItem.weight) || 0,
            time: this.currentItem.time,
            presset_id: this.currentItem.pressetId,
            selected_costs: this.currentItem.selectedCosts,
            photos: this.currentItem.photos,
            unit_price: parseCurrency(this.currentItem.singlePrice),
            wholesale_price: parseCurrency(this.currentItem.retailPrice),
            is_public: false
        };
        const { error } = await window.supabase.from('catalog').insert(newItem);
        if (error) {
            window.utils.showAlert({ title: 'Erro ao Salvar', message: 'Ocorreu um problema ao salvar o item: ' + error.message });
            return;
        }
        localStorage.removeItem('printsystem_current_calc');
        window.utils.showAlert({
            title: 'Sucesso!',
            message: 'Item salvo no catálogo com sucesso.',
            onConfirm: () => location.href = '/printsystem/meucatalogo/'
        });
    },

    getItemPrices(item) {
        // Tenta usar os perfis e custos do catálogo, ou do calculador como backup
        const profiles = (this.profiles && this.profiles.length > 0) ? this.profiles : (window.calculator.profiles || []);
        const globalCosts = (this.globalCosts && this.globalCosts.length > 0) ? this.globalCosts : (window.calculator.globalCosts || []);

        const profile = profiles.find(p => p.id == item.presset_id);
        const weight = parseFloat(item.weight) || 0;
        const time = item.time || { days: 0, hours: 0, minutes: 0 };
        const totalHours = (parseFloat(time.days || 0) * 24) + parseFloat(time.hours || 0) + (parseFloat(time.minutes || 0) / 60);

        let savedSelectedCosts = item.selected_costs || [];
        if (typeof savedSelectedCosts === 'string') {
            try { savedSelectedCosts = JSON.parse(savedSelectedCosts); } catch (e) { savedSelectedCosts = []; }
        }

        const selectedCosts = (savedSelectedCosts).map(sc => {
            // Se o item já tem nome e preço salvos (novo formato), usa eles
            if (sc.name && sc.price !== undefined) {
                return { ...sc, quantity: sc.quantity || 1 };
            }

            // Caso contrário, busca na lista global (formato antigo/legado)
            const scId = sc.id || sc;
            const gc = globalCosts.find(g => g.id == scId);
            if (gc) return { ...gc, quantity: sc.quantity || 1 };

            return null;
        }).filter(c => c !== null);

        if (!profile) {
            const breakdown = selectedCosts.map(item => ({
                name: `${item.name} (${item.quantity}x)`,
                value: (item.price || 0) * (item.quantity || 1)
            }));
            return {
                singlePrice: item.unit_price || 0,
                retailPrice: item.wholesale_price || 0,
                totalCost: breakdown.reduce((acc, b) => acc + b.value, 0),
                breakdown: breakdown
            };
        }

        return window.calculator.calculatePrices({ profile, weight, totalHours, selectedCosts });
    },

    async toggleVisibility(id, currentStatus) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        const updates = { is_public: !currentStatus };
        const { error } = await window.supabase.from('catalog').update(updates).eq('id', id);
        if (error) {
            window.utils.showAlert({ title: 'Erro', message: 'Erro ao alterar visibilidade: ' + error.message });
            return;
        }
        item.is_public = !currentStatus;
        this.renderCatalog();
    },

    openItemDetail(item) {
        const prices = this.getItemPrices(item);
        this.currentDetailItem = item;
        this.currentDetailPrices = prices;
        const profile = this.profiles.find(p => p.id === item.presset_id);
        this.currentDetailPhotos = item.photos || [];
        this.currentPhotoIndex = 0;
        document.getElementById('detail-item-name').innerText = item.name;

        const descEl = document.getElementById('detail-item-description');
        if (descEl) descEl.innerText = item.description || 'Sem descrição disponível.';

        const carousel = document.getElementById('detail-item-carousel');
        if (this.currentDetailPhotos.length > 0) {
            this.updateDetailPhoto();
            carousel.innerHTML = this.currentDetailPhotos.map((p, idx) => `<div class="carousel-thumb ${idx === 0 ? 'active' : ''}" data-index="${idx}" onclick="catalog.selectPhoto(${idx})"><img src="${p}" draggable="false"></div>`).join('');
            carousel.style.display = 'flex';
        } else {
            const mainPhotoImg = document.getElementById('detail-item-photo');
            mainPhotoImg.src = ''; mainPhotoImg.parentElement.style.display = 'none'; carousel.style.display = 'none';
        }

        const profileEl = document.getElementById('detail-item-profile');
        if (profileEl) profileEl.innerText = profile ? profile.name : 'Presset Removido';

        const weightEl = document.getElementById('detail-item-weight');
        if (weightEl) weightEl.innerText = item.weight ? `${item.weight}g` : '0g';

        const time = item.time || { days: 0, hours: 0, minutes: 0 };
        let timeStr = '';
        if (time.days > 0) timeStr += `${time.days}d `;
        if (time.hours > 0) timeStr += `${time.hours}h `;
        if (time.minutes > 0) timeStr += `${time.minutes}m`;
        const timeEl = document.getElementById('detail-item-time');
        if (timeEl) timeEl.innerText = timeStr.trim() || '0m';

        // Usar preços salvos no banco para exibição principal
        const displaySinglePrice = item.unit_price || prices.singlePrice;
        const displayRetailPrice = item.wholesale_price || prices.retailPrice;

        const sP = document.getElementById('detail-res-single');
        if (sP) sP.innerText = `R$ ${displaySinglePrice.toFixed(2)}`;

        const sPr = document.getElementById('detail-res-single-profit');
        if (sPr) sPr.innerText = `R$ ${(displaySinglePrice - prices.totalCost).toFixed(2)}`;

        const rP = document.getElementById('detail-res-retail');
        if (rP) rP.innerText = `R$ ${displayRetailPrice.toFixed(2)}`;

        const rPr = document.getElementById('detail-res-retail-profit');
        if (rPr) rPr.innerText = `R$ ${(displayRetailPrice - prices.totalCost).toFixed(2)}`;

        const sM = document.getElementById('detail-res-single-margin');
        if (sM && profile) sM.innerText = `Lucro: ${profile.saleMargin}%`;

        const rM = document.getElementById('detail-res-retail-margin');
        if (rM && profile) rM.innerText = `Lucro: ${profile.retailMargin}%`;

        const tC = document.getElementById('detail-res-total-cost');
        if (tC) tC.innerText = `R$ ${prices.totalCost.toFixed(2)}`;

        const bL = document.getElementById('detail-res-costs-breakdown');
        if (bL) {
            // Filtra itens com valor relevante no detalhamento
            const visibleBreakdown = (prices.breakdown || []).filter(b => Math.abs(b.value) > 0.001);
            if (visibleBreakdown.length > 0) {
                bL.innerHTML = visibleBreakdown.map(b => `
                    <div class="breakdown-item">
                        <span>${b.name}</span>
                        <strong>R$ ${b.value.toFixed(2)}</strong>
                    </div>
                `).join('');
            } else {
                bL.innerHTML = '<p class="text-muted" style="font-size: 0.8rem; text-align: center;">Sem detalhamento de custos disponível.</p>';
            }
        }
    },

    selectPhoto(index) { this.currentPhotoIndex = index; this.updateDetailPhoto(); },
    changePhoto(delta) { if (this.currentDetailPhotos.length === 0) return; this.currentPhotoIndex += delta; if (this.currentPhotoIndex < 0) this.currentPhotoIndex = this.currentDetailPhotos.length - 1; if (this.currentPhotoIndex >= this.currentDetailPhotos.length) this.currentPhotoIndex = 0; this.updateDetailPhoto(); },
    updateDetailPhoto() {
        const photoSrc = this.currentDetailPhotos[this.currentPhotoIndex];
        const mainPhotoImg = document.getElementById('detail-item-photo');
        if (mainPhotoImg) { mainPhotoImg.src = photoSrc; mainPhotoImg.parentElement.style.display = 'flex'; }
        const thumbs = document.querySelectorAll('.carousel-thumb');
        thumbs.forEach((t, idx) => { if (idx === this.currentPhotoIndex) { t.classList.add('active'); t.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } else t.classList.remove('active'); });
    },

    openImageViewer() {
        const mainPhotoSrc = document.getElementById('detail-item-photo').src; if (!mainPhotoSrc) return;
        const modal = document.getElementById('image-viewer-modal'), enlargedImg = document.getElementById('enlarged-image');
        enlargedImg.src = mainPhotoSrc; modal.classList.remove('hidden'); document.body.style.overflow = 'hidden';
    },

    closeImageViewer() { const modal = document.getElementById('image-viewer-modal'); modal.classList.add('hidden'); document.body.style.overflow = ''; },

    async deleteItem(id) {
        window.utils.showAlert({
            title: 'Excluir Item',
            message: 'Tem certeza que deseja excluir este item do catálogo?',
            type: 'confirm',
            onConfirm: async () => {
                const { error } = await window.supabase.from('catalog').delete().eq('id', id);
                if (error) {
                    window.utils.showAlert({ title: 'Erro', message: 'Erro ao excluir item: ' + error.message });
                } else {
                    this.items = this.items.filter(item => item.id !== id);
                    this.renderCatalog();
                }
            }
        });
    }
};

window.catalog = catalog;
