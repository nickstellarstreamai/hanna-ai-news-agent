import express from 'express';
import chatbotService from '../services/chatbotService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  try {
    const { message, userId, context = {} } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({
        error: 'Message and userId are required'
      });
    }

    const response = await chatbotService.processMessage(userId, message, context);
    
    res.json({
      success: true,
      ...response
    });
  } catch (error) {
    logger.error('Chatbot API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
});

router.get('/suggestions', async (req, res) => {
  try {
    const suggestions = [
      "What's trending in career content this week?",
      "Give me 3 TikTok ideas about salary negotiation",
      "What should I post on LinkedIn today?",
      "How do I create content about remote work trends?",
      "What's the best format for leadership content?",
      "Show me what's working for competitors",
      "Help me brainstorm hooks for job search content",
      "What topics should I avoid this week?"
    ];
    
    res.json({
      success: true,
      suggestions: suggestions.slice(0, 4)
    });
  } catch (error) {
    logger.error('Suggestions API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
});

router.post('/generate-idea', async (req, res) => {
  try {
    const { prompt, platform, userId } = req.body;
    
    if (!prompt || !userId) {
      return res.status(400).json({
        error: 'Prompt and userId are required'
      });
    }

    const message = `Generate a content idea for ${platform || 'the best platform'}: ${prompt}`;
    const response = await chatbotService.processMessage(userId, message);
    
    res.json({
      success: true,
      idea: response.content,
      sources: response.sources
    });
  } catch (error) {
    logger.error('Idea generation API error:', error);
    res.status(500).json({
      error: 'Internal server error',
      success: false
    });
  }
});

export default router;