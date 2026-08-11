const settings = {
    profiles: [],
    globalCosts: [],
    currentCustomFields: [],

    async init() {
        if (!window.user) return;

        const { data: profiles, error: pError } = await window.supabase
            .from('pressets')
            .select('*')
            .eq('user_id', window.user.id);

        const { data: globalCosts, error: gError } = await window.supabase
            .from('global_costs')
            .select('*')
            .eq('user_id', window.user.id);

        if (pError) console.error('Error fetching pressets:', pError);
        if (gError) console.error('Error fetching global costs:', gError);

        this.profiles = (profiles || []).map(p => ({
            id: p.id,
            name: p.name,
            saleMargin: p.sale_margin,
            retailMargin: p.retail_margin,
            materialPerWeight: p.material_per_weight,
            laborPerHour: p.labor_per_hour,
            energyPerHour: p.energy_per_hour,
            maintenancePerHour: p.maintenance_per_hour,
            customFields: p.custom_fields || []
        }));

        this.globalCosts = globalCosts || [];

        if (document.getElementById('profiles-list')) {
            this.renderProfiles();
        }
        if (document.getElementById('global-costs-list')) {
            this.renderGlobalCosts();
        }

        // Check if we are on the presset page
        if (window.location.pathname.includes('/printsystem/configuracoes/presset/')) {
            const urlParams = new URLSearchParams(window.location.search);
            const editId = urlParams.get('edit');
            const cloneId = urlParams.get('clone');

            if (editId) {
                const profile = this.profiles.find(p => p.id === editId);
                if (profile) this.populateProfileEditor(profile, false);
            } else if (cloneId) {
                const profile = this.profiles.find(p => p.id === cloneId);
                if (profile) this.populateProfileEditor(profile, true);
            }
        }

        this.setupEventListeners();

        // Inicializa as máscaras de dinheiro
        if (window.utils && window.utils.initMoneyInputs) {
            window.utils.initMoneyInputs();
        }
    },

    renderProfiles() {
        const list = document.getElementById('profiles-list');
        list.className = 'settings-list';
        list.innerHTML = this.profiles.map(p => `
            <div class="settings-item">
                <div class="item-info">
                    <span class="item-name">${p.name}</span>
                    <span class="item-details">Lucro: ${p.saleMargin}% (Un) / ${p.retailMargin}% (Atac)</span>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only" onclick="location.href='/printsystem/configuracoes/presset/?edit=${p.id}'" title="Editar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button class="btn-secondary btn-icon-only" onclick="location.href='/printsystem/configuracoes/presset/?clone=${p.id}'" title="Clonar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                    </button>
                    <button class="btn-secondary btn-icon-only danger" onclick="settings.deleteProfile('${p.id}')" title="Excluir">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    },

    renderGlobalCosts() {
        const list = document.getElementById('global-costs-list');
        list.className = 'settings-list';
        list.innerHTML = this.globalCosts.map(c => `
            <div class="settings-item global-cost-item">
                <div class="item-info">
                    <span class="item-name">${c.name}</span>
                </div>
                <span class="cost-price">R$ ${c.price.toFixed(2)}</span>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only" onclick="settings.editGlobalCost('${c.id}')" title="Editar">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                    </button>
                    <button class="btn-secondary btn-icon-only danger" onclick="settings.deleteGlobalCost('${c.id}')" title="Excluir">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    },

    setupEventListeners() {
        const safeClick = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        safeClick('btn-add-profile', () => location.href = '/printsystem/configuracoes/presset/');
        safeClick('btn-close-profile', () => location.href = '/printsystem/configuracoes/');
        safeClick('btn-save-profile', () => this.saveProfile());
        safeClick('btn-add-global', () => this.addGlobalCost());
        safeClick('btn-add-custom-field', () => this.addCustomField());

        // Custom Type Dropdown Logic
        const typeDisplay = document.getElementById('new-custom-type-display');
        const typeDropdown = document.getElementById('custom-type-results');

        if (typeDisplay && typeDropdown) {
            typeDisplay.onclick = (e) => {
                e.stopPropagation();
                const isHidden = typeDropdown.classList.contains('hidden');
                // Fecha outros menus se existirem
                document.querySelectorAll('.search-results-dropdown').forEach(d => d.classList.add('hidden'));

                if (isHidden) {
                    typeDropdown.classList.remove('hidden');
                }
            };
        }

        document.addEventListener('click', () => {
            if (typeDropdown) typeDropdown.classList.add('hidden');
        });
    },

    selectCustomType(value, label) {
        const display = document.getElementById('new-custom-type-display');
        const hidden = document.getElementById('new-custom-type');
        const dropdown = document.getElementById('custom-type-results');

        if (hidden) hidden.value = value;
        if (display) display.value = label;
        if (dropdown) dropdown.classList.add('hidden');
    },

    populateProfileEditor(profile, isClone) {
        const title = document.getElementById('profile-modal-title');
        title.innerHTML = isClone ? 'Novo Presset <span>(Clone)</span>' : 'Editar Presset: <span>' + profile.name + '</span>';

        document.getElementById('edit-profile-id').value = isClone ? '' : profile.id;
        document.getElementById('edit-profile-name').value = profile.name + (isClone ? ' (Cópia)' : '');
        document.getElementById('edit-profile-sale').value = profile.saleMargin;
        document.getElementById('edit-profile-retail').value = profile.retailMargin;
        document.getElementById('edit-profile-material').value = profile.materialPerWeight;
        document.getElementById('edit-profile-labor').value = profile.laborPerHour;
        document.getElementById('edit-profile-energy').value = profile.energyPerHour;
        document.getElementById('edit-profile-maint').value = profile.maintenancePerHour;
        this.currentCustomFields = JSON.parse(JSON.stringify(profile.customFields || []));
        this.renderCustomFields();

        // Re-inicializa as máscaras para garantir que os valores carregados fiquem formatados
        if (window.utils && window.utils.initMoneyInputs) {
            window.utils.initMoneyInputs();
        }
    },

    renderCustomFields() {
        const list = document.getElementById('custom-fields-list');
        if (!list) return;
        list.innerHTML = this.currentCustomFields.map((f, index) => `
            <div class="custom-field-item">
                <span class="field-name">${f.name}</span>
                <div class="field-value-group">
                    <span class="field-value">R$ ${f.value.toFixed(2)}</span>
                    <span class="badge">${f.type === 'hour' ? 'por Hora' : 'por Peso'}</span>
                </div>
                <button class="btn-secondary btn-icon-only danger" onclick="settings.removeCustomField(${index})" title="Remover">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                </button>
            </div>
        `).join('');
    },

    addCustomField() {
        const name = document.getElementById('new-custom-name').value;
        const value = parseFloat(document.getElementById('new-custom-value').value);
        const type = document.getElementById('new-custom-type').value;

        if (name && !isNaN(value)) {
            this.currentCustomFields.push({ name, value, type });
            this.renderCustomFields();
            document.getElementById('new-custom-name').value = '';
            document.getElementById('new-custom-value').value = '';

            // Reset custom type to default
            this.selectCustomType('hour', 'Por Hora');
        }
    },

    removeCustomField(index) {
        this.currentCustomFields.splice(index, 1);
        this.renderCustomFields();
    },

    async deleteProfile(id) {
        window.utils.showAlert({
            title: 'Excluir Presset',
            message: 'Deseja realmente excluir este presset? Esta ação não pode ser desfeita.',
            type: 'confirm',
            onConfirm: async () => {
                const { error } = await window.supabase
                    .from('pressets')
                    .delete()
                    .eq('id', id);

                if (error) {
                    window.utils.showAlert({ title: 'Erro', message: 'Erro ao excluir presset: ' + error.message });
                } else {
                    this.profiles = this.profiles.filter(p => p.id !== id);
                    this.renderProfiles();
                    window.dispatchEvent(new Event('settings-updated'));
                }
            }
        });
    },

    async saveProfile() {
        const id = document.getElementById('edit-profile-id').value || crypto.randomUUID();
        const profile = {
            id,
            user_id: window.user.id,
            name: document.getElementById('edit-profile-name').value,
            sale_margin: parseFloat(document.getElementById('edit-profile-sale').value) || 0,
            retail_margin: parseFloat(document.getElementById('edit-profile-retail').value) || 0,
            material_per_weight: parseFloat(document.getElementById('edit-profile-material').value) || 0,
            labor_per_hour: parseFloat(document.getElementById('edit-profile-labor').value) || 0,
            energy_per_hour: parseFloat(document.getElementById('edit-profile-energy').value) || 0,
            maintenance_per_hour: parseFloat(document.getElementById('edit-profile-maint').value) || 0,
            custom_fields: this.currentCustomFields
        };

        const { error } = await window.supabase
            .from('pressets')
            .upsert(profile);

        if (error) {
            window.utils.showAlert({ title: 'Erro ao Salvar', message: 'Erro ao salvar presset: ' + error.message });
            return;
        }

        // Recalcular todos os itens que usam este presset
        await this.recalculateCatalog(id);

        location.href = '/printsystem/configuracoes/';
    },

    editGlobalCost(id) {
        const cost = this.globalCosts.find(c => c.id === id);
        if (cost) {
            document.getElementById('edit-global-id').value = cost.id;
            document.getElementById('new-global-name').value = cost.name;
            document.getElementById('new-global-price').value = cost.price;
            document.getElementById('btn-add-global').innerText = 'Salvar';

            // Re-inicializa as máscaras
            if (window.utils && window.utils.initMoneyInputs) {
                window.utils.initMoneyInputs();
            }
        }
    },

    async addGlobalCost() {
        const id = document.getElementById('edit-global-id').value || crypto.randomUUID();
        const name = document.getElementById('new-global-name').value;
        const price = parseFloat(document.getElementById('new-global-price').value);

        if (name && !isNaN(price)) {
            const { error } = await window.supabase
                .from('global_costs')
                .upsert({ id, user_id: window.user.id, name, price });

            if (error) {
                window.utils.showAlert({ title: 'Erro ao Salvar', message: 'Erro ao salvar custo: ' + error.message });
                return;
            }

            // Como custo global afeta potencialmente todos os itens, recalcula tudo
            await this.recalculateCatalog();

            await this.init();

            // Reset
            document.getElementById('edit-global-id').value = '';
            document.getElementById('new-global-name').value = '';
            document.getElementById('new-global-price').value = '';
            document.getElementById('btn-add-global').innerText = 'Adicionar';
            window.dispatchEvent(new Event('settings-updated'));
        }
    },

    async recalculateCatalog(targetPressetId = null) {
        console.log("Recalculando preços do catálogo...");

        // 1. Buscar itens do catálogo
        let query = window.supabase.from('catalog').select('*').eq('user_id', window.user.id);
        if (targetPressetId) query = query.eq('presset_id', targetPressetId);

        const { data: items } = await query;
        if (!items || items.length === 0) return;

        // 2. Garantir que temos os dados de custo mais recentes
        await this.init();

        // 3. Processar cada item
        for (const item of items) {
            const profile = this.profiles.find(p => p.id === item.presset_id);
            if (!profile) continue;

            const weight = parseFloat(item.weight) || 0;
            const time = item.time || { days: 0, hours: 0, minutes: 0 };
            const totalHours = (parseFloat(time.days || 0) * 24) + parseFloat(time.hours || 0) + (parseFloat(time.minutes || 0) / 60);

            const selectedCosts = (item.selected_costs || []).map(sc => {
                const gc = this.globalCosts.find(g => g.id === sc.id);
                return gc ? { ...gc, quantity: sc.quantity } : null;
            }).filter(c => c !== null);

            const prices = window.calculator.calculatePrices({ profile, weight, totalHours, selectedCosts });

            // 4. Atualizar o item no banco com os preços "prontos"
            await window.supabase.from('catalog').update({
                unit_price: prices.singlePrice,
                wholesale_price: prices.retailPrice
            }).eq('id', item.id);
        }
        console.log("Recálculo concluído.");
    },

    async deleteGlobalCost(id) {
        window.utils.showAlert({
            title: 'Excluir Custo',
            message: 'Deseja realmente excluir este custo adicional?',
            type: 'confirm',
            onConfirm: async () => {
                const { error } = await window.supabase
                    .from('global_costs')
                    .delete()
                    .eq('id', id);

                if (error) {
                    window.utils.showAlert({ title: 'Erro', message: 'Erro ao excluir custo: ' + error.message });
                } else {
                    await this.init();
                    window.dispatchEvent(new Event('settings-updated'));
                }
            }
        });
    }
};

window.settings = settings;
