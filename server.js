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
        // Usamos &gl=br para forçar resultados do Brasil
        const searchUrl = 'https://www.google.com/search?q=Cl%C3%A9o+Costureira+Vivi+Xavier+Londrina&hl=pt-BR&gl=br';
        
        const response = await axios.get(searchUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9',
                // PULO DO GATO: Passamos um cookie falso afirmando que já aceitamos os termos de LGPD/Privacidade do Google
                'Cookie': 'CONSENT=YES+cb.20230101-01-p0.pt-BR+FX+999;'
            },
            timeout: 10000 // Desiste se demorar mais de 10s
        });

        const $ = cheerio.load(response.data);
        const textHtml = $('body').text(); // Pega todo o texto da página de uma vez
        
        let nota = null;
        let total = null;

        // ESTRATÉGIA DE REGEX: Procuramos por padrões de fala do Google, não por código HTML
        
        // 1. Tenta achar a nota (Padrão: "Classificação 4,9 de 5" ou "4,9 estrelas")
        const regexNota = /Classificação (\d[.,]\d) de 5/i;
        const regexNotaAlt = /(\d[.,]\d)\s+estrelas/i;
        
        const matchNota = textHtml.match(regexNota) || textHtml.match(regexNotaAlt);
        if (matchNota) {
            nota = parseFloat(matchNota[1].replace(',', '.'));
        }

        // 2. Tenta achar o total de avaliações (Padrão: "14 comentários" ou "14 avaliações")
        const regexTotal = /(\d+)\s+(comentários|avaliações)/i;
        const matchTotal = textHtml.match(regexTotal);
        if (matchTotal) {
            total = parseInt(matchTotal[1]);
        }

        // RESULTADO
        if (nota && total) {
            dadosGoogle.rating_geral = nota;
            dadosGoogle.total_avaliacoes = total;
            ultimaAtualizacao = Date.now(); 
            console.log(`✅ Scraping concluído com SUCESSO! Nota: ${nota} | Avaliações: ${total}`);
        } else {
            console.warn("⚠️ O robô burlou o bloqueio, mas os números não estavam no texto da página. Mantendo Cache.");
        }

    } catch (error) {
        console.error("⚠️ O Google bloqueou a conexão do servidor (Captcha). Mantendo Cache Antigo.", error.message);
    }
}

// --------------------------------------------------------------------------
// ROTA PRINCIPAL DA API
// --------------------------------------------------------------------------
app.get('/api/google-data', async (req, res) => {
    const tempoAtual = Date.now();

    if (tempoAtual - ultimaAtualizacao > INTERVALO_CACHE_MS) {
        // Dispara o robô para atualizar em segundo plano
        atualizarDadosGoogle(); 
    } else {
        console.log("⚡ Servindo dados do Cache de 48h.");
    }

    res.json(dadosGoogle);
});

// Health check para o Render
app.get('/', (req, res) => {
    res.json({ message: 'Robô de Scraping operando e protegido!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    atualizarDadosGoogle();
});