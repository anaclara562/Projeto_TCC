/* BARRA DE PROGRESSO */
document.addEventListener('DOMContentLoaded', () => {
  const barra = document.getElementById('barra-progresso');
  const textPercent = document.querySelector('.progress-bar-inner');

  function updateProgress() {
    const html = document.documentElement;
    const body = document.body;

    const scrollTop = html.scrollTop || body.scrollTop;
    const scrollHeight = html.scrollHeight || body.scrollHeight;
    const clientHeight = html.clientHeight;

    const maxScroll = scrollHeight - clientHeight;

    const progress = maxScroll > 0
      ? (scrollTop / maxScroll) * 100
      : 0;

    const roundedProgress = Math.min(
      Math.max(Math.round(progress), 0),
      100
    );

    if (barra) {
      barra.style.width = roundedProgress + '%';
    }

    if (textPercent) {
      textPercent.innerText = roundedProgress + '%';
    }
  }

  window.addEventListener('scroll', updateProgress);
  window.addEventListener('resize', updateProgress);
  updateProgress();


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
