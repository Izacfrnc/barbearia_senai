const API_URL = "https://gz-barbearia-1.onrender.com/";

document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;

    configurarTema();

    if (page === "index") {
        iniciarIndex();
    }

    if (page === "dashboard") {
        iniciarDashboard();
    }

    if (page === "cliente") {
        iniciarCliente();
    }
});

/* =========================================================
   REQUISIÇÕES
========================================================= */

async function request(url, options = {}) {
    const response = await fetch(`${API_URL}${url}`, {
        headers: {
            "Content-Type": "application/json"
        },
        ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.erro ||
            data.mensagem ||
            "Erro na requisição"
        );
    }

    return data;
}

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function formatarData(data) {
    if (!data) return "";

    const dataObj = new Date(data);

    if (isNaN(dataObj.getTime())) {
        return data;
    }

    return dataObj.toLocaleDateString("pt-BR");
}

function criarLinhaVazia(
    colspan,
    texto = "Nenhum registro encontrado"
) {
    return `
        <tr>
            <td colspan="${colspan}" class="mensagem-vazia">
                ${texto}
            </td>
        </tr>
    `;
}

function limparElemento(elemento) {
    if (elemento) {
        elemento.innerHTML = "";
    }
}

/* =========================================================
   INDEX
========================================================= */

async function iniciarIndex() {
    const statusApi = document.getElementById("status-api");
    const totalClientes = document.getElementById("total-clientes");
    const totalFuncionarios = document.getElementById("total-funcionarios");
    const totalServicos = document.getElementById("total-servicos");
    const totalAgendamentos = document.getElementById("total-agendamentos");

    const listaAgendamentosHome =
        document.getElementById("lista-agendamentos-home");

    try {
        const [
            clientes,
            funcionarios,
            servicos,
            agendamentos
        ] = await Promise.all([
            request("/clientes"),
            request("/funcionarios"),
            request("/servicos"),
            request("/agendamentos")
        ]);

        if (statusApi) {
            statusApi.textContent =
                "Conexão com backend funcionando.";
        }

        if (totalClientes) {
            totalClientes.textContent = clientes.length;
        }

        if (totalFuncionarios) {
            totalFuncionarios.textContent = funcionarios.length;
        }

        if (totalServicos) {
            totalServicos.textContent = servicos.length;
        }

        if (totalAgendamentos) {
            totalAgendamentos.textContent = agendamentos.length;
        }

        if (!listaAgendamentosHome) return;

        if (!agendamentos.length) {
            listaAgendamentosHome.innerHTML =
                criarLinhaVazia(6);

            return;
        }

        listaAgendamentosHome.innerHTML =
            agendamentos.map(item => `
                <tr>
                    <td>${item.id_agendamentos ?? ""}</td>
                    <td>${formatarData(item.data)}</td>
                    <td>${item.horario ?? ""}</td>
                    <td>${item.cliente ?? ""}</td>
                    <td>${item.servico ?? ""}</td>
                    <td>${item.funcionario ?? ""}</td>
                </tr>
            `).join("");

    } catch (error) {
        console.error(error);

        if (statusApi) {
            statusApi.textContent =
                `Erro: ${error.message}`;
        }

        if (listaAgendamentosHome) {
            listaAgendamentosHome.innerHTML =
                criarLinhaVazia(
                    6,
                    "Não foi possível carregar os agendamentos"
                );
        }
    }
}

/* =========================================================
   DASHBOARD
========================================================= */

async function iniciarDashboard() {
    configurarFormularioClientes();
    configurarFormularioFuncionarios();
    configurarFormularioServicos();
    configurarFormularioAgendamentos();

    await carregarTudoDashboard();
}

async function carregarTudoDashboard() {
    try {
        await Promise.all([
            carregarClientes(),
            carregarFuncionarios(),
            carregarServicos()
        ]);

        await carregarSelectsAgendamento();

        const tabela =
            document.getElementById("lista-agendamentos");

        if (tabela) {
            await carregarAgendamentos();
        }

    } catch (error) {
        console.error(
            "Erro ao carregar dashboard:",
            error
        );
    }
}

/* =========================================================
   CLIENTES
========================================================= */

function configurarFormularioClientes() {
    const form =
        document.getElementById("form-cliente");

    const cancelar =
        document.getElementById("cancelar-cliente");

    if (form) {
        form.addEventListener(
            "submit",
            salvarCliente
        );
    }

    if (cancelar) {
        cancelar.addEventListener(
            "click",
            resetarFormularioCliente
        );
    }
}

