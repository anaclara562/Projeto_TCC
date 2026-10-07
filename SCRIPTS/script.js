// MOSTRAR E OCULTAR SENHAS - PÁGINAS DE LOGIN E CADASTRO //
document.addEventListener("DOMContentLoaded", function () {

  function configurarSenha(idInput, idBotao) {

    const input = document.getElementById(idInput);
    const botao = document.getElementById(idBotao);

    if (
      !input || 
      !botao
    ) {
      console.log("Elemento não encontrado:", idInput, idBotao);
      return;
    }

    const olhoFechado = botao.querySelector(".olho-visivel");
    const olhoAberto = botao.querySelector(".olho-escondido");

    botao.addEventListener("click", function () {

      if (input.type === "password") {
        input.type = "text";
        olhoFechado.style.display = "none";
        olhoAberto.style.display = "block";
      } else {
        input.type = "password";
        olhoFechado.style.display = "block";
        olhoAberto.style.display = "none";
      }

    });
  }

  configurarSenha("senha", "mostrarSenha");
  configurarSenha("senha1", "mostrarSenha1");
  configurarSenha("senha2", "mostrarSenha2");
  
});


// CADASTRAR CONTA - PÁGINAS DE CADASTRO //
function cadastrarConta() { 
  const nome = document.getElementById("nome_user"); 
  const email = document.getElementById("email"); 
  const cpf = document.getElementById("cpf"); 
  const senha1 = document.getElementById("senha1"); 
  const senha2 = document.getElementById("senha2"); 
  if ( 
    !nome || 
    !email || 
    !cpf || 
    !senha1 || 
    !senha2 
  ) { 
    return; 
  } 
  

  const nomeValor = nome.value.trim(); 
  const emailValor = email.value.trim(); 
  const cpfValor = cpf.value.trim(); 
  const senhaValor = senha1.value; 
  const senhaConfirmacao = senha2.value; 
  if ( 
    nomeValor === "" || 
    emailValor === "" || 
    cpfValor === "" || 
    senhaValor === "" || 
    senhaConfirmacao === "" 
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


  const cpfNumeros = cpfValor.replace(/\D/g, ""); 
  if (cpfNumeros.length !== 11) { 
    alert("Digite um CPF válido."); 
    cpf.focus(); 
    return; 
  } 
  if (senhaValor.length < 6) { 
    alert( "A senha deve possuir pelo menos 6 caracteres." ); 
    senha1.focus(); 
    return; 
  } 
  if (senhaValor !== senhaConfirmacao) { 
    alert("As senhas não são iguais."); 
    senha2.focus(); 
    return; 
  }
  
  
  const usuarioExistente = JSON.parse( localStorage.getItem("usuarioLeBrasil") ); 
  if ( 
    usuarioExistente && 
    usuarioExistente.email === emailValor 
  ) { 
    alert( "Já existe uma conta cadastrada com este email." ); 
    email.focus(); 
    return; 
  }
  
  
  const usuario = { 
    nome: nomeValor, 
    email: emailValor, 
    cpf: cpfNumeros, 
    senha: senhaValor 
  };
  localStorage.setItem( 
    "usuarioLeBrasil", JSON.stringify(usuario) 
  );
  
  alert( "Conta cadastrada com sucesso! Agora faça login." ); 

  window.location.href = "/PAGES/Login.html"; 
} 


// LOGAR CONTA - PÁGINAS DE LOGIN //
function LogarConta() { 
  const email = document.getElementById("email"); 
  const senha = document.getElementById("senha"); 
  if (!email || !senha) { 
    return; 
  } 
  
  
  const emailValor = email.value.trim(); 
  const senhaValor = senha.value; 
  if ( emailValor === "" || 
    senhaValor === "" 
  ) { 
    alert( "Preencha o email e a senha." ); 
    return; 
  } 


  const usuario = JSON.parse( localStorage.getItem( "usuarioLeBrasil" ) ); 
  if (!usuario) { 
    alert( "Nenhuma conta cadastrada. Cadastre-se primeiro." ); 
    return; 
  } 
  if ( 
    emailValor === usuario.email && 
    senhaValor === usuario.senha 
  ) { 
    localStorage.setItem( "usuarioLogado", "true" ); 
    localStorage.setItem( "nomeUsuario", usuario.nome ); 

    window.location.href = "/PAGES/PaginaPrincipal.html"; 
  } else { 
    alert( "Email ou senha incorretos." ); 
  } 
} 


// MÁSCARA DO CPF //
const campoCPF = document.getElementById("cpf"); 
if (campoCPF) { 
  campoCPF.addEventListener( "input", function () { 
    let valor = campoCPF.value.replace(/\D/g, ""); 
    valor = valor.substring(0, 11); 
    
    if (valor.length > 9) { 
      valor = valor.replace( /(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4" ); 
    } else if (valor.length > 6) { 
      valor = valor.replace( /(\d{3})(\d{3})(\d+)/, "$1.$2.$3" ); 
    } else if (valor.length > 3) { 
      valor = valor.replace( /(\d{3})(\d+)/, "$1.$2" ); 
    } campoCPF.value = valor; } ); 
  }

  document.addEventListener( "keydown", function (event) { 
    if (event.key !== "Enter") { 
      return; 
    } 
    
    
    const login = document.getElementById("senha"); 
    const cadastro = document.getElementById("senha2"); 
    if ( login && !cadastro ) { 
      event.preventDefault(); 
      LogarConta(); 
    } 
  } 
);







    const botao = document.getElementById('btnFullscreen');

    botao.addEventListener('click', () => {
      const elem = document.documentElement;

      // Tenta ativar a tela cheia e redireciona
      const enterFullscreen = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.msRequestFullscreen;

      if (enterFullscreen) {
        enterFullscreen.call(elem).then(() => {
          window.location.href = 'outrapagina.html'; // Altere para o seu arquivo de destino
        }).catch(() => {
          // Se o navegador bloquear a tela cheia por algum motivo, redireciona mesmo assim
          window.location.href = 'outrapagina.html';
        });
      } else {
        window.location.href = 'outrapagina.html';
      }
    });



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
