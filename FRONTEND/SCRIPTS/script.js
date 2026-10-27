/* =====================================================
  1. MOSTRAR E OCULTAR SENHAS
  Páginas: Login e Cadastro
  ===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  function configurarSenha(idInput, idBotao) {
    const input = document.getElementById(idInput);
    const botao = document.getElementById(idBotao);
    if (!input || !botao) {
      return;
    }


    const olhoFechado = botao.querySelector(".olho-visivel");
    const olhoAberto = botao.querySelector(".olho-escondido");
    botao.addEventListener("click", function () {
      const mostrar = input.type === "password";

      input.type = mostrar ? "text" : "password";

      if (olhoFechado) {
        olhoFechado.style.display = mostrar ? "none" : "block";
      }
      if (olhoAberto) {
        olhoAberto.style.display = mostrar ? "block" : "none";
      }
    });
  }

  configurarSenha("senha", "mostrarSenha");
  configurarSenha("senha1", "mostrarSenha1");
  configurarSenha("senha2", "mostrarSenha2");

});


/* =====================================================
  2. CADASTRAR CONTA
  Página: Cadastro
  ===================================================== */

function cadastrarConta() {

  const nome = document.getElementById("nome_user");
  const email = document.getElementById("email");
  const cpf = document.getElementById("cpf");
  const senha1 = document.getElementById("senha1");
  const senha2 = document.getElementById("senha2");
  if (!nome || !email || !cpf || !senha1 || !senha2) {
    return;
  }

  const nomeValor = nome.value.trim();
  const emailValor = email.value.trim();
  const cpfNumeros = cpf.value.replace(/\D/g, "");
  const senhaValor = senha1.value;
  const senhaConfirmacao = senha2.value;
  if (
    !nomeValor ||
    !emailValor ||
    !cpf.value.trim() ||
    !senhaValor ||
    !senhaConfirmacao
  ) {
    alert("Preencha todos os campos.");
    return;
  }

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailValido.test(emailValor)) {
    alert("Digite um email válido.");
    email.focus();
    return;
  }

  if (cpfNumeros.length !== 11) {
    alert("Digite um CPF com 11 números.");
    cpf.focus();
    return;
  }

  if (senhaValor.length < 6) {
    alert("A senha deve possuir pelo menos 6 caracteres.");
    senha1.focus();
    return;
  }

  if (senhaValor !== senhaConfirmacao) {
    alert("As senhas não são iguais.");
    senha2.focus();
    return;
  }

  let usuarioExistente;

  try {
    usuarioExistente = JSON.parse(
      localStorage.getItem("usuarioLeBrasil")
    );
  } catch (erro) {
    alert("Não foi possível ler os dados salvos.");
    return;
  }

  if (
    usuarioExistente &&
    usuarioExistente.email.toLowerCase() === emailValor.toLowerCase()
  ) {
    alert("Já existe uma conta cadastrada com este email.");
    email.focus();
    return;
  }

  const usuario = {
    nome: nomeValor,
    email: emailValor,
    cpf: cpfNumeros,
    senha: senhaValor
  };

  try {
    localStorage.setItem(
      "usuarioLeBrasil",
      JSON.stringify(usuario)
    );
  } catch (erro) {
    alert("Não foi possível salvar a conta neste navegador.");
    return;
  }

  alert("Conta cadastrada com sucesso! Agora faça login.");

  window.location.href = "/PAGES/Login.html";
}


/* =====================================================
  3. FAZER LOGIN
  Página: Login
  ===================================================== */
function LogarConta() {
  const email = document.getElementById("email");
  const senha = document.getElementById("senha");
  if (!email || !senha) {
    return;
  }

  const emailValor = email.value.trim();
  const senhaValor = senha.value;
  if (!emailValor || !senhaValor) {
    alert("Preencha o email e a senha.");
    return;
  }

  let usuario;

  try {
    usuario = JSON.parse(
      localStorage.getItem("usuarioLeBrasil")
    );
  } catch (erro) {
    alert("Não foi possível ler os dados da conta.");
    return;
  }

  if (!usuario) {
    alert("Nenhuma conta cadastrada. Cadastre-se primeiro.");
    return;
  }

  if (
    emailValor.toLowerCase() === usuario.email.toLowerCase() &&
    senhaValor === usuario.senha
  ) {

    localStorage.setItem("usuarioLogado", "true");
    localStorage.setItem("nomeUsuario", usuario.nome);

    window.location.href = "/PAGES/PaginaPrincipal.html";

  } else {
    alert("Email ou senha incorretos.");
  }
}


