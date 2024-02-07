const axios = require("axios");
const { Client } = require("pg");

const config = {
  user: "postgres",
  host: "localhost",
  database: "backendTest",
  password: "1603",
  port: 5432,
};

const endpoints = [
  { name: "planets", url: "https://swapi.dev/api/planets/" },
  { name: "people", url: "https://swapi.dev/api/people/" },
  { name: "starships", url: "https://swapi.dev/api/starships/" },
  { name: "films", url: "https://swapi.dev/api/films/" },
  { name: "species", url: "https://swapi.dev/api/species/" },
  { name: "vehicles", url: "https://swapi.dev/api/vehicles/" },
];

async function realizarVarredura(endpoint, tableName, client) {
  try {
    let proximaUrl = endpoint;

    while (proximaUrl) {
      const resposta = await axios.get(proximaUrl);

      const dados = resposta.data.results;
      await inserirDadosNoBanco(dados, tableName, client);

      proximaUrl = resposta.data.next;
    }

    console.log("Varredura concluída com sucesso.");
  } catch (erro) {
    console.error(
      `Erro ao realizar varredura no endpoint ${endpoint}:`,
      erro.message
    );
  }
}

async function inserirDadosNoBanco(dados, tableName, client) {
  try {
    for (const registro of dados) {
      // Obtenha as chaves do objeto
      const colunas = Object.keys(registro);

      for (const coluna of colunas) {
        await client.query(`
          ALTER TABLE ${tableName}
          ADD COLUMN IF NOT EXISTS ${coluna} TEXT;
        `);
      }

      const valores = colunas.map((coluna) => registro[coluna]);

      const placeholders = valores
        .map((_, index) => `$${index + 1}`)
        .join(", ");

      const colunasFormatadas = colunas.join(", ");

      const query = `INSERT INTO ${tableName} (${colunasFormatadas}) VALUES (${placeholders})`;

      await client.query(query, valores);
    }

    console.log(`Dados inseridos com sucesso na tabela ${tableName}`);
  } catch (erro) {
    console.error("Erro ao inserir dados no banco de dados:", erro.message);
  }
}

async function realizarVarreduraPrincipal(tableName, endpoint) {
  const client = new Client(config);

  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        -- Adicione mais colunas conforme necessário
      )
    `);

    await realizarVarredura(endpoint, tableName, client);
  } finally {
    await client.end();
  }
}
endpoints.forEach((endpoint) => {
  realizarVarreduraPrincipal(endpoint.name, endpoint.url);
});
