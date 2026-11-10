
async function carregarProgressoLivros() {
    console.log("Função de progresso executada!");

    const token = localStorage.getItem("authToken");

    if (!token) {
        console.error("Token não encontrado.");
        return;
    }

    const cards = document.querySelectorAll(".card[data-livro-id]");

    console.log("Cards encontrados:", cards.length);

    for (const card of cards) {
        const idlivros = card.dataset.livroId;

        const texto = card.querySelector("#progresso-texto");
        const barra = card.querySelector("#progresso-barra");
        const botao = card.querySelector(".btn-continue");

        if (!texto || !barra || !botao) continue;

        try {
            const resposta = await fetch(
                `${API_URL}/api/progresso-leitura/${idlivros}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    },
                    cache: "no-store"
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(dados.erro || "Erro ao buscar progresso.");
            }

            const progresso = Math.min(
                100,
                Math.max(0, Number(dados.progresso) || 0)
            );

            texto.textContent = `${progresso}%`;
            barra.style.width = `${progresso}%`;

            if (progresso === 0) {
                botao.textContent = "Começar";
            } else if (progresso >= 100) {
                botao.textContent = "Reler";
            } else {
                botao.textContent = "Continuar";
            }

            // Obtém o endereço diretamente do href do botão.
            const paginaLivro = botao.href;

            // Evita adicionar vários eventos ao mesmo botão.
            botao.onclick = async (evento) => {
                evento.preventDefault();

                // Se o livro estiver concluído, reinicia a posição atual.
                if (progresso >= 100) {
                    try {
                        const respostaReset = await fetch(
                            `${API_URL}/api/progresso-leitura/reiniciar`,
                            {
                                method: "PUT",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    idlivros: Number(idlivros),
                                    progresso: 0
                                })
                            }
                        );

                        const dadosReset = await respostaReset.json();

                        if (!respostaReset.ok) {
                            throw new Error(
                                dadosReset.erro ||
                                "Não foi possível reiniciar a leitura."
                            );
                        }

                        console.log(
                            `Livro ${idlivros} reiniciado. Maior progresso preservado:`,
                            dadosReset.progresso
                        );

                    } catch (erro) {
                        console.error("Erro ao reler livro:", erro);
                        return;
                    }
                }

                // Abre o livro desde o início.
                window.location.href = paginaLivro;
            };

            console.log(`Livro ${idlivros}: ${progresso}%`);

        } catch (erro) {
            console.error(`Erro no livro ${idlivros}:`, erro);
        }
    }
}

document.addEventListener("DOMContentLoaded", carregarProgressoLivros);

window.carregarProgressoLivros = carregarProgressoLivros;
