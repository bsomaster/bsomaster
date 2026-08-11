const calculator = {
    profiles: [],
    globalCosts: [],
    selectedCosts: [], // { id, name, price, quantity }

    async init() {
        await this.loadData();

        // Only setup UI if we are on a page that has the calculator form
        if (document.getElementById('calc-profile')) {
            this.setupEventListeners();
            this.renderForm();
        }
    },

    async loadData() {
        if (!window.user) return;

        const { data: profiles } = await window.supabase
            .from('pressets')
            .select('*')
            .eq('user_id', window.user.id);

        const { data: globalCosts } = await window.supabase
            .from('global_costs')
            .select('*')
            .eq('user_id', window.user.id);

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
    },

    renderForm() {
        const profileDisplay = document.getElementById('calc-profile-display');
        const profileHidden = document.getElementById('calc-profile');
        const profileDropdown = document.getElementById('profile-results');

        if (!profileDisplay || !profileHidden || !profileDropdown) return;

        if (this.profiles.length > 0) {
            // Set default if none selected
            if (!profileHidden.value) {
                const defaultProfile = this.profiles[0];
                profileHidden.value = defaultProfile.id;
                profileDisplay.value = defaultProfile.name;
            }

            profileDropdown.innerHTML = this.profiles.map(p => `
                <div class="search-result-item" onclick="calculator.selectProfile('${p.id}', '${p.name}')">
                    <span>${p.name}</span>
                </div>
            `).join('');
        } else {
            profileDropdown.innerHTML = '<div class="search-result-item">Nenhum presset encontrado</div>';
        }

        this.renderSelectedCosts();
        this.calculate();
    },

    selectProfile(id, name) {
        const profileDisplay = document.getElementById('calc-profile-display');
        const profileHidden = document.getElementById('calc-profile');
        const profileDropdown = document.getElementById('profile-results');

        if (profileHidden) profileHidden.value = id;
        if (profileDisplay) profileDisplay.value = name;
        if (profileDropdown) profileDropdown.classList.add('hidden');
        this.calculate();
    },

    renderSelectedCosts() {
        const container = document.getElementById('calc-selected-costs');
        if (!container) return;

        if (this.selectedCosts.length === 0) {
            container.innerHTML = '<p class="text-muted" style="font-size: 0.8rem; text-align: center; padding: 1rem;">Nenhum custo adicional selecionado.</p>';
            return;
        }

        container.innerHTML = this.selectedCosts.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <span class="cart-item-name">${item.name}</span>
                    <span class="cart-item-price">R$ ${item.price.toFixed(2)} / un</span>
                </div>
                <div class="qty-controls">
                    <button class="btn-qty" onclick="calculator.updateQuantity(${index}, -1)">&lsaquo;</button>
                    <input type="number" class="qty-input" value="${item.quantity}" onchange="calculator.setQuantity(${index}, this.value)">
                    <button class="btn-qty" onclick="calculator.updateQuantity(${index}, 1)">&rsaquo;</button>
                </div>
                <button class="btn-remove-item" onclick="calculator.removeAdditionalCost(${index})" title="Remover">
                    &times;
                </button>
            </div>
        `).join('');
    },

    setupEventListeners() {
        const inputs = ['calc-weight', 'calc-days', 'calc-hours', 'calc-minutes'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => this.calculate());
        });

        const gcodeBtn = document.getElementById('btn-import-gcode');
        const gcodeFile = document.getElementById('gcode-file-input');

        if (gcodeBtn && gcodeFile) {
            gcodeBtn.onclick = () => gcodeFile.click();
            gcodeFile.onchange = (e) => this.handleGCodeUpload(e);
        }

        this.setupDragAndDrop();

        const searchInput = document.getElementById('calc-additional-search');
        const resultsDropdown = document.getElementById('search-results');

        if (searchInput && resultsDropdown) {
            searchInput.addEventListener('input', (e) => {
                this.searchAdditionalCosts(e.target.value);
            });

            searchInput.addEventListener('focus', () => {
                if (searchInput.value.trim() !== '') {
                    resultsDropdown.classList.remove('hidden');
                }
            });
        }

        // Toggle Presset Dropdown
        const profileDisplay = document.getElementById('calc-profile-display');
        const profileDropdown = document.getElementById('profile-results');

        if (profileDisplay && profileDropdown) {
            profileDisplay.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle('hidden');
                if (resultsDropdown) resultsDropdown.classList.add('hidden'); // Close other dropdown
            });
        }

        // Fechar dropdowns ao clicar fora
        document.addEventListener('click', (e) => {
            // Additional Costs search
            if (searchInput && resultsDropdown) {
                if (!searchInput.contains(e.target) && !resultsDropdown.contains(e.target)) {
                    searchInput.value = '';
                    resultsDropdown.classList.add('hidden');
                }
            }
            // Profile dropdown
            if (profileDisplay && profileDropdown) {
                if (!profileDisplay.contains(e.target) && !profileDropdown.contains(e.target)) {
                    profileDropdown.classList.add('hidden');
                }
            }
        });

        const btnSaveToCatalog = document.getElementById('btn-save-to-catalog');
        if (btnSaveToCatalog) {
            btnSaveToCatalog.onclick = () => {
                const profileId = document.getElementById('calc-profile').value;
                const profile = this.profiles.find(p => p.id === profileId);
                const weight = parseFloat(document.getElementById('calc-weight').value) || 0;
                const days = parseFloat(document.getElementById('calc-days').value) || 0;
                const hours = parseFloat(document.getElementById('calc-hours').value) || 0;
                const minutes = parseFloat(document.getElementById('calc-minutes').value) || 0;
                const totalHours = (days * 24) + hours + (minutes / 60);

                const result = this.calculatePrices({
                    profile,
                    weight,
                    totalHours,
                    selectedCosts: this.selectedCosts
                });

                const singlePrice = result.singlePrice;
                const retailPrice = result.retailPrice;
                const totalCostValue = result.totalCost;

                if (singlePrice === 0 || !isFinite(singlePrice)) {
                    window.utils.showAlert({
                        title: 'Simulação Inválida',
                        message: 'Por favor, preencha os parâmetros e faça uma simulação válida antes de salvar no catálogo.'
                    });
                    return;
                }

                const profileDisplayVal = document.getElementById('calc-profile-display').value;

                // Capture selected additional costs with full info for historical record
                const selectedCosts = this.selectedCosts.map(c => ({
                    id: c.id,
                    name: c.name,
                    price: c.price,
                    quantity: c.quantity
                }));

                const currentCalculation = {
                    singlePrice: singlePrice,
                    retailPrice: retailPrice,
                    weight: weight,
                    time: { days, hours, minutes },
                    pressetId: profileId,
                    profileName: profileDisplayVal,
                    selectedCosts: selectedCosts,
                    totalCost: totalCostValue
                };

                localStorage.setItem('printsystem_current_calc', JSON.stringify(currentCalculation));
                location.href = '/printsystem/meucatalogo/additem/';
            };
        }

        window.addEventListener('settings-updated', async () => {
            await this.loadData();
            this.renderForm();
        });
    },

    setupDragAndDrop() {
        const overlay = document.getElementById('drop-overlay');
        if (!overlay) return;

        let dragCounter = 0;

        window.addEventListener('dragenter', (e) => {
            // Só ativa se estivermos na página de cálculo e o arquivo for um gcode potencial
            if (!document.getElementById('page-calc').classList.contains('active')) return;

            e.preventDefault();
            dragCounter++;
            overlay.classList.remove('hidden');
        }, false);

        window.addEventListener('dragover', (e) => {
            e.preventDefault();
        }, false);

        window.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter <= 0) {
                dragCounter = 0;
                overlay.classList.add('hidden');
            }
        }, false);

        window.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            overlay.classList.add('hidden');

            const file = e.dataTransfer.files[0];
            if (!file) return;

            if (file.name.toLowerCase().endsWith('.gcode')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    this.parseGCode(event.target.result);
                };
                reader.readAsText(file);
            } else {
                window.utils.showAlert({
                    title: 'Formato Inválido',
                    message: 'Por favor, arraste apenas arquivos com extensão .gcode'
                });
            }
        }, false);
    },

    handleGCodeUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.parseGCode(content);
            event.target.value = ''; // Reset input
        };
        reader.readAsText(file);
    },

    parseGCode(content) {
        // Regex patterns for different slicers
        const patterns = {
            weight: [
                /filament used \[g\] = (\d+\.?\d*)/i,           // Prusa/Orca/Bambu
                /total filament used \[g\] = (\d+\.?\d*)/i,     // Newer Orca/Bambu
                /Filament used: (\d+\.?\d*)g/i                  // Some Cura versions/plugins
            ],
            time: [
                /estimated printing time \(normal mode\) = (?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i, // Prusa/Orca
                /;TIME:(\d+)/i, // Cura (seconds)
                /estimated printing time = (?:(\d+)d\s*)?(?:(\d+)h\s*)?(?:(\d+)m\s*)?(?:(\d+)s)?/i // General
            ]
        };

        let weight = 0;
        let totalSeconds = 0;

        // Extract Weight
        for (const regex of patterns.weight) {
            const match = content.match(regex);
            if (match) {
                weight = parseFloat(match[1]);
                break;
            }
        }

        // Extract Time
        for (const regex of patterns.time) {
            const match = content.match(regex);
            if (match) {
                if (regex.source.includes('TIME:')) {
                    totalSeconds = parseInt(match[1]);
                } else {
                    const d = parseInt(match[1] || 0);
                    const h = parseInt(match[2] || 0);
                    const m = parseInt(match[3] || 0);
                    const s = parseInt(match[4] || 0);
                    totalSeconds = (d * 86400) + (h * 3600) + (m * 60) + s;
                }
                break;
            }
        }

        if (weight > 0 || totalSeconds > 0) {
            const weightEl = document.getElementById('calc-weight');
            if (weightEl && weight > 0) weightEl.value = weight.toFixed(2);

            const daysEl = document.getElementById('calc-days');
            const hoursEl = document.getElementById('calc-hours');
            const minutesEl = document.getElementById('calc-minutes');

            if (totalSeconds > 0) {
                const days = Math.floor(totalSeconds / 86400);
                const hours = Math.floor((totalSeconds % 86400) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);

                if (daysEl) daysEl.value = days || '';
                if (hoursEl) hoursEl.value = hours || '';
                if (minutesEl) minutesEl.value = minutes || '';
            }

            this.calculate();
        } else {
            window.utils.showAlert({
                title: 'Erro G-Code',
                message: 'Não foi possível encontrar informações de peso ou tempo neste arquivo G-Code.'
            });
        }
    },

    removeAccents(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    },

    searchAdditionalCosts(query) {
        const resultsDropdown = document.getElementById('search-results');
        if (!resultsDropdown) return;

        if (query.trim() === '') {
            resultsDropdown.classList.add('hidden');
            resultsDropdown.innerHTML = '';
            return;
        }

        const normalizedQuery = this.removeAccents(query);
        const filtered = this.globalCosts.filter(c =>
            this.removeAccents(c.name).includes(normalizedQuery)
        );

        if (filtered.length === 0) {
            resultsDropdown.innerHTML = '<div class="search-result-item">Nenhum resultado encontrado</div>';
        } else {
            resultsDropdown.innerHTML = filtered.map(c => `
                <div class="search-result-item" onclick="calculator.addAdditionalCost('${c.id}')">
                    <span>${c.name}</span>
                    <strong>R$ ${c.price.toFixed(2)}</strong>
                </div>
            `).join('');
        }
        resultsDropdown.classList.remove('hidden');
    },

    addAdditionalCost(id) {
        const cost = this.globalCosts.find(c => c.id === id);
        if (!cost) return;

        const existing = this.selectedCosts.find(c => c.id === id);
        if (existing) {
            existing.quantity++;
        } else {
            this.selectedCosts.push({ ...cost, quantity: 1 });
        }

        const resultsDropdown = document.getElementById('search-results');
        const searchInput = document.getElementById('calc-additional-search');

        if (searchInput) searchInput.value = '';
        if (resultsDropdown) {
            resultsDropdown.classList.add('hidden');
            resultsDropdown.innerHTML = '';
        }

        this.renderSelectedCosts();
        this.calculate();
    },

    removeAdditionalCost(index) {
        this.selectedCosts.splice(index, 1);
        this.renderSelectedCosts();
        this.calculate();
    },

    updateQuantity(index, delta) {
        const item = this.selectedCosts[index];
        if (!item) return;

        item.quantity = Math.max(1, item.quantity + delta);
        this.renderSelectedCosts();
        this.calculate();
    },

    setQuantity(index, value) {
        const item = this.selectedCosts[index];
        if (!item) return;

        const qty = parseInt(value);
        item.quantity = isNaN(qty) || qty < 1 ? 1 : qty;
        this.renderSelectedCosts();
        this.calculate();
    },

    calculate() {
        const profileEl = document.getElementById('calc-profile');
        if (!profileEl) return;

        const profileId = profileEl.value;
        const profile = this.profiles.find(p => p.id === profileId);

        const resSingle = document.getElementById('res-single');
        const resRetail = document.getElementById('res-retail');

        if (!profile) {
            if (resSingle) resSingle.innerText = 'R$ 0,00';
            if (resRetail) resRetail.innerText = 'R$ 0,00';
            return;
        }

        const weight = parseFloat(document.getElementById('calc-weight').value) || 0;
        const days = parseFloat(document.getElementById('calc-days').value) || 0;
        const hours = parseFloat(document.getElementById('calc-hours').value) || 0;
        const minutes = parseFloat(document.getElementById('calc-minutes').value) || 0;
        const totalHours = (days * 24) + hours + (minutes / 60);

        const result = this.calculatePrices({
            profile,
            weight,
            totalHours,
            selectedCosts: this.selectedCosts
        });

        // Update UI Results
        if (resSingle) resSingle.innerText = `R$ ${result.singlePrice.toFixed(2)}`;

        const resSingleMargin = document.getElementById('res-single-margin');
        if (resSingleMargin) resSingleMargin.innerText = `Lucro: ${profile.saleMargin}%`;

        const resSingleProfit = document.getElementById('res-single-profit');
        if (resSingleProfit) resSingleProfit.innerText = `R$ ${(result.singlePrice - result.totalCost).toFixed(2)}`;

        if (resRetail) resRetail.innerText = `R$ ${result.retailPrice.toFixed(2)}`;

        const resRetailMargin = document.getElementById('res-retail-margin');
        if (resRetailMargin) resRetailMargin.innerText = `Lucro: ${profile.retailMargin}%`;

        const resRetailProfit = document.getElementById('res-retail-profit');
        if (resRetailProfit) resRetailProfit.innerText = `R$ ${(result.retailPrice - result.totalCost).toFixed(2)}`;

        const breakdownList = document.getElementById('res-costs-breakdown');
        if (breakdownList) {
            breakdownList.innerHTML = result.breakdown
                .filter(b => b.value > 0)
                .map(b => `
                    <div class="breakdown-item">
                        <span>${b.name}</span>
                        <strong>R$ ${b.value.toFixed(2)}</strong>
                    </div>
                `).join('');
        }

        const resTotalCost = document.getElementById('res-total-cost');
        if (resTotalCost) resTotalCost.innerText = `R$ ${result.totalCost.toFixed(2)}`;
    },

    calculatePrices({ profile, weight, totalHours, selectedCosts }) {
        // 1. Hourly Costs (Built-in)
        let totalHourlyCost = (profile.energyPerHour + profile.maintenancePerHour + profile.laborPerHour);

        // 2. Weight Costs (Built-in) - profile.materialPerWeight is R$ per Kg
        let totalWeightCost = (profile.materialPerWeight / 1000);

        // 3. Process Custom Fields
        if (profile.customFields) {
            profile.customFields.forEach(field => {
                if (field.type === 'hour') {
                    totalHourlyCost += field.value;
                } else if (field.type === 'kg' || field.type === 'gram') {
                    totalWeightCost += field.value / 1000;
                }
            });
        }

        // Apply weights and times
        const baseCost = (totalHourlyCost * totalHours) + (totalWeightCost * weight);

        // 4. Additional Costs (Selected in cart)
        let globalAdditionalCost = 0;
        selectedCosts.forEach(item => {
            globalAdditionalCost += item.price * item.quantity;
        });

        const totalCost = baseCost + globalAdditionalCost;

        // 5. Calculate Final Prices with Margin
        const calcPrice = (cost, margin) => {
            if (margin >= 100) return Infinity;
            return cost / (1 - (margin / 100));
        };

        const singlePrice = calcPrice(totalCost, profile.saleMargin);
        const retailPrice = calcPrice(totalCost, profile.retailMargin);

        // Breakdown logic
        const breakdown = [
            { name: 'Material', value: (profile.materialPerWeight / 1000) * weight },
            { name: 'Energia', value: profile.energyPerHour * totalHours },
            { name: 'Mão de Obra', value: profile.laborPerHour * totalHours },
            { name: 'Manutenção', value: profile.maintenancePerHour * totalHours }
        ];

        if (profile.customFields) {
            profile.customFields.forEach(f => {
                const val = f.type === 'hour' ? f.value * totalHours : (f.value / 1000) * weight;
                breakdown.push({ name: f.name, value: val });
            });
        }

        selectedCosts.forEach(item => {
            breakdown.push({ name: `${item.name} (${item.quantity}x)`, value: item.price * item.quantity });
        });

        return {
            totalCost,
            singlePrice,
            retailPrice,
            breakdown
        };
    }
};

window.calculator = calculator;