/* =====================================================
  4. MÁSCARA DO CPF
  Página: Cadastro
  ===================================================== */
document.addEventListener("DOMContentLoaded", function () {
  const campoCPF = document.getElementById("cpf");
  if (!campoCPF) {
    return;
  }

  campoCPF.addEventListener("input", function () {
    let valor = campoCPF.value.replace(/\D/g, "");
    valor = valor.substring(0, 11);

    if (valor.length > 9) {
      valor = valor.replace(
        /(\d{3})(\d{3})(\d{3})(\d{2})/,
        "$1.$2.$3-$4"
      );
    } else if (valor.length > 6) {
      valor = valor.replace(
        /(\d{3})(\d{3})(\d+)/,
        "$1.$2.$3"
      );
    } else if (valor.length > 3) {
      valor = valor.replace(
        /(\d{3})(\d+)/,
        "$1.$2"
      );
    }

    campoCPF.value = valor;
  });
});


/* =====================================================
  5. TECLA ENTER PARA FAZER LOGIN
  Página: Login
  ===================================================== */
document.addEventListener("DOMContentLoaded", function () {
  const senhaLogin = document.getElementById("senha");
  const senhaCadastro = document.getElementById("senha2");
  if (!senhaLogin || senhaCadastro) {
    return;
  }

  senhaLogin.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      LogarConta();
    }
  });
});

/* =====================================================
  7. PERFIL — CARREGAR E EDITAR NOME E BIOGRAFIA
  Elementos: #avatar, #avatar-icone, #nome, #bio, #editar
  ===================================================== */

document.addEventListener("DOMContentLoaded", function () {

  const avatarEl = document.getElementById("avatar");
  const avatarIcone = document.getElementById("avatar-icone");
  const nomeEl = document.getElementById("nome");
  const bioEl = document.getElementById("bio");
  const btnEditarBio = document.getElementById("editar");

  // Atualiza a inicial do avatar.
  function atualizarInicialAvatar(nome) {

      if (!avatarEl || !nome || !nome.trim()) {
          return;
      }

      const inicial = nome.trim().charAt(0).toUpperCase();
      const spanEl = avatarEl.querySelector("span");

      if (spanEl) {
          spanEl.textContent = inicial;
      } else {
          avatarEl.textContent = inicial;
      }
  }

  // Atualiza o nome exibido.
  function atualizarNome(nome) {

      if (!nomeEl) {
          return;
      }

      const texto = Array.from(nomeEl.childNodes).find(
          node => node.nodeType === Node.TEXT_NODE
      );

      if (texto) {
          texto.nodeValue = nome + " ";
      } else {
          nomeEl.prepend(document.createTextNode(nome + " "));
      }
  }

  // Atualiza a biografia exibida.
  function atualizarBio(bio) {

      if (!bioEl) {
          return;
      }

      const texto = Array.from(bioEl.childNodes).find(
          node => node.nodeType === Node.TEXT_NODE
      );

      if (texto) {
          texto.nodeValue = bio + " ";
      } else {
          bioEl.prepend(document.createTextNode(bio + " "));
      }
  }

  // Carrega os dados salvos.
  function carregarDadosPerfil() {

      const nomeSalvo = localStorage.getItem("perfil_nome");
      const bioSalva = localStorage.getItem("perfil_bio");

      if (nomeSalvo) {
          atualizarNome(nomeSalvo);
          atualizarInicialAvatar(nomeSalvo);
      } else if (nomeEl) {
          atualizarInicialAvatar(nomeEl.textContent.trim());
      }

      if (bioSalva) {
          atualizarBio(bioSalva);
      }
  }

  // Edita o nome ao clicar no avatar.
  if (avatarIcone) {

      avatarIcone.addEventListener("click", function (event) {

          event.stopPropagation();

          const nomeAtual = nomeEl
              ? nomeEl.textContent.trim()
              : "";

          const novoNome = prompt(
              "Digite seu novo nome:",
              nomeAtual
          );

          if (novoNome === null || !novoNome.trim()) {
              return;
          }

          const nomeFormatado = novoNome.trim();

          localStorage.setItem("perfil_nome", nomeFormatado);
          atualizarNome(nomeFormatado);
          atualizarInicialAvatar(nomeFormatado);
      });
  }

  // Edita a biografia.
  if (btnEditarBio) {

      btnEditarBio.addEventListener("click", function (event) {

          event.stopPropagation();

          const bioAtual = bioEl
              ? bioEl.textContent.trim()
              : "";

          const novaBio = prompt(
              "Digite a nova descrição:",
              bioAtual
          );

          if (novaBio === null) {
              return;
          }

          const bioFormatada = novaBio.trim();

          localStorage.setItem("perfil_bio", bioFormatada);
          atualizarBio(bioFormatada);
      });
  }

  carregarDadosPerfil();
});


