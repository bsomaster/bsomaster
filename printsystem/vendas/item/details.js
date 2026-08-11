const vendasItem = {
    sale: null,
    tempCancelCosts: [], // Lista temporária para os custos de cancelamento
    tempConfirmCosts: [], // Lista temporária para os custos na confirmação
    tempConfirmDiscounts: [], // Lista temporária para os descontos na confirmação

    async init() {
        const urlParams = new URLSearchParams(window.location.search);
        const saleId = urlParams.get('id');

        if (!saleId) {
            location.href = '/printsystem/vendas/';
            return;
        }

        await this.loadSale(saleId);
        this.setupEventListeners();
        this.render();
    },

    async loadSale(id) {
        const { data, error } = await window.supabase
            .from('vendas')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('Error loading sale:', error);
            location.href = '/printsystem/vendas/';
            return;
        }

        this.sale = data;
        console.log('Sale object loaded:', this.sale);
    },

    setupEventListeners() {
        document.getElementById('btn-back').onclick = () => location.href = '/printsystem/vendas/';

        const btnAbort = document.getElementById('btn-abort-cancel');
        if (btnAbort) {
            btnAbort.onclick = () => this.showCancelCard(false);
        }

        const btnConfirmCancel = document.getElementById('btn-confirm-cancel-sale');
        if (btnConfirmCancel) {
            btnConfirmCancel.onclick = () => this.executeCancellation();
        }

        const btnAddCost = document.getElementById('btn-add-cancel-cost');
        if (btnAddCost) {
            btnAddCost.onclick = () => this.addCancelCost();
        }

        // Eventos Confirmação
        const btnAbortConfirm = document.getElementById('btn-abort-confirm');
        if (btnAbortConfirm) {
            btnAbortConfirm.onclick = () => this.showConfirmCard(false);
        }

        const btnAddConfirmCost = document.getElementById('btn-add-confirm-cost');
        if (btnAddConfirmCost) {
            btnAddConfirmCost.onclick = () => this.addConfirmCost();
        }

        const btnAddConfirmDiscount = document.getElementById('btn-add-confirm-discount');
        if (btnAddConfirmDiscount) {
            btnAddConfirmDiscount.onclick = () => this.addConfirmDiscount();
        }

        const btnFinalizeSale = document.getElementById('btn-confirm-final-sale');
        if (btnFinalizeSale) {
            btnFinalizeSale.onclick = () => this.executeFinalSale();
        }
    },

    addCancelCost() {
        const descInput = document.getElementById('cancel-cost-desc');
        const valInput = document.getElementById('cancel-cost-val');
        const desc = descInput.value.trim();
        const val = parseFloat(valInput.value) || 0;

        if (!desc || val <= 0) return;

        this.tempCancelCosts.push({ id: crypto.randomUUID(), desc, val });
        descInput.value = '';
        valInput.value = '';
        this.renderCancelCosts();
    },

    removeCancelCost(id) {
        this.tempCancelCosts = this.tempCancelCosts.filter(c => c.id !== id);
        this.renderCancelCosts();
    },

    renderCancelCosts() {
        const list = document.getElementById('cancel-costs-list');
        const totalElem = document.getElementById('cancel-costs-total');
        const trashIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

        if (this.tempCancelCosts.length === 0) {
            list.innerHTML = '<p class="text-muted" style="text-align: center; padding: 2rem; border: 1px dashed var(--border); border-radius: 12px;">Nenhum custo adicional adicionado.</p>';
            totalElem.innerText = 'R$ 0,00';
            return;
        }

        let total = 0;
        list.innerHTML = this.tempCancelCosts.map(c => {
            total += c.val;
            return `
                <div class="settings-item global-cost-item">
                    <div class="item-info">
                        <span class="item-name">${c.desc}</span>
                    </div>
                    <strong class="cost-price" style="color: #ef4444;">R$ ${c.val.toFixed(2)}</strong>
                    <div class="item-actions">
                        <button class="btn-secondary btn-icon-only danger" onclick="vendasItem.removeCancelCost('${c.id}')" title="Excluir">
                            ${trashIcon}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        totalElem.innerText = `R$ ${total.toFixed(2)}`;
    },

    showCancelCard(show) {
        const card = document.getElementById('cancel-sale-card');
        const confirmCard = document.getElementById('confirm-sale-card');
        const actions = document.getElementById('detail-actions');

        if (show) {
            this.tempCancelCosts = [];
            this.renderCancelCosts();
            card.classList.remove('hidden');
            confirmCard.classList.add('hidden');
            actions.classList.add('hidden');
            card.scrollIntoView({ behavior: 'smooth' });
        } else {
            card.classList.add('hidden');
            actions.classList.remove('hidden');
            document.getElementById('cancel-reason').value = '';
            document.getElementById('cancel-cost-desc').value = '';
            document.getElementById('cancel-cost-val').value = '';
        }
    },

    showConfirmCard(show) {
        const card = document.getElementById('confirm-sale-card');
        const cancelCard = document.getElementById('cancel-sale-card');
        const actions = document.getElementById('detail-actions');

        if (show) {
            // Inicializar com o que já existe na venda
            this.tempConfirmCosts = JSON.parse(JSON.stringify(this.extractArray(this.sale.detalhes_custos_adicionais)));
            this.tempConfirmDiscounts = JSON.parse(JSON.stringify(this.extractArray(this.sale.detalhes_descontos)));

            // Garantir que tenham IDs para remoção
            this.tempConfirmCosts.forEach(c => { if(!c.id) c.id = crypto.randomUUID(); });
            this.tempConfirmDiscounts.forEach(d => { if(!d.id) d.id = crypto.randomUUID(); });

            this.renderConfirmCosts();
            this.renderConfirmDiscounts();
            this.updateConfirmTotals();

            card.classList.remove('hidden');
            cancelCard.classList.add('hidden');
            actions.classList.add('hidden');
            card.scrollIntoView({ behavior: 'smooth' });
        } else {
            card.classList.add('hidden');
            actions.classList.remove('hidden');
            document.getElementById('confirm-cost-desc').value = '';
            document.getElementById('confirm-cost-val').value = '';
            document.getElementById('confirm-discount-desc').value = '';
            document.getElementById('confirm-discount-val').value = '';
        }
    },

    addConfirmCost() {
        const descInput = document.getElementById('confirm-cost-desc');
        const valInput = document.getElementById('confirm-cost-val');
        const desc = descInput.value.trim();
        const val = parseFloat(valInput.value) || 0;

        if (!desc || val <= 0) return;

        this.tempConfirmCosts.push({ id: crypto.randomUUID(), desc, val });
        descInput.value = '';
        valInput.value = '';
        this.renderConfirmCosts();
        this.updateConfirmTotals();
    },

    removeConfirmCost(id) {
        this.tempConfirmCosts = this.tempConfirmCosts.filter(c => c.id !== id);
        this.renderConfirmCosts();
        this.updateConfirmTotals();
    },

    renderConfirmCosts() {
        const list = document.getElementById('confirm-costs-list');
        const trashIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

        if (this.tempConfirmCosts.length === 0) {
            list.innerHTML = '<p class="text-muted" style="text-align: center; padding: 1rem; border: 1px dashed var(--border); border-radius: 12px;">Nenhum custo adicional.</p>';
            return;
        }

        list.innerHTML = this.tempConfirmCosts.map(c => `
            <div class="settings-item global-cost-item">
                <div class="item-info">
                    <span class="item-name">${c.desc}</span>
                </div>
                <strong class="cost-price" style="color: #ef4444;">R$ ${parseFloat(c.val).toFixed(2)}</strong>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="vendasItem.removeConfirmCost('${c.id}')" title="Excluir">
                        ${trashIcon}
                    </button>
                </div>
            </div>
        `).join('');
    },

    addConfirmDiscount() {
        const descInput = document.getElementById('confirm-discount-desc');
        const valInput = document.getElementById('confirm-discount-val');
        const desc = descInput.value.trim();
        const val = parseFloat(valInput.value) || 0;

        if (!desc || val <= 0) return;

        this.tempConfirmDiscounts.push({ id: crypto.randomUUID(), desc, val });
        descInput.value = '';
        valInput.value = '';
        this.renderConfirmDiscounts();
        this.updateConfirmTotals();
    },

    removeConfirmDiscount(id) {
        this.tempConfirmDiscounts = this.tempConfirmDiscounts.filter(d => d.id !== id);
        this.renderConfirmDiscounts();
        this.updateConfirmTotals();
    },

    renderConfirmDiscounts() {
        const list = document.getElementById('confirm-discounts-list');
        const trashIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`;

        if (this.tempConfirmDiscounts.length === 0) {
            list.innerHTML = '<p class="text-muted" style="text-align: center; padding: 1rem; border: 1px dashed var(--border); border-radius: 12px;">Nenhum desconto aplicado.</p>';
            return;
        }

        list.innerHTML = this.tempConfirmDiscounts.map(d => `
            <div class="settings-item global-cost-item">
                <div class="item-info">
                    <span class="item-name">${d.desc}</span>
                </div>
                <strong class="cost-price" style="color: #ef4444;">R$ ${parseFloat(d.val).toFixed(2)}</strong>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="vendasItem.removeConfirmDiscount('${d.id}')" title="Excluir">
                        ${trashIcon}
                    </button>
                </div>
            </div>
        `).join('');
    },

    updateConfirmTotals() {
        const sale = this.sale;
        // Preço base é o valor antes dos descontos
        const precoBase = parseFloat(sale.preco_venda) + parseFloat(sale.descontos);
        const custoProducao = parseFloat(sale.custo_producao) || 0;

        const totalCustos = this.tempConfirmCosts.reduce((acc, c) => acc + parseFloat(c.val), 0);
        const totalDescontos = this.tempConfirmDiscounts.reduce((acc, d) => acc + parseFloat(d.val), 0);

        // Valor Cobrado é o preço base menos os descontos
        const totalFinal = precoBase - totalDescontos;
        // Lucro Real é o Valor Cobrado menos custo de produção e custos adicionais
        const lucroReal = totalFinal - custoProducao - totalCustos;

        document.getElementById('confirm-total-final').innerText = `R$ ${totalFinal.toFixed(2)}`;
        document.getElementById('confirm-lucro-real').innerText = `R$ ${lucroReal.toFixed(2)}`;
    },

    async executeCancellation() {
        const id = this.sale.id;
        const currentStatus = this.sale.status;
        const reason = document.getElementById('cancel-reason').value.trim();
        const totalExtraCost = this.tempCancelCosts.reduce((acc, c) => acc + c.val, 0);

        if (!reason) {
            window.utils.showAlert({ title: 'Campo Obrigatório', message: 'Por favor, informe o motivo do cancelamento.' });
            return;
        }

        const { error } = await window.supabase
            .from('vendas')
            .update({
                status: 'cancelada',
                motivo_cancelamento: reason,
                custo_cancelamento: totalExtraCost,
                detalhes_custos_cancelamento: this.tempCancelCosts, // Salvando a lista detalhada
                lucro_real: currentStatus === 'concluida' ? -totalExtraCost : 0
            })
            .eq('id', id);

        if (error) {
            window.utils.showAlert({ title: 'Erro', message: 'Erro ao cancelar venda: ' + error.message });
        } else {
            this.showCancelCard(false);
            await this.loadSale(id);
            this.render();
            window.utils.showAlert({ title: 'Sucesso', message: 'Venda cancelada com sucesso.' });
        }
    },

    // Função robusta para extrair array de qualquer formato (string, objeto, null)
    extractArray(data) {
        if (!data) return [];

        // Se já for array, retorna
        if (Array.isArray(data)) return data;

        // Se for string, tenta fazer parse
        if (typeof data === 'string') {
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) return parsed;
                if (typeof parsed === 'object' && parsed !== null) return Object.values(parsed);
            } catch (e) {
                console.warn('Campo não é um JSON válido, retornando vazio:', data);
                return [];
            }
        }

        // Se for objeto mas não array, tenta pegar os valores
        if (typeof data === 'object' && data !== null) {
            return Object.values(data);
        }

        return [];
    },

    render() {
        const sale = this.sale;
        if (!sale) return;

        // Status Badge
        const statusElem = document.getElementById('detail-status-badge');
        const statusText = sale.status ? (sale.status.charAt(0).toUpperCase() + sale.status.slice(1)) : 'N/A';
        statusElem.innerText = statusText;
        statusElem.className = `status-badge ${sale.status || ''}`;

        // Preencher informações do item
        document.getElementById('detail-product-name').innerText = sale.item_name || 'Item desconhecido';
        const date = sale.status === 'agendada' ? sale.data_agendamento : sale.data_venda;
        const dateObj = date ? new Date(date) : null;
        document.getElementById('detail-date').innerText = dateObj ? dateObj.toLocaleDateString('pt-BR') : 'Não informada';
        document.getElementById('detail-time').innerText = dateObj ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Não informada';

        document.getElementById('detail-pricing-type').innerText = sale.tipo_venda === 'atacado' ? 'Atacado' : 'Unitário';
        document.getElementById('detail-quantity').innerText = sale.quantidade || 0;

        // Dados do Comprador
        const buyerList = document.getElementById('detail-buyer-info-list');
        const rawBuyerInfo = sale.buyer_info || sale.buyerinfo || sale.buyer_details || [];
        const buyerInfo = this.extractArray(rawBuyerInfo);

        if (buyerInfo.length > 0) {
            buyerList.innerHTML = buyerInfo.map(info => {
                const title = info.title || info.label || 'Informação';
                const value = info.value || info.text || '-';
                return `
                    <div class="info-item">
                        <span>${title}</span>
                        <strong>${value}</strong>
                    </div>
                `;
            }).join('');
        } else {
            buyerList.innerHTML = '<p class="text-muted">Nenhuma informação informada.</p>';
        }

        // Se estiver cancelada, mostrar info do cancelamento
        const cancelSection = document.getElementById('detail-cancel-section');
        if (cancelSection) {
            if (sale.status === 'cancelada') {
                cancelSection.classList.remove('hidden');
                document.getElementById('detail-cancel-reason').innerText = sale.motivo_cancelamento || 'Não informado';
                document.getElementById('detail-cancel-total-cost').innerText = `R$ ${parseFloat(sale.custo_cancelamento || 0).toFixed(2)}`;

                const cancelCosts = this.extractArray(sale.detalhes_custos_cancelamento);
                const breakdownElem = document.getElementById('detail-cancel-costs-breakdown');

                if (breakdownElem) {
                    if (cancelCosts.length > 0) {
                        breakdownElem.innerHTML = cancelCosts.map(c => `
                            <div class="mini-list-item">
                                <span>${c.desc}</span>
                                <strong style="color: var(--accent-danger)">R$ ${parseFloat(c.val || 0).toFixed(2)}</strong>
                            </div>
                        `).join('');
                    } else {
                        breakdownElem.innerHTML = '';
                    }
                }
            } else {
                cancelSection.classList.add('hidden');
            }
        }

        // Financeiro
        const precoVenda = parseFloat(sale.preco_venda) || 0;
        const descontos = parseFloat(sale.descontos) || 0;
        const custoProducao = parseFloat(sale.custo_producao) || 0;
        const custosAdicionais = parseFloat(sale.custos_adicionais) || 0;
        const lucroReal = parseFloat(sale.lucro_real) || 0;
        const quantidade = parseInt(sale.quantidade) || 1;

        const totalBasePrice = precoVenda + descontos;
        const unitBasePrice = totalBasePrice / quantidade;

        document.getElementById('detail-total-value').innerText = `R$ ${precoVenda.toFixed(2)}`;
        document.getElementById('detail-base-price').innerText = `R$ ${unitBasePrice.toFixed(2)}`;
        document.getElementById('detail-production-cost').innerText = `R$ ${custoProducao.toFixed(2)}`;

        const formatMargin = (val) => {
            // Se a primeira casa decimal for zero (ex: 42.05), mostrar apenas o inteiro
            if (Math.floor(val * 10) % 10 === 0) return val.toFixed(0);
            return val.toFixed(1);
        };

        // Margem Base: Lucro sobre o Preço de Venda (antes dos descontos extras)
        const baseMargin = totalBasePrice > 0 ? ((totalBasePrice - custoProducao) / totalBasePrice * 100) : 0;
        document.getElementById('detail-base-margin').innerText = `${formatMargin(baseMargin)}%`;

        const realProfitElem = document.getElementById('detail-real-profit');
        realProfitElem.innerText = `R$ ${lucroReal.toFixed(2)}`;
        realProfitElem.style.color = lucroReal >= 0 ? '#27ae60' : '#e74c3c';

        // Margem Final: Lucro Real sobre o Preço Final Recebido
        const finalMargin = precoVenda > 0 ? (lucroReal / precoVenda * 100) : 0;
        document.getElementById('detail-final-margin').innerText = `${formatMargin(finalMargin)}%`;

        // Listas de custos e descontos
        const extraCostsList = document.getElementById('detail-extra-costs-list');
        const extraCosts = this.extractArray(sale.detalhes_custos_adicionais);

        if (extraCostsList) {
            if (extraCosts.length > 0) {
                extraCostsList.innerHTML = extraCosts.map(c => `
                    <div class="mini-list-item">
                        <span>${c.desc || 'Custo'}:</span>
                        <strong style="color: #e74c3c">R$ ${parseFloat(c.val || 0).toFixed(2)}</strong>
                    </div>
                `).join('');
            } else {
                extraCostsList.innerHTML = '<p class="text-muted">Nenhum custo adicional.</p>';
            }
        }

        const discountsList = document.getElementById('detail-discounts-list');
        const discounts = this.extractArray(sale.detalhes_descontos);

        if (discountsList) {
            if (discounts.length > 0) {
                discountsList.innerHTML = discounts.map(d => `
                    <div class="mini-list-item">
                        <span>${d.desc || 'Desconto'}:</span>
                        <strong style="color: #e74c3c">R$ ${parseFloat(d.val || 0).toFixed(2)}</strong>
                    </div>
                `).join('');
            } else {
                discountsList.innerHTML = '<p class="text-muted">Nenhum desconto aplicado.</p>';
            }
        }

        // Ações
        const actionsElem = document.getElementById('detail-actions');
        if (actionsElem) {
            actionsElem.innerHTML = '';
            if (sale.status === 'agendada') {
                actionsElem.innerHTML = `
                    <button class="btn-secondary" onclick="vendasItem.cancelarVenda('${sale.id}', 'agendada')">Cancelar Agendamento</button>
                    <button class="btn-primary" onclick="vendasItem.confirmarVenda('${sale.id}')">Confirmar Venda</button>
                `;
            } else if (sale.status === 'concluida') {
                actionsElem.innerHTML = `
                    <button class="btn-secondary" onclick="vendasItem.cancelarVenda('${sale.id}', 'concluida')">Cancelar Venda</button>
                `;
            }
        }
    },

    async executeFinalSale() {
        const id = this.sale.id;
        const totalCustos = this.tempConfirmCosts.reduce((acc, c) => acc + parseFloat(c.val), 0);
        const totalDescontos = this.tempConfirmDiscounts.reduce((acc, d) => acc + parseFloat(d.val), 0);

        const precoBase = parseFloat(this.sale.preco_venda) + parseFloat(this.sale.descontos);
        const precoVendaFinal = precoBase - totalDescontos;
        const lucroReal = precoVendaFinal - (parseFloat(this.sale.custo_producao) || 0) - totalCustos;

        const { error } = await window.supabase
            .from('vendas')
            .update({
                status: 'concluida',
                data_venda: new Date().toISOString().split('T')[0],
                data_confirmacao: new Date().toISOString(),
                custos_adicionais: totalCustos,
                detalhes_custos_adicionais: this.tempConfirmCosts,
                descontos: totalDescontos,
                detalhes_descontos: this.tempConfirmDiscounts,
                preco_venda: precoVendaFinal,
                lucro_real: lucroReal
            })
            .eq('id', id);

        if (error) {
            window.utils.showAlert({ title: 'Erro', message: 'Erro ao confirmar venda: ' + error.message });
        } else {
            this.showConfirmCard(false);
            await this.loadSale(id);
            this.render();
            window.utils.showAlert({ title: 'Sucesso', message: 'Venda confirmada com sucesso!' });
        }
    },

    async confirmarVenda(id) {
        this.showConfirmCard(true);
    },

    async cancelarVenda(id, currentStatus) {
        this.showCancelCard(true);
    }
};

window.vendasItem = vendasItem;
