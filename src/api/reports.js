import express from 'express';
import reportGeneration from '../services/reportGeneration.js';
import database from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.post('/generate', async (req, res) => {
  try {
    const { weekStart } = req.body;
    
    logger.info('Manual weekly report generation requested');
    
    const report = await reportGeneration.generateWeeklyReport(weekStart);
    
    res.json({
      success: true,
      report: {
        id: report.reportId,
        weekStart: report.weekStart,
        weekEnd: report.weekEnd,
        ideasCount: report.ideas.length,
        themesCount: report.themes.length,
        reportUrl: report.reportUrl
      },
      message: 'Weekly report generated successfully'
    });
  } catch (error) {
    logger.error('Report generation API error:', error);
    res.status(500).json({
      error: 'Failed to generate weekly report',
      success: false
    });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const reports = await database.getWeeklyReports(parseInt(limit));
    
    const reportsWithSummary = reports.map(report => {
      const data = JSON.parse(report.report_data);
      return {
        id: report.id,
        weekStart: report.week_start_date,
        weekEnd: report.week_end_date,
        generatedDate: report.generated_date,
        ideasCount: report.ideas_count,
        summary: data.summary,
        topThemes: data.themes.slice(0, 3).map(t => t.cluster)
      };
    });
    
    res.json({
      success: true,
      reports: reportsWithSummary
    });
  } catch (error) {
    logger.error('Recent reports API error:', error);
    res.status(500).json({
      error: 'Failed to fetch recent reports',
      success: false
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await database.get(`
      SELECT * FROM weekly_reports WHERE id = ?
    `, [id]);
    
    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        success: false
      });
    }
    
    const reportData = JSON.parse(report.report_data);
    
    res.json({
      success: true,
      report: {
        id: report.id,
        weekStart: report.week_start_date,
        weekEnd: report.week_end_date,
        generatedDate: report.generated_date,
        ...reportData
      }
    });
  } catch (error) {
    logger.error('Get report API error:', error);
    res.status(500).json({
      error: 'Failed to fetch report',
      success: false
    });
  }
});

router.get('/:id/ideas', async (req, res) => {
  try {
    const { id } = req.params;
    const { pillar, platform } = req.query;
    
    let query = `
      SELECT * FROM content_ideas 
      WHERE week_id = ?
    `;
    const params = [id];
    
    if (pillar) {
      query += ` AND pillar_tags LIKE ?`;
      params.push(`%${pillar}%`);
    }
    
    if (platform) {
      query += ` AND platform = ?`;
      params.push(platform);
    }
    
    query += ` ORDER BY generated_date DESC`;
    
    const ideas = await database.all(query, params);
    
    const formattedIdeas = ideas.map(idea => ({
      id: idea.id,
      title: idea.title,
      platform: idea.platform,
      format: idea.format,
      hooks: JSON.parse(idea.hooks),
      keyPoints: JSON.parse(idea.key_points),
      pillarTags: JSON.parse(idea.pillar_tags),
      rationale: idea.rationale,
      sourceLinks: JSON.parse(idea.source_links || '[]'),
      generatedDate: idea.generated_date
    }));
    
    res.json({
      success: true,
      ideas: formattedIdeas
    });
  } catch (error) {
    logger.error('Get report ideas API error:', error);
    res.status(500).json({
      error: 'Failed to fetch report ideas',
      success: false
    });
  }
});

export default router;