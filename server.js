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

// Rota base de verificação
app.get('/', (req, res) => {
    res.json({ message: 'API da Cléo Costureira está online!' });
});

// --------------------------------------------------------------------------
// ROTA: BUSCAR AVALIAÇÕES DO GOOGLE BUSINESS (PLACES API)
// --------------------------------------------------------------------------
app.get('/api/reviews', async (req, res) => {
    try {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY; 
        const placeId = process.env.GOOGLE_PLACE_ID; 

        if (!apiKey || !placeId) {
            console.warn("Chaves do Google não configuradas.");
            return res.status(503).json({ error: "Configurações da API não definidas." });
        }

        const googleApiUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating&language=pt-BR&key=${apiKey}`;
        
        const response = await axios.get(googleApiUrl);
        
        if (response.data.result && response.data.result.reviews) {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor backend rodando na porta ${PORT}`);
});