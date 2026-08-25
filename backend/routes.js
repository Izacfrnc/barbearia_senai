const express = require("express");
const router = express.Router();
const db = require("./db");

const erro500 = (res, error) => {
  console.error(error);

  res.status(500).json({
    erro: error.message
  });
};

// ===============================
// LISTAR
// ===============================

async function listar(res, tabela) {
  try {
    const result = await db.query(`SELECT * FROM ${tabela}`);

    res.json(result.rows);
  } catch (error) {
    erro500(res, error);
  }
}

// ===============================
// CRIAR
// ===============================

async function criar(req, res, tabela, campos) {
  try {
    const valores = campos.map(c => req.body[c]);

    if (
      valores.some(
        v => v === undefined || v === null || v === ""
      )
    ) {
      return res.status(400).json({
        erro: "Preencha todos os campos"
      });
    }

    const parametros = campos
      .map((_, index) => `$${index + 1}`)
      .join(", ");

    const sql = `
      INSERT INTO ${tabela} (${campos.join(", ")})
      VALUES (${parametros})
      RETURNING *
    `;

    const result = await db.query(sql, valores);

    const registro = result.rows[0];

    const id =
      registro.id_clientes ??
      registro.id_funcionarios ??
      registro.id_servico ??
      registro.id_usuario ??
      registro.id_agendamentos;

    res.status(201).json({
      mensagem: "Criado com sucesso",
      id
    });

  } catch (error) {
    erro500(res, error);
  }
}

// ===============================
// ATUALIZAR
// ===============================

async function atualizar(
  req,
  res,
  tabela,
  idCampo,
  campos
) {
  try {
    const { id } = req.params;

    const valores = campos.map(c => req.body[c]);

    if (
      valores.some(
        v => v === undefined || v === null || v === ""
      )
    ) {
      return res.status(400).json({
        erro: "Preencha todos os campos"
      });
    }

    const sets = campos
      .map((campo, index) => `${campo} = $${index + 1}`)
      .join(", ");

    const sql = `
      UPDATE ${tabela}
      SET ${sets}
      WHERE ${idCampo} = $${campos.length + 1}
      RETURNING *
    `;

    const result = await db.query(
      sql,
      [...valores, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        erro: "Registro não encontrado"
      });
    }

    res.json({
      mensagem: "Atualizado com sucesso"
    });

  } catch (error) {
    erro500(res, error);
  }
}

// ===============================
// REMOVER
// ===============================

async function remover(
  req,
  res,
  tabela,
  idCampo,
  nome = "Registro"
) {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM ${tabela} WHERE ${idCampo} = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        erro: `${nome} não encontrado`
      });
    }

    res.json({
      mensagem: "Removido com sucesso"
    });

  } catch (error) {
    erro500(res, error);
  }
}

// ======================================================
// CLIENTES
// ======================================================

router.get("/clientes", (req, res) =>
  listar(res, "clientes")
);

router.post("/clientes", (req, res) =>
  criar(
    req,
    res,
    "clientes",
    ["nome", "telefone"]
  )
);

router.put("/clientes/:id", (req, res) =>
  atualizar(
    req,
    res,
    "clientes",
    "id_clientes",
    ["nome", "telefone"]
  )
);

router.delete("/clientes/:id", (req, res) =>
  remover(
    req,
    res,
    "clientes",
    "id_clientes",
    "Cliente"
  )
);

// ======================================================
// FUNCIONÁRIOS
// ======================================================

router.get("/funcionarios", (req, res) =>
  listar(res, "funcionarios")
);

router.post("/funcionarios", (req, res) =>
  criar(
    req,
    res,
    "funcionarios",
    ["nome"]
  )
);

router.put("/funcionarios/:id", (req, res) =>
  atualizar(
    req,
    res,
    "funcionarios",
    "id_funcionarios",
    ["nome"]
  )
);

router.delete("/funcionarios/:id", (req, res) =>
  remover(
    req,
    res,
    "funcionarios",
    "id_funcionarios",
    "Funcionário"
  )
);

// ======================================================
// SERVIÇOS
// ======================================================

router.get("/servicos", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM servico"
    );

    res.json(result.rows);

  } catch (error) {
    erro500(res, error);
  }
});

router.post("/servicos", (req, res) =>
  criar(
    req,
    res,
    "servico",
    ["tipo", "imagem", "preco"]
  )
);

router.put("/servicos/:id", (req, res) =>
  atualizar(
    req,
    res,
    "servico",
    "id_servico",
    ["tipo", "imagem", "preco"]
  )
);

