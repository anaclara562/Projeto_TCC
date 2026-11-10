
const API_URL = window.location.origin;

async function carregarAtividadesRecentes() {
    const lista = document.getElementById("lista-atividades");
    const total = document.getElementById("total-atividades");
    const token = localStorage.getItem("authToken");

    if (!lista || !total) {
        console.error("Elementos de atividades não encontrados.");
        return;
    }

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
            throw new Error(dados.erro || "Erro ao carregar atividades.");
        }

        const atividades = dados.atividades || [];

        total.textContent =
            `${atividades.length} ${atividades.length === 1
                ? "atividade recente"
                : "atividades recentes"}`;

        if (atividades.length === 0) {
            lista.innerHTML = `
                <div class="lista-atividades-recentes">
                    Você ainda não possui atividades recentes.
                </div>
            `;
            return;
        }

        lista.innerHTML = "";

        
        atividades.forEach(atividade => {
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
            } else if (tipo === "redacao") {
                classe = "redacao";
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
            item.querySelector(".pontos").textContent =
                `★ + ${Number(atividade.pontos) || 0}`;

            lista.appendChild(item);
        });


    } catch (erro) {
        console.error("Erro ao carregar atividades:", erro);
        lista.textContent = "Não foi possível carregar suas atividades.";
    }
}

document.addEventListener("DOMContentLoaded", carregarAtividadesRecentes);
