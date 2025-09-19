export const CONTENT_PILLARS = {
  CAREER_CLARITY: {
    name: "Career Clarity & Goals",
    description: "Identifying values, building vision, goal-setting, overcoming confusion",
    keywords: ["career clarity", "values", "goals", "vision", "career path", "purpose", "direction", "career confusion", "priorities", "success definition"],
    sampleTopics: [
      "3 Questions to Define Your Ideal Career",
      "How to Spot Misalignment in Your Current Role", 
      "Goal-Setting Framework for the Next 90 Days",
      "Common Myths About 'Success'"
    ],
    audience: "Career Pivoters, Burnt Out Achievers",
    contentTypes: ["framework videos", "assessment tools", "reflection prompts"]
  },
  
  PERSONAL_BRANDING: {
    name: "Personal Branding & Visibility",
    description: "LinkedIn strategy, content creation, authentic messaging, building visibility",
    keywords: ["personal branding", "LinkedIn", "visibility", "thought leadership", "content strategy", "networking", "online presence", "storytelling", "credibility"],
    sampleTopics: [
      "How to Stand Out on LinkedIn",
      "Personal Brand Audits: Before & After",
      "3 Mistakes Killing Your Online Presence",
      "Content Calendar Template"
    ],
    audience: "Side Hustle Seekers, Ambitious Climbers",
    contentTypes: ["LinkedIn strategy", "content templates", "brand audits"]
  },
  
  STRATEGIC_GROWTH: {
    name: "Strategic Growth & Skills Development", 
    description: "Skill development, continuous learning, career advancement, negotiation",
    keywords: ["skill development", "upskilling", "learning", "career advancement", "negotiation", "promotion", "professional development", "growth mindset"],
    sampleTopics: [
      "Top Skills to Thrive in 2025",
      "Negotiation Scripts That Got Me a 20% Raise",
      "From Good to Great: Leveling Up Your Professional Abilities",
      "Upskilling with Micro-Learning"
    ],
    audience: "Ambitious Climbers, Recent Casualties",
    contentTypes: ["skill frameworks", "negotiation scripts", "learning strategies"]
  },
  
  WORKPLACE_ADVOCACY: {
    name: "Workplace Trends, Rights & Advocacy",
    description: "Workplace trends, employee rights, advocacy, culture evaluation",
    keywords: ["workplace trends", "employee rights", "advocacy", "workplace culture", "remote work", "salary transparency", "diversity", "inclusion", "boundaries"],
    sampleTopics: [
      "Top Workplace Trends Shaping the Future of Work",
      "Why Salary Transparency Matters",
      "Remote Work Realities vs. Myths",
      "Employee Wellbeing: Stats You Need to Know"
    ],
    audience: "All segments",
    contentTypes: ["trend analysis", "advocacy content", "industry insights"]
  },
  
  WORK_LIFE_INTEGRATION: {
    name: "Work that Complements Life",
    description: "Work-life balance, personal journey, behind-the-scenes, lifestyle integration", 
    keywords: ["work life balance", "lifestyle", "personal journey", "behind the scenes", "productivity", "habits", "wellness", "boundaries", "sustainable success"],
    sampleTopics: [
      "Day in My Life as a Career Strategist & Creator",
      "Lessons I Learned Leaving Corporate for Entrepreneurship", 
      "Personal Routine That Boosts My Productivity",
      "Behind the Scenes: How I Plan My Content"
    ],
    audience: "Burnt Out Achievers, Side Hustle Seekers",
    contentTypes: ["personal stories", "lifestyle content", "routine optimization"]
  }
};

export const getPillarByKeyword = (keyword) => {
  const lowerKeyword = keyword.toLowerCase();
  
  for (const [pillarId, pillar] of Object.entries(CONTENT_PILLARS)) {
    if (pillar.keywords.some(k => lowerKeyword.includes(k.toLowerCase()) || k.toLowerCase().includes(lowerKeyword))) {
      return { id: pillarId, ...pillar };
    }
  }
  
  return null;
};

export const getAllPillars = () => CONTENT_PILLARS;

export const updatePillars = (newPillars) => {
  Object.assign(CONTENT_PILLARS, newPillars);
};