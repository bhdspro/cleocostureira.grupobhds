// --- IMPORTAÇÕES BÁSICAS ---
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET']
}));

// --------------------------------------------------------------------------
// DADOS DE BACKUP / CACHE INICIAL
// --------------------------------------------------------------------------
// Esses dados são usados na primeira vez ou caso o Google bloqueie o robô.
let dadosGoogle = {
    rating_geral: 5.0,
    total_avaliacoes: 14,
    reviews: [
        {
            author_name: "Mariana Silva",
            rating: 5,
            text: "A Cléo é uma excelente profissional! Salvou um vestido de festa meu de última hora com um ajuste perfeito."
        },
        {
            author_name: "Julio Cesar",
            rating: 5,
            text: "Levo meus uniformes de trabalho para ela fazer a barra e ajustar. Sempre rápido e com preço super justo na Zona Norte."
        },
        {
            author_name: "Renata Farias",
            rating: 5,
            text: "Costureira de mão cheia. Fez a troca do zíper da minha jaqueta e ficou parecendo que veio da loja. Muito atenciosa!"
        }
    ]
};

// Variável para guardar a data da última vez que o scraping funcionou
let ultimaAtualizacao = 0; 
// 48 horas em milissegundos: 48 * 60 * 60 * 1000 = 172.800.000 ms
const INTERVALO_CACHE_MS = 172800000; 

// --------------------------------------------------------------------------
// FUNÇÃO INTERNA DO ROBÔ (WEB SCRAPING)
// --------------------------------------------------------------------------
async function atualizarDadosGoogle() {
    console.log("Iniciando rotina de Scraping do Google...");
    try {
        const searchUrl = 'https://www.google.com/search?q=Cl%C3%A9o+Costureira+Vivi+Xavier+Londrina&hl=pt-BR';
        
        // Finge ser um navegador real
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        const $ = cheerio.load(response.data);
        
        let nota = null;
        let total = null;

        // Tenta raspar a Nota e o Total
        const ratingText = $('span:contains("estrelas")').first().text(); 
        const totalText = $('span:contains("comentários")').first().text() || $('span:contains("avaliações")').first().text();

        if (ratingText) {
            const matchNota = ratingText.match(/(\d[.,]\d)/);
            if (matchNota) nota = parseFloat(matchNota[1].replace(',', '.'));
        }
        if (totalText) {
            const matchTotal = totalText.match(/(\d+)/);
            if (matchTotal) total = parseInt(matchTotal[1]);
        }

        // Se conseguiu raspar dados VÁLIDOS, atualiza o Cache na memória
        if (nota && total) {
            dadosGoogle.rating_geral = nota;
            dadosGoogle.total_avaliacoes = total;
            // A data de agora virou a "última atualização"
            ultimaAtualizacao = Date.now(); 
            console.log(`✅ Scraping de 48h realizado com SUCESSO! Nova Nota: ${nota} | Total: ${total}`);
        } else {
            console.warn("⚠️ Robô não achou os números (layout mudou ou Google bloqueou). Mantendo Cache Antigo.");
        }

    } catch (error) {
        console.error("⚠️ Falha na tentativa de Scraping. Mantendo Cache Antigo.", error.message);
    }
}

// --------------------------------------------------------------------------
// ROTA PRINCIPAL DA API (O que o seu site chama)
// --------------------------------------------------------------------------
app.get('/api/google-data', async (req, res) => {
    const tempoAtual = Date.now();

    // LÓGICA DE CACHE: Se já passaram 48h desde a última atualização...
    if (tempoAtual - ultimaAtualizacao > INTERVALO_CACHE_MS) {
        // Dispara o robô para atualizar (sem travar a resposta pro cliente!)
        atualizarDadosGoogle(); 
    } else {
        console.log("⚡ Dados servidos direto do Cache rápido (menos de 48h de idade).");
    }

    // Entrega o dado imediatamente para o site ficar ultra rápido!
    // (Pode ser o dado novinho que acabou de raspar, ou o dado que tem menos de 48h)
    res.json(dadosGoogle);
});

// Health check para o painel do Render
app.get('/', (req, res) => {
    res.json({ message: 'API de Scraping com Cache 48h está rodando!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    // Ao ligar o servidor, ele já tenta fazer o primeiro scraping
    atualizarDadosGoogle();
});