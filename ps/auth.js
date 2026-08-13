const auth = {
    isUsernameAvailable: false,
    checkedUsername: '',

    async init() {
        const { data: { session } } = await window.supabase.auth.getSession();
        this.handleAuthStateChange(session);

        window.supabase.auth.onAuthStateChange((_event, session) => {
            this.handleAuthStateChange(session);
        });

        this.setupEventListeners();
    },

    handleAuthStateChange(session) {
        window.user = session?.user || null;
        const path = window.location.pathname;
        const isLoginPage = path.includes('/ps/login');
        const isLandingPage = path === '/ps/' || path === '/ps/index.html';

        if (!session && !isLoginPage && !isLandingPage) {
            window.location.href = '/ps/login/';
        } else if (session && isLoginPage) {
            window.location.href = '/ps/dashboard/';
        }

        if (session) {
            const username = session.user.user_metadata?.username || 'Usuário';
            const usernameBtn = document.getElementById('btn-user-menu');
            if (usernameBtn) {
                const span = usernameBtn.querySelector('span');
                if (span) span.innerText = username;
            }
        }

        if (window.onAuthChange) {
            window.onAuthChange(session);
        }
    },

    setupEventListeners() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const linkShowRegister = document.getElementById('link-show-register');
        const linkShowLogin = document.getElementById('link-show-login');
        const btnLogout = document.getElementById('btn-logout');
        const btnUserMenu = document.getElementById('btn-user-menu');
        const userDropdown = document.getElementById('user-dropdown');
        const btnCheckUsername = document.getElementById('btn-check-username');
        const usernameInput = document.getElementById('register-username');
        const usernameStatus = document.getElementById('username-status');

        if (linkShowRegister) {
            linkShowRegister.onclick = (e) => {
                e.preventDefault();
                document.getElementById('page-login').classList.remove('active');
                document.getElementById('page-register').classList.add('active');
            };
        }

        if (linkShowLogin) {
            linkShowLogin.onclick = (e) => {
                e.preventDefault();
                document.getElementById('page-register').classList.remove('active');
                document.getElementById('page-login').classList.add('active');
            };
        }

        if (btnCheckUsername) {
            btnCheckUsername.onclick = async () => {
                const username = usernameInput.value.trim();

                // Validação de caracteres e tamanho
                const regex = /^[a-zA-Z0-9]+$/;
                if (username.length < 5) {
                    this.updateUsernameStatus('Mínimo 5 caracteres', 'error');
                    return;
                }
                if (username.length > 15) {
                    this.updateUsernameStatus('Máximo 15 caracteres', 'error');
                    return;
                }
                if (!regex.test(username)) {
                    this.updateUsernameStatus('Apenas letras e números', 'error');
                    return;
                }

                this.updateUsernameStatus('Verificando...', 'wait');

                try {
                    // Busca insensível a maiúsculas/minúsculas usando o operador 'ilike'
                    const { data, error } = await window.supabase
                        .from('user_profiles')
                        .select('username')
                        .ilike('username', username);

                    if (error) throw error;

                    if (data && data.length > 0) {
                        this.isUsernameAvailable = false;
                        this.updateUsernameStatus('Indisponível', 'error');
                    } else {
                        this.isUsernameAvailable = true;
                        this.checkedUsername = username;
                        this.updateUsernameStatus('Disponível!', 'success');
                    }
                } catch (err) {
                    console.error(err);
                    this.updateUsernameStatus('Erro ao verificar', 'error');
                }
            };
        }

        if (usernameInput) {
            usernameInput.oninput = () => {
                this.isUsernameAvailable = false;
                usernameStatus.innerText = '';
            };
        }

        if (loginForm) {
            loginForm.onsubmit = async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const { error } = await window.supabase.auth.signInWithPassword({ email, password });
                if (error) window.utils.showAlert({ title: 'Erro de Login', message: error.message });
            };
        }

        if (registerForm) {
            registerForm.onsubmit = async (e) => {
                e.preventDefault();
                const username = usernameInput.value.trim();
                const email = document.getElementById('register-email').value;
                const password = document.getElementById('register-password').value;

                if (!this.isUsernameAvailable || username !== this.checkedUsername) {
                    window.utils.showAlert({
                        title: 'Atenção',
                        message: 'Por favor, verifique a disponibilidade do nome de usuário antes de prosseguir.'
                    });
                    return;
                }

                const { data, error } = await window.supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username
                        }
                    }
                });

                if (error) window.utils.showAlert({ title: 'Erro de Cadastro', message: error.message });
                else {
                    // O trigger no banco deve criar o perfil, ou fazemos manualmente aqui se o RLS permitir
                    window.utils.showAlert({
                        title: 'Sucesso',
                        message: 'Cadastro realizado com sucesso! Você já pode fazer login.',
                        onConfirm: () => window.location.reload()
                    });
                }
            };
        }

        if (btnLogout) {
            btnLogout.onclick = async (e) => {
                e.preventDefault();
                await window.supabase.auth.signOut();
                window.location.href = '/ps/login/';
            };
        }

        if (btnUserMenu && userDropdown) {
            btnUserMenu.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            };

            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });
        }
    },

    updateUsernameStatus(message, type) {
        const status = document.getElementById('username-status');
        if (!status) return;
        status.innerText = message;
        status.style.color = type === 'success' ? '#10b981' : (type === 'wait' ? '#8b5cf6' : '#f72549');
    }
};

window.auth = auth;
