// Abrir e Fechar menu mobile
const siteOverMenu = document.getElementById('siteOverMenu')
const btnMenu = document.getElementById('siteBtnMenu')
const menu = document.getElementById('siteMenu')

btnMenu.addEventListener('click', () => {

    menu.classList.add('openMenu')
    document.body.style.overflow = 'hidden'
})

siteOverMenu.addEventListener('click', () => {

    menu.classList.remove('openMenu')
    document.body.style.overflow = 'auto'
})

// Executar ações ao cerregar página
/*window.onload = function () {
    
    // Obtém a referência à div
    const accountName = document.getElementById('accountName')
    const accountImg = document.getElementById('accountImg')

    // Recupera dados do LocalStorage
    const token = localStorage.getItem('user_token')
    const username = localStorage.getItem('user_username')
    const id = localStorage.getItem('user_id')
    const avatar = localStorage.getItem('user_avatar')

    if (token && id && username && avatar) {
        
        accountName.innerText = username
        accountImg.src = `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`

        // Logout com discord
        const accountButton = document.getElementById('accountButton')
        
        accountButton.addEventListener('click', () => {

            const confirmMessage = 'Tem certeza que deseja deslogar de sua conta ?';
            const userConfirmed = window.confirm(confirmMessage);

            if (userConfirmed) {
                
                localStorage.clear();
                location.reload();
            }
        })
    
    } else {

        // Login com discord
        const accountButton = document.getElementById('accountButton')
        
        accountButton.addEventListener('click', () => {

            localStorage.setItem('auth_return', location.pathname + location.search)
            location.href = 'https://discord.com/oauth2/authorize?client_id=719753452791791669&response_type=code&scope=identify+email'
        })
    }
}*/

function onSignIn(response) {
    
    console.log('ID Token: ' + response.credential);
    // Decodifique o token JWT para obter informações do usuário
    const user = JSON.parse(atob(response.credential.split('.')[1]));
    console.log('ID: ' + user.sub);
    console.log('Name: ' + user.name);
    console.log('Image URL: ' + user.picture);
    console.log('Email: ' + user.email);
}