async function carregarClientes() {
    const tbody =
        document.getElementById("lista-clientes");

    if (!tbody) return;

    try {
        const clientes =
            await request("/clientes");

        if (!clientes.length) {
            tbody.innerHTML =
                criarLinhaVazia(4);

            return;
        }

        tbody.innerHTML =
            clientes.map(cliente => `
                <tr>
                    <td>${cliente.id_clientes ?? ""}</td>

                    <td>${cliente.nome ?? ""}</td>

                    <td>${cliente.telefone ?? ""}</td>

                    <td>
                        <div class="acoes">

                            <button
                                type="button"
                                onclick='editarCliente(${JSON.stringify(cliente)})'
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="perigo"
                                onclick="excluirCliente(${cliente.id_clientes})"
                            >
                                Excluir
                            </button>

                        </div>
                    </td>
                </tr>
            `).join("");

    } catch (error) {
        console.error(error);

        tbody.innerHTML =
            criarLinhaVazia(
                4,
                error.message
            );
    }
}

async function salvarCliente(event) {
    event.preventDefault();

    const id =
        document.getElementById("cliente-id")?.value;

    const nome =
        document.getElementById("cliente-nome")?.value.trim();

    const telefone =
        document.getElementById("cliente-telefone")?.value.trim();

    if (!nome || !telefone) {
        alert("Preencha todos os campos.");
        return;
    }

    const payload = {
        nome,
        telefone
    };

    try {
        if (id) {
            await request(`/clientes/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

        } else {
            await request("/clientes", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        resetarFormularioCliente();

        await carregarClientes();
        await carregarSelectsAgendamento();

    } catch (error) {
        alert(error.message);
    }
}

function editarCliente(cliente) {
    const id =
        document.getElementById("cliente-id");

    const nome =
        document.getElementById("cliente-nome");

    const telefone =
        document.getElementById("cliente-telefone");

    if (id) {
        id.value = cliente.id_clientes;
    }

    if (nome) {
        nome.value = cliente.nome;
    }

    if (telefone) {
        telefone.value = cliente.telefone;
    }
}

async function excluirCliente(id) {
    if (!confirm("Excluir cliente?")) {
        return;
    }

    try {
        await request(`/clientes/${id}`, {
            method: "DELETE"
        });

        await carregarClientes();
        await carregarSelectsAgendamento();

        const tabela =
            document.getElementById("lista-agendamentos");

        if (tabela) {
            await carregarAgendamentos();
        }

    } catch (error) {
        alert(error.message);
    }
}

function resetarFormularioCliente() {
    const form =
        document.getElementById("form-cliente");

    const id =
        document.getElementById("cliente-id");

    if (form) {
        form.reset();
    }

    if (id) {
        id.value = "";
    }
}

/* =========================================================
   FUNCIONÁRIOS
========================================================= */

function configurarFormularioFuncionarios() {
    const form =
        document.getElementById("form-funcionario");

    const cancelar =
        document.getElementById("cancelar-funcionario");

    if (form) {
        form.addEventListener(
            "submit",
            salvarFuncionario
        );
    }

    if (cancelar) {
        cancelar.addEventListener(
            "click",
            resetarFormularioFuncionario
        );
    }
}

async function carregarFuncionarios() {
    const tbody =
        document.getElementById("lista-funcionarios");

    if (!tbody) return;

    try {
        const funcionarios =
            await request("/funcionarios");

        if (!funcionarios.length) {
            tbody.innerHTML =
                criarLinhaVazia(3);

            return;
        }

        tbody.innerHTML =
            funcionarios.map(funcionario => `
                <tr>

                    <td>
                        ${funcionario.id_funcionarios ?? ""}
                    </td>

                    <td>
                        ${funcionario.nome ?? ""}
                    </td>

                    <td>
                        <div class="acoes">

                            <button
                                type="button"
                                onclick='editarFuncionario(${JSON.stringify(funcionario)})'
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="perigo"
                                onclick="excluirFuncionario(${funcionario.id_funcionarios})"
                            >
                                Excluir
                            </button>

                        </div>
                    </td>

                </tr>
            `).join("");

    } catch (error) {
        console.error(error);

        tbody.innerHTML =
            criarLinhaVazia(
                3,
                error.message
            );
    }
}

async function salvarFuncionario(event) {
    event.preventDefault();

    const id =
        document.getElementById("funcionario-id")?.value;

    const nome =
        document.getElementById("funcionario-nome")?.value.trim();

    if (!nome) {
        alert("Informe o nome do funcionário.");
        return;
    }

    const payload = {
        nome
    };

    try {
        if (id) {
            await request(`/funcionarios/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

        } else {
            await request("/funcionarios", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        resetarFormularioFuncionario();

        await carregarFuncionarios();
        await carregarSelectsAgendamento();

    } catch (error) {
        alert(error.message);
    }
}

function editarFuncionario(funcionario) {
    const id =
        document.getElementById("funcionario-id");

    const nome =
        document.getElementById("funcionario-nome");

    if (id) {
        id.value =
            funcionario.id_funcionarios;
    }

    if (nome) {
        nome.value =
            funcionario.nome;
    }
}

async function excluirFuncionario(id) {
    if (!confirm("Excluir funcionário?")) {
        return;
    }

    try {
        await request(`/funcionarios/${id}`, {
            method: "DELETE"
        });

        await carregarFuncionarios();
        await carregarSelectsAgendamento();

        const tabela =
            document.getElementById("lista-agendamentos");

        if (tabela) {
            await carregarAgendamentos();
        }

    } catch (error) {
        alert(error.message);
    }
}

function resetarFormularioFuncionario() {
    const form =
        document.getElementById("form-funcionario");

    const id =
        document.getElementById("funcionario-id");

    if (form) {
        form.reset();
    }

    if (id) {
        id.value = "";
    }
}

/* =========================================================
   SERVIÇOS
========================================================= */

function configurarFormularioServicos() {
    const form =
        document.getElementById("form-servico");

    const cancelar =
        document.getElementById("cancelar-servico");

    if (form) {
        form.addEventListener(
            "submit",
            salvarServico
        );
    }

    if (cancelar) {
        cancelar.addEventListener(
            "click",
            resetarFormularioServico
        );
    }
}

async function carregarServicos() {
    const tbody =
        document.getElementById("lista-servicos");

    if (!tbody) return;

    try {
        const servicos =
            await request("/servicos");

        if (!servicos.length) {
            tbody.innerHTML =
                criarLinhaVazia(5);

            return;
        }

        tbody.innerHTML =
            servicos.map(servico => `
                <tr>

                    <td>
                        ${servico.id_servico ?? ""}
                    </td>

                    <td>
                        ${servico.tipo ?? ""}
                    </td>

                    <td>
                        R$ ${Number(
                            servico.preco || 0
                        ).toFixed(2).replace(".", ",")}
                    </td>

                    <td>
                        ${servico.imagem ?? ""}
                    </td>

                    <td>
                        <div class="acoes">

                            <button
                                type="button"
                                onclick='editarServico(${JSON.stringify(servico)})'
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="perigo"
                                onclick="excluirServico(${servico.id_servico})"
                            >
                                Excluir
                            </button>

                        </div>
                    </td>

                </tr>
            `).join("");

    } catch (error) {
        console.error(error);

        tbody.innerHTML =
            criarLinhaVazia(
                5,
                error.message
            );
    }
}

async function salvarServico(event) {
    event.preventDefault();

    const id =
        document.getElementById("servico-id")?.value;

    const tipo =
        document.getElementById("servico-tipo")?.value.trim();

    const preco =
        document.getElementById("servico-preco")?.value;

    const imagem =
        document.getElementById("servico-imagem")?.value.trim();

    if (!tipo || preco === "") {
        alert("Preencha o tipo e o preço.");
        return;
    }

    const payload = {
        tipo,
        preco,
        imagem
    };

    try {
        if (id) {
            await request(`/servicos/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            });

        } else {
            await request("/servicos", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        resetarFormularioServico();

        await carregarServicos();
        await carregarSelectsAgendamento();

    } catch (error) {
        alert(error.message);
    }
}

function editarServico(servico) {
    const id =
        document.getElementById("servico-id");

    const tipo =
        document.getElementById("servico-tipo");

    const preco =
        document.getElementById("servico-preco");

    const imagem =
        document.getElementById("servico-imagem");

    if (id) {
        id.value = servico.id_servico;
    }

    if (tipo) {
        tipo.value = servico.tipo;
    }

    if (preco) {
        preco.value = servico.preco;
    }

    if (imagem) {
        imagem.value = servico.imagem || "";
    }
}

async function excluirServico(id) {
    if (!confirm("Excluir serviço?")) {
        return;
    }

    try {
        await request(`/servicos/${id}`, {
            method: "DELETE"
        });

        await carregarServicos();
        await carregarSelectsAgendamento();

        const tabela =
            document.getElementById("lista-agendamentos");

        if (tabela) {
            await carregarAgendamentos();
        }

    } catch (error) {
        alert(error.message);
    }
}

function resetarFormularioServico() {
    const form =
        document.getElementById("form-servico");

    const id =
        document.getElementById("servico-id");

    if (form) {
        form.reset();
    }

    if (id) {
        id.value = "";
    }
}

/* =========================================================
   AGENDAMENTOS
========================================================= */

function configurarFormularioAgendamentos() {
    const form =
        document.getElementById("form-agendamento");

    const cancelar =
        document.getElementById("cancelar-agendamento");

    const verificar =
        document.getElementById("verificar-disponibilidade");

    if (form) {
        form.addEventListener(
            "submit",
            salvarAgendamento
        );
    }

    if (cancelar) {
        cancelar.addEventListener(
            "click",
            resetarFormularioAgendamento
        );
    }

    if (verificar) {
        verificar.addEventListener(
            "click",
            verificarDisponibilidade
        );
    }
}

async function carregarAgendamentos() {
    const tbody =
        document.getElementById("lista-agendamentos");

    if (!tbody) return;

    try {
        const agendamentos =
            await request("/agendamentos");

        if (!agendamentos.length) {
            tbody.innerHTML =
                criarLinhaVazia(7);

            return;
        }

        tbody.innerHTML =
            agendamentos.map(item => `
                <tr>

                    <td>
                        ${item.id_agendamentos ?? ""}
                    </td>

                    <td>
                        ${formatarData(item.data)}
                    </td>

                    <td>
                        ${item.horario ?? ""}
                    </td>

                    <td>
                        ${item.cliente ?? ""}
                    </td>

                    <td>
                        ${item.servico ?? ""}
                    </td>

                    <td>
                        ${item.funcionario ?? ""}
                    </td>

                    <td>
                        <div class="acoes">

                            <button
                                type="button"
                                onclick='editarAgendamento(${JSON.stringify(item)})'
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="perigo"
                                onclick="excluirAgendamento(${item.id_agendamentos})"
                            >
                                Excluir
                            </button>

                        </div>
                    </td>

                </tr>
            `).join("");

    } catch (error) {
        console.error(error);

        tbody.innerHTML =
            criarLinhaVazia(
                7,
                error.message
            );
    }
}

/* =========================================================
   SELECTS + CARDS DOS SERVIÇOS
========================================================= */

async function carregarSelectsAgendamento() {
    try {
        const [
            clientes,
            servicos,
            funcionarios
        ] = await Promise.all([
            request("/clientes"),
            request("/servicos"),
            request("/funcionarios")
        ]);

        const selectCliente =
            document.getElementById(
                "agendamento-cliente"
            );

        const selectServico =
            document.getElementById(
                "agendamento-servico"
            );

        const selectFuncionario =
            document.getElementById(
                "agendamento-funcionario"
            );

        /* CLIENTES */

        if (selectCliente) {
            selectCliente.innerHTML =
                '<option value="">Selecione</option>' +
                clientes.map(cliente => `
                    <option value="${cliente.id_clientes}">
                        ${cliente.id_clientes} - ${cliente.nome}
                    </option>
                `).join("");
        }

        /* SERVIÇOS */

        if (selectServico) {
            selectServico.innerHTML =
                '<option value="">Selecione</option>' +
                servicos.map(servico => `
                    <option value="${servico.id_servico}">
                        ${servico.id_servico} - ${servico.tipo}
                    </option>
                `).join("");
        }

        /* FUNCIONÁRIOS */

        if (selectFuncionario) {
            selectFuncionario.innerHTML =
                '<option value="">Selecione</option>' +
                funcionarios.map(funcionario => `
                    <option value="${funcionario.id_funcionarios}">
                        ${funcionario.id_funcionarios} - ${funcionario.nome}
                    </option>
                `).join("");
        }

        /* =================================================
           CARDS DOS SERVIÇOS PARA O CLIENTE
        ================================================= */

        const listaServicosCliente =
            document.getElementById(
                "lista-servicos-cliente"
            );

        if (!listaServicosCliente) {
            return;
        }

        if (!servicos.length) {
            listaServicosCliente.innerHTML =
                "<p>Nenhum corte disponível no momento.</p>";

            return;
        }

        listaServicosCliente.innerHTML =
            servicos.map(servico => {

                const preco =
                    Number(
                        servico.preco || 0
                    ).toLocaleString(
                        "pt-BR",
                        {
                            style: "currency",
                            currency: "BRL"
                        }
                    );

                let imagem = "";

                if (servico.imagem) {
                    if (
                        servico.imagem.startsWith("http://") ||
                        servico.imagem.startsWith("https://") ||
                        servico.imagem.startsWith("/")
                    ) {
                        imagem = servico.imagem;
                    } else {
                        imagem =
                            `/frontend/Imagens/${servico.imagem}`;
                    }
                }

                return `
                    <div
                        class="servico-cliente-card"
                        data-servico-id="${servico.id_servico}"
                    >

                        ${
                            imagem
                                ? `
                                    <img
                                        src="${imagem}"
                                        alt="${servico.tipo}"
                                        onerror="
                                            this.style.display='none';
                                            this.nextElementSibling.style.display='flex';
                                        "
                                    >

                                    <div
                                        class="servico-sem-imagem"
                                        style="display:none;"
                                    >
                                        Imagem não encontrada
                                    </div>
                                `
                                : `
                                    <div class="servico-sem-imagem">
                                        Sem imagem
                                    </div>
                                `
                        }

                        <div class="servico-cliente-info">

                            <h3>
                                ${servico.tipo}
                            </h3>

                            <div class="servico-cliente-preco">
                                ${preco}
                            </div>

                            <div class="servico-cliente-selecionado">
                                ✓ Corte selecionado
                            </div>

                        </div>

                    </div>
                `;
            }).join("");

        /* CLIQUE NOS CARDS */

        document
            .querySelectorAll(".servico-cliente-card")
            .forEach(card => {

                card.addEventListener(
                    "click",
                    () => {

                        const idServico =
                            card.dataset.servicoId;

                        if (selectServico) {
                            selectServico.value =
                                idServico;
                        }

                        document
                            .querySelectorAll(
                                ".servico-cliente-card"
                            )
                            .forEach(outroCard => {
                                outroCard.classList.remove(
                                    "selecionado"
                                );
                            });

                        card.classList.add(
                            "selecionado"
                        );
                    }
                );
            });

    } catch (error) {
        console.error(
            "Erro ao carregar selects:",
            error
        );
    }
}

/* =========================================================
   SALVAR AGENDAMENTO
========================================================= */

async function salvarAgendamento(event) {
    event.preventDefault();

    const id =
        document.getElementById(
            "agendamento-id"
        )?.value;

    const data =
        document.getElementById(
            "agendamento-data"
        )?.value;

    const horario =
        document.getElementById(
            "agendamento-horario"
        )?.value;

    const servico_id_servico =
        document.getElementById(
            "agendamento-servico"
        )?.value;

    const funcionarios_id_funcionarios =
        document.getElementById(
            "agendamento-funcionario"
        )?.value;

    if (!data) {
        alert("Selecione uma data.");
        return;
    }

    if (!horario) {
        alert("Selecione um horário.");
        return;
    }

    if (!servico_id_servico) {
        alert("Selecione um corte antes de agendar.");
        return;
    }

    if (!funcionarios_id_funcionarios) {
        alert("Selecione um funcionário.");
        return;
    }

    const idUsuario =
        localStorage.getItem("id_usuario");

    if (!idUsuario) {
        alert(
            "Usuário não identificado. Faça login novamente."
        );
        return;
    }

    try {

        /* Descobre automaticamente o cliente relacionado ao usuário */

        const clientes =
            await request("/clientes");

        const nomeUsuario =
            localStorage.getItem("nome");

        const telefoneUsuario =
            localStorage.getItem("telefone");

        const cliente =
            clientes.find(c =>
                c.nome === nomeUsuario &&
                c.telefone === telefoneUsuario
            );

        if (!cliente) {
            alert(
                "Cliente não encontrado. Faça o cadastro novamente."
            );
            return;
        }

        const payload = {
            data,
            horario,
            clientes_id_clientes:
                cliente.id_clientes,
            servico_id_servico,
            funcionarios_id_funcionarios
        };

        if (id) {

            await request(
                `/agendamentos/${id}`,
                {
                    method: "PUT",
                    body: JSON.stringify(payload)
                }
            );

        } else {

            await request(
                "/agendamentos",
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );
        }

        alert(
            id
                ? "Agendamento atualizado com sucesso!"
                : "Agendamento realizado com sucesso!"
        );

        resetarFormularioAgendamento();

        if (
            document.body.dataset.page === "cliente"
        ) {
            await carregarAgendamentosCliente();
        } else {
            await carregarAgendamentos();
        }

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

/* =========================================================
   EDITAR AGENDAMENTO
========================================================= */

function editarAgendamento(item) {
    const id =
        document.getElementById(
            "agendamento-id"
        );

    const data =
        document.getElementById(
            "agendamento-data"
        );

    const horario =
        document.getElementById(
            "agendamento-horario"
        );

    const cliente =
        document.getElementById(
            "agendamento-cliente"
        );

    const servico =
        document.getElementById(
            "agendamento-servico"
        );

    const funcionario =
        document.getElementById(
            "agendamento-funcionario"
        );

    if (id) {
        id.value =
            item.id_agendamentos;
    }

    if (data) {
        data.value =
            item.data
                ? item.data.split("T")[0]
                : "";
    }

    if (horario) {
        horario.value =
            item.horario || "";
    }

    if (cliente) {
        cliente.value =
            item.clientes_id_clientes || "";
    }

    if (servico) {
        servico.value =
            item.servico_id_servico || "";
    }

    if (funcionario) {
        funcionario.value =
            item.funcionarios_id_funcionarios || "";
    }

    /* Marca o card correspondente */

    document
        .querySelectorAll(
            ".servico-cliente-card"
        )
        .forEach(card => {

            card.classList.remove(
                "selecionado"
            );

            if (
                card.dataset.servicoId ===
                String(item.servico_id_servico)
            ) {
                card.classList.add(
                    "selecionado"
                );
            }
        });
}

/* =========================================================
   EXCLUIR AGENDAMENTO
========================================================= */

async function excluirAgendamento(id) {
    if (!confirm("Excluir agendamento?")) {
        return;
    }

    try {
        await request(
            `/agendamentos/${id}`,
            {
                method: "DELETE"
            }
        );

        if (
            document.body.dataset.page === "cliente"
        ) {
            await carregarAgendamentosCliente();
        } else {
            await carregarAgendamentos();
        }

        limparListaDisponibilidade();

    } catch (error) {
        alert(error.message);
    }
}

/* =========================================================
   RESETAR AGENDAMENTO
========================================================= */

function resetarFormularioAgendamento() {
    const form =
        document.getElementById(
            "form-agendamento"
        );

    const id =
        document.getElementById(
            "agendamento-id"
        );

    if (form) {
        form.reset();
    }

    if (id) {
        id.value = "";
    }

    document
        .querySelectorAll(
            ".servico-cliente-card"
        )
        .forEach(card => {

            card.classList.remove(
                "selecionado"
            );

        });

    limparListaDisponibilidade();
}

/* =========================================================
   DISPONIBILIDADE
========================================================= */

async function verificarDisponibilidade() {
    const data =
        document.getElementById(
            "agendamento-data"
        )?.value;

    const funcionarioId =
        document.getElementById(
            "agendamento-funcionario"
        )?.value;

    const lista =
        document.getElementById(
            "lista-disponibilidade"
        );

    if (!data || !funcionarioId) {
        alert(
            "Selecione data e funcionário."
        );
        return;
    }

    try {

        const horarios =
            await request(
                `/disponibilidade?data=${encodeURIComponent(data)}&funcionarioId=${encodeURIComponent(funcionarioId)}`
            );

        limparElemento(lista);

        if (!horarios.length) {

            if (lista) {
                lista.innerHTML =
                    "<li>Nenhum horário ocupado nessa data.</li>";
            }

            return;
        }

        if (lista) {
            lista.innerHTML =
                horarios.map(item => `
                    <li>
                        ${item.horario}
                    </li>
                `).join("");
        }

    } catch (error) {
        alert(error.message);
    }
}

function limparListaDisponibilidade() {
    const lista =
        document.getElementById(
            "lista-disponibilidade"
        );

    if (lista) {
        lista.innerHTML = "";
    }
}

/* =========================================================
   CLIENTE
========================================================= */

async function carregarAgendamentosCliente() {
    const tbody =
        document.getElementById(
            "lista-agendamentos"
        );

    if (!tbody) return;

    try {

        const nomeUsuario =
            localStorage.getItem("nome");

        const telefoneUsuario =
            localStorage.getItem("telefone");

        if (!nomeUsuario || !telefoneUsuario) {

            tbody.innerHTML =
                criarLinhaVazia(
                    7,
                    "Usuário não identificado. Faça login novamente."
                );

            return;
        }

        /* Descobre o cliente logado */

        const cliente =
            await request(
                `/cliente-logado?nome=${encodeURIComponent(nomeUsuario)}&telefone=${encodeURIComponent(telefoneUsuario)}`
            );

        if (!cliente) {

            tbody.innerHTML =
                criarLinhaVazia(
                    7,
                    "Cliente não encontrado."
                );

            return;
        }

        const clienteId =
            cliente.id_clientes ||
            cliente.id_cliente ||
            cliente.cliente_id;

        if (!clienteId) {

            console.error(
                "Resposta do cliente:",
                cliente
            );

            tbody.innerHTML =
                criarLinhaVazia(
                    7,
                    "Não foi possível identificar seu cadastro."
                );

            return;
        }

        /* Busca os agendamentos */

        const agendamentos =
            await request("/agendamentos");

        /* Mostra somente os agendamentos desse cliente */

        const meusAgendamentos =
            agendamentos.filter(item =>
                Number(
                    item.clientes_id_clientes
                ) === Number(clienteId)
            );

        if (!meusAgendamentos.length) {

            tbody.innerHTML =
                criarLinhaVazia(
                    7,
                    "Você ainda não possui agendamentos."
                );

            return;
        }

        tbody.innerHTML =
            meusAgendamentos.map(item => `
                <tr>

                    <td>
                        ${item.id_agendamentos ?? ""}
                    </td>

                    <td>
                        ${formatarData(item.data)}
                    </td>

                    <td>
                        ${item.horario ?? ""}
                    </td>

                    <td>
                        ${item.cliente ?? nomeUsuario}
                    </td>

                    <td>
                        ${item.servico ?? ""}
                    </td>

                    <td>
                        ${item.funcionario ?? ""}
                    </td>

                    <td>
                        <div class="acoes">

                            <button
                                type="button"
                                onclick='editarAgendamento(${JSON.stringify(item)})'
                            >
                                Editar
                            </button>

                            <button
                                type="button"
                                class="perigo"
                                onclick="excluirAgendamento(${item.id_agendamentos})"
                            >
                                Cancelar
                            </button>

                        </div>
                    </td>

                </tr>
            `).join("");

    } catch (error) {

        console.error(
            "Erro ao carregar meus agendamentos:",
            error
        );

        tbody.innerHTML =
            criarLinhaVazia(
                7,
                error.message
            );
    }
}

async function iniciarCliente() {
    configurarFormularioAgendamentos();

    await carregarSelectsAgendamento();
    await carregarAgendamentosCliente();
}

/* =========================================================
   TEMA
========================================================= */

function configurarTema() {
    const botao =
        document.getElementById("tema");

    if (!botao) {
        return;
    }

    const temaSalvo =
        localStorage.getItem("tema");

    if (
        temaSalvo === "dark" ||
        temaSalvo === "escuro"
    ) {

        document.body.classList.add("dark");
        document.body.classList.remove("light");

        botao.textContent = "☀️";

    } else {

        document.body.classList.remove("dark");
        document.body.classList.remove("light");

        botao.textContent = "🌙";
    }

    botao.addEventListener(
        "click",
        () => {

            document.body.classList.toggle(
                "dark"
            );

            const estaEscuro =
                document.body.classList.contains(
                    "dark"
                );

            if (estaEscuro) {

                localStorage.setItem(
                    "tema",
                    "dark"
                );

                botao.textContent = "☀️";

            } else {

                localStorage.setItem(
                    "tema",
                    "light"
                );

                botao.textContent = "🌙";
            }
        }
    );
}