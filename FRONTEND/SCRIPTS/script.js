// ==========================================
// CONEXÃO COM O BACKEND
// ==========================================
const API_URL = window.location.origin;


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
  2. CADASTRAR E LOGAR CONTA
  ===================================================== */
document.addEventListener("DOMContentLoaded", () => {

    const btnCadastrar = document.getElementById("btnCadastrar");

    if (btnCadastrar) {
        btnCadastrar.addEventListener("click", cadastrarConta);
    }

    const btnLogin = document.getElementById("btnLogin");

    if (btnLogin) {
        btnLogin.addEventListener("click", LogarConta);
    }

});

async function cadastrarConta() {
  const nome = document.getElementById("nome_user");
  const email = document.getElementById("email");
  const cpf = document.getElementById("cpf");
  const senha1 = document.getElementById("senha1");
  const senha2 = document.getElementById("senha2");

  if (!nome || !email || !cpf || !senha1 || !senha2) return;

  const nomeValor = nome.value.trim();
  const emailValor = email.value.trim();
  const cpfNumeros = cpf.value.replace(/\D/g, "");
  const senhaValor = senha1.value;
  const senhaConfirmacao = senha2.value;

  if (!nomeValor || !emailValor || !cpfNumeros ||
      !senhaValor || !senhaConfirmacao) {
      alert("Preencha todos os campos.");
      return;
  }

  if (cpfNumeros.length !== 11) {
      alert("Digite um CPF com 11 números.");
      return;
  }

  if (senhaValor.length < 8) {
      alert("A senha deve possuir pelo menos 8 caracteres.");
      return;
  }

  if (senhaValor !== senhaConfirmacao) {
      alert("As senhas não são iguais.");
      return;
  }

  try {
    const resposta = await fetch(`${API_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nome: nomeValor,
        email: emailValor,
        cpf: cpfNumeros,
        senha: senhaValor,
        confirmarSenha: senhaConfirmacao
      })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      alert(dados.erro || "Erro ao cadastrar.");
      return;
    }

    alert("Cadastro realizado com sucesso!");

    window.location.href = "/FRONTEND/PAGES/Login.html";

  } catch (erro) {
    console.error("Erro no cadastro:", erro);
    alert("Não foi possível conectar ao servidor.");
  }
}

async function LogarConta() {
    const email = document.getElementById("email");
    const senha = document.getElementById("senha");

    if (!email || !senha) return;

    const emailValor = email.value.trim();
    const senhaValor = senha.value;

    if (!emailValor || !senhaValor) {
        alert("Preencha o email e a senha.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/api/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email: emailValor,
                senha: senhaValor
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            alert(dados.erro || "Email ou senha incorretos.");
            return;
        }

        localStorage.setItem("authToken", dados.token);
        localStorage.setItem("usuarioLogado", "true");
        localStorage.setItem("nomeUsuario", dados.usuario.nome);

        window.location.href = "/FRONTEND/PAGES/paginaPrincipal.html";

    } catch (erro) {
        console.error("Erro no login:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}


/* =====================================================
  4. MÁSCARA DO CPF
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
  1. PESQUISAR OS LIVROS
  Página: Pesquisa
  ===================================================== */
document.addEventListener("DOMContentLoaded", async () => {

    const campoPesquisa = document.querySelector(".search-input");
    const resultados = document.querySelector("#resultados-pesquisa");
    const listaLivros = document.querySelector(".books-list");
    const mensagemVazia = document.querySelector("#sem-resultados");
    const botoesFiltro = document.querySelectorAll(".filter-pills .pill");
    const secaoBuscas = document.querySelector(".section-buscas");

    let livros = [];
    let filtroAtivo = null;

    // Busca os livros cadastrados no banco
    async function carregarLivros() {
        try {
            const token = localStorage.getItem("authToken");

            const resposta = await fetch(
                "http://127.0.0.1:3000/api/books",
                {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const dados = await resposta.json();

            console.log("Resposta da API:", dados);

            if (!resposta.ok) {
                throw new Error(
                    dados.erro || dados.message ||
                    "Não foi possível carregar os livros."
                );
            }

            // Guarda os livros recebidos do banco
            livros = dados.livros || [];

            console.log("Livros recebidos:", livros);

            // Atualiza os resultados da pesquisa
            atualizarResultados();

        } catch (erro) {
            console.error("Erro ao carregar livros:", erro);
        }
    }

    // Cria os cards dos livros
    function criarCard(livro) {
        // Informações específicas de cada livro
        const detalhesLivros = {
            "Dom Casmurro": {
                svg: `<path d="M480-160q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740v498.67q51-32.67 107-49 56-16.34 113-16.34 36 0 75.83 6.67 39.84 6.67 77.5 25.33v-496.66q11.59 4.16 22.8 8.75Q887.33-758 898-752q10.33 5.67 16.17 15.45Q920-726.76 920-716v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59Zm66.67-178v-362l240-240v391.33L546.67-338Zm-133.34 63.67V-699q-33.66-17.33-75.5-25.83-41.83-8.5-77.83-8.5-43.67 0-82.33 9-38.67 9-71 24.02v425.98q35-15.67 73.5-24 38.5-8.34 80.16-8.34 41.67 0 79.84 8.34 38.16 8.33 73.16 24Zm0 0V-699v424.67Z"/>`,
                avaliacao: "4.8",
                paginas: 208,
                xp: "921",
                genero: "Realismo",
                link: "/FRONTEND/PAGES/Livros/Dom_Casmurro.html"
            },

            "Iracema": {
                svg: `<path d="M480.22-606.38q18.65 0 31.75-13.29 13.1-13.3 13.1-31.84 0-18.73-13.03-31.75t-32.07-13.02q-18.39 0-31.6 12.94-13.2 12.93-13.2 32.08 0 18.31 13.2 31.6 13.21 13.28 31.85 13.28Zm-69.75 214.89q-30.99-22.13-45.31-58.25-5.83 0-11.67.5-5.83.5-11.71.5-50.8 0-86.94-36.13-36.14-36.12-36.14-86.89 0-20.95 7.94-41.13 7.95-20.18 23.09-38.32-14.14-18.15-22.09-38.26-7.94-20.12-7.94-40.89 0-51.21 35.73-87.35 35.74-36.13 86.44-36.13 5.81 0 11.64.5 5.82.5 11.65.5 14.32-36.12 45.31-58.25 31-22.14 69.51-22.14 38.51 0 69.65 22.14 31.13 22.13 45.48 58.25 5.8 0 11.54-.5 5.75-.5 11.57-.5 50.79 0 86.44 36.17 35.64 36.16 35.64 86.99 0 20.97-7.44 41.15-7.45 20.17-22.35 38.32 13.9 18.14 21.85 38.28 7.94 20.14 7.94 40.87 0 51.13-35.64 87.23-35.65 36.09-86.44 36.09-5.82 0-11.55-.5t-11.67-.5q-14.24 36.12-45.37 58.25-31.14 22.14-69.65 22.14-38.51 0-69.51-22.14ZM480-67.8q0-75.88 29.74-143.56t80.48-118.42q50.74-50.74 118.42-80.48Q776.32-440 852.2-440q0 75.88-29.74 143.43-29.74 67.56-80.56 118.43-50.83 50.86-118.43 80.6Q555.88-67.8 480-67.8Zm88.8-88.73q72.34-24.17 122-73.89 49.67-49.71 74-122.11-72.33 24.49-121.92 74.41-49.58 49.92-74.08 121.59ZM480-67.8q0-75.88-29.74-143.56T369.7-329.78q-50.82-50.74-118.42-80.48Q183.68-440 107.8-440q0 75.88 29.74 143.43 29.74 67.56 80.6 118.43 50.87 50.86 118.43 80.6Q404.12-67.8 480-67.8Zm-88.8-88.73q-72.34-24.17-122-73.89-49.67-49.71-74-122.11 72.33 24.49 121.92 74.41 49.58 49.92 74.08 121.59Zm177.6 0Zm-177.6 0Zm224.53-363.42q21.76 0 37.43-15.66 15.66-15.66 15.66-37.7 0-16.02-8.5-28.14-8.5-12.11-22.52-19.44l-43.51-21q-2.19 13.16-6.14 24.94-3.95 11.77-9.7 22.38-5.78 10.65-13.81 19.9-8.03 9.26-18.27 17l39.19 28.02q6.29 4.79 13.62 7.25 7.32 2.45 16.55 2.45Zm-21.47-140.74 43.54-21q14.02-7.17 22.14-19.94 8.12-12.77 8.12-27.61 0-21.85-15.13-37.54-15.12-15.69-37.39-15.69-8.86 0-15.97 2.38-7.1 2.38-14.29 6.98l-40.58 28.2q10.24 7.66 18.74 16.73 8.5 9.07 14.25 19.51 6.57 10.41 10.49 22.32 3.92 11.92 6.08 25.66Zm-160.97-94.7q12.8-5.33 24.59-8.04 11.79-2.71 22.12-2.71 10.33 0 22.16 2.71t24.65 8.04l6.41-56.32q2.16-20.32-14.88-34.44-17.04-14.12-37.97-14.12-20.94 0-38.23 14.28-17.29 14.28-15.13 34.16l6.28 56.44Zm47.06 313.24q20.89 0 37.96-14.12t14.91-34.6l-6.41-56.32q-12.82 5.33-24.65 8.12-11.83 2.79-22.16 2.79t-22.12-2.79q-11.79-2.79-24.59-8.12l-6.28 56.44q-2.16 19.88 15.14 34.24 17.3 14.36 38.2 14.36ZM365.98-660.69q2-13.74 6.04-25.66 4.04-11.91 9.89-22.23 5.7-10.47 13.74-19.57 8.05-9.1 17.98-16.76l-39-28.02q-6.32-4.87-13.7-7.21-7.38-2.33-16.72-2.33-21.74 0-37.38 15.63-15.65 15.64-15.65 37.7 0 14.97 8.5 27.51 8.5 12.53 22.82 19.94l43.48 21Zm-21.52 139.5q8.86 0 15.88-2.17 7.02-2.16 14.54-7.16l40.42-27.07q-10.24-7.88-18.62-16.83t-14.01-19.42q-5.95-10.48-10.27-22.73-4.32-12.25-6.42-25.32l-43.48 21q-14.32 7.41-22.32 20.12-8 12.7-8 27.46 1 21.97 15.47 37.05 14.48 15.07 36.81 15.07Zm233.89-73.46Zm-.66-114.02ZM480-766.14Zm0 229.86Zm-98.12-172.39Zm.67 114.92Z"/>`,
                avaliacao: "4.8",
                paginas: 128,
                xp: "561",
                genero: "Indianismo",
                link: "/FRONTEND/PAGES/Livros/Iracema.html"
            },

            "O Cortiço": {
                svg: `<path d="M200.67-160v-383.33L80-451.33 40-504l440-336 172 131.33V-800h106.67v172.67L920-504l-40.67 52.67L758.67-544v384h-232v-240h-93.34v240H200.67Zm66.66-66.67h99.34v-240h226.66v240H692v-367.66l-212-162-212.67 162v367.66Zm129.34-339.66h166.66q0-32.67-25-53.84-25-21.16-58.33-21.16t-58.33 21.06q-25 21.06-25 53.94Zm-30 339.66v-240h226.66v240-240H366.67v240Z"/>`,
                avaliacao: "4.7",
                paginas: 280,
                xp: "875",
                genero: "Naturalismo",
                link: "/FRONTEND/PAGES/Livros/O_Cortico.html"
            },

            "O Guarani": {
                svg:`<path d="M544.67-80H416v-152.67H120l179.33-262.66h-90L480-880l270.67 384.67h-89.34L840-232.67H544.67V-80ZM247.33-299.33h179.34-85.34 277.34H534h179.33-466Zm0 0h466L534-562h84.67L480-759.33 341.33-562h85.34L247.33-299.33Z"/>`,
                avaliacao: "4.7",
                paginas: 350,
                xp: "946",
                genero: "Indianismo",
                link: "/FRONTEND/PAGES/Livros/O_Guarani.html"
            },

            "Vidas Secas": {
                svg: `<path d="M446.67-766.67V-920h66.66v153.33h-66.66ZM706-659.33l-46.33-46.34 108-109.66 46.66 47.66L706-659.33Zm60.67 212.66v-66.66H920v66.66H766.67ZM446.67-40v-153.33h66.66V-40h-66.66ZM253.33-660.67l-108-107 47-46.66L300.67-706l-47.34 45.33ZM768-145.33l-108.33-109L705-299.67l110 106-47 48.34ZM40-446.67v-66.66h153.33v66.66H40Zm153 301.34-47.33-47L253-299.67l24.33 22.34L301.67-254 193-145.33ZM310-310q-70-70-70-170t70-170q70-70 170-70t170 70q70 70 70 170t-70 170q-70 70-170 70t-170-70Zm292.67-47.33Q653.33-408 653.33-480t-50.66-122.67Q552-653.33 480-653.33t-122.67 50.66Q306.67-552 306.67-480t50.66 122.67Q408-306.67 480-306.67t122.67-50.66ZM480-480Z"/>`,
                avaliacao: "4.9",
                paginas: 160,
                xp: "577",
                genero: "Regionalismo",
                link: "/FRONTEND/PAGES/Livros/Vidas_Secas.html"
            },
            
            "O Primo Basílio": {
                svg: `<path d="M481-83.67Q346.33-219.33 266.83-302.33T145.83-440q-41.5-54.67-53.66-93.55Q80-572.43 80-620.28 80-712 144-776t156-64q45 0 87 16.5t75 47.5l-62 216h120.67l-42 367 122.66-407H480l71-212q25-14 52.5-21t56.5-7q92 0 156 64t64 156q0 46.75-12 85.71-12 38.96-53.33 94.12-41.34 55.17-120.34 138-79 82.84-213.33 218.5Zm-63.67-158 28.34-251.66H311.33l73.67-257q-20-10-41.17-16.5-21.16-6.5-43.83-6.5-63.52 0-108.43 44.9-44.9 44.91-44.9 108.43 0 32.11 12.16 64.22 12.17 32.11 42.67 74.61t83 99.67q52.5 57.17 132.83 139.83Zm153.34-28Q701-398 757.17-478.67q56.16-80.66 56.16-141.58 0-63.08-44.9-108.08-44.91-45-108.43-45-13.89 0-27.78 2.5t-26.89 7.16l-32 97H690l-119.33 397Zm119.33-397ZM311.33-493.33Z"/>`,
                avaliacao: "4.6",
                paginas: 450,
                xp: "1.000",
                genero: "Realismo",
                link: "/FRONTEND/PAGES/Livros/O_Primo_Basílio.html"
            }
        };

        // Busca os detalhes do livro atual
        const detalhes = detalhesLivros[livro.titulo] || {};

        const card = document.createElement("article");
        card.className = "book-card";

        card.innerHTML = `
            <div class="book-left">

                <div class="book-icon">
                    <svg xmlns="http://www.w3.org/2000/svg"
                        height="40px"
                        viewBox="0 -960 960 960"
                        width="40px"
                        fill="#FFFFFF">

                        ${detalhes.svg || '<text x="50%" y="50%" text-anchor="middle" fill="#FFFFFF" font-size="300">📖</text>'}

                    </svg>
                </div>

                <div class="book-info">

                    <h3 class="book-title"></h3>

                    <p class="book-author"></p>

                    <div class="book-meta">

                        <div class="avaliacao">
                            <span>★</span>
                            ${detalhes.avaliacao ?? "0.0"}
                        </div>

                        <span class="meta-pages">

                            <svg xmlns="http://www.w3.org/2000/svg"
                                height="20px"
                                viewBox="0 -960 960 960"
                                width="20px"
                                fill="#000000">

                                <path d="M264-279.15q47.35 0 92.17 12 44.83 12 87.83 30v-454q-42-22-87-33t-93.22-11q-36.94 0-73.36 6.5T120-707.15v452q35-13 70.81-18.5 35.82-5.5 73.19-5.5Zm252 42q43-20 87.83-31 44.82-11 92.17-11 37 0 73.5 4.5t70.5 19.5v-452q-35-13-71.19-20.5t-72.89-7.5q-47.92 0-92.92 11t-87 33v454ZM480.72-126.3q-49.24-31.76-103.24-52.72-54-20.96-113.48-20.96-37.18 0-74.4 7.62-37.21 7.62-71.73 22.14-27.35 11.68-52.32-3.69-24.96-15.36-24.96-44.81v-502.76q0-17.35 8.81-32.02 8.82-14.68 24.45-22.02 45.48-19.76 92.75-29.4 47.28-9.65 96.66-9.65 57.45 0 112.18 13.5 54.73 13.5 104.56 41.22 51-26.48 105.31-40.6 54.3-14.12 111.43-14.12 49.38 0 96.66 9.65 47.27 9.64 92.75 29.4 15.63 7.34 24.95 22.02 9.31 14.67 9.31 32.02v506.35q0 27.63-18.84 43.23-18.85 15.6-39.44 5.68-39.52-17.52-81.21-25.64-41.69-8.12-84.92-8.12-59 0-112.64 21.08-53.64 21.07-102.64 52.6ZM283-486.15Z"/>

                            </svg>

                            <p>${detalhes.paginas ?? 0} pág.</p>

                        </span>

                        <span class="meta-xp">
                            + ${detalhes.xp ?? "0"} XP
                        </span>

                    </div>
                </div>
            </div>

            <div class="book-right">

                <span class="genre-tag"></span>

                <a class="btn-ler">
                    Ler livro
                </a>

            </div>
        `;

        // Preenche os dados vindos do banco
        card.querySelector(".book-title").textContent = livro.titulo;
        card.querySelector(".book-author").textContent = livro.autor;

        // Preenche o gênero
        card.querySelector(".genre-tag").textContent =
            detalhes.genero || livro.genero || "Sem gênero";

        // Define o endereço da página do livro
        card.querySelector(".btn-ler").href = detalhes.link || "#";

        return card;
    }

    
    function atualizarResultados() {

        // Verifica se os elementos existem
        const pesquisa = (campoPesquisa?.value || "")
            .trim()
            .toLocaleLowerCase("pt-BR");

        if (!listaLivros || !resultados || !mensagemVazia) {
            console.error("Elementos da biblioteca não encontrados.");
            return;
        }

        const encontrados = livros.filter(livro => {

            const titulo = (livro.titulo || "").toLocaleLowerCase("pt-BR");
            const autor = (livro.autor || "").toLocaleLowerCase("pt-BR");
            const genero = (livro.genero || "").toLocaleLowerCase("pt-BR");

            const correspondePesquisa =
                titulo.includes(pesquisa) ||
                autor.includes(pesquisa) ||
                genero.includes(pesquisa);

            const correspondeFiltro =
                filtroAtivo === null ||
                filtroAtivo === "Todos" ||
                genero === filtroAtivo.toLocaleLowerCase("pt-BR");

            return correspondePesquisa && correspondeFiltro;
        });

        // Remove os cards anteriores
        listaLivros.querySelectorAll(".book-card").forEach(card => {
            card.remove();
        });

        // Cria os novos cards
        encontrados.forEach(livro => {
            listaLivros.appendChild(criarCard(livro));
        });

        const mostrarResultados =
            pesquisa !== "" || filtroAtivo !== null;

        resultados.hidden = !mostrarResultados;

        if (secaoBuscas) {
            secaoBuscas.hidden = mostrarResultados;
        }

        mensagemVazia.hidden =
            !mostrarResultados || encontrados.length > 0;

        if (typeof carregarProgressoLivros === "function") {
            carregarProgressoLivros();
        }
    }


    const buscasRecentes = document.querySelectorAll(".recent-tag");
    buscasRecentes.forEach(botao => {
        botao.addEventListener("click", () => {

            campoPesquisa.value = botao.textContent.trim();

            // Atualiza os livros encontrados
            atualizarResultados();

            campoPesquisa.focus();
        });
    });

    // Pesquisa enquanto digita
    if (campoPesquisa) {
        campoPesquisa.addEventListener("input", atualizarResultados);
    }

    // Filtros de gênero
    botoesFiltro.forEach(botao => {

        botao.addEventListener("click", () => {

            const selecionado = botao.textContent.trim();

            if (filtroAtivo === selecionado) {
                filtroAtivo = null;
            } else {
                filtroAtivo = selecionado;
            }

            botoesFiltro.forEach(outroBotao => {

                const ativo =
                    filtroAtivo !== null &&
                    outroBotao.textContent.trim() === filtroAtivo;

                outroBotao.classList.toggle("active", ativo);

                outroBotao.setAttribute(
                    "aria-pressed",
                    String(ativo)
                );
            });

            atualizarResultados();
        });
    });

    // Carrega os livros ao abrir a página
    await carregarLivros();

});





















/* =====================================================
    1. CARREGAR E EDITAR NOME E BIOGRAFIA
    Página: Perfil
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    carregarDadosPerfil();

    const avatarIcone = document.getElementById("avatar-icone");
    const editarBio = document.getElementById("editar");

    if (avatarIcone) {
        avatarIcone.addEventListener("click", editarNomePerfil);
    }

    if (editarBio) {
        editarBio.addEventListener("click", editarBiografia);
    }
});

/* ==========================================
    2. ATUALIZAR NOME E INICIAL DO AVATAR
========================================== */

function atualizarNome(nome) {
    const nomeEl = document.getElementById("nome");
    const inicialEl = document.getElementById("avatar-inicial");

    if (!nomeEl || !nome) return;

    const texto = nomeEl.childNodes[0];

    if (texto && texto.nodeType === Node.TEXT_NODE) {
        texto.textContent = nome + " ";
    } else {
        nomeEl.insertBefore(
            document.createTextNode(nome + " "),
            nomeEl.firstChild
        );
    }

    if (inicialEl) {
        inicialEl.textContent = nome.charAt(0).toUpperCase();
    }
}

/* ==========================================
    3. ATUALIZAR BIOGRAFIA
========================================== */
function atualizarBio(bio) {
    const bioEl = document.getElementById("bio");

    if (!bioEl) return;

    const texto = Array.from(bioEl.childNodes).find(
        node => node.nodeType === Node.TEXT_NODE
    );

    if (texto) {
        texto.textContent = bio + " ";
    }
}

/* ==========================================
    4. CARREGAR DADOS DO USUÁRIO
========================================== */
async function carregarDadosPerfil() {
    const token = localStorage.getItem("authToken");

    if (!token) {
        console.error("Usuário não autenticado.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/api/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao carregar perfil.");
        }

        // O nome vem diretamente do banco de dados
        const usuario = dados.usuario;
        if (usuario && usuario.nome) {
            atualizarNome(usuario.nome);
            localStorage.setItem("perfil_nome", usuario.nome);
        }

        // A biografia continua sendo carregada do localStorage
        const bioSalva = localStorage.getItem("perfil_bio");

        if (bioSalva !== null) {
            atualizarBio(bioSalva);
        }

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
    }
}

/* ==========================================
    5. EDITAR NOME
========================================== */
async function editarNomePerfil() {
    const nomeAtual = document.getElementById("nome")
        ?.childNodes[0]?.textContent.trim() || "";

    const novoNome = prompt("Digite seu novo nome:", nomeAtual);

    if (novoNome === null || !novoNome.trim()) return;

    const nome = novoNome.trim();

    try {
        const token = localStorage.getItem("authToken");

        const resposta = await fetch(`${API_URL}/api/me`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ nome })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível atualizar o nome.");
        }

        const nomeAtualizado = dados.usuario.nome;
        atualizarNome(nomeAtualizado);
        localStorage.setItem("perfil_nome", nomeAtualizado);

    } catch (erro) {
        console.error("Erro ao atualizar nome:", erro);
        alert(erro.message);
    }
}

/* ==========================================
    6. EDITAR BIOGRAFIA
========================================== */
function editarBiografia() {
    const bioAtual = localStorage.getItem("perfil_bio") || "";

    const novaBio = prompt("Digite sua biografia:", bioAtual);

    if (novaBio === null) return;

    localStorage.setItem("perfil_bio", novaBio);
    atualizarBio(novaBio);
}

// ==========================================
// 9. MÉTRICA DE LIVROS LIDOS
// Página: Perfil
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    carregarLivrosLidos();
});

async function carregarLivrosLidos() {
    const elemento = document.getElementById("livros-lidos");

    // Só executa na página que possui essa métrica
    if (!elemento) return;

    const token = localStorage.getItem("authToken");

    if (!token) {
        console.error("Usuário não autenticado.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/api/livros-lidos`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            cache: "no-store"
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao carregar livros lidos.");
        }

        elemento.textContent = Number(dados.livrosLidos) || 0;

        console.log("Livros concluídos:", dados.livrosLidos);

    } catch (erro) {
        console.error("Erro na métrica de livros lidos:", erro);
    }
}


