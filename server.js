// --- IMPORTAÇÕES BÁSICAS ---
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();

app.use(cors({
    origin: '*', 
    methods: ['GET']
}));

app.get('/', (req, res) => {
    res.json({ message: 'API da Cléo Costureira está online e operando!' });
});

// --------------------------------------------------------------------------
// ROTA 1: BUSCAR DADOS COMPLETOS DO GOOGLE BUSINESS
// --------------------------------------------------------------------------
app.get('/api/google-data', async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY; 
        const placeId = process.env.GOOGLE_PLACE_ID; 

        if (!apiKey || !placeId) {
            console.warn("Chaves do Google não configuradas.");
            return res.status(503).json({ error: "Configurações da API não definidas." });
        }

        // Adicionamos 'photos' aos campos solicitados ao Google
        const googleApiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total,current_opening_hours,photos&language=pt-BR&key=${apiKey}`;
        
        const response = await axios.get(googleApiUrl);
        
        // NOVO CÓDIGO DE DIAGNÓSTICO: Diz exatamente se o Google bloqueou a chave e o porquê
        if (response.data.status !== 'OK') {
            console.error("⚠️ ERRO NA API DO GOOGLE. Status:", response.data.status);
            if (response.data.error_message) {
                console.error("Motivo detalhado do Google:", response.data.error_message);
            }
            return res.status(400).json({ error: `Google API negou o acesso: ${response.data.status}` });
        }
        
        if (response.data.result) {
            const data = response.data.result;
            
            // Filtra as melhores avaliações
            const melhoresAvaliacoes = data.reviews ? data.reviews.filter(r => r.rating >= 4) : [];

            // Monta o pacote inteligente
            res.json({
                rating_geral: data.rating || 5.0,
                total_avaliacoes: data.user_ratings_total || 0,
                reviews: melhoresAvaliacoes,
                aberto_agora: data.current_opening_hours ? data.current_opening_hours.open_now : null,
                // Pega os códigos (referências) das primeiras 4 fotos para o frontend usar
                photos: data.photos ? data.photos.slice(0, 4).map(p => p.photo_reference) : []
            });

        } else {
            res.status(404).json({ error: 'Nenhum dado encontrado no Google' });
        }
    } catch (error) {
        console.error("Erro na API do Google:", error.message);
        res.status(500).json({ error: "Erro interno no servidor ao contatar o Google" });
    }
});

// --------------------------------------------------------------------------
// ROTA 2: CARREGAR FOTOS DO GOOGLE DE FORMA SEGURA (PROXY)
// --------------------------------------------------------------------------
// Esta rota impede que a sua Chave de API vaze no site.
app.get('/api/google-photo/:reference', async (req, res) => {
    try {
        const reference = req.params.reference;
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        
        // Pede a imagem para o Google limitando a 600px de largura para carregar rápido
        const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photo_reference=${reference}&key=${apiKey}`;
        
        // Pega a imagem como um "fluxo de dados" e manda direto para quem acessou o site
        const response = await axios.get(url, { responseType: 'stream' });
        response.data.pipe(res);
        
    } catch (error) {
        console.error("Erro ao carregar a foto:", error.message);
        res.status(500).send("Erro ao carregar a imagem");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor backend rodando na porta ${PORT}`);
});