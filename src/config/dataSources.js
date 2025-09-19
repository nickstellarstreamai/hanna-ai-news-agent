export const NEWS_SOURCES = {
  NEWSLETTERS: [
    {
      name: "LinkedIn News",
      url: "https://www.linkedin.com/news/",
      type: "scraper",
      topics: ["careers", "recruiting", "professional development"],
      priority: "high"
    },
    {
      name: "HR Brew",
      url: "https://www.hr-brew.com/",
      type: "rss",
      rssUrl: "https://www.hr-brew.com/feed",
      topics: ["hr", "workplace", "hiring"],
      priority: "high"
    },
    {
      name: "Harvard Business Review",
      url: "https://hbr.org/",
      type: "rss",
      rssUrl: "https://feeds.hbr.org/harvardbusiness",
      topics: ["leadership", "management", "business"],
      priority: "medium"
    },
    {
      name: "FlexOS Future of Work",
      url: "https://flexos.work/",
      type: "rss",
      topics: ["remote work", "future of work", "workplace technology"],
      priority: "high"
    },
    {
      name: "Morning Brew",
      url: "https://www.morningbrew.com/",
      type: "rss",
      rssUrl: "https://www.morningbrew.com/feed",
      topics: ["business", "workplace", "economy"],
      priority: "medium"
    }
  ],
  
  SUBSTACKS: [
    {
      name: "Joel Uili",
      url: "https://joeluili.substack.com/",
      type: "rss",
      rssUrl: "https://joeluili.substack.com/feed",
      topics: ["career advice", "professional development"],
      priority: "high"
    },
    {
      name: "Laetitia@Work",
      url: "https://laetitiawork.substack.com/",
      type: "rss",
      rssUrl: "https://laetitiawork.substack.com/feed",
      topics: ["workplace", "career", "leadership"],
      priority: "high"
    },
    {
      name: "Adam Grant - Granted",
      url: "https://adamgrant.substack.com/",
      type: "rss",
      rssUrl: "https://adamgrant.substack.com/feed",
      topics: ["psychology", "workplace", "leadership"],
      priority: "medium"
    },
    {
      name: "FullStack HR",
      url: "https://fullstackhr.substack.com/",
      type: "rss",
      rssUrl: "https://fullstackhr.substack.com/feed",
      topics: ["hr", "recruiting", "workplace"],
      priority: "high"
    }
  ],
  
  REDDIT_SUBREDDITS: [
    {
      name: "r/AskManagers",
      subreddit: "AskManagers",
      topics: ["management", "leadership", "workplace"],
      priority: "high",
      postLimit: 25
    },
    {
      name: "r/careerguidance", 
      subreddit: "careerguidance",
      topics: ["career advice", "job search", "professional development"],
      priority: "high",
      postLimit: 50
    },
    {
      name: "r/jobs",
      subreddit: "jobs",
      topics: ["job search", "hiring", "workplace"],
      priority: "medium",
      postLimit: 30
    },
    {
      name: "r/recruitinghell",
      subreddit: "recruitinghell", 
      topics: ["recruiting", "hiring", "job search"],
      priority: "medium",
      postLimit: 20
    },
    {
      name: "r/resumes",
      subreddit: "resumes",
      topics: ["resume", "job application", "career"],
      priority: "low",
      postLimit: 15
    },
    {
      name: "r/negotiation",
      subreddit: "negotiation",
      topics: ["salary negotiation", "workplace negotiation"],
      priority: "medium",
      postLimit: 20
    },
    {
      name: "r/futureofwork",
      subreddit: "futureofwork",
      topics: ["future of work", "automation", "remote work"],
      priority: "high",
      postLimit: 25
    }
  ],
  
  LABOR_MARKET_DATA: [
    {
      name: "BLS Jobs Report",
      url: "https://www.bls.gov/news.release/empsit.nr0.htm",
      type: "scraper",
      topics: ["employment", "labor market", "economy"],
      priority: "medium",
      schedule: "monthly"
    },
    {
      name: "ZipRecruiter Blog",
      url: "https://www.ziprecruiter.com/blog/",
      type: "rss",
      topics: ["job market", "hiring trends", "employment"],
      priority: "medium"
    },
    {
      name: "Glassdoor Insights",
      url: "https://www.glassdoor.com/research/",
      type: "scraper",
      topics: ["workplace", "salary", "company culture"],
      priority: "medium"
    }
  ]
};

export const SOCIAL_CREATORS = {
  PRIMARY_COMPETITORS: [
    { handle: "inspiredmediaco", platforms: ["tiktok", "linkedin"] },
    { handle: "CatGPT", platforms: ["tiktok", "linkedin"] },
    { handle: "Taiwo Ade", platforms: ["tiktok", "linkedin", "instagram"] },
    { handle: "mckenzie.mack", platforms: ["tiktok", "linkedin"] },
    { handle: "bylillianzhang", platforms: ["tiktok", "linkedin"] },
    { handle: "graceandrewsss", platforms: ["tiktok", "linkedin"] },
    { handle: "erinondemand", platforms: ["tiktok", "linkedin"] },
    { handle: "siliconvalleygirl", platforms: ["tiktok", "linkedin"] },
    { handle: "gannon.meyer", platforms: ["tiktok", "linkedin"] },
    { handle: "tomnoske", platforms: ["tiktok", "linkedin"] }
  ],
  
  CAREER_FOCUSED: [
    { handle: "internshipgirl", platforms: ["tiktok", "instagram"] },
    { handle: "Sophworkbaby", platforms: ["tiktok", "instagram"] },
    { handle: "Kyyahabdul", platforms: ["tiktok", "linkedin"], filter: "career" },
    { handle: "Janel Abrahami", platforms: ["linkedin"] }
  ]
};

export const KEYWORD_THEMES = [
  "job market", "hiring trends", "recruitment", "salary negotiation", 
  "pay transparency", "personal branding", "executive presence",
  "LinkedIn strategy", "LinkedIn algorithm", "future of work", 
  "reskilling", "upskilling", "remote work", "hybrid work",
  "AI and jobs", "employee engagement", "workplace culture",
  "multigenerational workforce", "DEI trends", "manager training",
  "leadership development", "layoffs", "hiring freeze",
  "labor market report", "economic trends", "employment"
];

export const getSourcesByType = (type) => {
  switch(type) {
    case 'newsletters': return NEWS_SOURCES.NEWSLETTERS;
    case 'substacks': return NEWS_SOURCES.SUBSTACKS;
    case 'reddit': return NEWS_SOURCES.REDDIT_SUBREDDITS;
    case 'labor_data': return NEWS_SOURCES.LABOR_MARKET_DATA;
    default: return [];
  }
};

export const getAllSources = () => NEWS_SOURCES;