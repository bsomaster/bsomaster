const vendas = {
    sales: [],
    periodStats: {
        totalProfit: 0,
        totalGross: 0,
        totalCosts: 0,
        count: 0
    },

    async init() {
        console.log('Vendas module initialized');
        this.setupEventListeners();
        await this.loadSales();
        this.render();
    },

    setupEventListeners() {
        const periodDisplay = document.getElementById('stats-period-display');
        const periodDropdown = document.getElementById('stats-period-dropdown');
        const monthDisplay = document.getElementById('stats-month-display');
        const monthDropdown = document.getElementById('stats-month-dropdown');
        const yearDisplay = document.getElementById('stats-year-display');
        const yearDropdown = document.getElementById('stats-year-dropdown');

        if (periodDisplay) {
            periodDisplay.onclick = (e) => {
                e.stopPropagation();
                this.closeAllDropdowns();
                periodDropdown.classList.toggle('hidden');
            };
        }

        if (monthDisplay) {
            monthDisplay.onclick = (e) => {
                e.stopPropagation();
                this.closeAllDropdowns();
                monthDropdown.classList.toggle('hidden');
            };
        }

        if (yearDisplay) {
            yearDisplay.onclick = (e) => {
                e.stopPropagation();
                this.closeAllDropdowns();
                yearDropdown.classList.toggle('hidden');
            };
        }

        const startTrigger = document.getElementById('start-date-trigger');
        const endTrigger = document.getElementById('end-date-trigger');
        if (startTrigger) startTrigger.onclick = () => this.openDatePicker('start');
        if (endTrigger) endTrigger.onclick = () => this.openDatePicker('end');

        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });

        const startInput = document.getElementById('stats-start-date');
        const endInput = document.getElementById('stats-end-date');
        if (startInput) startInput.addEventListener('change', () => this.updateStats());
        if (endInput) endInput.addEventListener('change', () => this.updateStats());
    },

    async loadSales() {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await window.supabase
            .from('vendas')
            .select('*')
            .eq('user_id', user.id)
            .order('data_venda', { ascending: false });

        if (error) {
            console.error('Error loading sales:', error);
            return;
        }

        this.sales = data || [];
        this.updateStats();
    },

    updateStats() {
        const period = document.getElementById('stats-period').value;
        let filteredSales = this.sales;

        const now = new Date();
        if (period === 'monthly') {
            const selectedMonth = parseInt(document.getElementById('stats-month').value);
            const selectedYear = parseInt(document.getElementById('stats-year').value) || now.getFullYear();
            filteredSales = this.sales.filter(s => {
                const d = new Date(s.data_venda || s.data_agendamento);
                return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
            });
        } else if (period === 'yearly') {
            const selectedYear = parseInt(document.getElementById('stats-year').value) || now.getFullYear();
            filteredSales = this.sales.filter(s => {
                const d = new Date(s.data_venda || s.data_agendamento);
                return d.getFullYear() === selectedYear;
            });
        } else if (period === 'custom') {
            const start = new Date(document.getElementById('stats-start-date').value);
            const end = new Date(document.getElementById('stats-end-date').value);
            if (!isNaN(start) && !isNaN(end)) {
                filteredSales = this.sales.filter(s => {
                    const d = new Date(s.data_venda || s.data_agendamento);
                    return d >= start && d <= end;
                });
            }
        }

        const stats = filteredSales.reduce((acc, sale) => {
            if (sale.status === 'concluida') {
                acc.totalGross += sale.preco_venda || 0;
                acc.totalCosts += (sale.custo_producao || 0) + (sale.custos_adicionais || 0);
                acc.totalProfit += sale.lucro_real || 0;
                acc.count++;
            } else if (sale.status === 'cancelada') {
                acc.totalCosts += (sale.custo_cancelamento || 0);
                acc.totalProfit -= (sale.custo_cancelamento || 0);
            }
            return acc;
        }, { totalProfit: 0, totalGross: 0, totalCosts: 0, count: 0 });

        document.getElementById('stat-net-profit').textContent = `R$ ${stats.totalProfit.toFixed(2)}`;
        document.getElementById('stat-gross').textContent = `R$ ${stats.totalGross.toFixed(2)}`;
        document.getElementById('stat-costs').textContent = `R$ ${stats.totalCosts.toFixed(2)}`;
        document.getElementById('stat-count').textContent = stats.count;

        this.periodStats = stats;
        this.renderFilteredLists(filteredSales);
    },

    renderFilteredLists(filteredSales) {
        const agendamentosList = document.getElementById('list-agendamentos');
        const concluidasList = document.getElementById('list-concluidas');
        const canceladasList = document.getElementById('list-canceladas');

        const agendadas = filteredSales.filter(s => s.status === 'agendada')
            .sort((a, b) => new Date(a.data_agendamento) - new Date(b.data_agendamento));

        const concluidas = filteredSales.filter(s => s.status === 'concluida')
            .sort((a, b) => new Date(b.data_venda) - new Date(a.data_venda));

        const canceladas = filteredSales.filter(s => s.status === 'cancelada')
            .sort((a, b) => new Date(b.data_venda || b.data_agendamento) - new Date(a.data_venda || a.data_agendamento));

        document.getElementById('count-agendamentos').textContent = agendadas.length;
        document.getElementById('count-concluidas').textContent = concluidas.length;
        document.getElementById('count-canceladas').textContent = canceladas.length;

        agendamentosList.innerHTML = agendadas.length ? '' : '<div class="empty-state">Nenhum agendamento pendente.</div>';
        concluidasList.innerHTML = concluidas.length ? '' : '<div class="empty-state">Nenhuma venda realizada.</div>';
        canceladasList.innerHTML = canceladas.length ? '' : '<div class="empty-state">Nenhuma venda cancelada.</div>';

        agendadas.forEach(sale => {
            agendamentosList.appendChild(this.createSaleCard(sale));
        });

        concluidas.forEach(sale => {
            concluidasList.appendChild(this.createSaleCard(sale));
        });

        canceladas.forEach(sale => {
            canceladasList.appendChild(this.createSaleCard(sale));
        });
    },

    createSaleCard(sale) {
        const div = document.createElement('div');
        div.className = `sale-card ${sale.status}`;
        div.onclick = () => location.href = `/vendas/item/?id=${sale.id}`;

        const date = sale.status === 'agendada' ? sale.data_agendamento : sale.data_venda;
        const formattedDate = new Date(date).toLocaleDateString('pt-BR');

        let buyerName = '';
        if (sale.buyer_info) {
            let info = sale.buyer_info;
            if (typeof info === 'string') { try { info = JSON.parse(info); } catch(e) {} }
            if (Array.isArray(info) && info.length > 0) {
                // Tenta encontrar uma info com título "Nome" ou similar, caso contrário pega a primeira
                const nameInfo = info.find(i => i.title.toLowerCase().includes('nome')) || info[0];
                buyerName = nameInfo.value;
            }
        }

        div.innerHTML = `
            <div class="sale-card-content">
                <div class="sale-main-info">
                    <h3 class="sale-item-title">
                        ${sale.item_name}
                        ${buyerName ? `<span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 500; text-transform: none; display: block; margin-top: 0.2rem;">Comprador: ${buyerName}</span>` : ''}
                    </h3>
                    <span class="sale-date">${formattedDate}</span>
                </div>
                <div class="sale-values">
                    <div class="sale-value-item">
                        <span>Cobrado</span>
                        <strong>R$ ${sale.preco_venda.toFixed(2)}</strong>
                    </div>
                    <div class="sale-value-item">
                        <span>Lucro Real</span>
                        <strong class="${sale.lucro_real >= 0 ? 'pos' : 'neg'}">R$ ${sale.lucro_real.toFixed(2)}</strong>
                    </div>
                </div>
            </div>
        `;
        return div;
    },

    openExpensesModal() {
        const modal = document.getElementById('modal-expenses');
        const tbody = document.getElementById('table-expenses-body');
        const totalElem = document.getElementById('total-expenses-value');

        tbody.innerHTML = '';
        let total = 0;

        const period = document.getElementById('stats-period').value;
        let filteredSales = this.sales;
        const now = new Date();
        if (period === 'monthly') {
            filteredSales = this.sales.filter(s => {
                const d = new Date(s.data_venda || s.data_agendamento);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
        } else if (period === 'yearly') {
            filteredSales = this.sales.filter(s => {
                const d = new Date(s.data_venda || d.data_agendamento);
                return d.getFullYear() === now.getFullYear();
            });
        } else if (period === 'custom') {
            const start = new Date(document.getElementById('stats-start-date').value);
            const end = new Date(document.getElementById('stats-end-date').value);
            if (!isNaN(start) && !isNaN(end)) {
                filteredSales = this.sales.filter(s => {
                    const d = new Date(s.data_venda || s.data_agendamento);
                    return d >= start && d <= end;
                });
            }
        }

        filteredSales.forEach(s => {
            if (s.status === 'concluida') {
                const cost = (s.custo_producao || 0) + (s.custos_adicionais || 0);
                total += cost;
                tbody.innerHTML += `
                    <tr>
                        <td>${s.item_name} (Produção + Adic.)</td>
                        <td>${new Date(s.data_venda).toLocaleDateString()}</td>
                        <td>Custo Venda</td>
                        <td>R$ ${cost.toFixed(2)}</td>
                    </tr>
                `;
            } else if (s.status === 'cancelada' && s.custo_cancelamento > 0) {
                total += s.custo_cancelamento;
                tbody.innerHTML += `
                    <tr>
                        <td>${s.item_name} (Devolução/Cancel.)</td>
                        <td>${new Date(s.data_venda || s.data_agendamento).toLocaleDateString()}</td>
                        <td>Custo Cancel.</td>
                        <td>R$ ${s.custo_cancelamento.toFixed(2)}</td>
                    </tr>
                `;
            }
        });

        totalElem.textContent = `R$ ${total.toFixed(2)}`;
        modal.classList.remove('hidden');
    },

    closeExpensesModal() {
        document.getElementById('modal-expenses').classList.add('hidden');
    },

    closeAllDropdowns() {
        const dropdowns = [
            'stats-period-dropdown',
            'stats-month-dropdown',
            'stats-year-dropdown'
        ];
        dropdowns.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    },

    selectPeriod(value, display) {
        document.getElementById('stats-period').value = value;
        document.getElementById('stats-period-display').value = display;
        this.closeAllDropdowns();

        const monthGroup = document.getElementById('month-selector-group');
        const yearGroup = document.getElementById('year-selector-group');
        const customRange = document.getElementById('custom-date-range');

        // Reset display
        monthGroup.classList.add('hidden');
        yearGroup.classList.add('hidden');
        customRange.classList.add('hidden');

        if (value === 'monthly') {
            monthGroup.classList.remove('hidden');
        } else if (value === 'yearly') {
            yearGroup.classList.remove('hidden');
        } else if (value === 'custom') {
            customRange.classList.remove('hidden');
        }

        this.updateStats();
    },

    selectMonth(value, display) {
        document.getElementById('stats-month').value = value;
        document.getElementById('stats-month-display').value = display;
        this.closeAllDropdowns();
        this.updateStats();
    },

    selectYear(value) {
        document.getElementById('stats-year').value = value;
        document.getElementById('stats-year-display').value = value;
        this.closeAllDropdowns();
        this.updateStats();
    },

    openDatePicker(type) {
        const modal = document.createElement('div');
        modal.className = 'picker-modal';
        modal.id = 'calendar-modal';

        const currentVal = document.getElementById(`stats-${type}-date`).value;
        const tempDate = currentVal ? new Date(currentVal + 'T12:00:00') : new Date();

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
                const isActive = day === tempDate.getDate() && month === tempDate.getMonth() && year === tempDate.getFullYear();
                html += `<div class="calendar-day ${isActive ? 'active' : ''}" onclick="vendas.selectCalendarDay(${day}, ${month}, ${year}, '${type}')">${day}</div>`;
            }

            html += `</div><div class="picker-actions"><button class="btn-secondary" onclick="document.getElementById('calendar-modal').remove()">Fechar</button></div></div>`;
            modal.innerHTML = html;

            modal.querySelector('#prev-month').onclick = (e) => { e.stopPropagation(); date.setMonth(date.getMonth() - 1); renderCalendar(date); };
            modal.querySelector('#next-month').onclick = (e) => { e.stopPropagation(); date.setMonth(date.getMonth() + 1); renderCalendar(date); };
        };

        renderCalendar(new Date(tempDate));
        document.body.appendChild(modal);
    },

    selectCalendarDay(day, month, year, type) {
        const d = new Date(year, month, day);
        const formatted = d.toLocaleDateString('pt-BR');
        const iso = d.toISOString().split('T')[0];

        document.getElementById(`display-${type}-date`).innerText = formatted;
        document.getElementById(`stats-${type}-date`).value = iso;

        document.getElementById('calendar-modal').remove();
        this.updateStats();
    },

    initSelectors() {
        const now = new Date();
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

        // Init Month
        document.getElementById('stats-month').value = now.getMonth();
        document.getElementById('stats-month-display').value = months[now.getMonth()];

        // Init Year
        const currentYear = now.getFullYear();
        document.getElementById('stats-year').value = currentYear;
        document.getElementById('stats-year-display').value = currentYear;

        // Init Dates for Custom Range
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        document.getElementById('stats-start-date').value = firstOfMonth.toISOString().split('T')[0];
        document.getElementById('display-start-date').innerText = firstOfMonth.toLocaleDateString('pt-BR');

        document.getElementById('stats-end-date').value = lastOfMonth.toISOString().split('T')[0];
        document.getElementById('display-end-date').innerText = lastOfMonth.toLocaleDateString('pt-BR');

        // Populate Year Dropdown
        const yearDropdown = document.getElementById('stats-year-dropdown');
        if (yearDropdown) {
            yearDropdown.innerHTML = '';
            for (let i = currentYear + 2; i >= currentYear - 10; i--) {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.onclick = () => this.selectYear(i);
                item.innerHTML = `<span>${i}</span>`;
                yearDropdown.appendChild(item);
            }
        }
    },

    render() {
        this.initSelectors();
        this.updateStats();
    }
};

window.vendas = vendas;