/* ==========================================
   7. SEQUÊNCIA DE DIAS DE LOGIN
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    registrarLoginDiario();
});

async function registrarLoginDiario() {
    const token = localStorage.getItem("authToken");

    if (!token) {
        console.error("Usuário não autenticado.");
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}/api/login-diario`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Não foi possível carregar a sequência."
            );
        }

        // Atualiza a métrica do perfil, se existir.
        const elementoSequencia =
            document.getElementById("dias-sequencia");

        if (elementoSequencia) {
            elementoSequencia.textContent = dados.sequenciaAtual;
        }

        // Atualiza o texto com o ícone de fogo.
        const textoSequencia =
            document.getElementById("textSequencia");

        if (textoSequencia) {
            const paragrafo = textoSequencia.querySelector("p");

            if (paragrafo) {
                const dias = Number(dados.sequenciaAtual) || 0;

                paragrafo.textContent =
                    `${dias} ${dias === 1 ? "dia" : "dias"} de sequência`;
            }
        }

        console.log("Sequência atual:", dados.sequenciaAtual);
        console.log("Maior sequência:", dados.maiorSequencia);

        // Só busca os desafios depois de registrar o login.
        await iniciarDesafios();

    } catch (erro) {
        console.error("Erro ao registrar login diário:", erro);
    }
}


(() => {
    document.addEventListener("DOMContentLoaded", carregarXP);

    async function carregarXP() {
        const token = localStorage.getItem("authToken");

        if (!token) return;

        try {
            const resposta = await fetch(
                `${window.location.origin}/api/xp`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(dados.erro || "Erro ao carregar XP.");
            }

            const xpTotal = Number(dados.xp) || 0;

            document.querySelectorAll("#xp-total").forEach(elemento => {
                elemento.textContent = `${xpTotal} XP`;
            });

            atualizarProgressoNivel(xpTotal);

        } catch (erro) {
            console.error("Erro ao carregar XP:", erro);
        }
        window.iniciarDesafios = iniciarDesafios;
    }

    function atualizarProgressoNivel(xpTotal) {
        const xpPorNivel = 500;
        const nivelAtual = Math.floor(xpTotal / xpPorNivel) + 1;
        const xpNoNivel = xpTotal % xpPorNivel;
        const faltamXP = xpPorNivel - xpNoNivel;

        const nivel = document.getElementById("numNivelAtual");
        const proximo = document.getElementById("numProximoNivel");
        const texto = document.getElementById("textXP");
        const barra = document.getElementById("barraXP");
        const faltam = document.querySelector("#textFaltamXP p");

        if (nivel) nivel.textContent = nivelAtual;
        if (proximo) proximo.textContent = nivelAtual + 1;

        if (texto) {
            texto.textContent = `${xpNoNivel} / ${xpPorNivel} XP`;
        }

        if (barra) {
            barra.style.width = `${(xpNoNivel / xpPorNivel) * 100}%`;
        }

        if (faltam) {
            faltam.textContent =
                `Faltam ${faltamXP} XP para o próximo nível`;
        }
    }

    // Permite atualizar o XP depois de uma atividade.
    window.atualizarXP = carregarXP;
})();

// ==========================================
// DESAFIOS DIÁRIOS - LÊBRASIL
// ==========================================
async function iniciarDesafios() {
    try {
        const token = localStorage.getItem("authToken");

        if (!token) {
            console.error("Token não encontrado.");
            return;
        }

        const resposta = await fetch(`${API_URL}/api/desafios`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao carregar desafios.");
        }

        const desafios = dados.desafios;
        console.log("DESAFIOS RECEBIDOS:", {
            leitura: desafios.leitura,
            explorador: desafios.explorador
        });

        if (!desafios) {
            throw new Error("A API não retornou os desafios.");
        }

        atualizarStatusDesafio(
            desafios.leitura.progresso,
            10,
            "numLeitura",
            "statusLeitura",
            "barraLeitura"
        );

        atualizarStatusDesafio(
            dados.desafios.sequencia.progresso,
            7,
            "numSequencia",
            "statusSequencia",
            "barraSequencia"
        );

        atualizarStatusDesafio(
            desafios.explorador.progresso,
            1,
            "numExplorador",
            "statusExplorador",
            "barraExplorador"
        );

        atualizarStatusDesafio(
            desafios.bonus.progresso,
            3,
            "statusBonus",
            "statusBonusConcluido",
            "barraBonus"
        );

    } catch (erro) {
        console.error("Erro nos desafios:", erro);
    }

    if (typeof window.atualizarXP === "function") {
        window.atualizarXP();
    }
}



// ==========================================
// ATUALIZAR ELEMENTOS DOS DESAFIOS
// ==========================================

function atualizarStatusDesafio(atual, meta, idNumero, idStatus, idBarra) {
    const numero = document.getElementById(idNumero);
    const status = document.getElementById(idStatus);
    const barra = document.getElementById(idBarra);

    if (!numero || !status || !barra) {
        console.error("Elemento do desafio não encontrado:", idNumero);
        return;
    }

    atual = Math.min(meta, Math.max(0, Number(atual) || 0));

    const porcentagem = (atual / meta) * 100;
    const concluido = atual >= meta;

    numero.textContent = `${atual}/${meta}`;
    numero.hidden = concluido;

    status.hidden = !concluido;
    barra.style.width = `${porcentagem}%`;
}











/* =====================================================
  8. MACETES DE REDAÇÃO
  Função: mostrarInfo(idDesejado)
  ===================================================== */
