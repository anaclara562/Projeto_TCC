
document.addEventListener("DOMContentLoaded", () => {

    // ==========================================
    // VERIFICAÇÃO DA PÁGINA
    // ==========================================

    if (!document.getElementById("view-1")) return;

    // ==========================================
    // CONFIGURAÇÕES E VARIÁVEIS
    // ==========================================

    const MIN_PALAVRAS = 150;

    const LEVEL_CLASS = {
        "Fácil": "facil",
        "Médio": "medio",
        "Difícil": "dificil"
    };

    const $ = (id) => document.getElementById(id);

    let chosenTheme = "";
    let chosenCategory = "";
    let chosenLevel = "";
    let chosenXp = 0;



    // ==========================================
    // SISTEMA DE RASCUNHO AUTOMÁTICO
    // ==========================================

    const CHAVE_RASCUNHO = "rascunhoRedacao";

    // Salvar o rascunho
    function salvarRascunho() {
        // Não salva se a redação já foi enviada
        if (localStorage.getItem("redacaoEnviada") === "true") {
            return;
        }

        const campoTexto = $("essay-input");
        if (!campoTexto || !chosenTheme) return;

        localStorage.setItem("rascunhoRedacao", JSON.stringify({
            tema: chosenTheme,
            categoria: chosenCategory,
            nivel: chosenLevel,
            xp: chosenXp,
            texto: campoTexto.value
        }));
    }

    // Recuperar o rascunho
    function recuperarRascunho() {

        const salvo = localStorage.getItem(CHAVE_RASCUNHO);

        if (!salvo) return;

        try {

            const rascunho = JSON.parse(salvo);

            chosenTheme = rascunho.tema || "";
            chosenCategory = rascunho.categoria || "";
            chosenLevel = rascunho.nivel || "";
            chosenXp = Number(rascunho.xp) || 0;

            const campoTexto = $("essay-input");

            if (campoTexto) {
                campoTexto.value = rascunho.texto || "";
            }

        } catch (erro) {

            console.error("Erro ao recuperar rascunho:", erro);

        }
    }


    function limparRascunho() {

        // Apaga o rascunho salvo no navegador
        localStorage.removeItem("rascunhoRedacao");

        // Limpa o campo de escrita
        const campoTexto = $("essay-input");

        if (campoTexto) {
            campoTexto.value = "";
        }

        // Limpa as informações do tema anterior
        chosenTheme = "";
        chosenCategory = "";
        chosenLevel = "";
        chosenXp = 0;

        // Remove a seleção visual dos temas
        document.querySelectorAll(".theme-card").forEach(card => {
            card.classList.remove("selected", "active");
        });

    }



    // Recupera o rascunho ao abrir a página
    recuperarRascunho();

    // Salva sempre que o estudante digitar
    $("essay-input")?.addEventListener(
        "input",
        salvarRascunho
    );

    // Salva também ao sair da página
    window.addEventListener(
        "beforeunload",
        salvarRascunho
    );



    let stepAtual = 1;

    const tituloPrincipal = document.querySelector(".titulo-principal");
    const tituloOriginal = tituloPrincipal
        ? tituloPrincipal.textContent
        : "Escrever Redação";


    // ==========================================
    // NAVEGAÇÃO ENTRE AS ETAPAS
    // ==========================================
    $("btn-nova-redacao")?.addEventListener("click", () => {

        limparRascunho();

        navigateToStep(1);

    });


    function navigateToStep(numero) {

        stepAtual = numero;

        document.querySelectorAll(".view-section").forEach(view => {

            const ativa = view.id === `view-${numero}`;

            view.classList.toggle("active", ativa);

            view.style.display = "";

        });

        document.querySelectorAll(".step-pill").forEach((pill, index) => {

            pill.classList.toggle("active", index === numero - 1);

        });

        const titulos = {
            1: tituloOriginal,
            2: "Redigindo...",
            3: "Resultado"
        };

        if (tituloPrincipal) {
            tituloPrincipal.textContent = titulos[numero];
        }

        const backBtn = $("back-btn");

        if (backBtn) {
            backBtn.style.display = numero === 2 ? "block" : "none";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    // ==========================================
    // VOLTAR ETAPA
    // ==========================================

    function goBack() {

        if (stepAtual === 2) {
            navigateToStep(1);
        }

        else if (stepAtual === 3) {
            navigateToStep(2);
        }

    }


    // ==========================================
    // SELEÇÃO DO TEMA
    // ==========================================

    function selectTheme(themeName, category, level, xp) {

        chosenTheme = themeName;
        chosenCategory = category;
        chosenLevel = level;

        chosenXp = parseInt(
            String(xp).replace(/\D/g, ""),
            10
        ) || 0;

        // Salva o rascunho com o XP correto do tema
        salvarRascunho();

        $("selected-theme-title").textContent = themeName;

        // Dificuldade

        const badge = $("theme-level-badge");

        badge.textContent = level;

        badge.classList.remove(
            "facil",
            "medio",
            "dificil"
        );

        badge.classList.add(
            LEVEL_CLASS[level] || "dificil"
        );

        // XP

        $("theme-xp-badge").textContent =
            `+${chosenXp} XP ao completar`;

        // Placeholder

        $("essay-input").placeholder =
            `Escreva sua redação sobre "${themeName}"...

Dica: Comece com uma introdução que apresente o tema e sua tese. Use pelo menos 2 parágrafos de desenvolvimento e finalize com uma conclusão e proposta de intervenção.`;

        // Atualiza estatísticas

        updateEditorStats();

        // Vai para a etapa de escrita

        navigateToStep(2);

    }


    // ==========================================
    // ESTATÍSTICAS DO EDITOR
    // ==========================================

    function updateEditorStats() {

        const editor = $("essay-input");

        if (!editor) return;

        const texto = editor.value;

        const textoLimpo = texto.trim();

        const palavras = textoLimpo === ""
            ? 0
            : textoLimpo.split(/\s+/).length;

        const caracteres = texto.length;

        const porcentagem = Math.min(
            Math.round((palavras / MIN_PALAVRAS) * 100),
            100
        );

        // Quantidade de caracteres

        $("chars-count").textContent =
            `${caracteres} chars`;

        // Quantidade de palavras

        $("words-count-footer").textContent =
            `${palavras} palavras`;

        // Porcentagem

        $("progress-percent").textContent =
            `${porcentagem}%`;

        // Barra de progresso

        $("progress-fill").style.width =
            `${porcentagem}%`;

        // Mensagem de palavras restantes

        const wordsLeft = $("words-left-text");

        if (palavras >= MIN_PALAVRAS) {

            wordsLeft.textContent =
                "Meta de palavras atingida! Pronto para enviar.";

            wordsLeft.style.color = "var(--success)";

        } else {

            const faltam = MIN_PALAVRAS - palavras;

            wordsLeft.textContent =
                `Faltam ${faltam} palavras para poder enviar`;

            wordsLeft.style.color = "#64748B";

        }

    }


    // ==========================================
    // RENDERIZAÇÃO DOS RESULTADOS
    // ==========================================

    function renderResultsUI(data) {

        // Aceita os formatos de resposta da IA

        const nota = Number(
            data.notaFinal ??
            data.nota ??
            0
        );

        const comentario =
            data.comentarioGeral ??
            data.comentario ??
            "Correção concluída.";

        const criterios = data.criterios || [];

        const sugestoes = data.sugestoes || [];

        const xp = Math.round(
            chosenXp * (nota / 1000)
        );

        const status =
            nota >= 800 ? "Excelente" :
            nota >= 600 ? "Muito bom" :
            nota >= 400 ? "Bom" :
            "Pode melhorar";


        // ======================================
        // NOTA FINAL
        // ======================================

        $("score-value").textContent = nota;

        const anel = $("score-ring-fill");

        if (anel) {

            anel.style.strokeDasharray = "100 100";

            anel.style.strokeDashoffset =
                100 - (nota / 10);

        }

        // ======================================
        // STATUS DA NOTA
        // ======================================

        $("score-status").textContent =
            data.statusNota || status;

        // ======================================
        // XP GANHO
        // ======================================

        $("xp-reward").textContent =
            `+${xp} XP ganhos`;

        // ======================================
        // COMENTÁRIO GERAL
        // ======================================

        $("comment-body").textContent =
            comentario;


        // ======================================
        // CRITÉRIOS DE AVALIAÇÃO
        // ======================================

        const cards = document.querySelectorAll(
            "#view-3 .criterion-card"
        );

        criterios.forEach((criterio, index) => {

            const card = cards[index];

            if (!card) return;

            // Aceita objetos ou números

            const notaCriterio =
                typeof criterio === "object"
                    ? Number(criterio.nota)
                    : Number(criterio);

            const maximo =
                typeof criterio === "object"
                    ? Number(
                        criterio.max ||
                        (notaCriterio <= 20 ? 20 : 200)
                    )
                    : 20;

            const nome =
                typeof criterio === "object"
                    ? criterio.nome
                    : null;

            const porcentagem =
                typeof criterio === "object" &&
                criterio.porcentagem !== undefined
                    ? Number(criterio.porcentagem)
                    : (notaCriterio / maximo) * 100;

            const spans = card.querySelectorAll(
                ".criterion-row span"
            );

            if (nome && spans[0]) {
                spans[0].textContent = nome;
            }

            if (spans[1]) {

                spans[1].textContent =
                    `${notaCriterio}/${maximo}`;

            }

            const barra = card.querySelector(
                ".criterion-fill"
            );

            if (barra) {

                barra.style.width =
                    `${Math.min(100, Math.max(0, porcentagem))}%`;

            }

        });


        // ======================================
        // SUGESTÕES DA IA
        // ======================================


        const caixas = document.querySelectorAll(
            "#view-3 .suggestion-box"
        );

        // Os três tipos de sugestões do seu HTML
        const tiposSugestao = ["tip", "warning", "info"];

        sugestoes.forEach((sugestao, index) => {

            const caixa = caixas[index];

            if (!caixa) return;

            const tipo = tiposSugestao[index];

            // Mantém a classe visual de cada caixa
            caixa.className = `suggestion-box ${tipo}`;

            // Encontra o título e o texto no HTML
            const titulo = caixa.querySelector(
                ".suggestion-header strong"
            );

            const texto = caixa.querySelector("p");

            // Atualiza o título
            if (titulo) {
                titulo.textContent = sugestao.titulo;
            }

            // Atualiza o conteúdo
            if (texto) {
                texto.textContent = sugestao.texto;
            }

        });

        // Esconde as caixas que não receberam sugestões
        caixas.forEach((caixa, index) => {
            caixa.style.display =
                index < sugestoes.length ? "block" : "none";
        });


    }


    // ==========================================
    // ENVIAR REDAÇÃO PARA CORREÇÃO
    // ==========================================

    
    async function submitEssay() {

        const texto = $("essay-input").value.trim();

        const palavras = texto === ""
            ? 0
            : texto.split(/\s+/).length;

        // Verifica se existe tema selecionado
        if (!chosenTheme) {
            alert("Escolha um tema primeiro.");
            navigateToStep(1);
            return;
        }

        // Verifica quantidade mínima de palavras
        if (palavras < MIN_PALAVRAS) {
            alert(
                `Sua redação precisa de pelo menos ${MIN_PALAVRAS} palavras.`
            );
            return;
        }

        // Botão de envio
        const btn = document.querySelector("#view-2 .submit-btn");
        const textoOriginal = btn.textContent;

        btn.disabled = true;
        btn.textContent = "Avaliando com IA...";
        btn.style.opacity = "0.7";

        try {

            // 1. CORREÇÃO PELA IA

            if (typeof window.callGroqAPI !== "function") {
                throw new Error(
                    "A função callGroqAPI não foi encontrada. Verifique o carregamento do arquivo redacaoIA.js."
                );
            }

            const resultadoBruto = await window.callGroqAPI(
                chosenTheme,
                texto,
                chosenCategory,
                chosenLevel
            );

            console.log("CORREÇÃO COMPLETA DA IA:", resultadoBruto);
            console.log("CRITÉRIOS RECEBIDOS:", resultadoBruto.criterios);
            console.log("SUGESTÕES RECEBIDAS:", resultadoBruto.sugestoes);

            // Padroniza os dados recebidos
            const resultado = {
                notaFinal: Number(
                    resultadoBruto.nota_final ??
                    resultadoBruto.notaFinal ??
                    resultadoBruto.nota
                ),

                statusNota:
                    resultadoBruto.status_nota ??
                    resultadoBruto.statusNota,

                comentarioGeral:
                    resultadoBruto.comentario_geral ??
                    resultadoBruto.comentarioGeral ??
                    resultadoBruto.comentario,

                criterios: resultadoBruto.criterios || [],

                sugestoes: resultadoBruto.sugestoes || []
            };

            // 2. VALIDAR NOTA

            const nota = resultado.notaFinal;

            if (!Number.isFinite(nota) || nota < 0 || nota > 1000) {
                throw new Error("A IA retornou uma nota inválida.");
            }

            // 3. CALCULAR XP

            const xp = Math.round(
                Math.max(0, Math.min(1000, nota)) * chosenXp / 1000
            );

            console.log("XP máximo do tema:", chosenXp);
            console.log("Nota da redação:", nota);
            console.log("XP conquistado:", xp);

            // 4. MOSTRAR RESULTADOS

            renderResultsUI(resultado);

            // 5. VERIFICAR AUTENTICAÇÃO

            const token = localStorage.getItem("authToken");

            if (!token) {
                throw new Error(
                    "Usuário não autenticado. Faça login novamente."
                );
            }

            // 6. SALVAR NO BANCO DE DADOS

            const status =
                nota >= 800 ? "Excelente" :
                nota >= 600 ? "Muito bom" :
                nota >= 400 ? "Bom" :
                "Pode melhorar";

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

                    nota_final: nota,
                    status_nota: status,
                    comentario_geral: resultado.comentarioGeral,
                    xp_ganhos: xp,

                    criterios: resultado.criterios,
                    sugestoes: resultado.sugestoes
                })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem ||
                    dados.erro ||
                    "Erro ao salvar redação."
                );
            }

            localStorage.setItem("redacaoEnviada", "true");
            localStorage.removeItem("rascunhoRedacao");

            console.log("Redação salva com sucesso!", dados);

            // 7. LIMPAR RASCUNHO APÓS SALVAMENTO

            localStorage.removeItem("rascunhoRedacao");

            // 8. IR PARA RESULTADO

            navigateToStep(3);

        } catch (erro) {

            console.error("Erro ao enviar redação:", erro);

            alert(
                erro.message ||
                "Não foi possível corrigir sua redação."
            );

        } finally {

            btn.disabled = false;
            btn.textContent = textoOriginal;
            btn.style.opacity = "1";

        }
    }



    // ==========================================
    // NOVA REDAÇÃO
    // ==========================================

    function novaRedacao() {

        localStorage.removeItem("redacaoEnviada");
        localStorage.removeItem("rascunhoRedacao");

        chosenTheme = "";
        chosenCategory = "";
        chosenLevel = "";
        chosenXp = 0;

        $("essay-input").value = "";

        updateEditorStats();

        navigateToStep(1);

    }


    // ==========================================
    // REESCREVER REDAÇÃO
    // ==========================================

    function reescreverRedacao() {

        navigateToStep(2);

    }


    // ==========================================
    // CLIQUES NOS CARDS DE TEMAS
    // ==========================================

    document.querySelectorAll(".theme-card").forEach(card => {

        card.addEventListener("click", () => {

            const tema = card.querySelector(
                ".card-header h3"
            )?.textContent.trim();

            const categoria = card.querySelector(
                ".card-header p"
            )?.textContent.trim();

            const nivel = card.querySelector(
                ".badge"
            )?.textContent.trim();

            const xp = card.querySelector(
                ".xp-text"
            )?.textContent.trim();

            if (!tema || !categoria || !nivel) {

                console.error(
                    "Não foi possível identificar os dados do tema."
                );

                return;

            }

            selectTheme(
                tema,
                categoria,
                nivel,
                xp || "0 XP"
            );

        });

    });


    // ==========================================
    // CONTAGEM AUTOMÁTICA DO EDITOR
    // ==========================================

    const essayInput = $("essay-input");

    if (essayInput) {

        essayInput.addEventListener(
            "input",
            updateEditorStats
        );

    }


    // ==========================================
    // BOTÃO ENVIAR REDAÇÃO
    // ==========================================

    const submitBtn = document.querySelector(
        "#view-2 .submit-btn"
    );

    if (submitBtn) {

        submitBtn.addEventListener(
            "click",
            submitEssay
        );

    }


    // ==========================================
    // BOTÃO VOLTAR
    // ==========================================

    const backBtn = $("back-btn");

    if (backBtn) {

        backBtn.removeAttribute("onclick");

        backBtn.addEventListener(
            "click",
            goBack
        );

    }


    // ==========================================
    // BOTÕES DO RESULTADO
    // ==========================================

    const botoesResultado = document.querySelector(
        "#view-3 .actions-bottom"
    );

    if (botoesResultado) {

        const botoes = botoesResultado.querySelectorAll("button");

        if (botoes[0]) {

            botoes[0].removeAttribute("onclick");

            botoes[0].addEventListener(
                "click",
                novaRedacao
            );

        }

        if (botoes[1]) {

            botoes[1].removeAttribute("onclick");

            botoes[1].addEventListener(
                "click",
                reescreverRedacao
            );

        }

    }


    // ==========================================
    // ABAS DOS MACETES
    // ==========================================

    document.querySelectorAll(
        ".botoes-container button[data-info]"
    ).forEach(botao => {

        botao.addEventListener("click", () => {

            const infoId = botao.dataset.info;

            const container = botao.closest(".macetes-frame");

            if (!container) return;

            container.querySelectorAll(".conteudo").forEach(
                conteudo => {

                    conteudo.classList.toggle(
                        "active",
                        conteudo.id === infoId
                    );

                }
            );

            container.querySelectorAll(
                ".botoes-container button"
            ).forEach(outroBotao => {

                outroBotao.classList.toggle(
                    "active",
                    outroBotao === botao
                );

            });

        });

    });


    // ==========================================
    // DISPONIBILIZAR FUNÇÕES GLOBAIS
    // ==========================================

    window.selectTheme = selectTheme;

    window.navigateToStep = navigateToStep;

    window.goBack = goBack;

    window.updateEditorStats = updateEditorStats;

    window.submitEssay = submitEssay;

    window.renderResultsUI = renderResultsUI;


    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    updateEditorStats();

    navigateToStep(1);

    console.log("Sistema de redação inicializado!");

});