router.delete("/servicos/:id", (req, res) =>
  remover(
    req,
    res,
    "servico",
    "id_servico",
    "Serviço"
  )
);

// ======================================================
// AGENDAMENTOS - LISTAR
// ======================================================

router.get("/agendamentos", async (req, res) => {
  try {

    const result = await db.query(`
      SELECT
        a.id_agendamentos,
        a.data,
        a.horario,
        a.clientes_id_clientes,
        a.servico_id_servico,
        a.funcionarios_id_funcionarios,

        c.nome AS cliente,
        s.tipo AS servico,
        f.nome AS funcionario

      FROM agendamentos a

      INNER JOIN clientes c
        ON a.clientes_id_clientes = c.id_clientes

      INNER JOIN servico s
        ON a.servico_id_servico = s.id_servico

      INNER JOIN funcionarios f
        ON a.funcionarios_id_funcionarios =
           f.id_funcionarios

      ORDER BY a.data, a.horario
    `);

    res.json(result.rows);

  } catch (error) {
    erro500(res, error);
  }
});

// ======================================================
// DISPONIBILIDADE
// ======================================================

router.get("/disponibilidade", async (req, res) => {

  try {

    const {
      data,
      funcionarioId
    } = req.query;

    if (!data || !funcionarioId) {
      return res.status(400).json({
        erro: "Informe data e funcionarioId"
      });
    }

    const result = await db.query(
      `
      SELECT horario
      FROM agendamentos

      WHERE data = $1
        AND funcionarios_id_funcionarios = $2

      ORDER BY horario
      `,
      [
        data,
        funcionarioId
      ]
    );

    res.json(result.rows);

  } catch (error) {
    erro500(res, error);
  }
});

// ======================================================
// CRIAR AGENDAMENTO
// ======================================================

router.post("/agendamentos", async (req, res) => {

  try {

    const {
      data,
      horario,
      clientes_id_clientes,
      servico_id_servico,
      funcionarios_id_funcionarios
    } = req.body;

    if (
      !data ||
      !horario ||
      !clientes_id_clientes ||
      !servico_id_servico ||
      !funcionarios_id_funcionarios
    ) {
      return res.status(400).json({
        erro: "Preencha todos os campos"
      });
    }

    // Verificar conflito
    const existe = await db.query(
      `
      SELECT id_agendamentos
      FROM agendamentos

      WHERE data = $1
        AND horario = $2
        AND funcionarios_id_funcionarios = $3
      `,
      [
        data,
        horario,
        funcionarios_id_funcionarios
      ]
    );

    if (existe.rows.length) {
      return res.status(409).json({
        erro:
          "Esse funcionário já possui agendamento nesse dia e horário"
      });
    }

    // Criar agendamento
    const result = await db.query(
      `
      INSERT INTO agendamentos
      (
        data,
        horario,
        clientes_id_clientes,
        servico_id_servico,
        funcionarios_id_funcionarios
      )

      VALUES ($1, $2, $3, $4, $5)

      RETURNING id_agendamentos
      `,
      [
        data,
        horario,
        clientes_id_clientes,
        servico_id_servico,
        funcionarios_id_funcionarios
      ]
    );

    res.status(201).json({
      mensagem: "Agendamento criado com sucesso",
      id_agendamentos:
        result.rows[0].id_agendamentos
    });

  } catch (error) {
    erro500(res, error);
  }
});

// ======================================================
// ATUALIZAR AGENDAMENTO
// ======================================================

router.put("/agendamentos/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const {
      data,
      horario,
      clientes_id_clientes,
      servico_id_servico,
      funcionarios_id_funcionarios
    } = req.body;

    if (
      !data ||
      !horario ||
      !clientes_id_clientes ||
      !servico_id_servico ||
      !funcionarios_id_funcionarios
    ) {
      return res.status(400).json({
        erro: "Preencha todos os campos"
      });
    }

    // Verificar conflito
    const existe = await db.query(
      `
      SELECT id_agendamentos

      FROM agendamentos

      WHERE data = $1
        AND horario = $2
        AND funcionarios_id_funcionarios = $3
        AND id_agendamentos <> $4
      `,
      [
        data,
        horario,
        funcionarios_id_funcionarios,
        id
      ]
    );

    if (existe.rows.length) {
      return res.status(409).json({
        erro:
          "Esse funcionário já possui agendamento nesse dia e horário"
      });
    }

    // Atualizar
    const result = await db.query(
      `
      UPDATE agendamentos

      SET
        data = $1,
        horario = $2,
        clientes_id_clientes = $3,
        servico_id_servico = $4,
        funcionarios_id_funcionarios = $5

      WHERE id_agendamentos = $6

      RETURNING id_agendamentos
      `,
      [
        data,
        horario,
        clientes_id_clientes,
        servico_id_servico,
        funcionarios_id_funcionarios,
        id
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        erro: "Agendamento não encontrado"
      });
    }

    res.json({
      mensagem:
        "Agendamento atualizado com sucesso"
    });

  } catch (error) {
    erro500(res, error);
  }
});

