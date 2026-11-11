window.callGroqAPI = async function(tema, texto, categoria, nivel) {
    const token = localStorage.getItem("authToken");

    if (!token) {
        throw new Error("Usuário não autenticado. Faça login novamente.");
    }

    const resposta = await fetch("/api/corrigir-redacao", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tema,
            texto,
            categoria,
            nivel
        })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(
            dados.erro || dados.mensagem || "Erro ao corrigir redação."
        );
    }

    return dados.correcao;
};