document.addEventListener("click", function(event) {

    const botao = event.target.closest(
        ".macetes-frame .botoes-container button[data-info]"
    );

    // Se não clicou em um botão dos macetes, encerra
    if (!botao) return;

    const frame = botao.closest(".macetes-frame");

    if (!frame) return;

    const quadro = frame.querySelector(".quadro-info");

    const idDesejado = botao.dataset.info;

    const conteudos = frame.querySelectorAll(".conteudo");

    const botoes = frame.querySelectorAll(
        ".botoes-container button"
    );

    const conteudoSelecionado = Array.from(conteudos).find(
        conteudo => conteudo.id === idDesejado
    );

    if (!quadro || !conteudoSelecionado) {
        console.error("Não foi possível encontrar o conteúdo:", idDesejado);
        return;
    }

    // Verifica se o botão já está ativo
    const jaEstaAberto = botao.classList.contains("ativo");

    // Fecha todos os conteúdos
    conteudos.forEach(conteudo => {
        conteudo.classList.remove("ativo");
    });

    // Remove o destaque dos botões
    botoes.forEach(botaoAtual => {
        botaoAtual.classList.remove("ativo");
    });

    // Se clicou no mesmo botão, fecha o quadro
    if (jaEstaAberto) {
        quadro.classList.remove("ativo");
        return;
    }

    // Abre o conteúdo selecionado
    conteudoSelecionado.classList.add("ativo");
    botao.classList.add("ativo");
    quadro.classList.add("ativo");

});



