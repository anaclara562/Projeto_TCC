function mostrarInfo(idDesejado) {

    const quadro = document.querySelector('.quadro-info');
    const conteudoSelecionado = document.getElementById(idDesejado);

    // Se o conteúdo já estiver aparecendo, esconde
    if (conteudoSelecionado.classList.contains('ativo')) {
        conteudoSelecionado.classList.remove('ativo');
        quadro.classList.remove('ativo');
        return;
    }

    // Mostra o quadro
    quadro.classList.add('ativo');

    // Esconde todos os conteúdos
    document.querySelectorAll('.conteudo').forEach(conteudo => {
        conteudo.classList.remove('ativo');
    });

    // Mostra o conteúdo clicado
    conteudoSelecionado.classList.add('ativo');
}