/* =====================================================
  8. MOSTRAR E OCULTAR INFORMAÇÕES
  Função: mostrarInfo(idDesejado)
  ===================================================== */

function mostrarInfo(idDesejado) {
  const quadro = document.querySelector(".quadro-info");
  const conteudoSelecionado = document.getElementById(idDesejado);
  const botoes = document.querySelectorAll(".botoes-container button");

  if (!quadro || !conteudoSelecionado) {
      return;
  }

  // Localiza o botão correspondente ao conteúdo selecionado
  const botaoSelecionado = document.querySelector(
      `.botoes-container button[onclick*="${idDesejado}"]`
  );

  // Se o conteúdo já estiver aberto, fecha
  if (conteudoSelecionado.classList.contains("ativo")) {
      conteudoSelecionado.classList.remove("ativo");
      quadro.classList.remove("ativo");

      if (botaoSelecionado) {
          botaoSelecionado.classList.remove("ativo");
      }

      return;
  }

  // Fecha os outros conteúdos e remove o destaque dos botões
  document.querySelectorAll(".conteudo").forEach(function (conteudo) {
      conteudo.classList.remove("ativo");
  });

  botoes.forEach(function (botao) {
      botao.classList.remove("ativo");
  });

  // Abre o conteúdo escolhido
  conteudoSelecionado.classList.add("ativo");
  quadro.classList.add("ativo");

  // Destaca o botão selecionado
  if (botaoSelecionado) {
      botaoSelecionado.classList.add("ativo");
  }
}








document.addEventListener("DOMContentLoaded", () => {
    const campoPesquisa = document.querySelector(".search-input");
    const secaoBuscas = document.querySelector(".section-buscas");
    const resultados = document.querySelector("#resultados-pesquisa");
    const mensagemVazia = document.querySelector("#sem-resultados");
    const botoesFiltro = document.querySelectorAll(".filter-pills .pill");

    if (!campoPesquisa || !resultados) {
        console.warn("Elementos da pesquisa não encontrados.");
        return;
    }

    const cards = resultados.querySelectorAll(".book-card");

    // Nenhum filtro começa selecionado
    let filtroAtivo = null;

    function atualizarResultados() {
        const pesquisa = campoPesquisa.value
            .trim()
            .toLocaleLowerCase("pt-BR");

        let encontrados = 0;

        cards.forEach(card => {
            const titulo = card.querySelector(".book-title")
                ?.textContent.trim().toLocaleLowerCase("pt-BR") || "";

            const autor = card.querySelector(".book-author")
                ?.textContent.trim().toLocaleLowerCase("pt-BR") || "";

            const genero = card.querySelector(".genre-tag")
                ?.textContent.trim().toLocaleLowerCase("pt-BR") || "";

            // Pesquisa pelo título, autor ou gênero
            const correspondePesquisa =
                titulo.includes(pesquisa) ||
                autor.includes(pesquisa) ||
                genero.includes(pesquisa);

            // Verifica se o livro pertence ao gênero selecionado
            const correspondeFiltro =
                filtroAtivo === null ||
                filtroAtivo.toLocaleLowerCase("pt-BR") === "todos" ||
                genero === filtroAtivo.toLocaleLowerCase("pt-BR");

            const corresponde =
                correspondePesquisa && correspondeFiltro;

            card.hidden = !corresponde;

            if (corresponde) {
                encontrados++;
            }
        });

        // Mostra resultados se houver pesquisa ou filtro ativo
        const mostrarResultados =
            pesquisa !== "" || filtroAtivo !== null;

        resultados.hidden = !mostrarResultados;

        // Mostra as buscas recentes quando não há pesquisa nem filtro
        if (secaoBuscas) {
            secaoBuscas.hidden = mostrarResultados;
        }

        // Exibe mensagem se nenhum livro for encontrado
        if (mensagemVazia) {
            mensagemVazia.hidden =
                !mostrarResultados || encontrados > 0;
        }
    }

    // Pesquisa enquanto o usuário digita
    campoPesquisa.addEventListener("input", atualizarResultados);

    // Clique nos filtros
    botoesFiltro.forEach(botao => {
        botao.addEventListener("click", () => {
            const filtroSelecionado = botao.textContent.trim();

            // Clicou novamente no mesmo filtro: desativa
            if (botao.classList.contains("active")) {
                filtroAtivo = null;

                botoesFiltro.forEach(outroBotao => {
                    outroBotao.classList.remove("active");
                    outroBotao.setAttribute("aria-pressed", "false");
                });

                atualizarResultados();
                return;
            }

            // Ativa o filtro clicado e desativa os demais
            filtroAtivo = filtroSelecionado;

            botoesFiltro.forEach(outroBotao => {
                const ativo = outroBotao === botao;

                outroBotao.classList.toggle("active", ativo);
                outroBotao.setAttribute(
                    "aria-pressed",
                    String(ativo)
                );
            });

            atualizarResultados();
        });
    });

    // Estado inicial dos botões
    botoesFiltro.forEach(botao => {
        botao.classList.remove("active");
        botao.setAttribute("aria-pressed", "false");
    });

    // Estado inicial da página
    atualizarResultados();
});


