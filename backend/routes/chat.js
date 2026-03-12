const express = require('express');
const router = express.Router();

// Mock AI Assistant Logic for "Raitha Mithra"
// In a real app, this would use Gemini or OpenAI API
const responses = {
  en: {
    greeting: "Hello! I am Raitha Mithra, your digital farming assistant. How can I help you today?",
    unknown: "I'm not sure I understand. You can ask me to 'sell crops', 'check prices', or 'report spoilage'.",
    navigate_sell: "I'll take you to the Add Crop page. You can list your harvest there.",
    navigate_dashboard: "Going back to your main dashboard.",
    navigate_predict: "Let's check the market trends using our AI Predictor.",
    navigate_rescue: "Opening the Spoilage Rescue Network. We'll help you find urgent buyers.",
    navigate_orders: "Opening your orders page to check pending requests."
  },
  kn: { // Kannada
    greeting: "ನಮಸ್ಕಾರ! ನಾನು ರೈತ ಮಿತ್ರ, ನಿಮ್ಮ ಡಿಜಿಟಲ್ ಕೃಷಿ ಸಹಾಯಕ. ಇವತ್ತು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
    unknown: "ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ನೀವು 'ಬೆಳೆ ಮಾರಿ', 'ಬೆಲೆ ನೋಡಿ' ಅಥವಾ 'ಸಹಾಯ ಬೇಕು' ಎಂದು ಕೇಳಬಹುದು.",
    navigate_sell: "ಬೆಳೆ ಸೇರಿಸುವ ಪುಟಕ್ಕೆ ಹೋಗೋಣ.",
    navigate_dashboard: "ಮುಖ್ಯ ಪುಟಕ್ಕೆ ಹಿಂತಿರುಗುತ್ತಿದ್ದೇವೆ."
  },
  hi: { // Hindi
    greeting: "नमस्ते! मैं रायथ मित्र हूँ, आपका डिजिटल खेती सहायक। आज मैं आपकी क्या मदद कर सकता हूँ?",
    unknown: "क्षमा करें, मुझे समझ नहीं आया। आप 'फसल बेचें', 'कीमतें देखें' या 'मदद चाहिए' पूछ सकते हैं।"
  }
};

router.post('/', async (req, res) => {
  try {
    const { message, lang = 'en' } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const input = message.toLowerCase();
    const l = responses[lang] || responses['en'];
    let action = null;
    let reply = l.unknown;

    // Basic Intent Mapping
    if (input.includes('sell') || input.includes('mari') || input.includes('bech')) {
      reply = l.navigate_sell;
      action = { type: 'navigate', url: '/add-crop.html' };
    } else if (input.includes('price') || input.includes('predict') || input.includes('bele') || input.includes('kimat')) {
      reply = l.navigate_predict || responses.en.navigate_predict;
      action = { type: 'navigate', url: '/ai-predictor.html' };
    } else if (input.includes('rescue') || input.includes('spoil') || input.includes('urgent') || input.includes('sahaya')) {
      reply = l.navigate_rescue || responses.en.navigate_rescue;
      action = { type: 'navigate', url: '/spoilage-rescue.html' };
    } else if (input.includes('order') || input.includes('request')) {
      reply = l.navigate_orders || responses.en.navigate_orders;
      action = { type: 'navigate', url: '/order-management.html' };
    } else if (input.includes('home') || input.includes('dashboard')) {
      reply = l.navigate_dashboard;
      action = { type: 'navigate', url: '/farmer-dashboard.html' };
    } else if (input.includes('hi') || input.includes('hello') || input.includes('namaste')) {
      reply = l.greeting;
    }

    res.json({
      success: true,
      reply,
      action
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
