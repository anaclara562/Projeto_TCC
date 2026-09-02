function mostrarInfo(idDesejado) {

    // Mostra o quadro
    const quadro = document.querySelector('.quadro-info');
    quadro.classList.add('ativo');

    // Esconde todos os conteúdos
    const todosOsConteudos = document.querySelectorAll('.conteudo');

    todosOsConteudos.forEach(conteudo => {
        conteudo.classList.remove('ativo');
    });

    // Mostra o conteúdo selecionado
    const conteudoSelecionado = document.getElementById(idDesejado);
    conteudoSelecionado.classList.add('ativo');
}