/* BARRA DE PROGRESSO */
document.addEventListener('DOMContentLoaded', () => {

  /* MODO CLARO / ESCURO */
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');

      if (toggleBtn.classList.contains('day')) {
        toggleBtn.classList.remove('day');
        toggleBtn.classList.add('night');
      } else {
        toggleBtn.classList.remove('night');
        toggleBtn.classList.add('day');
      }
    });
  }


  /* TELA CHEIA */
  const fullscreen = document.getElementById('fullscreen');
  if (fullscreen) {
    const iconeNormal = fullscreen.innerHTML;
    const iconeTelaCheia = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#24292f">
        <path d="M240-120v-120H120v-80h200v200h-80Zm400 0v-200h200v80H720v120h-80ZM120-640v-80h120v-120h80v200H120Zm520 0v-200h80v120h120v80H640Z"/>
      </svg>
    `;

    fullscreen.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (erro) {
        console.log(
          'Não foi possível alterar o modo de tela:',
          erro
        );
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement) {
        fullscreen.innerHTML = iconeTelaCheia;
        fullscreen.title = 'Voltar para tela normal';
      } else {
        fullscreen.innerHTML = iconeNormal;
        fullscreen.title = 'Entrar em tela cheia';
      }
    });
  }
});


/* 4. AJUSTE DO TAMANHO DA FONTE */
document.querySelectorAll('[data-font-change]').forEach(botao => {
    botao.addEventListener('click', () => {
        const valor = Number(botao.dataset.fontChange);
        mudarFonte(valor);
    });
});

function mudarFonte(valor) {
  const html = document.documentElement;
  const tamanhoAtual = parseFloat(
    window.getComputedStyle(html).fontSize
  );

  const novoTamanho = tamanhoAtual + valor;
  if (novoTamanho >= 5 && novoTamanho <= 30) {
    html.style.fontSize = novoTamanho + 'px';
  }
}


// ==========================================
// PROGRESSO DE LEITURA
// ==========================================

const API_URL = window.location.origin;
const ID_LIVRO = Number(document.body.dataset.livroId);

if (!ID_LIVRO) {
    console.error("ID do livro não encontrado no HTML.");
}
const token = localStorage.getItem("authToken");

let temporizador;
let progressoRestaurado = false;


// ==========================================
// CALCULAR PROGRESSO ATUAL
// ==========================================

function calcularProgresso() {
    const alturaDocumento = document.documentElement.scrollHeight;
    const alturaJanela = window.innerHeight;
    const distanciaTotal = alturaDocumento - alturaJanela;

    if (distanciaTotal <= 0) return 100;

    const distanciaPercorrida = window.scrollY + alturaJanela;

    return Math.min(
        100,
        Math.max(0, Math.round((distanciaPercorrida / alturaDocumento) * 100))
    );
}

// ==========================================
// ATUALIZAR BARRA E PORCENTAGEM DO LIVRO
// ==========================================

function atualizarBarra(progresso) {

    // Porcentagem exibida no topo
    const texto =
        document.getElementById("barra-progresso-texto") ||
        document.querySelector(".progress-bar-inner");

    // Barra visual exibida no topo
    const barra =
        document.getElementById("barra-progresso");

    if (texto) {
        texto.textContent = `${progresso}%`;
    }

    if (barra) {
        barra.style.width = `${progresso}%`;
    }
}


// ==========================================
// BUSCAR PROGRESSO SALVO
// ==========================================

async function restaurarProgresso() {
    if (!token) {
        console.error("Usuário não autenticado.");
        return;
    }

    try {
        const resposta = await fetch(
            `${API_URL}/api/progresso-leitura/${ID_LIVRO}`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const dados = await resposta.json();

        console.log("DADOS RECEBIDOS DO BANCO:", dados);

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao buscar progresso.");
        }

        const progressoSalvo = Math.min(
            100,
            Math.max(0, Number(dados.progresso) || 0)
        );

        // Calcula a posição correspondente ao progresso salvo
        const alturaDocumento = document.documentElement.scrollHeight;
        const alturaJanela = window.innerHeight;
        const distanciaTotal = alturaDocumento - alturaJanela;

        if (distanciaTotal > 0 && progressoSalvo > 0) {
            const posicao = (progressoSalvo / 100) * distanciaTotal;

            window.scrollTo({
                top: posicao,
                behavior: "instant"
            });
        }

        atualizarBarra(progressoSalvo);

        console.log("Progresso restaurado:", progressoSalvo + "%");

    } catch (erro) {
        console.error("Erro ao restaurar progresso:", erro);
    }

    // Só permite salvar depois de terminar a restauração
    progressoRestaurado = true;
}



// ==========================================
// SALVAR PROGRESSO NO BANCO
// ==========================================
async function salvarProgresso(progresso) {
    if (!token) {
        console.error("Usuário não autenticado.");
        return;
    }

    try {
        const resposta = await fetch(
            `${API_URL}/api/progresso-leitura`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    idlivros: ID_LIVRO,
                    progresso: progresso
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(dados.erro || "Erro ao salvar progresso.");
        }

        console.log("Posição atual:", dados.progressoAtual + "%");
        console.log("Maior progresso:", dados.progresso + "%");

        if (typeof window.iniciarDesafios === "function") {
            await window.iniciarDesafios();
        }

        if (typeof window.atualizarXP === "function") {
            await window.atualizarXP();
        }

    } catch (erro) {
        console.error("Erro ao salvar progresso:", erro);
    }
}




// ==========================================
// ATUALIZAR PROGRESSO AO ROLAR A PÁGINA
// ==========================================

function atualizarProgresso() {
    if (!progressoRestaurado) return;

    const progresso = calcularProgresso();

    atualizarBarra(progresso);

    clearTimeout(temporizador);

    temporizador = setTimeout(() => {
        salvarProgresso(progresso);
    }, 600);
}




// ==========================================
// INICIAR LEITURA
// ==========================================

async function iniciarLeitura() {
    await restaurarProgresso();

    window.addEventListener("scroll", atualizarProgresso);
    window.addEventListener("resize", atualizarProgresso);
}


// Espera a página e suas imagens carregarem
if (document.readyState === "complete") {
    iniciarLeitura();
} else {
    window.addEventListener("load", iniciarLeitura, { once: true });
}