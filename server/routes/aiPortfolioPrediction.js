const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash-lite", 
    generationConfig: { response_mime_type: "application/json" }
});

async function getAIPortfolioPrediction(features) {
    console.log('--- Calling Gemini API for AI portfolio prediction ---');
    
    const prompt = `You are a professional portfolio manager. Analyze the given stock features and suggest optimal portfolio weights.
Given the following stock features:
${features.map((f, i) => `Stock ${i + 1}:
- Returns: ${f.returns}
- Risk: ${f.risk}
- Sharpe Ratio: ${f.sharpeRatio}`).join('\n')}

Please analyze these stocks and suggest optimal portfolio weights that maximize the Sharpe Ratio while maintaining diversification.
Return a single, valid JSON object with two keys:
1.  "weights": An array of numbers that sum to 1.
2.  "analysis": A brief string (2-3 sentences) explaining *why* you chose these weights, based on risk, returns, and diversification.

Example:
{
  "weights": [0.4, 0.3, 0.3],
  "analysis": "I prioritized Stock 1 due to its high Sharpe Ratio, while balancing with Stocks 2 and 3 to reduce overall portfolio volatility."
}
`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponseText = response.text();
        const aiObject = JSON.parse(aiResponseText); 

        const weights = aiObject.weights;
        const sum = weights.reduce((a, b) => a + b, 0);
        if (Math.abs(sum - 1) > 0.01) {
            aiObject.weights = weights.map(w => w / sum);
        }
        
        return aiObject;

    } catch (error) {
        console.error('!!! Critical Error in getAIPortfolioPrediction:', error);
        throw new Error('AI prediction failed: ' + error.message);
    }
}

router.post('/ai-predict', async (req, res) => {
    try {
        const { features } = req.body;
        const aiResult = await getAIPortfolioPrediction(features);
        res.json(aiResult); 
        
    } catch (error) {
        console.error('Error in /ai-predict route:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error in AI prediction',
            error: error.message 
        });
    }
});

module.exports = { router, getAIPortfolioPrediction };