function setScore(score, max = 1000) {
    const pct = Math.min(Number(score) / max, 1) * 100;
    document.getElementById('score-ring-fill').style.strokeDashoffset = 100 - pct;
    document.getElementById('score-value').textContent = score;
}


























































let currentStep = 1;
let chosenTheme = "O papel da literatura na formação do cidadão brasileiro";

function navigateToStep(step) {
    currentStep = step;

    const backBtn = document.getElementById("back-btn");

    if (backBtn) {
        backBtn.style.display = step === 2 ? "block" : "none";
    }

    // Exibe somente a etapa selecionada.
    document.querySelectorAll(".view-section").forEach(el => {
        el.classList.remove("active");
    });

    const view = document.getElementById(`view-${step}`);

    if (view) {
        view.classList.add("active");
    }

    // Atualiza a barra de etapas.
    for (let i = 1; i <= 3; i++) {
        const pill = document.getElementById(`pill-step-${i}`);

        if (pill) {
            pill.classList.toggle("active", i === step);
        }
    }

    // Atualiza o título principal existente.
    const titulo = document.querySelector(".titulo-principal");

    if (titulo) {
        if (step === 1) {
            titulo.textContent = "Escrever Redação";
        } else if (step === 2) {
            titulo.textContent = "Redigindo...";
        } else if (step === 3) {
            titulo.textContent = "Resultado da Redação";
        }
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


function goBack() {
    if (currentStep > 1) {
        navigateToStep(currentStep - 1);
    }
}

function selectTheme(themeName, category, level, xp) {
    chosenTheme = themeName;
    document.getElementById('selected-theme-title').innerText = themeName;
    
    const badge = document.getElementById('theme-level-badge');
    badge.innerText = level;
    badge.className = `badge ${level.toLowerCase() === 'médio' ? 'medio' : level.toLowerCase() === 'difícil' ? 'dificil' : 'facil'}`;
    
    document.getElementById('theme-xp-badge').innerText = `${xp} ao completar`;
    document.getElementById('essay-input').placeholder = `Escreva sua redação sobre "${themeName}"...\n\nDica: Comece com uma introdução que apresente o tema e sua tese. Use pelo menos 2 parágrafos de desenvolvimento e finalize com uma conclusão e proposta de intervenção.`;
    
    navigateToStep(2);
}

function updateEditorStats() {
    const text = document.getElementById('essay-input').value;
    const chars = text.length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const minWords = 150;
    
    document.getElementById('word-count-header').innerText = `${words} palavras`;
    document.getElementById('chars-count').innerText = `${chars} chars`;
    document.getElementById('words-count-footer').innerText = `${words} palavras`;

    let percent = Math.min(Math.round((words / minWords) * 100), 100);
    document.getElementById('progress-percent').innerText = `${percent}%`;
    document.getElementById('progress-fill').style.width = `${percent}%`;

    const wordsLeftText = document.getElementById('words-left-text');
    if (words >= minWords) {
        wordsLeftText.innerText = "Meta de palavras atingida! Pronto para enviar.";
        wordsLeftText.style.color = "var(--success)";
    } else {
        const diff = minWords - words;
        wordsLeftText.innerText = `Faltam ${diff} palavras para poder enviar`;
        wordsLeftText.style.color = "var(--text-muted)";
    }
}

function submitEssay() {
    navigateToStep(3);
    setScore(500);   // nota de teste
}