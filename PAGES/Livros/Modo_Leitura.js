document.addEventListener('DOMContentLoaded', () => {
  const barra = document.getElementById('barra-progresso');
  const textPercent = document.querySelector('.progress-bar-inner');
  const toggleBtn = document.getElementById('theme-toggle');

  function updateProgress() {
    const html = document.documentElement;
    const body = document.body;

    const scrollTop = html.scrollTop || body.scrollTop;
    const scrollHeight = html.scrollHeight || body.scrollHeight;
    const clientHeight = html.clientHeight;

    const maxScroll = scrollHeight - clientHeight;
    const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;
    const roundedProgress = Math.min(Math.max(Math.round(progress), 0), 100);

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

  // Modo Claro/Escuro
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
});

//Fonte Ajustavel
function mudarFonte(valor) {
  const html = document.documentElement;

  let tamanhoAtual = parseFloat(window.getComputedStyle(html).fontSize);
  let novoTamanho = tamanhoAtual + valor;
  
  if (novoTamanho >= 5 && novoTamanho <= 30) {
    html.style.fontSize = novoTamanho + 'px';
  }
}

//Tela Cheia
const fullscreen = document.getElementById("fullscreen");

fullscreen.addEventListener("click", async () => {

    try {

        await document.documentElement.requestFullscreen();

        // Esconde o botão
        fullscreen.style.display = "none";

    } catch (erro) {

        console.log("Não foi possível entrar em tela cheia:", erro);

    }

});


// Quando sair da tela cheia, inclusive apertando ESC
document.addEventListener("fullscreenchange", () => {

    if (!document.fullscreenElement) {

        // Mostra o botão novamente
        fullscreen.style.display = "flex";

    }

});