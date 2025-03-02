let btnMenu = document.getElementById('siteBtnMenu')
let menu = document.getElementById('siteMenu')

btnMenu.addEventListener('click', () => {

    menu.classList.add('openMenu')
})

menu.addEventListener('click', () => {

    menu.classList.remove('openMenu')
})