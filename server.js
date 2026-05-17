// --- IMPORTAÇÕES BÁSICAS ---
// Rode no terminal: npm install express cors axios dotenv
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Configurações de segurança para permitir que o site (Frontend) acesse esta API
app.use(cors({
    origin: '*', // Em produção, você pode alterar para o domínio do site ex: 'https://cleocostureira.com.br'
    methods: ['GET']
}));

// Rota base de verificação (Health Check)
app.get('/', (req, res) => {
    res.json({ message: 'API da Cléo Costureira está online e operando!' });
});

// --------------------------------------------------------------------------
// ROTA 1: BUSCAR AVALIAÇÕES DO GOOGLE BUSINESS (PLACES API)
// --------------------------------------------------------------------------
app.get('/api/reviews', async (req, res) => {
    try {
        // Para que isso funcione 100%, você deve colocar suas chaves no painel do Render (Environment Variables)
        const apiKey = process.env.GOOGLE_PLACES_API_KEY; 
        const placeId = process.env.GOOGLE_PLACE_ID; 

        if (!apiKey || !placeId) {
            console.warn("Chaves do Google não configuradas. Retornando erro amigável para acionar o Fallback do Frontend.");
            return res.status(503).json({ error: "Configurações da API não definidas." });
        }

        // Endpoint oficial da API do Google Places (Details)
        const googleApiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating&language=pt-BR&key=${apiKey}`;
        
        const response = await axios.get(googleApiUrl);
        
        if (response.data.result && response.data.result.reviews) {
            // Filtra as avaliações para pegar apenas as mais bem avaliadas (5 estrelas)
            const melhoresAvaliacoes = response.data.result.reviews.filter(r => r.rating >= 4);
            res.json(melhoresAvaliacoes);
        } else {
            res.status(404).json({ error: 'Nenhuma avaliação encontrada' });
        }
    } catch (error) {
        console.error("Erro ao buscar dados do Google:", error.message);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// --------------------------------------------------------------------------
// ROTA 2: SCRAPING/BUSCA DE FOTOS DO INSTAGRAM
// --------------------------------------------------------------------------
// NOTA: Scraping direto no Instagram pelo Render costuma resultar em bloqueio de IP.
// A recomendação ideal é usar a Instagram Basic Display API (oficial). 
// Contudo, construímos a estrutura robusta usando o padrão de feed aberto.
app.get('/api/instagram', async (req, res) => {
    try {
        // Uma abordagem segura de Web Scraping simples usando perfis públicos baseados em JSON (quando disponível)
        // O username fornecido foi cleo_costureira_2026
        const username = 'cleo_costureira_2026';
        
        // Simulação do comportamento de extração (Caso use uma API de terceiros como Apify ou Instaloader, a lógica entra aqui)
        // Como o scraping real bloqueia no Render, muitos usam serviços que entregam o Feed RSS do instagram, ou a própria API do Face.
        
        // Exemplo da estrutura que o Frontend espera receber:
        /*
        const mockResponse = [
            { url: 'https://instagram.com/p/ID_DA_POST1', imageUrl: 'link_da_imagem_1.jpg' },
            { url: 'https://instagram.com/p/ID_DA_POST2', imageUrl: 'link_da_imagem_2.jpg' }
        ]
        */

        // Se você tiver um token da API Oficial do Instagram, basta fazer a requisição abaixo:
        const instaToken = process.env.INSTAGRAM_ACCESS_TOKEN;
        
        if (instaToken) {
            const url = `https://graph.instagram.com/me/media?fields=id,media_type,media_url,permalink&access_token=${instaToken}`;
            const apiRes = await axios.get(url);
            
            const imagens = apiRes.data.data
                .filter(item => item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM')
                .map(item => ({
                    url: item.permalink,
                    imageUrl: item.media_url
                }));
                
            return res.json(imagens);
        } else {
            // Se não houver token, enviamos erro 503 para que o frontend exiba as belas fotos Fallback do ateliê
            return res.status(503).json({ error: "Token do Instagram não configurado." });
        }

    } catch (error) {
        console.error("Erro ao buscar dados do Instagram:", error.message);
        res.status(500).json({ error: "Erro interno no servidor ao tentar buscar feed" });
    }
});

// --------------------------------------------------------------------------
// INICIA O SERVIDOR
// --------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor backend rodando na porta ${PORT}`);
    console.log(`Pronto para ser hospedado no Render!`);
});