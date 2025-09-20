#!/usr/bin/env node

import 'dotenv/config';
import { google } from 'googleapis';
import fs from 'fs/promises';

console.log('🔍 Analyzing Your Perfect Document Format...\n');

async function analyzePerfectDocument() {
  try {
    // Initialize OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/auth/callback'
    );

    // Load tokens
    const tokenData = await fs.readFile('./data/google-oauth-token.json', 'utf8');
    const tokens = JSON.parse(tokenData);
    oauth2Client.setCredentials(tokens);

    const docs = google.docs({ version: 'v1', auth: oauth2Client });

    console.log('📄 Reading your perfectly formatted document...');

    // Get the document content
    const docResponse = await docs.documents.get({
      documentId: '15euyiZsDgIvkdiRzqTot0Q1rf8IHcG_8U-mtKg-iP1Y'
    });

    const document = docResponse.data;
    console.log(`✅ Document loaded: ${document.title}`);

    console.log('\n📋 Analyzing document structure...');

    // Analyze the document content
    const content = document.body.content;
    const formatAnalysis = {
      headings: [],
      textElements: [],
      structure: [],
      formatting: {}
    };

    for (let i = 0; i < content.length; i++) {
      const element = content[i];

      if (element.paragraph) {
        const paragraph = element.paragraph;
        const style = paragraph.paragraphStyle;

        // Extract text content
        let text = '';
        if (paragraph.elements) {
          for (const textElement of paragraph.elements) {
            if (textElement.textRun) {
              text += textElement.textRun.content;
            }
          }
        }

        // Clean up the text
        text = text.replace(/\n/g, '').trim();
        if (!text) continue;

        // Analyze formatting
        const analysis = {
          text: text,
          style: style?.namedStyleType || 'NORMAL_TEXT',
          bullet: paragraph.bullet ? true : false,
          textFormatting: paragraph.elements?.[0]?.textRun?.textStyle || {}
        };

        if (style?.namedStyleType?.includes('HEADING')) {
          formatAnalysis.headings.push(analysis);
        } else {
          formatAnalysis.textElements.push(analysis);
        }

        formatAnalysis.structure.push(analysis);
      }
    }

    console.log(`\n📊 Document Analysis Results:`);
    console.log(`   Total elements: ${formatAnalysis.structure.length}`);
    console.log(`   Headings: ${formatAnalysis.headings.length}`);
    console.log(`   Text elements: ${formatAnalysis.textElements.length}`);

    console.log('\n📝 Document Structure:');
    formatAnalysis.structure.slice(0, 20).forEach((element, index) => {
      const type = element.style.includes('HEADING') ? `[${element.style}]` : '[TEXT]';
      const bullet = element.bullet ? '[BULLET]' : '';
      const bold = element.textFormatting.bold ? '[BOLD]' : '';
      const italic = element.textFormatting.italic ? '[ITALIC]' : '';

      console.log(`${index + 1}. ${type}${bullet}${bold}${italic} ${element.text.substring(0, 60)}...`);
    });

    // Extract the content for updating SAMPLE_REPORT.md
    console.log('\n📄 Extracting formatted content...');

    let formattedContent = '';
    let currentSection = '';

    for (const element of formatAnalysis.structure) {
      if (element.style.includes('HEADING_1')) {
        formattedContent += `# ${element.text}\n\n`;
      } else if (element.style.includes('HEADING_2')) {
        formattedContent += `## ${element.text}\n\n`;
        currentSection = element.text;
      } else if (element.style.includes('HEADING_3')) {
        formattedContent += `### ${element.text}\n\n`;
      } else if (element.bullet) {
        if (element.text.match(/^\d+\./)) {
          formattedContent += `${element.text}\n`;
        } else {
          formattedContent += `- ${element.text}\n`;
        }
      } else {
        // Regular text
        if (element.textFormatting.bold && element.textFormatting.italic) {
          formattedContent += `***${element.text}***\n`;
        } else if (element.textFormatting.bold) {
          formattedContent += `**${element.text}**\n`;
        } else if (element.textFormatting.italic) {
          formattedContent += `*${element.text}*\n`;
        } else {
          formattedContent += `${element.text}\n`;
        }
      }
    }

    // Save the extracted format to update SAMPLE_REPORT.md
    await fs.writeFile('./EXTRACTED_PERFECT_FORMAT.md', formattedContent);
    console.log('\n✅ Perfect format extracted and saved to EXTRACTED_PERFECT_FORMAT.md');

    console.log('\n🎯 Key Formatting Patterns Identified:');
    const headingsByLevel = formatAnalysis.headings.reduce((acc, h) => {
      acc[h.style] = (acc[h.style] || 0) + 1;
      return acc;
    }, {});

    Object.entries(headingsByLevel).forEach(([level, count]) => {
      console.log(`   ${level}: ${count} headings`);
    });

    const bulletCount = formatAnalysis.textElements.filter(e => e.bullet).length;
    const boldCount = formatAnalysis.textElements.filter(e => e.textFormatting.bold).length;
    const italicCount = formatAnalysis.textElements.filter(e => e.textFormatting.italic).length;

    console.log(`   Bullet points: ${bulletCount}`);
    console.log(`   Bold text: ${boldCount}`);
    console.log(`   Italic text: ${italicCount}`);

    return {
      analysis: formatAnalysis,
      extractedContent: formattedContent
    };

  } catch (error) {
    console.error('❌ Document analysis failed:', error.message);
    throw error;
  }
}

analyzePerfectDocument()
  .then(result => {
    console.log('\n🎉 Document analysis complete!');
    console.log('Use EXTRACTED_PERFECT_FORMAT.md to update the formatting system.');
  });