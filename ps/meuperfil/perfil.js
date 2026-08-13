const perfil = {
    data: {
        full_name: '',
        email_contact: '',
        phone: '',
        bio: '',
        photo_url: '',
        extra_info: [],
        social_links: []
    },

    async init() {
        if (!window.user) return;
        await this.loadProfile();
        this.setupEventListeners();
        this.renderExtraInfo();
        this.renderSocialLinks();
    },

    async loadProfile() {
        try {
            const { data, error } = await window.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', window.user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found

            if (data) {
                this.data = {
                    ...this.data,
                    ...data,
                    extra_info: data.extra_info || [],
                    social_links: data.social_links || []
                };
                this.fillForm();
            }
        } catch (err) {
            console.error('Erro ao carregar perfil:', err);
        }
    },

    fillForm() {
        document.getElementById('profile-name').value = this.data.full_name || '';
        document.getElementById('profile-email').value = this.data.email_contact || '';
        document.getElementById('profile-phone').value = this.data.phone || '';
        document.getElementById('profile-bio').value = this.data.bio || '';

        if (this.data.photo_url) {
            const img = document.getElementById('img-preview');
            img.src = this.data.photo_url;
            img.style.display = 'block';
            document.getElementById('img-placeholder').style.display = 'none';
        }
    },

    setupEventListeners() {
        document.getElementById('btn-save-profile').onclick = () => this.saveProfile();
        document.getElementById('btn-add-extra').onclick = () => this.addExtraInfo();
        document.getElementById('btn-add-social').onclick = () => this.addSocialLink();
        document.getElementById('btn-view-public').onclick = () => {
             const username = window.user?.user_metadata?.username;
             if (username) {
                 window.open(`/ps/user/perfil/?u=${username}`, '_blank');
             }
        };

        const btnCancelCrop = document.getElementById('btn-cancel-crop');
        if (btnCancelCrop) btnCancelCrop.onclick = () => this.closeCropper();
        const btnConfirmCrop = document.getElementById('btn-confirm-crop');
        if (btnConfirmCrop) btnConfirmCrop.onclick = () => this.confirmCrop();

        // Platform Dropdown Logic
        const platformDisplay = document.getElementById('social-platform-display');
        const platformDropdown = document.getElementById('social-platform-results');

        if (platformDisplay && platformDropdown) {
            platformDisplay.onclick = (e) => {
                e.stopPropagation();
                const isHidden = platformDropdown.classList.contains('hidden');
                document.querySelectorAll('.search-results-dropdown').forEach(d => d.classList.add('hidden'));
                if (isHidden) platformDropdown.classList.remove('hidden');
            };
        }

        document.addEventListener('click', () => {
            if (platformDropdown) platformDropdown.classList.add('hidden');
        });

        const inputPhoto = document.getElementById('input-photo');
        inputPhoto.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    this.openCropper(event.target.result);
                };
                reader.readAsDataURL(file);
                // Reseta o input para permitir selecionar a mesma imagem novamente
                e.target.value = '';
            }
        };
    },

    openCropper(imageSrc) {
        const modal = document.getElementById('cropper-modal');
        const image = document.getElementById('cropper-image');
        image.src = imageSrc;
        modal.classList.remove('hidden');

        if (this.cropper) this.cropper.destroy();

        this.cropper = new Cropper(image, {
            aspectRatio: 1,
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 1,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false
        });
    },

    closeCropper() {
        document.getElementById('cropper-modal').classList.add('hidden');
        if (this.cropper) {
            this.cropper.destroy();
            this.cropper = null;
        }
    },

    async confirmCrop() {
        if (!this.cropper) return;
        const canvas = this.cropper.getCroppedCanvas({ width: 500, height: 500 });
        let base64 = canvas.toDataURL('image/webp', 0.8);

        // Comprimir imagem para WebP se o utilitário estiver disponível
        if (window.utils && window.utils.compressImage) {
            try {
                base64 = await window.utils.compressImage(base64, 150); // Máximo 150KB
            } catch (err) {
                console.error('Erro ao comprimir imagem:', err);
            }
        }

        this.data.photo_url = base64;
        const img = document.getElementById('img-preview');
        img.src = base64;
        img.style.display = 'block';
        document.getElementById('img-placeholder').style.display = 'none';

        this.closeCropper();
    },

    selectPlatform(value, label) {
        const display = document.getElementById('social-platform-display');
        const hidden = document.getElementById('social-platform');
        const dropdown = document.getElementById('social-platform-results');

        if (hidden) hidden.value = value;
        if (display) display.value = label;
        if (dropdown) dropdown.classList.add('hidden');
    },

    addExtraInfo() {
        const title = document.getElementById('extra-title').value.trim();
        const content = document.getElementById('extra-content').value.trim();

        if (!title || !content) return;

        this.data.extra_info.push({ title, content });
        document.getElementById('extra-title').value = '';
        document.getElementById('extra-content').value = '';
        this.renderExtraInfo();
    },

    removeExtraInfo(index) {
        this.data.extra_info.splice(index, 1);
        this.renderExtraInfo();
    },

    renderExtraInfo() {
        const list = document.getElementById('extra-info-list');
        list.className = 'settings-list';
        list.innerHTML = '';
        this.data.extra_info.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'settings-item';
            div.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${item.title}</span>
                    <span class="item-details">${item.content}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="perfil.removeExtraInfo(${index})" title="Remover">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    },

    addSocialLink() {
        const platform = document.getElementById('social-platform').value;
        const username = document.getElementById('social-username').value.trim().replace('@', '');

        if (!username) return;

        this.data.social_links.push({ platform, username });
        document.getElementById('social-username').value = '';
        this.renderSocialLinks();
    },

    removeSocialLink(index) {
        this.data.social_links.splice(index, 1);
        this.renderSocialLinks();
    },

    renderSocialLinks() {
        const list = document.getElementById('social-list');
        list.className = 'settings-list';
        list.innerHTML = '';
        this.data.social_links.forEach((item, index) => {
            const platformLabel = item.platform.charAt(0).toUpperCase() + item.platform.slice(1);
            const presymbol = item.platform === 'site' ? '' : '@';
            const div = document.createElement('div');
            div.className = 'settings-item';
            div.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${platformLabel}</span>
                    <span class="item-details">${presymbol}${item.username}</span>
                </div>
                <div class="item-actions">
                    <button class="btn-secondary btn-icon-only danger" onclick="perfil.removeSocialLink(${index})" title="Remover">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    },

    async saveProfile() {
        const btn = document.getElementById('btn-save-profile');
        const originalText = btn.innerText;
        btn.innerText = 'Salvando...';
        btn.disabled = true;

        try {
            const updates = {
                id: window.user.id,
                username: window.user.user_metadata?.username || this.data.username,
                full_name: document.getElementById('profile-name').value.trim(),
                email_contact: document.getElementById('profile-email').value.trim(),
                phone: document.getElementById('profile-phone').value.trim(),
                bio: document.getElementById('profile-bio').value.trim(),
                photo_url: this.data.photo_url,
                extra_info: this.data.extra_info,
                social_links: this.data.social_links,
                updated_at: new Date()
            };

            const { error } = await window.supabase
                .from('user_profiles')
                .upsert(updates);

            if (error) throw error;

            window.utils.showAlert({
                title: 'Sucesso',
                message: 'Perfil atualizado com sucesso!'
            });
        } catch (err) {
            console.error('Erro ao salvar perfil:', err);
            window.utils.showAlert({
                title: 'Erro',
                message: 'Erro ao salvar perfil: ' + err.message
            });
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
};

window.perfil = perfil;
