const express = require('express');
const router = express.Router();

// Mock AI Prediction Data
// In a real scenario, this would call a Python/ML service or an OpenAI/Gemini API
const cropPriceData = {
  "Wheat": { current: 25, trend: "up", change: 5, recommendation: "Hold for 2 weeks for 10% higher price." },
  "Rice": { current: 40, trend: "stable", change: 1, recommendation: "Sell now at current market rates." },
  "Tomato": { current: 20, trend: "down", change: 15, recommendation: "Sell immediately before prices drop further." },
  "Onion": { current: 35, trend: "up", change: 12, recommendation: "Wait for 1 month for peak seasonal price." },
  "Potato": { current: 18, trend: "stable", change: 2, recommendation: "Market is saturated, look for bulk buyers." },
  "Sugarcane": { current: 310, trend: "up", change: 3, unit: "ton", recommendation: "Factory demand is high, negotiate better rates." }
};

// GET /api/ai/predict?crop=Wheat
router.get('/predict', async (req, res) => {
  try {
    const { crop } = req.query;
    
    if (!crop) {
      return res.status(400).json({ success: false, error: 'Crop name is required' });
    }

    // Fuzzy match or exact match
    const cropName = Object.keys(cropPriceData).find(c => c.toLowerCase() === crop.toLowerCase());
    
    if (!cropName) {
      // Return a "generic" prediction if crop not in mock data
      return res.json({
        success: true,
        crop: crop,
        prediction: {
          current_price: "15-50",
          trend: "neutral",
          confidence: "65%",
          recommendation: "Historical data for this crop is low. Monitor local Mandi rates."
        }
      });
    }

    const data = cropPriceData[cropName];
    
    // Simulate some randomness for "AI" feel
    const variance = (Math.random() * 4 - 2).toFixed(2);
    const predictedPrice = (data.current * (1 + (data.trend === 'up' ? 0.05 : -0.05))).toFixed(2);

    res.json({
      success: true,
      crop: cropName,
      prediction: {
        current_market_price: data.current,
        predicted_price: predictedPrice,
        trend: data.trend,
        volatility: data.change + "%",
        confidence: "88%",
        recommendation: data.recommendation,
        forecast_chart: generateMockChartData(data)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function generateMockChartData(data) {
  const points = [];
  let basePrice = data.current - 5;
  for (let i = 0; i < 7; i++) {
    basePrice += Math.random() * 2;
    points.push({ day: i + 1, price: basePrice.toFixed(2) });
  }
  return points;
}

module.exports = router;
