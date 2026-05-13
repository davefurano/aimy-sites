window.SITE_CONFIG = {
  siteName: 'AI My Bio',
  oneLineValueProp: 'Everyone hates writing their bio. You need six.',
  subtitle: 'LinkedIn. Twitter. Speaker intro. About page. Email signature. Press kit. Answer five questions \u2014 Claude writes all six.',
  primaryCTA: 'Rewrite My Brand',

  // Evocative names \u2014 every one maps to a real capability in the backend.
  cards: [
    {
      title: 'Style Mimic',
      desc: 'Six tones, one click. Warm. Bold. Executive. Humble. Creative. Professional. Regenerate until it sounds like you on your best day.',
      tag: 'Voice',
      stats: '6 tones',
    },
    {
      title: 'Platform Morph',
      desc: 'Serious for LinkedIn. Punchy for Twitter. Warm for your About page. One line for your email signature. Every format, same truth.',
      tag: 'Formats',
      stats: '6 places',
    },
    {
      title: 'Mirror Score',
      desc: 'Every bio rated 0\u2013100 on clarity, credibility, memorability, keywords, and call-to-action \u2014 with one specific line on how to make it sharper.',
      tag: 'Critique',
      stats: '5 metrics',
    },
    {
      title: 'Story Arc',
      desc: 'Five questions find the through-line in your career. Claude threads it into every bio so you sound like a person, not a LinkedIn template.',
      tag: 'Narrative',
      stats: '5 Qs',
    },
    {
      title: 'Keyword Stuffer',
      desc: 'Drop the terms recruiters and Google search for. Claude weaves them in without making you sound like a SEO robot.',
      tag: 'SEO',
      stats: 'Found',
    },
    {
      title: 'Press Kit',
      desc: 'Third person. Media-ready. Journalists paste it straight into articles, podcasters read it aloud, conference emcees don\u2019t embarrass you.',
      tag: 'PR',
      stats: '180\u2013220w',
    },
  ],

  howItWorks: [
    { title: 'Spill the beans',  desc: 'Five quick questions. What you do, what you\u2019re proud of, what people get wrong, one sentence, what you\u2019re building.' },
    { title: 'Pick your voice', desc: 'Six tones to choose from \u2014 or try them all. Your mirror, your setting.' },
    { title: 'Paste and go',    desc: 'LinkedIn. Twitter. About page. Speaker intro. Email signature. Press kit. Done in 60 seconds.' },
  ],

  // Everything in `cards` above is live today. This list is how we\u2019ll talk about the
  // actual bio output formats on the dashboard / in the product.
  formats: [
    { key: 'linkedin',        title: 'LinkedIn About',       desc: 'Up to 2,000 characters, first person, keyword-rich.' },
    { key: 'speaker_intro',   title: 'Speaker Introduction', desc: '60-second third-person intro for conferences.' },
    { key: 'website_about',   title: 'Website About Page',   desc: '300\u2013500 words, warm and conversational.' },
    { key: 'twitter',         title: 'Twitter / X Bio',      desc: '160 characters, punchy.' },
    { key: 'email_signature', title: 'Email Signature',      desc: 'One-line tagline, under 100 chars.' },
    { key: 'press_kit',       title: 'Press Kit Bio',        desc: '180\u2013220 words, media-ready.' },
  ],

  plans: [
    { key: 'free',     name: 'Free',     price: '$0',   sub: 'forever',  bullets: ['1 bio set', 'Watermarked outputs', 'All 6 formats', 'Mirror Score included'],                             cta: 'Start free',        signupOnly: true },
    { key: 'pro',      name: 'Pro',      price: '$29',  sub: '/month',   bullets: ['Unlimited bio sets', 'All 6 tones', 'No watermark', 'Regenerate anytime'],                                cta: 'Upgrade to Pro' },
    { key: 'lifetime', name: 'Lifetime', price: '$299', sub: 'one-time', bullets: ['Everything in Pro', 'Forever, no subscription', 'Early access to new formats'],                           cta: 'Get Lifetime', highlight: true },
    { key: 'team',     name: 'Team',     price: '$99',  sub: '/month',   bullets: ['Up to 25 members', 'Shared brand voice', 'Admin dashboard'],                                              cta: 'Start Team plan' },
    { key: 'agency',   name: 'Agency',   price: '$299', sub: '/month',   bullets: ['Unlimited members', 'White-label', 'Priority support'],                                                   cta: 'Start Agency plan' },
  ],
};
