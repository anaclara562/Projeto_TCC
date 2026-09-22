function mostrarInfo(idDesejado) {

    const quadro = document.querySelector('.quadro-info');
    const conteudoSelecionado = document.getElementById(idDesejado);

    if (conteudoSelecionado.classList.contains('ativo')) {
        conteudoSelecionado.classList.remove('ativo');
        quadro.classList.remove('ativo');
        return;
    }

    quadro.classList.add('ativo');

    document.querySelectorAll('.conteudo').forEach(conteudo => {
        conteudo.classList.remove('ativo');
    });

    conteudoSelecionado.classList.add('ativo');
}













document.addEventListener("DOMContentLoaded", () => {
  const avatarEl = document.getElementById("avatar");
  const avatarIcone = document.getElementById("avatar-icone");
  const nomeEl = document.getElementById("nome");
  const bioEl = document.getElementById("bio");
  const btnEditarBio = document.getElementById("editar");

  const atualizarInicialAvatar = (nome) => {
    if (nome && nome.trim() !== "") {
      const inicial = nome.trim().charAt(0).toUpperCase();

      const spanEl = avatarEl ? avatarEl.querySelector("span") : null;
      if (spanEl) {
        spanEl.textContent = inicial;
      } else if (avatarEl && avatarEl.childNodes.length > 0) {
        avatarEl.childNodes[0].nodeValue = inicial;
      }
    }
  };

  const carregarDados = () => {
    const nomeSalvo = localStorage.getItem("perfil_nome");
    const bioSalva = localStorage.getItem("perfil_bio");

    if (nomeSalvo) {
      nomeEl.childNodes[0].nodeValue = nomeSalvo + " ";
      atualizarInicialAvatar(nomeSalvo);
    } else if (nomeEl) {
      const nomePadrao = nomeEl.childNodes[0].nodeValue.trim();
      atualizarInicialAvatar(nomePadrao);
    }

    if (bioSalva) {
      bioEl.childNodes[0].nodeValue = bioSalva + " ";
    }
  };

  if (avatarIcone) {
    avatarIcone.addEventListener("click", (e) => {
      e.stopPropagation();

      const nomeAtual = nomeEl.childNodes[0].nodeValue.trim();
      const novoNome = prompt("Digite seu novo nome:", nomeAtual);

      if (novoNome !== null && novoNome.trim() !== "") {
        const nomeFormatado = novoNome.trim();

        nomeEl.childNodes[0].nodeValue = nomeFormatado + " ";
        localStorage.setItem("perfil_nome", nomeFormatado);

        atualizarInicialAvatar(nomeFormatado);
      }
    });
  }

  if (btnEditarBio) {
    btnEditarBio.addEventListener("click", (e) => {
      e.stopPropagation();

      const bioAtual = bioEl.childNodes[0].nodeValue.trim();
      const novaBio = prompt("Digite a nova descrição:", bioAtual);

      if (novaBio !== null && novaBio.trim() !== "") {
        const bioFormatada = novaBio.trim();

        bioEl.childNodes[0].nodeValue = bioFormatada + " ";
        localStorage.setItem("perfil_bio", bioFormatada);
      }
    });
  }

  carregarDados();
});