// =====================================================
// SELEÇÃO DOS TEMAS DE REDAÇÃO
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

    // Só roda na página de redação
    if (!document.getElementById("view-1")) return;

    const MIN_PALAVRAS = 150;
    const LEVEL_CLASS = { "Fácil": "facil", "Médio": "medio", "Difícil": "dificil" };

    const $ = (id) => document.getElementById(id);
    const tituloPrincipal = document.querySelector(".titulo-principal");
    const tituloOriginal = tituloPrincipal ? tituloPrincipal.textContent : "";

    let chosenTheme = "";
    let chosenXp = 0;
    let stepAtual = 1;

    function navigateToStep(n) {
        stepAtual = n;

        document.querySelectorAll(".view-section").forEach(v => {
            const ativa = v.id === `view-${n}`;
            v.classList.toggle("active", ativa);
            v.style.display = ""; // remove qualquer display forçado e devolve o controle ao CSS
        })

        document.querySelectorAll(".step-pill").forEach((p, i) =>
            p.classList.toggle("active", i === n - 1));

        const titulos = { 1: tituloOriginal, 2: "Redigindo...", 3: "Resultado" };
        if (tituloPrincipal) tituloPrincipal.textContent = titulos[n];

        $("back-btn").style.display = n === 1 ? "none" : "block";
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function goBack() {
        if (stepAtual === 2) navigateToStep(1);
        else if (stepAtual === 3) navigateToStep(2);
    }

    function selectTheme(themeName, category, level, xp) {
        chosenTheme = themeName;
        chosenXp = parseInt(String(xp).replace(/\D/g, ""), 10) || 0;

        $("selected-theme-title").textContent = themeName;

        const badge = $("theme-level-badge");
        badge.textContent = level;
        badge.classList.remove("facil", "medio", "dificil");
        badge.classList.add(LEVEL_CLASS[level] || "dificil");

        $("theme-xp-badge").textContent = `+${chosenXp} XP ao completar`;

        updateEditorStats();
        navigateToStep(2);
    }

    window.updateEditorStats = function updateEditorStats() {
        const editor = document.getElementById('essay-input');
        if (!editor) return;
        const text = editor.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        const chars = editor.value.length;
        const progress = Math.min(100, Math.round((words / 150) * 100));
        const charsElement = document.getElementById('chars-count');
        const wordsElement = document.getElementById('words-count-footer');
        const percentElement = document.getElementById('progress-percent');
        const fillElement = document.getElementById('progress-fill');
        const leftElement = document.getElementById('words-left-text');
        if (charsElement) charsElement.textContent = `${chars} chars`;
        if (wordsElement) wordsElement.textContent = `${words} palavras`;
        if (percentElement) percentElement.textContent = `${progress}%`;
        if (fillElement) fillElement.style.width = `${progress}%`;
        if (leftElement) leftElement.textContent = words >= 150
        ? 'Mínimo de 150 palavras atingido'
        : `Faltam ${150 - words} palavras para poder enviar`;
    };

    const essayInput = document.getElementById("essay-input");

    if (essayInput) {
        essayInput.addEventListener("input", updateEditorStats);
    }

    async function corrigirRedacao(tema, texto) {
        await new Promise(r => setTimeout(r, 1200));
        const criterios = [18, 17, 16, 18, 15];
        return {
            nota: criterios.reduce((a, b) => a + b, 0) * 10,
            criterios,
            comentario: "Redação bem estruturada! Continue desenvolvendo seu repertório cultural."
        };
    }

    function mostrarResultado({ nota, criterios, comentario }) {
        $("score-value").textContent = nota;

        const anel = $("score-ring-fill");
        if (anel) {
            anel.style.strokeDasharray = "100 100";
            anel.style.strokeDashoffset = 100 - nota / 10;
        }

        const status = document.querySelector(".score-badge-status p");
        if (status) {
            status.textContent =
                nota >= 800 ? "Excelente" : nota >= 600 ? "Muito bom" : nota >= 400 ? "Bom" : "Pode melhorar";
        }

        const pill = document.querySelector(".xp-reward-pill");
        if (pill) pill.textContent = `★ +${Math.round(chosenXp * (nota / 1000))} XP ganhos`;

        const corpo = document.querySelector(".comment-body");
        if (corpo) corpo.textContent = comentario;

        document.querySelectorAll(".criterion-card").forEach((card, i) => {
            if (criterios[i] === undefined) return;
            card.querySelectorAll(".criterion-row span")[1].textContent = `${criterios[i]}/20`;
            card.querySelector(".criterion-fill").style.width = `${(criterios[i] / 20) * 100}%`;
        });
    }

    async function submitEssay() {
        const texto = $("essay-input").value.trim();
        const palavras = texto ? texto.split(/\s+/).length : 0;

        if (!chosenTheme) {
            alert("Escolha um tema primeiro.");
            navigateToStep(1);
            return;
        }

        if (palavras < MIN_PALAVRAS) {
            alert(`Sua redação precisa de pelo menos ${MIN_PALAVRAS} palavras.`);
            return;
        }

        const btn = document.querySelector("#view-2 .submit-btn");
        const textoOriginal = btn.textContent;

        btn.disabled = true;
        btn.textContent = "Corrigindo...";

        try {
            // 1. Recebe a correção
            const resultado = await corrigirRedacao(chosenTheme, texto);

            // 2. Calcula o XP
            const xp = Math.round(chosenXp * (resultado.nota / 1000));

            // 3. Mostra o resultado
            mostrarResultado(resultado);

            // 4. Salva no banco de dados
            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error("Usuário não autenticado.");
            }

            const resposta = await fetch("/api/redacoes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    tema: chosenTheme,
                    categoria: chosenCategory,
                    nivel: chosenLevel,
                    texto: texto,
                    nota_final: resultado.nota,
                    status_nota: resultado.nota >= 800
                        ? "Excelente"
                        : resultado.nota >= 600
                        ? "Muito bom"
                        : resultado.nota >= 400
                        ? "Bom"
                        : "Pode melhorar",
                    comentario_geral: resultado.comentario,
                    xp_ganhos: xp
                })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(dados.mensagem || "Erro ao salvar redação.");
            }

            console.log("Redação salva!", dados);

            navigateToStep(3);

        } catch (erro) {
            console.error("Erro ao enviar redação:", erro);
            alert(erro.message || "Não foi possível enviar a redação.");

        } finally {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    }

    const submitBtn = document.querySelector("#view-2 .submit-btn");

    if (submitBtn) {
        submitBtn.addEventListener("click", submitEssay);
    }

    // CLIQUES NOS TEMAS
    document.querySelectorAll(".theme-card").forEach(card => {
        card.addEventListener("click", () => {
            const tema = card.querySelector("h3")?.textContent.trim();
            const categoria = card.querySelector(".card-header p")?.textContent.trim();
            const nivel = card.querySelector(".badge")?.textContent.trim();
            const xp = card.querySelector(".xp-text")?.textContent.trim();

            if (!tema || !nivel) {
                console.error("Não foi possível identificar os dados do tema.");
                return;
            }

            selectTheme(tema, categoria, nivel, xp || "0 XP");
        });
    });

    const backBtn = $("back-btn");
    if (backBtn) {
        backBtn.removeAttribute("onclick");
        backBtn.addEventListener("click", goBack);
    }

    // Os onclick inline do HTML precisam enxergar estas funções
    window.selectTheme = selectTheme;
    window.goBack = goBack;
    window.updateEditorStats = updateEditorStats;
    window.submitEssay = submitEssay;
    window.navigateToStep = navigateToStep;
});




















































document.getElementById("btn-sair")?.addEventListener("click", sairSite);

function sairSite() {
    localStorage.removeItem("authToken");
    window.location.href = "/FRONTEND/PAGES/login.html";
}