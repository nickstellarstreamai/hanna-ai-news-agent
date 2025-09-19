export const AUDIENCE_SEGMENTS = {
  CAREER_PIVOTERS: {
    name: "Career Pivoters",
    percentage: "25-30%",
    description: "Currently dissatisfied but unclear on direction",
    demographics: "Women 25-32, 3-7 years experience",
    primaryGoal: "Clear path to fulfilling new career",
    mainChallenges: ["Lack of clarity", "Confidence in transition", "Translating skills"],
    willingToInvest: "$25-50/month",
    painPoints: [
      "Dreading Monday mornings",
      "Feeling stuck in wrong role",
      "Unsure what they actually want",
      "Fear of starting over",
      "Imposter syndrome about new fields"
    ],
    contentNeeds: [
      "Career clarity frameworks",
      "Transition strategies",
      "Skill translation guides",
      "Success stories from pivoters",
      "Confidence building content"
    ],
    preferredFormats: ["Framework videos", "Assessment tools", "Personal stories"],
    keyMessages: [
      "You're not stuck forever",
      "Your skills transfer more than you think",
      "Clarity comes from action, not analysis"
    ]
  },

  AMBITIOUS_CLIMBERS: {
    name: "Ambitious Climbers", 
    percentage: "20-25%",
    description: "Clear goals but stuck in execution",
    demographics: "Women 26-34, 4-10 years experience",
    primaryGoal: "Accelerated advancement and leadership roles",
    mainChallenges: ["Visibility issues", "Political navigation", "Executive presence"],
    willingToInvest: "$50-100/month",
    painPoints: [
      "Working hard but not getting promoted",
      "Being overlooked for opportunities",
      "Struggling with office politics",
      "Lack of executive presence",
      "Not getting credit for work"
    ],
    contentNeeds: [
      "Promotion strategies",
      "Leadership development",
      "Personal branding for advancement",
      "Negotiation tactics",
      "Executive presence building"
    ],
    preferredFormats: ["LinkedIn strategy", "Negotiation scripts", "Leadership frameworks"],
    keyMessages: [
      "You deserve recognition for your work",
      "Visibility is part of the job",
      "Strategic career moves beat hard work alone"
    ]
  },

  RECENT_CASUALTIES: {
    name: "Recent Casualties",
    percentage: "15-20%", 
    description: "Recently laid off or unemployed",
    demographics: "Women 24-35, varies by experience",
    primaryGoal: "Landing aligned role quickly while rebuilding confidence",
    mainChallenges: ["Market navigation", "Confidence", "Job search overwhelm"],
    willingToInvest: "$10-25/month",
    painPoints: [
      "Feeling rejected and defeated",
      "Market seems impossible",
      "Self-doubt about worth",
      "Financial stress",
      "Networking feels inauthentic"
    ],
    contentNeeds: [
      "Job search strategies",
      "Confidence rebuilding",
      "Interview preparation", 
      "Market navigation tips",
      "Quick wins and momentum"
    ],
    preferredFormats: ["Tactical job search tips", "Confidence boosters", "Quick frameworks"],
    keyMessages: [
      "This doesn't define your worth",
      "The market is tough, not you",
      "Your next role will be better aligned"
    ]
  },

  BURNT_OUT_ACHIEVERS: {
    name: "Burnt Out Achievers",
    percentage: "15-20%",
    description: "Successful but exhausted, need sustainable success",
    demographics: "Women 28-35, 5-12 years experience",
    primaryGoal: "Better work-life balance without sacrificing success",
    mainChallenges: ["Burnout recovery", "Setting boundaries", "Redefining success"],
    willingToInvest: "$25-75/month", 
    painPoints: [
      "Success feels empty",
      "Can't maintain current pace",
      "Guilt about wanting balance",
      "Fear of being seen as less committed",
      "Lost sense of what they actually want"
    ],
    contentNeeds: [
      "Boundary setting strategies",
      "Sustainable success models",
      "Burnout recovery",
      "Work-life integration",
      "Redefining achievement"
    ],
    preferredFormats: ["Personal journey stories", "Boundary frameworks", "Lifestyle integration"],
    keyMessages: [
      "Success shouldn't cost your wellbeing",
      "Boundaries make you more effective",
      "You can redefine what winning looks like"
    ]
  },

  SIDE_HUSTLE_SEEKERS: {
    name: "Side Hustle Seekers",
    percentage: "10-15%",
    description: "Want additional income streams and eventual independence",
    demographics: "Women 24-32, 3-8 years experience",
    primaryGoal: "Financial independence and eventual self-employment",
    mainChallenges: ["Time management", "Skill development", "Building visibility"],
    willingToInvest: "$25-50/month",
    painPoints: [
      "Not enough hours in the day",
      "Don't know where to start",
      "Imposter syndrome about expertise",
      "Fear of failure",
      "Balancing current job with side projects"
    ],
    contentNeeds: [
      "Personal branding strategies",
      "Time management systems",
      "Monetization frameworks",
      "Content creation tips",
      "Building audience"
    ],
    preferredFormats: ["Behind-the-scenes content", "Personal branding templates", "Growth strategies"],
    keyMessages: [
      "Your expertise is more valuable than you think",
      "Start before you feel ready", 
      "Small steps lead to big changes"
    ]
  }
};

export const getSegmentByPainPoint = (painPoint) => {
  const lowerPainPoint = painPoint.toLowerCase();
  
  for (const [segmentId, segment] of Object.entries(AUDIENCE_SEGMENTS)) {
    if (segment.painPoints.some(pain => 
      lowerPainPoint.includes(pain.toLowerCase()) || pain.toLowerCase().includes(lowerPainPoint)
    )) {
      return { id: segmentId, ...segment };
    }
  }
  
  return null;
};

export const getContentNeedsForSegments = (segmentIds) => {
  const needs = new Set();
  
  segmentIds.forEach(id => {
    const segment = AUDIENCE_SEGMENTS[id];
    if (segment) {
      segment.contentNeeds.forEach(need => needs.add(need));
    }
  });
  
  return Array.from(needs);
};

export const getAllSegments = () => AUDIENCE_SEGMENTS;