// ======================================================
// REMOVER AGENDAMENTO
// ======================================================

router.delete("/agendamentos/:id", async (req, res) => {

  try {

    const { id } = req.params;

    const result = await db.query(
      `
      DELETE FROM agendamentos
      WHERE id_agendamentos = $1
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        erro: "Agendamento não encontrado"
      });
    }

    res.json({
      mensagem:
        "Agendamento removido com sucesso"
    });

  } catch (error) {
    erro500(res, error);
  }
});

// ======================================================
// CADASTRO DE USUÁRIO
// ======================================================

router.post("/cadastro", async (req, res) => {

  const client = await db.connect();

  try {

    const {
      nome,
      email,
      telefone,
      senha
    } = req.body;

    if (
      !nome ||
      !email ||
      !telefone ||
      !senha
    ) {
      return res.status(400).json({
        erro: "Preencha todos os campos"
      });
    }

    // Iniciar transação
    await client.query("BEGIN");

    // Verificar email
    const existe = await client.query(
      `
      SELECT *
      FROM usuarios
      WHERE email = $1
      `,
      [email]
    );

    if (existe.rows.length > 0) {

      await client.query("ROLLBACK");

      return res.status(409).json({
        erro: "Esse email já está cadastrado"
      });
    }

    // Criar usuário
    const resultado = await client.query(
      `
      INSERT INTO usuarios
      (
        nome,
        email,
        telefone,
        senha,
        tipo
      )

      VALUES ($1, $2, $3, $4, $5)

      RETURNING id_usuario
      `,
      [
        nome,
        email,
        telefone,
        senha,
        "cliente"
      ]
    );

    // Criar cliente
    await client.query(
      `
      INSERT INTO clientes
      (
        nome,
        telefone
      )

      VALUES ($1, $2)
      `,
      [
        nome,
        telefone
      ]
    );

    // Confirmar
    await client.query("COMMIT");

    res.json({
      mensagem:
        "Cadastro realizado com sucesso",

      id_usuario:
        resultado.rows[0].id_usuario
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(
      "Erro no cadastro:",
      error
    );

    res.status(500).json({
      erro: error.message
    });

  } finally {

    client.release();
  }
});

// ======================================================
// LOGIN
// ======================================================

router.post("/login", async (req, res) => {

  try {

    const {
      email,
      senha
    } = req.body;

    const result = await db.query(
      `
      SELECT
        id_usuario,
        nome,
        telefone,
        tipo

      FROM usuarios

      WHERE email = $1
        AND senha = $2
      `,
      [
        email,
        senha
      ]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        erro:
          "Email ou senha inválidos"
      });
    }

    const usuario = result.rows[0];

    res.json({
      id: usuario.id_usuario,
      nome: usuario.nome,
      telefone: usuario.telefone,
      tipo: usuario.tipo
    });

  } catch (error) {

    console.error(
      "Erro no login:",
      error
    );

    res.status(500).json({
      erro:
        "Erro interno do servidor"
    });
  }
});

// ======================================================
// CLIENTE LOGADO
// ======================================================

router.get("/cliente-logado", async (req, res) => {

  try {

    const {
      nome,
      telefone
    } = req.query;

    if (!nome || !telefone) {
      return res.status(400).json({
        erro:
          "Nome e telefone não informados"
      });
    }

    const result = await db.query(
      `
      SELECT
        id_clientes,
        nome,
        telefone

      FROM clientes

      WHERE nome = $1
        AND telefone = $2

      LIMIT 1
      `,
      [
        nome,
        telefone
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        erro:
          "Cliente não encontrado"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(
      "Erro ao buscar cliente logado:",
      error
    );

    res.status(500).json({
      erro:
        "Erro ao buscar cliente"
    });
  }
});

// ======================================================
// EXPORTAR
// ======================================================

module.exports = router;