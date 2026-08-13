<<<<<<< HEAD:ps/vendas_nova.js
const vendasNova = {
    currentItem: null,
    currentPrices: null,
    extraCosts: [],
    extraDiscounts: [],
    buyerInfo: [],
    selectedDate: new Date(),
    selectedTime: { h: new Date().getHours(), m: new Date().getMinutes() },

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');

        if (!itemId) {
            location.href = '/ps/meucatalogo/';
            return;
        }

        await this.loadItem(itemId);
        this.setupEventListeners();
        this.renderInitialInfo();
        this.updateCalculations();
    },

    async loadItem(id) {
        const { data: item, error } = await window.supabase.from('catalog').select('*').eq('id', id).single();
        if (error || !item) {
            alert('Item não encontrado');
            location.href = '/ps/meucatalogo/';
            return;
        }
        this.currentItem = item;

        if (!window.catalog.profiles) {
            await window.catalog.loadDependencies();
        }
        this.currentPrices = window.catalog.getItemPrices(item);
    },

    setupEventListeners() {
        document.getElementById('btn-back').onclick = () => window.history.back();

        const typeDisplay = document.getElementById('sale-type-display');
        const typeDropdown = document.getElementById('sale-type-dropdown');
        if (typeDisplay && typeDropdown) {
            typeDisplay.onclick = (e) => {
                e.stopPropagation();
                typeDropdown.classList.toggle('hidden');
            };
        }

        document.addEventListener('click', () => {
            if (typeDropdown) typeDropdown.classList.add('hidden');
        });

        document.getElementById('sale-qty').oninput = () => this.updateCalculations();
        document.getElementById('btn-add-cost').onclick = () => this.addExtraCost();
        document.getElementById('btn-add-discount').onclick = () => this.addExtraDiscount();
        document.getElementById('btn-add-buyer-info').onclick = () => this.addBuyerInfo();

        document.getElementById('btn-confirm-concluida').onclick = () => this.confirmSale('concluida');
        document.getElementById('btn-confirm-agendada').onclick = () => this.confirmSale('agendada');

        // Pickers
        document.getElementById('date-picker-trigger').onclick = () => this.openDatePicker();
        document.getElementById('time-picker-trigger').onclick = () => this.openTimePicker();

        if (window.utils && window.utils.initMoneyInputs) {
            window.utils.initMoneyInputs();
        }
    },

    renderInitialInfo() {
        document.getElementById('item-name').innerText = this.currentItem.name;
        document.getElementById('item-photo').src = (this.currentItem.photos && this.currentItem.photos.length > 0) ? this.currentItem.photos[0] : '';
        document.getElementById('item-prices-info').innerText = `Unitário: R$ ${this.currentPrices.singlePrice.toFixed(2)} | Atacado: R$ ${this.currentPrices.retailPrice.toFixed(2)}`;

        this.updateDateDisplay();
        this.updateTimeDisplay();

        document.getElementById('sale-type-display').value = 'Unitária';
    },

    updateDateDisplay() {
        const d = this.selectedDate;
        const formatted = d.toLocaleDateString('pt-BR');
        document.getElementById('display-date').innerText = formatted;

        // Formato YYYY-MM-DD local seguro
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        document.getElementById('sale-date').value = `${year}-${month}-${day}`;
    },

    updateTimeDisplay() {
        const h = this.selectedTime.h.toString().padStart(2, '0');
        const m = this.selectedTime.m.toString().padStart(2, '0');
        document.getElementById('display-time').innerText = `${h}:${m}`;
        document.getElementById('sale-time').value = `${h}:${m}`;
    },

    // Custom Date Picker (Calendar)
    openDatePicker() {
        const modal = document.createElement('div');
        modal.className = 'picker-modal';
        modal.id = 'calendar-modal';

        const tempDate = new Date(this.selectedDate);

        const renderCalendar = (date) => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

            const firstDay = new Date(year, month, 1).getDay();
            const lastDay = new Date(year, month + 1, 0).getDate();

            let html = `
                <div class="picker-card">
                    <div class="calendar-header">
                        <button class="btn-icon" id="prev-month">&lsaquo;</button>
                        <h4>${monthNames[month]} ${year}</h4>
                        <button class="btn-icon" id="next-month">&rsaquo;</button>
                    </div>
                    <div class="calendar-grid">
                        <div class="calendar-day-name">D</div><div class="calendar-day-name">S</div><div class="calendar-day-name">T</div>
                        <div class="calendar-day-name">Q</div><div class="calendar-day-name">Q</div><div class="calendar-day-name">S</div>
                        <div class="calendar-day-name">S</div>
            `;

            for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`;

            for (let day = 1; day <= lastDay; day++) {
                const isActive = day === this.selectedDate.getDate() && month === this.selectedDate.getMonth() && year === this.selectedDate.getFullYear();
                html += `<div class="calendar-day ${isActive ? 'active' : ''}" onclick="vendasNova.selectCalendarDay(${day}, ${month}, ${year})">${day}</div>`;
            }

            html += `</div><div class="picker-actions"><button class="btn-secondary" onclick="document.getElementById('calendar-modal').remove()">Fechar</button></div></div>`;
            modal.innerHTML = html;

            modal.querySelector('#prev-month').onclick = (e) => { e.stopPropagation(); tempDate.setMonth(tempDate.getMonth() - 1); renderCalendar(tempDate); };
            modal.querySelector('#next-month').onclick = (e) => { e.stopPropagation(); tempDate.setMonth(tempDate.getMonth() + 1); renderCalendar(tempDate); };
        };

        renderCalendar(tempDate);
        document.body.appendChild(modal);
    },

    selectCalendarDay(day, month, year) {
        this.selectedDate = new Date(year, month, day);
        this.updateDateDisplay();
        document.getElementById('calendar-modal').remove();
    },

    // Custom Time Picker (Scrolling)
    openTimePicker() {
        const modal = document.createElement('div');
        modal.className = 'picker-modal';
        modal.id = 'time-modal';

        let tempH = this.selectedTime.h;
        let tempM = this.selectedTime.m;

        let html = `
            <div class="picker-card">
                <div class="calendar-header"><h4>Selecionar Horário</h4></div>
                <div class="time-picker-columns">
                    <div class="time-column" id="hour-column" style="user-select: none;"></div>
                    <div class="time-separator">:</div>
                    <div class="time-column" id="min-column" style="user-select: none;"></div>
                </div>
                <div class="picker-actions">
                    <button class="btn-secondary" id="cancel-time">Cancelar</button>
                    <button class="btn-primary" id="save-time">Confirmar</button>
                </div>
            </div>
        `;
        modal.innerHTML = html;
        document.body.appendChild(modal);

        const hCol = modal.querySelector('#hour-column');
        const mCol = modal.querySelector('#min-column');

        for (let i = 0; i < 24; i++) {
            const item = document.createElement('div');
            item.className = 'time-item' + (i === tempH ? ' selected' : '');
            item.innerText = i.toString().padStart(2, '0');
            item.onclick = () => {
                tempH = i;
                Array.from(hCol.children).forEach(c => c.classList.remove('selected'));
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            hCol.appendChild(item);
        }

        for (let i = 0; i < 60; i++) {
            const item = document.createElement('div');
            item.className = 'time-item' + (i === tempM ? ' selected' : '');
            item.innerText = i.toString().padStart(2, '0');
            item.onclick = () => {
                tempM = i;
                Array.from(mCol.children).forEach(c => c.classList.remove('selected'));
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            mCol.appendChild(item);
        }

        this.setupDragToScroll(hCol, (val) => { tempH = val; });
        this.setupDragToScroll(mCol, (val) => { tempM = val; });

        // Scroll inicial
        setTimeout(() => {
            hCol.children[tempH].scrollIntoView({ block: 'center' });
            mCol.children[tempM].scrollIntoView({ block: 'center' });
        }, 50);

        modal.querySelector('#save-time').onclick = () => {
            this.selectedTime.h = tempH;
            this.selectedTime.m = tempM;
            this.updateTimeDisplay();
            modal.remove();
        };

        modal.querySelector('#cancel-time').onclick = () => {
            modal.remove();
        };
    },

    setupDragToScroll(el, onSelect) {
        let isDown = false;
        let startY;
        let scrollTop;

        el.addEventListener('mousedown', (e) => {
            isDown = true;
            el.style.cursor = 'grabbing';
            startY = e.pageY - el.offsetTop;
            scrollTop = el.scrollTop;
        });

        el.addEventListener('mouseleave', () => {
            if (!isDown) return;
            isDown = false;
            el.style.cursor = 'grab';
            this.snapToCenter(el, onSelect);
        });

        el.addEventListener('mouseup', () => {
            if (!isDown) return;
            isDown = false;
            el.style.cursor = 'grab';
            this.snapToCenter(el, onSelect);
        });

        el.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const y = e.pageY - el.offsetTop;
            const walk = (y - startY) * 2;
            el.scrollTop = scrollTop - walk;
        });

        el.style.cursor = 'grab';

        // Snap on normal scroll wheel too
        let scrollTimeout;
        el.addEventListener('scroll', () => {
            if (isDown) return;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.snapToCenter(el, onSelect), 150);
        });
    },

    snapToCenter(el, onSelect) {
        const items = Array.from(el.children);
        const center = el.scrollTop + (el.offsetHeight / 2);

        let closest = items[0];
        let minDiff = Math.abs(center - (items[0].offsetTop + items[0].offsetHeight / 2));

        items.forEach(item => {
            const diff = Math.abs(center - (item.offsetTop + item.offsetHeight / 2));
            if (diff < minDiff) {
                minDiff = diff;
                closest = item;
            }
        });

        items.forEach(c => c.classList.remove('selected'));
        closest.classList.add('selected');
        closest.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const val = parseInt(closest.innerText);
        onSelect(val);
    },

    selectSaleType(value, label) {
        document.getElementById('sale-type').value = value;
        document.getElementById('sale-type-display').value = label;
        this.updateCalculations();
    },

    addExtraCost() {
        const desc = document.getElementById('add-cost-desc').value.trim();
        const val = parseFloat(document.getElementById('add-cost-value').value) || 0;
        if (!desc || val <= 0) return;

        this.extraCosts.push({ id: crypto.randomUUID(), desc, val });
        document.getElementById('add-cost-desc').value = '';
        document.getElementById('add-cost-value').value = '';
        this.renderExtraLists();
        this.updateCalculations();
    },

    addExtraDiscount() {
        const desc = document.getElementById('add-discount-desc').value.trim();
        const val = parseFloat(document.getElementById('add-discount-value').value) || 0;
        if (!desc || val <= 0) return;

        this.extraDiscounts.push({ id: crypto.randomUUID(), desc, val });
        document.getElementById('add-discount-desc').value = '';
        document.getElementById('add-discount-value').value = '';
        this.renderExtraLists();
        this.updateCalculations();
    },

    addBuyerInfo() {
        const title = document.getElementById('add-buyer-info-title').value.trim();
        const value = document.getElementById('add-buyer-info-value').value.trim();
        if (!title || !value) return;

        this.buyerInfo.push({ id: crypto.randomUUID(), title, value });
        document.getElementById('add-buyer-info-title').value = '';
        document.getElementById('add-buyer-info-value').value = '';
        this.renderBuyerInfoList();
    },

    renderBuyerInfoList() {
        const infoList = document.getElementById('buyer-info-list');
        const trashIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

        infoList.innerHTML = this.buyerInfo.map(info => `
            <div class="settings-item global-cost-item">
                <div class="item-info">
                    <span class="item-name">${info.title}</span>
                </div>
                <strong class="cost-price" style="color: var(--text-main);">${info.value}</strong>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="vendasNova.removeBuyerInfo('${info.id}')" title="Excluir">
                        ${trashIcon}
                    </button>
                </div>
            </div>
        `).join('');
    },

    removeBuyerInfo(id) {
        this.buyerInfo = this.buyerInfo.filter(info => info.id !== id);
        this.renderBuyerInfoList();
    },

    renderExtraLists() {
        const costsList = document.getElementById('additional-costs-list');
        const discountsList = document.getElementById('discounts-list');
        const trashIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

        costsList.innerHTML = this.extraCosts.map(c => `
            <div class="settings-item global-cost-item">
                <div class="item-info">
                    <span class="item-name">${c.desc}</span>
                </div>
                <strong class="cost-price" style="color: #ef4444;">R$ ${c.val.toFixed(2)}</strong>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="vendasNova.removeExtraCost('${c.id}')" title="Excluir">
                        ${trashIcon}
                    </button>
                </div>
            </div>
        `).join('');

        discountsList.innerHTML = this.extraDiscounts.map(d => `
            <div class="settings-item global-cost-item">
                <div class="item-info">
                    <span class="item-name">${d.desc}</span>
                </div>
                <strong class="cost-price" style="color: #ef4444;">R$ ${d.val.toFixed(2)}</strong>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="vendasNova.removeExtraDiscount('${d.id}')" title="Excluir">
                        ${trashIcon}
                    </button>
                </div>
            </div>
        `).join('');
    },

    removeExtraCost(id) {
        this.extraCosts = this.extraCosts.filter(c => c.id !== id);
        this.renderExtraLists();
        this.updateCalculations();
    },

    removeExtraDiscount(id) {
        this.extraDiscounts = this.extraDiscounts.filter(d => d.id !== id);
        this.renderExtraLists();
        this.updateCalculations();
    },

    updateCalculations() {
        const type = document.getElementById('sale-type').value;
        const qty = parseInt(document.getElementById('sale-qty').value) || 1;
        const qtyGroup = document.getElementById('qty-group');
        qtyGroup.classList.remove('hidden');

        const basePrice = type === 'atacado' ? this.currentPrices.retailPrice : this.currentPrices.singlePrice;
        const totalBasePrice = basePrice * qty;
        const totalBaseCost = this.currentPrices.totalCost * qty;
        const totalExtraCosts = this.extraCosts.reduce((acc, c) => acc + c.val, 0);
        const totalDiscounts = this.extraDiscounts.reduce((acc, d) => acc + d.val, 0);

        const finalPrice = totalBasePrice - totalDiscounts;
        const finalProfit = finalPrice - totalBaseCost - totalExtraCosts;

        document.getElementById('res-final-price').innerText = `R$ ${finalPrice.toFixed(2)}`;
        document.getElementById('res-final-profit').innerText = `R$ ${finalProfit.toFixed(2)}`;
        document.getElementById('summary-type').innerText = type === 'atacado' ? 'Atacado' : 'Unitário';
        document.getElementById('summary-base-price').innerText = `R$ ${totalBasePrice.toFixed(2)}`;
        document.getElementById('summary-total-cost').innerText = `R$ ${totalBaseCost.toFixed(2)}`;

        const extraCostsSummary = document.getElementById('summary-extra-costs');
        if (totalExtraCosts > 0) extraCostsSummary.innerHTML = `<div class="breakdown-item"><span>Custos Adicionais</span><strong style="color: #ef4444;">R$ ${totalExtraCosts.toFixed(2)}</strong></div>`;
        else extraCostsSummary.innerHTML = '';

        const extraDiscountsSummary = document.getElementById('summary-extra-discounts');
        if (totalDiscounts > 0) extraDiscountsSummary.innerHTML = `<div class="breakdown-item"><span>Descontos Aplicados</span><strong style="color: #ef4444;">R$ ${totalDiscounts.toFixed(2)}</strong></div>`;
        else extraDiscountsSummary.innerHTML = '';

        this.calcResults = { type, qty, totalBaseCost, totalExtraCosts, totalDiscounts, finalPrice, finalProfit };
    },

    async confirmSale(status) {
        const buyerName = document.getElementById('buyer-name').value.trim();
        if (!buyerName) {
            window.utils.showAlert({ title: 'Campo Obrigatório', message: 'Por favor, informe o nome do comprador.' });
            return;
        }

        // Se houver algo digitado nos campos de comprador extra mas não adicionado, adiciona automaticamente
        const titleInput = document.getElementById('add-buyer-info-title');
        const valueInput = document.getElementById('add-buyer-info-value');
        if (titleInput && valueInput && titleInput.value.trim() && valueInput.value.trim()) {
            this.addBuyerInfo();
        }

        const dateStr = document.getElementById('sale-date').value;
        const timeStr = document.getElementById('sale-time').value;
        if (!dateStr || !timeStr) {
            alert('Por favor, selecione a data e o horário.');
            return;
        }

        // Criar objeto Date local e converter para ISO completo
        const [y, mon, d] = dateStr.split('-');
        const [h, min] = timeStr.split(':');
        const dateObj = new Date(y, mon - 1, d, h, min);
        const fullDateTime = dateObj.toISOString();
        const calc = this.calcResults;

        // Inclui o nome obrigatório na lista de buyer_info
        const finalBuyerInfo = [
            { id: 'primary-name', title: 'Nome', value: buyerName },
            ...this.buyerInfo
        ];

        const saleData = {
            user_id: window.user.id,
            item_id: this.currentItem.id,
            item_name: this.currentItem.name,
            status: status,
            tipo_venda: calc.type,
            quantidade: calc.qty,
            preco_venda: calc.finalPrice,
            custo_producao: calc.totalBaseCost,
            custos_adicionais: calc.totalExtraCosts,
            descontos: calc.totalDiscounts,
            lucro_real: calc.finalProfit,
            detalhes_custos_adicionais: this.extraCosts,
            detalhes_descontos: this.extraDiscounts,
            buyer_info: finalBuyerInfo
        };

        if (status === 'agendada') saleData.data_agendamento = fullDateTime;
        else saleData.data_venda = fullDateTime;

        const { error } = await window.supabase.from('vendas').insert(saleData);
        if (error) {
            window.utils.showAlert({ title: 'Erro', message: 'Erro ao registrar venda: ' + error.message });
            return;
        }

        window.utils.showAlert({
            title: 'Sucesso!',
            message: status === 'agendada' ? 'Venda agendada com sucesso.' : 'Venda registrada com sucesso.',
            onConfirm: () => location.href = '/ps/vendas/'
        });
    }
};

window.vendasNova = vendasNova;
=======
const vendasNova = {
    currentItem: null,
    currentPrices: null,
    extraCosts: [],
    extraDiscounts: [],
    buyerInfo: [],
    selectedDate: new Date(),
    selectedTime: { h: new Date().getHours(), m: new Date().getMinutes() },

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const itemId = urlParams.get('id');

        if (!itemId) {
            location.href = '/printsystem/meucatalogo/';
            return;
        }

        await this.loadItem(itemId);
        this.setupEventListeners();
        this.renderInitialInfo();
        this.updateCalculations();
    },

    async loadItem(id) {
        const { data: item, error } = await window.supabase.from('catalog').select('*').eq('id', id).single();
        if (error || !item) {
            alert('Item não encontrado');
            location.href = '/printsystem/meucatalogo/';
            return;
        }
        this.currentItem = item;

        if (!window.catalog.profiles) {
            await window.catalog.loadDependencies();
        }
        this.currentPrices = window.catalog.getItemPrices(item);
    },

    setupEventListeners() {
        document.getElementById('btn-back').onclick = () => window.history.back();

        const typeDisplay = document.getElementById('sale-type-display');
        const typeDropdown = document.getElementById('sale-type-dropdown');
        if (typeDisplay && typeDropdown) {
            typeDisplay.onclick = (e) => {
                e.stopPropagation();
                typeDropdown.classList.toggle('hidden');
            };
        }

        document.addEventListener('click', () => {
            if (typeDropdown) typeDropdown.classList.add('hidden');
        });

        document.getElementById('sale-qty').oninput = () => this.updateCalculations();
        document.getElementById('btn-add-cost').onclick = () => this.addExtraCost();
        document.getElementById('btn-add-discount').onclick = () => this.addExtraDiscount();
        document.getElementById('btn-add-buyer-info').onclick = () => this.addBuyerInfo();

        document.getElementById('btn-confirm-concluida').onclick = () => this.confirmSale('concluida');
        document.getElementById('btn-confirm-agendada').onclick = () => this.confirmSale('agendada');

        // Pickers
        document.getElementById('date-picker-trigger').onclick = () => this.openDatePicker();
        document.getElementById('time-picker-trigger').onclick = () => this.openTimePicker();

        if (window.utils && window.utils.initMoneyInputs) {
            window.utils.initMoneyInputs();
        }
    },

    renderInitialInfo() {
        document.getElementById('item-name').innerText = this.currentItem.name;
        document.getElementById('item-photo').src = (this.currentItem.photos && this.currentItem.photos.length > 0) ? this.currentItem.photos[0] : '';
        document.getElementById('item-prices-info').innerText = `Unitário: R$ ${this.currentPrices.singlePrice.toFixed(2)} | Atacado: R$ ${this.currentPrices.retailPrice.toFixed(2)}`;

        this.updateDateDisplay();
        this.updateTimeDisplay();

        document.getElementById('sale-type-display').value = 'Unitária';
    },

    updateDateDisplay() {
        const d = this.selectedDate;
        const formatted = d.toLocaleDateString('pt-BR');
        document.getElementById('display-date').innerText = formatted;
        document.getElementById('sale-date').value = d.toISOString().split('T')[0];
    },

    updateTimeDisplay() {
        const h = this.selectedTime.h.toString().padStart(2, '0');
        const m = this.selectedTime.m.toString().padStart(2, '0');
        document.getElementById('display-time').innerText = `${h}:${m}`;
        document.getElementById('sale-time').value = `${h}:${m}`;
    },

    // Custom Date Picker (Calendar)
    openDatePicker() {
        const modal = document.createElement('div');
        modal.className = 'picker-modal';
        modal.id = 'calendar-modal';

        const tempDate = new Date(this.selectedDate);

        const renderCalendar = (date) => {
            const year = date.getFullYear();
            const month = date.getMonth();
            const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

            const firstDay = new Date(year, month, 1).getDay();
            const lastDay = new Date(year, month + 1, 0).getDate();

            let html = `
                <div class="picker-card">
                    <div class="calendar-header">
                        <button class="btn-icon" id="prev-month">&lsaquo;</button>
                        <h4>${monthNames[month]} ${year}</h4>
                        <button class="btn-icon" id="next-month">&rsaquo;</button>
                    </div>
                    <div class="calendar-grid">
                        <div class="calendar-day-name">D</div><div class="calendar-day-name">S</div><div class="calendar-day-name">T</div>
                        <div class="calendar-day-name">Q</div><div class="calendar-day-name">Q</div><div class="calendar-day-name">S</div>
                        <div class="calendar-day-name">S</div>
            `;

            for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`;

            for (let day = 1; day <= lastDay; day++) {
                const isActive = day === this.selectedDate.getDate() && month === this.selectedDate.getMonth() && year === this.selectedDate.getFullYear();
                html += `<div class="calendar-day ${isActive ? 'active' : ''}" onclick="vendasNova.selectCalendarDay(${day}, ${month}, ${year})">${day}</div>`;
            }

            html += `</div><div class="picker-actions"><button class="btn-secondary" onclick="document.getElementById('calendar-modal').remove()">Fechar</button></div></div>`;
            modal.innerHTML = html;

            modal.querySelector('#prev-month').onclick = (e) => { e.stopPropagation(); tempDate.setMonth(tempDate.getMonth() - 1); renderCalendar(tempDate); };
            modal.querySelector('#next-month').onclick = (e) => { e.stopPropagation(); tempDate.setMonth(tempDate.getMonth() + 1); renderCalendar(tempDate); };
        };

        renderCalendar(tempDate);
        document.body.appendChild(modal);
    },

    selectCalendarDay(day, month, year) {
        this.selectedDate = new Date(year, month, day);
        this.updateDateDisplay();
        document.getElementById('calendar-modal').remove();
    },

    // Custom Time Picker (Scrolling)
    openTimePicker() {
        const modal = document.createElement('div');
        modal.className = 'picker-modal';
        modal.id = 'time-modal';

        let tempH = this.selectedTime.h;
        let tempM = this.selectedTime.m;

        let html = `
            <div class="picker-card">
                <div class="calendar-header"><h4>Selecionar Horário</h4></div>
                <div class="time-picker-columns">
                    <div class="time-column" id="hour-column" style="user-select: none;"></div>
                    <div class="time-separator">:</div>
                    <div class="time-column" id="min-column" style="user-select: none;"></div>
                </div>
                <div class="picker-actions">
                    <button class="btn-secondary" id="cancel-time">Cancelar</button>
                    <button class="btn-primary" id="save-time">Confirmar</button>
                </div>
            </div>
        `;
        modal.innerHTML = html;
        document.body.appendChild(modal);

        const hCol = modal.querySelector('#hour-column');
        const mCol = modal.querySelector('#min-column');

        for (let i = 0; i < 24; i++) {
            const item = document.createElement('div');
            item.className = 'time-item' + (i === tempH ? ' selected' : '');
            item.innerText = i.toString().padStart(2, '0');
            item.onclick = () => {
                tempH = i;
                Array.from(hCol.children).forEach(c => c.classList.remove('selected'));
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            hCol.appendChild(item);
        }

        for (let i = 0; i < 60; i++) {
            const item = document.createElement('div');
            item.className = 'time-item' + (i === tempM ? ' selected' : '');
            item.innerText = i.toString().padStart(2, '0');
            item.onclick = () => {
                tempM = i;
                Array.from(mCol.children).forEach(c => c.classList.remove('selected'));
                item.classList.add('selected');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            mCol.appendChild(item);
        }

        this.setupDragToScroll(hCol, (val) => { tempH = val; });
        this.setupDragToScroll(mCol, (val) => { tempM = val; });

        // Scroll inicial
        setTimeout(() => {
            hCol.children[tempH].scrollIntoView({ block: 'center' });
            mCol.children[tempM].scrollIntoView({ block: 'center' });
        }, 50);

        modal.querySelector('#save-time').onclick = () => {
            this.selectedTime.h = tempH;
            this.selectedTime.m = tempM;
            this.updateTimeDisplay();
            modal.remove();
        };

        modal.querySelector('#cancel-time').onclick = () => {
            modal.remove();
        };
    },

    setupDragToScroll(el, onSelect) {
        let isDown = false;
        let startY;
        let scrollTop;

        el.addEventListener('mousedown', (e) => {
            isDown = true;
            el.style.cursor = 'grabbing';
            startY = e.pageY - el.offsetTop;
            scrollTop = el.scrollTop;
        });

        el.addEventListener('mouseleave', () => {
            if (!isDown) return;
            isDown = false;
            el.style.cursor = 'grab';
            this.snapToCenter(el, onSelect);
        });

        el.addEventListener('mouseup', () => {
            if (!isDown) return;
            isDown = false;
            el.style.cursor = 'grab';
            this.snapToCenter(el, onSelect);
        });

        el.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const y = e.pageY - el.offsetTop;
            const walk = (y - startY) * 2;
            el.scrollTop = scrollTop - walk;
        });

        el.style.cursor = 'grab';

        // Snap on normal scroll wheel too
        let scrollTimeout;
        el.addEventListener('scroll', () => {
            if (isDown) return;
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => this.snapToCenter(el, onSelect), 150);
        });
    },

    snapToCenter(el, onSelect) {
        const items = Array.from(el.children);
        const center = el.scrollTop + (el.offsetHeight / 2);

        let closest = items[0];
        let minDiff = Math.abs(center - (items[0].offsetTop + items[0].offsetHeight / 2));

        items.forEach(item => {
            const diff = Math.abs(center - (item.offsetTop + item.offsetHeight / 2));
            if (diff < minDiff) {
                minDiff = diff;
                closest = item;
            }
        });

        items.forEach(c => c.classList.remove('selected'));
        closest.classList.add('selected');
        closest.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const val = parseInt(closest.innerText);
        onSelect(val);
    },

    selectSaleType(value, label) {
        document.getElementById('sale-type').value = value;
        document.getElementById('sale-type-display').value = label;
        this.updateCalculations();
    },

    addExtraCost() {
        const desc = document.getElementById('add-cost-desc').value.trim();
        const val = parseFloat(document.getElementById('add-cost-value').value) || 0;
        if (!desc || val <= 0) return;

        this.extraCosts.push({ id: crypto.randomUUID(), desc, val });
        document.getElementById('add-cost-desc').value = '';
        document.getElementById('add-cost-value').value = '';
        this.renderExtraLists();
        this.updateCalculations();
    },

    addExtraDiscount() {
        const desc = document.getElementById('add-discount-desc').value.trim();
        const val = parseFloat(document.getElementById('add-discount-value').value) || 0;
        if (!desc || val <= 0) return;

        this.extraDiscounts.push({ id: crypto.randomUUID(), desc, val });
        document.getElementById('add-discount-desc').value = '';
        document.getElementById('add-discount-value').value = '';
        this.renderExtraLists();
        this.updateCalculations();
    },

    addBuyerInfo() {
        const title = document.getElementById('add-buyer-info-title').value.trim();
        const value = document.getElementById('add-buyer-info-value').value.trim();
        if (!title || !value) return;

        this.buyerInfo.push({ id: crypto.randomUUID(), title, value });
        document.getElementById('add-buyer-info-title').value = '';
        document.getElementById('add-buyer-info-value').value = '';
        this.renderBuyerInfoList();
    },

    renderBuyerInfoList() {
        const infoList = document.getElementById('buyer-info-list');
        const trashIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

        infoList.innerHTML = this.buyerInfo.map(info => `
            <div class="settings-item global-cost-item">
                <div class="item-info">
                    <span class="item-name">${info.title}</span>
                </div>
                <strong class="cost-price" style="color: var(--text-main);">${info.value}</strong>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="vendasNova.removeBuyerInfo('${info.id}')" title="Excluir">
                        ${trashIcon}
                    </button>
                </div>
            </div>
        `).join('');
    },

    removeBuyerInfo(id) {
        this.buyerInfo = this.buyerInfo.filter(info => info.id !== id);
        this.renderBuyerInfoList();
    },

    renderExtraLists() {
        const costsList = document.getElementById('additional-costs-list');
        const discountsList = document.getElementById('discounts-list');
        const trashIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

        costsList.innerHTML = this.extraCosts.map(c => `
            <div class="settings-item global-cost-item">
                <div class="item-info">
                    <span class="item-name">${c.desc}</span>
                </div>
                <strong class="cost-price" style="color: #ef4444;">R$ ${c.val.toFixed(2)}</strong>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="vendasNova.removeExtraCost('${c.id}')" title="Excluir">
                        ${trashIcon}
                    </button>
                </div>
            </div>
        `).join('');

        discountsList.innerHTML = this.extraDiscounts.map(d => `
            <div class="settings-item global-cost-item">
                <div class="item-info">
                    <span class="item-name">${d.desc}</span>
                </div>
                <strong class="cost-price" style="color: #ef4444;">R$ ${d.val.toFixed(2)}</strong>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="vendasNova.removeExtraDiscount('${d.id}')" title="Excluir">
                        ${trashIcon}
                    </button>
                </div>
            </div>
        `).join('');
    },

    removeExtraCost(id) {
        this.extraCosts = this.extraCosts.filter(c => c.id !== id);
        this.renderExtraLists();
        this.updateCalculations();
    },

    removeExtraDiscount(id) {
        this.extraDiscounts = this.extraDiscounts.filter(d => d.id !== id);
        this.renderExtraLists();
        this.updateCalculations();
    },

    updateCalculations() {
        const type = document.getElementById('sale-type').value;
        const qty = parseInt(document.getElementById('sale-qty').value) || 1;
        const qtyGroup = document.getElementById('qty-group');
        qtyGroup.classList.remove('hidden');

        const basePrice = type === 'atacado' ? this.currentPrices.retailPrice : this.currentPrices.singlePrice;
        const totalBasePrice = basePrice * qty;
        const totalBaseCost = this.currentPrices.totalCost * qty;
        const totalExtraCosts = this.extraCosts.reduce((acc, c) => acc + c.val, 0);
        const totalDiscounts = this.extraDiscounts.reduce((acc, d) => acc + d.val, 0);

        const finalPrice = totalBasePrice - totalDiscounts;
        const finalProfit = finalPrice - totalBaseCost - totalExtraCosts;

        document.getElementById('res-final-price').innerText = `R$ ${finalPrice.toFixed(2)}`;
        document.getElementById('res-final-profit').innerText = `R$ ${finalProfit.toFixed(2)}`;
        document.getElementById('summary-type').innerText = type === 'atacado' ? 'Atacado' : 'Unitário';
        document.getElementById('summary-base-price').innerText = `R$ ${totalBasePrice.toFixed(2)}`;
        document.getElementById('summary-total-cost').innerText = `R$ ${totalBaseCost.toFixed(2)}`;

        const extraCostsSummary = document.getElementById('summary-extra-costs');
        if (totalExtraCosts > 0) extraCostsSummary.innerHTML = `<div class="breakdown-item"><span>Custos Adicionais</span><strong style="color: #ef4444;">R$ ${totalExtraCosts.toFixed(2)}</strong></div>`;
        else extraCostsSummary.innerHTML = '';

        const extraDiscountsSummary = document.getElementById('summary-extra-discounts');
        if (totalDiscounts > 0) extraDiscountsSummary.innerHTML = `<div class="breakdown-item"><span>Descontos Aplicados</span><strong style="color: #ef4444;">R$ ${totalDiscounts.toFixed(2)}</strong></div>`;
        else extraDiscountsSummary.innerHTML = '';

        this.calcResults = { type, qty, totalBaseCost, totalExtraCosts, totalDiscounts, finalPrice, finalProfit };
    },

    async confirmSale(status) {
        const buyerName = document.getElementById('buyer-name').value.trim();
        if (!buyerName) {
            window.utils.showAlert({ title: 'Campo Obrigatório', message: 'Por favor, informe o nome do comprador.' });
            return;
        }

        // Se houver algo digitado nos campos de comprador extra mas não adicionado, adiciona automaticamente
        const titleInput = document.getElementById('add-buyer-info-title');
        const valueInput = document.getElementById('add-buyer-info-value');
        if (titleInput && valueInput && titleInput.value.trim() && valueInput.value.trim()) {
            this.addBuyerInfo();
        }

        const date = document.getElementById('sale-date').value;
        const time = document.getElementById('sale-time').value;
        if (!date || !time) {
            alert('Por favor, selecione a data e o horário.');
            return;
        }

        const fullDateTime = `${date}T${time}:00`;
        const calc = this.calcResults;

        // Inclui o nome obrigatório na lista de buyer_info
        const finalBuyerInfo = [
            { id: 'primary-name', title: 'Nome', value: buyerName },
            ...this.buyerInfo
        ];

        const saleData = {
            user_id: window.user.id,
            item_id: this.currentItem.id,
            item_name: this.currentItem.name,
            status: status,
            tipo_venda: calc.type,
            quantidade: calc.qty,
            preco_venda: calc.finalPrice,
            custo_producao: calc.totalBaseCost,
            custos_adicionais: calc.totalExtraCosts,
            descontos: calc.totalDiscounts,
            lucro_real: calc.finalProfit,
            detalhes_custos_adicionais: this.extraCosts,
            detalhes_descontos: this.extraDiscounts,
            buyer_info: finalBuyerInfo
        };

        if (status === 'agendada') saleData.data_agendamento = fullDateTime;
        else saleData.data_venda = fullDateTime;

        const { error } = await window.supabase.from('vendas').insert(saleData);
        if (error) {
            window.utils.showAlert({ title: 'Erro', message: 'Erro ao registrar venda: ' + error.message });
            return;
        }

        window.utils.showAlert({
            title: 'Sucesso!',
            message: status === 'agendada' ? 'Venda agendada com sucesso.' : 'Venda registrada com sucesso.',
            onConfirm: () => location.href = '/printsystem/vendas/'
        });
    }
};

window.vendasNova = vendasNova;
>>>>>>> 5e21ac9a8408cf132a049eb2730d818cf0f8132f:printsystem/vendas_nova.js
