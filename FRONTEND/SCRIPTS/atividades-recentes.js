
let atividadesCarregadas = [];
let mostrarTodasAtividades = false;
let dataFiltroAtividades = "";
let filtrosAtividadesConfigurados = false;

function renderizarAtividades() {
    const lista = document.getElementById("lista-atividades");
    const total = document.getElementById("total-atividades");

    if (!lista || !total) return;

    // Filtra pela data selecionada.
    let atividadesFiltradas = [...atividadesCarregadas];

    if (dataFiltroAtividades) {
        atividadesFiltradas = atividadesFiltradas.filter(atividade => {
            const dataAtividade = String(
                atividade.data_atividade || ""
            ).trim().slice(0, 10);

            return dataAtividade === dataFiltroAtividades;
        });
    }

    // Sem filtro de data, mostra as últimas 5 ou todas.
    if (!dataFiltroAtividades && !mostrarTodasAtividades) {
        atividadesFiltradas = atividadesFiltradas.slice(0, 5);
    }

    total.textContent =
        `${atividadesFiltradas.length} ${
            atividadesFiltradas.length === 1
                ? "atividade recente"
                : "atividades recentes"
        }`;

    lista.innerHTML = "";

    if (atividadesFiltradas.length === 0) {
        lista.innerHTML = `
            <div class="lista-atividades-recentes">

                <p id="sem-resultados">
                    Nenhuma atividade encontrada.
                </p>
            
            </div>
        `;
        return;
    }

    
    atividadesFiltradas.forEach(atividade => {
        const tipo = String(atividade.tipo || "").toLowerCase();

        let classe = "inicio";
        let svg = `
            <svg xmlns="http://www.w3.org/2000/svg" height="26px" viewBox="0 -960 960 960" width="26px" fill="#8BC0D4">
                <path d="M358.54-293.46 480-366.59l121.46 74.13-32.05-138.5 107.18-92.65-140.74-12.52L480-667.11l-55.85 130.22-140.74 12.28 107.18 93.41-32.05 137.74ZM221.04-103.5l68.35-294.63L60.63-596.46l301.87-25.95L480-900.33l117.5 277.92 301.87 25.95-228.76 198.33 68.35 294.63L480-259.91 221.04-103.5ZM480-469.28Z"/>
            </svg>
        `;

        if (tipo === "conclusao") {
            classe = "livro";
            svg = `
                <svg xmlns="http://www.w3.org/2000/svg" height="26px" viewBox="0 -960 960 960" width="26px" fill="#8BC0D4">
                    <path d="M480.72-146.37q-48.24-37.76-104.24-59.6-56-21.83-116.48-21.83-41.18 0-80.9 11-39.71 11-76.23 30.52-24.35 12.67-47.32-1.16-22.96-13.83-22.96-40.34V-709.3q0-14.35 6.81-27.13 6.82-12.77 20.45-19.16 46.48-23.76 96.72-35.4 50.23-11.64 102.69-11.64 58.5 0 114.24 15 55.74 15 106.5 45.72v491.89q51-32 107-48.6t113-16.6q36 0 70.5 6.36T840-290.5v-489.57q15.48 5 30.7 10.86 15.21 5.86 29.93 13.62 13.87 5.96 20.33 18.97 6.45 13.01 6.45 27.32v485.1q0 25.64-22.84 38.23-22.85 12.6-47.44-.31-36.52-19.52-76.23-30.52-39.72-11-80.9-11-60 0-115.64 21.95-55.64 21.96-103.64 59.48Z"/>
                </svg>
            `;
        } else if (tipo === "nivel") {
            classe = "next_nivel";
            svg = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" height="26px" width="26px" fill="#8BC0D4">
                    <path d="M7,21V19h4V15.9q-1.22-0.28-2.19-1.04T7.4,12.95q-1.88-0.22-3.14-1.64T3,8V7Q3,6.18 3.59,5.59T5,5H7V3H17V5h2q0.83 0 1.41,0.59Q21,6.18 21,7V8q0,1.9-1.26,3.31T16.6,12.95q-0.45,1.15-1.41,1.91Q14.23,15.63 13,15.9V19h4v2H7ZM7,10.8V7H5V8Q5,8.95 5.55,9.71Q6.1,10.48 7,10.8Zm10,0q0.9-0.32 1.45-1.09T19,8V7H17v3.8Z"/>
                </svg>
            `;
        }

        const data = new Date(atividade.data_atividade);

        const tempo = Number.isNaN(data.getTime())
            ? "Data indisponível"
            : data.toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short"
            });

        const item = document.createElement("div");
        item.className = `item ${classe}`;

        item.innerHTML = `
            ${svg}
            <div class="texto">
                <span class="titulo"></span>
                <span class="tempo"></span>
            </div>
            <span class="pontos"></span>
        `;

        item.querySelector(".titulo").textContent = atividade.descricao;
        item.querySelector(".tempo").textContent = tempo;
        const pontos = Number(atividade.pontos) || 0;
        item.querySelector(".pontos").textContent = `★ + ${pontos} XP`;

        lista.appendChild(item);
    });

}



function configurarFiltrosAtividades() {
    if (filtrosAtividadesConfigurados) return;

    const btnUltimas = document.getElementById("btn-ultimas-atividades");
    const btnTodas = document.getElementById("btn-todas-atividades");
    const filtroData = document.getElementById("filtro-data-atividades");
    const btnLimpar = document.getElementById("limpar-filtro-atividades");

    if (!btnUltimas || !btnTodas || !filtroData || !btnLimpar) {
        console.error("Não foi possível encontrar todos os controles das atividades.");
        return;
    }

    // Últimas 5 atividades
    btnUltimas.addEventListener("click", () => {
        mostrarTodasAtividades = false;
        dataFiltroAtividades = "";
        filtroData.value = "";

        btnUltimas.classList.add("ativo");
        btnTodas.classList.remove("ativo");

        renderizarAtividades();
    });

    // Todas as atividades
    btnTodas.addEventListener("click", () => {
        mostrarTodasAtividades = true;
        dataFiltroAtividades = "";
        filtroData.value = "";

        btnTodas.classList.add("ativo");
        btnUltimas.classList.remove("ativo");

        renderizarAtividades();
    });

    // Filtrar por dia
    filtroData.addEventListener("change", (event) => {
        dataFiltroAtividades = event.target.value;

        btnUltimas.classList.remove("ativo");
        btnTodas.classList.remove("ativo");

        renderizarAtividades();
    });

    // Limpar filtragem
    btnLimpar.addEventListener("click", () => {
        dataFiltroAtividades = "";
        mostrarTodasAtividades = false;
        filtroData.value = "";

        btnUltimas.classList.add("ativo");
        btnTodas.classList.remove("ativo");

        renderizarAtividades();
    });

    filtrosAtividadesConfigurados = true;
}







async function carregarAtividadesRecentes() {
    const lista = document.getElementById("lista-atividades");
    const total = document.getElementById("total-atividades");
    const token = localStorage.getItem("authToken");

    if (!lista || !total) {
        console.error("Elementos de atividades não encontrados.");
        return;
    }

    // Configura os filtros antes de buscar os dados.
    configurarFiltrosAtividades();

    if (!token) {
        lista.textContent = "Faça login para visualizar suas atividades.";
        total.textContent = "0 atividades recentes";
        return;
    }

    try {
        const resposta = await fetch(
            `${API_URL}/api/atividades-recentes`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
            throw new Error(
                dados.erro || "Erro ao carregar atividades."
            );
        }

        atividadesCarregadas = (dados.atividades || []).sort(
            (a, b) => {
                return new Date(b.data_atividade).getTime() -
                    new Date(a.data_atividade).getTime();
            }
        );

        renderizarAtividades();

    } catch (erro) {
        console.error("Erro ao carregar atividades:", erro);

        lista.textContent = "Não foi possível carregar suas atividades.";
        total.textContent = "0 atividades recentes";
    }
}

// Executa mesmo se o DOM já estiver carregado
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        carregarAtividadesRecentes,
        { once: true }
    );
} else {
    carregarAtividadesRecentes();
}
