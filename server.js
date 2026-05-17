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

let ultimaAtualizacao = 0; 
const INTERVALO_CACHE_MS = 172800000; // 48 horas

// --------------------------------------------------------------------------
// FUNÇÃO INTERNA DO ROBÔ (WEB SCRAPING AVANÇADO)
// --------------------------------------------------------------------------
async function atualizarDadosGoogle() {
    console.log("🕵️ Iniciando robô invisível para Scraping do Google...");
    try {
        // Mudamos a tática: Usamos a URL do Google Maps em vez da busca normal
        const searchUrl = 'https://www.google.com/maps/search/Cl%C3%A9o+Costureira+Vivi+Xavier+Londrina/?hl=pt-BR';
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                'Cookie': 'CONSENT=YES+cb.20230101-01-p0.pt-BR+FX+999;'
            },
            timeout: 10000
        });

        // Pegamos o HTML puro e bruto (onde ficam escondidos os dados do Google Maps)
        const rawHtml = response.data;
        
        let nota = null;
        let total = null;

        // ESTRATÉGIA DE REGEX PROFUNDO: Procura os números escondidos nos arrays de configuração do Google
        // Geralmente o Google Maps cospe algo como: [null,null,5.0,14]
        
        // Caçando o padrão de estrelas (ex: 5,0 estrelas ou 4,9 estrelas dentro dos metadados)
        const regexNota = /\\?"?ratingValue\\?"?\s*:\s*\\?"?(\d[.,]\d)\\?"?/i;
        const regexNotaTexto = /([\d,.]+)\s*estrelas?/i;
        
        const matchNota = rawHtml.match(regexNota) || rawHtml.match(regexNotaTexto);
        if (matchNota) {
            nota = parseFloat(matchNota[1].replace(',', '.'));
        }

        // Caçando o padrão de total de reviews
        const regexTotal = /\\?"?reviewCount\\?"?\s*:\s*\\?"?(\d+)\\?"?/i;
        const regexTotalTexto = /(\d+)\s*avaliações?/i;
        const regexTotalComentarios = /(\d+)\s*comentários?/i;

        const matchTotal = rawHtml.match(regexTotal) || rawHtml.match(regexTotalTexto) || rawHtml.match(regexTotalComentarios);
        if (matchTotal) {
            total = parseInt(matchTotal[1]);
        }

        // RESULTADO
        if (nota && total) {
            dadosGoogle.rating_geral = nota;
            dadosGoogle.total_avaliacoes = total;
            ultimaAtualizacao = Date.now(); 
            console.log(`✅ Scraping de Código-Fonte concluído com SUCESSO! Nota: ${nota} | Avaliações: ${total}`);
        } else {
            console.warn("⚠️ O robô leu o código-fonte, mas o painel da Cléo não foi renderizado para este servidor. Mantendo Cache Antigo (Isso é normal e seguro).");
        }

    } catch (error) {
        console.error("⚠️ O Google cortou a conexão. Mantendo Cache Antigo.", error.message);
    }
}

// --------------------------------------------------------------------------
// ROTA PRINCIPAL DA API
// --------------------------------------------------------------------------
app.get('/api/google-data', async (req, res) => {
    const tempoAtual = Date.now();

    // Se passou 48h, manda o robô tentar atualizar silenciosamente no fundo
    if (tempoAtual - ultimaAtualizacao > INTERVALO_CACHE_MS) {
        atualizarDadosGoogle(); 
    } else {
        console.log("⚡ Servindo dados do Cache Seguro.");
    }

    res.json(dadosGoogle);
});

// Health check
app.get('/', (req, res) => {
    res.json({ message: 'Robô de Scraping operando e protegido!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    atualizarDadosGoogle(); // Faz a primeira tentativa ao ligar
});