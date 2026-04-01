/**
 * Soulo Enneagram AI Evaluation System - Subtype Signatures
 *
 * All 27 instinctual subtypes (9 types x 3 variants) with behavioral signatures,
 * countertype flags, look-alike confusions, and discriminators.
 */

import type { SubtypeSignature, EnneagramType } from '../types';

export const SUBTYPE_SIGNATURES: SubtypeSignature[] = [
  // ═══════════════════════════════════════════════════════════════════
  // TYPE 1 SUBTYPES
  // ═══════════════════════════════════════════════════════════════════
  {
    type_id: 1,
    variant: 'SP',
    keyword: 'Worry / Anxiety',
    countertype: true,
    description: 'The countertype 1. Unlike typical 1s who express anger outward as resentment, SP 1s turn their critical energy inward. They worry obsessively about whether they themselves are good enough, correct enough, and doing things right. They are the warmest and most anxious 1s, resembling 6s. Their perfectionism manifests as persistent self-doubt and anxiety about their own imperfections rather than criticism of others.',
    key_patterns: [
      'Intense self-criticism and worry about personal correctness',
      'Anxiety-driven rather than anger-driven',
      'Warm and approachable compared to other 1s',
      'Perfectionism turned inward toward self',
      'Difficulty relaxing due to fear of making mistakes',
      'Material and physical world concerns intertwined with moral concerns',
    ],
    looks_like: [
      { type: 6, reason: 'Anxiety, worry, and self-doubt mirror phobic 6 patterns' },
      { type: 4, reason: 'Self-criticism and internal focus can look like 4 introspection' },
    ],
    discriminators: [
      'SP 1s worry about being correct/good; 6s worry about being safe/supported',
      'SP 1s have a clear inner standard they fall short of; 6s doubt what the standard even is',
      'SP 1s\' anxiety is about imperfection; 6s\' anxiety is about danger',
    ],
  },
  {
    type_id: 1,
    variant: 'SO',
    keyword: 'Non-Adaptability / Rigidity',
    countertype: false,
    description: 'The most visibly "1-like" subtype. SO 1s are focused on teaching, reforming, and modeling correct behavior for groups and society. They are the most rigid and principled, driven by a need to be the exemplar of how things should be done. They can come across as preachy or moralistic, believing they have a duty to improve the world through right action.',
    key_patterns: [
      'Strong opinions about how things should be done in society',
      'Teaching and modeling correct behavior',
      'Rigid adherence to principles in public settings',
      'Moral indignation about social issues',
      'Can appear preachy or self-righteous',
      'Focus on being an exemplar and raising standards',
    ],
    looks_like: [
      { type: 8, reason: 'Strong opinions and forceful presence can look like 8 energy' },
      { type: 3, reason: 'Focus on being exemplary can look like 3 image management' },
    ],
    discriminators: [
      'SO 1s reform from moral imperative; 8s confront from intensity/justice',
      'SO 1s want to be the model; 3s want to be the winner',
      'SO 1s\' energy is principled; 8s\' energy is instinctual',
    ],
  },
  {
    type_id: 1,
    variant: 'SX',
    keyword: 'Zeal / Heat',
    countertype: false,
    description: 'SX 1s channel their reforming energy into intimate relationships and causes they are passionate about. They have an intensity and zeal that can be fiery and even aggressive. They want to perfect their partner or their passionate cause, and can be the most openly angry of the 1 subtypes. Their perfectionism becomes a crusade.',
    key_patterns: [
      'Intense passion about reforming close others or causes',
      'More openly angry than other 1 subtypes',
      'Zealous and missionary in their energy',
      'Focus perfectionism on intimate relationships',
      'Can be controlling of partner under guise of improvement',
      'Fiery intensity that looks unlike typical controlled 1',
    ],
    looks_like: [
      { type: 8, reason: 'Direct anger and intensity can look like 8' },
      { type: 4, reason: 'Emotional intensity in relationships can mimic 4' },
    ],
    discriminators: [
      'SX 1s\' intensity serves moral improvement; 8s\' intensity serves control/protection',
      'SX 1s feel guilt about their anger; 8s feel entitled to their anger',
      'SX 1s\' passion has a "should" quality; 4s\' intensity is about authenticity',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TYPE 2 SUBTYPES
  // ═══════════════════════════════════════════════════════════════════
  {
    type_id: 2,
    variant: 'SP',
    keyword: 'Privilege / Me-First',
    countertype: true,
    description: 'The countertype 2. SP 2s are the least overtly giving of the 2s. Instead of giving to earn love, they charm and attract to have their own needs met - often without directly asking. They are more childlike, cute, and ambivalent about giving. They want to be taken care of but struggle to ask directly. This is the most self-focused 2, which can look unlike typical 2 descriptions.',
    key_patterns: [
      'Charm and attractiveness used to get needs met indirectly',
      'Ambivalent about giving - gives but also wants to receive',
      'More self-focused than other 2 subtypes',
      'Childlike, playful, sometimes helpless presentation',
      'Fear of being seen as needy while actually being needy',
      'Less overtly nurturing, more subtly seductive',
    ],
    looks_like: [
      { type: 7, reason: 'Playful, charming, and self-focused energy mimics 7' },
      { type: 4, reason: 'Focus on own emotional needs can look like 4' },
      { type: 3, reason: 'Charm and image-consciousness can resemble 3' },
    ],
    discriminators: [
      'SP 2s charm to be loved/cared for; 7s charm because they enjoy the interaction',
      'SP 2s\' self-focus is about being lovable; 4s\' self-focus is about identity',
      'SP 2s still orient to relationships; 7s orient to experiences',
    ],
  },
  {
    type_id: 2,
    variant: 'SO',
    keyword: 'Ambition / Power Behind the Throne',
    countertype: false,
    description: 'SO 2s seek influence through strategic relationships and group leadership. They are ambitious about being influential and indispensable to important people and organizations. They position themselves as the power behind the throne, gaining status through their connections and their ability to make things happen for others.',
    key_patterns: [
      'Strategic relationship building with influential people',
      'Ambitious about social influence and position',
      'Power through being indispensable to leaders',
      'Networking as a form of giving and receiving',
      'Political savvy about group dynamics',
      'Pride in social connections and influence',
    ],
    looks_like: [
      { type: 3, reason: 'Ambition and strategic networking look like 3 achievement' },
      { type: 8, reason: 'Power-seeking and influence can mimic 8 energy' },
    ],
    discriminators: [
      'SO 2s seek power through relationships; 3s seek power through personal achievement',
      'SO 2s want to be needed by the powerful; 8s want to be the power',
      'SO 2s\' ambition is about being loved/valued; 3s\' ambition is about being admired',
    ],
  },
  {
    type_id: 2,
    variant: 'SX',
    keyword: 'Seduction / Aggression',
    countertype: false,
    description: 'SX 2s are the most intense and emotionally aggressive of the 2 subtypes. They pursue deep one-on-one connections with passion and can become possessive and overwhelming. Their giving is focused and intense - they want to be THE most important person to their chosen other. When rejected, they can become fierce.',
    key_patterns: [
      'Intense one-on-one emotional connections',
      'Seductive and magnetically attractive energy',
      'Possessive and exclusive in relationships',
      'Fierce when rejected or replaced',
      'Overwhelming generosity toward chosen person',
      'Emotional intensity that can feel suffocating',
    ],
    looks_like: [
      { type: 4, reason: 'Emotional intensity and push-pull in relationships looks like 4' },
      { type: 8, reason: 'Aggression when rejected can look like 8' },
    ],
    discriminators: [
      'SX 2s pursue to be loved; 4s long for what is missing',
      'SX 2s\' aggression comes from rejected love; 8s\' assertiveness comes from need for control',
      'SX 2s need to be needed; 4s need to be understood',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TYPE 3 SUBTYPES
  // ═══════════════════════════════════════════════════════════════════
  {
    type_id: 3,
    variant: 'SP',
    keyword: 'Security / Workaholic',
    countertype: true,
    description: 'The countertype 3. SP 3s are the least image-conscious of the 3s. They achieve through hard work and efficiency rather than self-promotion. They can appear modest and may not seek the spotlight, preferring to let their work speak for itself. They look like 1s in their dedication to doing things well, but their motivation is proving worth through productivity rather than moral correctness.',
    key_patterns: [
      'Workaholism and constant productivity',
      'Modest self-presentation despite high achievement',
      'Efficiency and pragmatism over flash',
      'Avoids self-promotion; lets results speak',
      'Security-oriented - achievement as safety net',
      'Can seem like a 1 or 6 in their conscientiousness',
    ],
    looks_like: [
      { type: 1, reason: 'Hard-working, modest, quality-focused behavior looks like 1' },
      { type: 6, reason: 'Security focus and team orientation can look like 6' },
    ],
    discriminators: [
      'SP 3s work hard to prove worth; 1s work hard to be correct',
      'SP 3s measure success by output; 1s measure success by integrity',
      'SP 3s adapt to what is valued; 1s hold fixed standards',
    ],
  },
  {
    type_id: 3,
    variant: 'SO',
    keyword: 'Prestige / Status',
    countertype: false,
    description: 'The most visibly "3-like" subtype. SO 3s are focused on social image, status, and how they appear to their reference group. They are the most competitive and status-conscious, wanting to be seen as successful by society\'s standards. They are polished, professional, and skilled at reading what a group values.',
    key_patterns: [
      'Strong focus on social status and prestige',
      'Polished, professional self-presentation',
      'Competitive and comparison-oriented',
      'Reads and adapts to group values quickly',
      'Name-dropping and status signaling',
      'Success measured by external recognition',
    ],
    looks_like: [
      { type: 7, reason: 'Social charm and high energy can resemble 7' },
      { type: 8, reason: 'Drive and dominance in social settings can look like 8' },
    ],
    discriminators: [
      'SO 3s want to be admired; 7s want to be entertained',
      'SO 3s adapt image; 8s present authentically (even if abrasively)',
      'SO 3s perform for approval; 7s engage for stimulation',
    ],
  },
  {
    type_id: 3,
    variant: 'SX',
    keyword: 'Charisma / Magnetism',
    countertype: false,
    description: 'SX 3s focus their achievement drive on being attractive and desirable to specific individuals. They are the most emotionally expressive 3s, supporting and promoting the people they are close to. They can appear more like 2s in their relational focus, but their underlying motivation is still about being seen as valuable.',
    key_patterns: [
      'Personal magnetism and charm in one-on-one settings',
      'Promotes and supports close others as an extension of self',
      'More emotionally available than other 3 subtypes',
      'Attractive and appealing self-presentation',
      'Achievement through personal relationships',
      'Can lose self in intimate partnership',
    ],
    looks_like: [
      { type: 2, reason: 'Relational focus and supportiveness looks like 2' },
      { type: 7, reason: 'Charm and enthusiasm can mimic 7' },
    ],
    discriminators: [
      'SX 3s support others to be valued; 2s give to be loved',
      'SX 3s are focused on being desirable; 2s are focused on being indispensable',
      'SX 3s can detach from feelings for goals; 2s can\'t detach from others\' feelings',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TYPE 4 SUBTYPES
  // ═══════════════════════════════════════════════════════════════════
  {
    type_id: 4,
    variant: 'SP',
    keyword: 'Tenacity / Endurance',
    countertype: true,
    description: 'The countertype 4. SP 4s internalize suffering and endure pain stoically rather than expressing it dramatically. They are the toughest and most resilient 4s, pushing through hardship without complaint. They may not appear emotionally expressive on the surface, making them harder to identify as 4s. Their envy manifests as a quiet determination to prove they can handle anything.',
    key_patterns: [
      'Stoic endurance of suffering without drama',
      'Tough, resilient, self-reliant exterior',
      'Internalizes pain rather than expressing it',
      'Demands a lot of self - masochistic quality',
      'Does not complain or seek sympathy',
      'Envy expressed as quiet determination rather than longing',
    ],
    looks_like: [
      { type: 1, reason: 'Stoic self-discipline and toughness looks like 1' },
      { type: 5, reason: 'Emotional containment and self-reliance can look like 5' },
      { type: 3, reason: 'Action-oriented endurance can resemble 3 drive' },
    ],
    discriminators: [
      'SP 4s endure to prove their depth; 1s discipline themselves for correctness',
      'SP 4s\' containment hides emotional intensity; 5s\' containment reflects emotional distance',
      'SP 4s are motivated by identity; 3s are motivated by achievement',
    ],
  },
  {
    type_id: 4,
    variant: 'SO',
    keyword: 'Shame / Suffering',
    countertype: false,
    description: 'SO 4s wear their suffering visibly and compare themselves unfavorably to others in the social group. They are the most shame-driven 4s, feeling that they are fundamentally lacking compared to everyone else. Their envy is overt and can manifest as either withdrawal from or competition with the group.',
    key_patterns: [
      'Visible suffering and emotional expression in social settings',
      'Constant comparison to others (always coming up short)',
      'Shame about perceived deficiencies',
      'Feels like the outsider in every group',
      'May alternate between withdrawal and dramatic expression',
      'Competitive envy - wants what others have',
    ],
    looks_like: [
      { type: 6, reason: 'Social anxiety and group-comparison can look like 6' },
      { type: 2, reason: 'Emotional expression and social sensitivity can resemble 2' },
    ],
    discriminators: [
      'SO 4s compare to feel unique/deficient; 6s compare to feel safe/belonging',
      'SO 4s\' social pain is about identity; 2s\' social focus is about being needed',
    ],
  },
  {
    type_id: 4,
    variant: 'SX',
    keyword: 'Competition / Hate',
    countertype: false,
    description: 'SX 4s are the most intense and aggressive 4s. Rather than internalizing their envy, they externalize it through competition and can become demanding and rageful. They want what others have and can be vocal about their dissatisfaction. They are the most assertive 4 subtype and can be mistaken for 8s.',
    key_patterns: [
      'Active competition and assertion of needs',
      'Externalized envy - vocal dissatisfaction',
      'Intense, demanding presence in relationships',
      'Rageful when feeling unseen or deprived',
      'More aggressive than typically expected of 4s',
      'Hate/anger as an expression of unmet longing',
    ],
    looks_like: [
      { type: 8, reason: 'Assertiveness, anger, and demanding presence look like 8' },
      { type: 6, reason: 'Reactivity and intensity can resemble counterphobic 6' },
    ],
    discriminators: [
      'SX 4s\' aggression comes from frustrated longing; 8s\' aggression comes from need for control',
      'SX 4s want to be understood and feel special; 8s want to be respected and autonomous',
      'SX 4s\' anger follows from hurt; 8s\' anger is their primary stance',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TYPE 5 SUBTYPES
  // ═══════════════════════════════════════════════════════════════════
  {
    type_id: 5,
    variant: 'SP',
    keyword: 'Castle / Home',
    countertype: false,
    description: 'SP 5s are the most withdrawn and resource-conserving of the 5 subtypes. They create a physical sanctuary (their "castle") and minimize their needs to an extreme. They are the most hermit-like, requiring very clear boundaries around their space, time, and energy.',
    key_patterns: [
      'Creates a physical sanctuary with clear boundaries',
      'Extreme minimization of needs and consumption',
      'Hermit-like withdrawal to conserve resources',
      'Very private about personal space and possessions',
      'Practical and material focus on self-sufficiency',
      'The most introverted of all 27 subtypes',
    ],
    looks_like: [
      { type: 9, reason: 'Withdrawal and low-energy presentation can look like 9' },
      { type: 4, reason: 'Retreat from the world can resemble 4 withdrawal' },
    ],
    discriminators: [
      'SP 5s withdraw to conserve energy; 9s withdraw to avoid discomfort',
      'SP 5s have clear boundaries; 9s have diffuse boundaries',
      'SP 5s minimize needs deliberately; 9s forget their needs',
    ],
  },
  {
    type_id: 5,
    variant: 'SO',
    keyword: 'Totem / Ideals',
    countertype: true,
    description: 'The countertype 5. SO 5s are the most social and engaged of the 5 subtypes. They connect with groups through shared knowledge, ideals, or expertise. They can be quite visible as teachers, experts, or thought leaders within their communities. They look less like typical 5s because of their social engagement, but their connection is always mediated through ideas rather than emotions.',
    key_patterns: [
      'Engages with groups through expertise and shared ideals',
      'More socially visible than other 5 subtypes',
      'Connects through intellectual contribution',
      'Can be a teacher, expert, or thought leader',
      'Still maintains emotional distance even while socially present',
      'Seeks meaning and belonging through ideas and systems',
    ],
    looks_like: [
      { type: 1, reason: 'Idealistic engagement and teaching can look like 1' },
      { type: 7, reason: 'Intellectual enthusiasm and breadth can resemble 7' },
      { type: 6, reason: 'Group engagement and system-thinking can look like 6' },
    ],
    discriminators: [
      'SO 5s engage through ideas; 1s engage through moral standards',
      'SO 5s\' enthusiasm is cerebral; 7s\' enthusiasm is experiential',
      'SO 5s connect through expertise; 6s connect through loyalty',
    ],
  },
  {
    type_id: 5,
    variant: 'SX',
    keyword: 'Confidence / Secret Knowledge',
    countertype: false,
    description: 'SX 5s are the most emotionally intense of the 5 subtypes, though this intensity is usually hidden. They seek deep one-on-one connections based on shared secret or esoteric knowledge. They can be surprisingly passionate in intimate settings while remaining reserved publicly.',
    key_patterns: [
      'Deep one-on-one connections based on shared knowledge',
      'Hidden emotional intensity revealed only to trusted few',
      'Interest in esoteric, hidden, or taboo knowledge',
      'Passionate in private, reserved in public',
      'Seeks confidants who can match intellectual depth',
      'Chemistry and connection through minds meeting',
    ],
    looks_like: [
      { type: 4, reason: 'Hidden intensity and depth of connection can look like 4' },
      { type: 8, reason: 'Private intensity can be mistaken for controlled 8 energy' },
    ],
    discriminators: [
      'SX 5s connect through shared knowledge; 4s connect through shared feeling',
      'SX 5s\' intensity is cerebral at core; 4s\' intensity is emotional at core',
      'SX 5s compartmentalize feelings; 4s amplify feelings',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TYPE 6 SUBTYPES
  // ═══════════════════════════════════════════════════════════════════
  {
    type_id: 6,
    variant: 'SP',
    keyword: 'Warmth / Affection',
    countertype: false,
    description: 'SP 6s manage their anxiety by building warm, reliable alliances and being personally likable. They are the warmest and most openly anxious 6s, using friendliness and personal connection as their security strategy. They seek safety through being trustworthy and having trustworthy allies.',
    key_patterns: [
      'Warm, friendly, and personally likable presentation',
      'Seeks safety through reliable personal relationships',
      'Openly anxious and seeking reassurance',
      'Dutiful and responsible in personal obligations',
      'Cautious decision-making with input from trusted allies',
      'Home and personal security as primary concerns',
    ],
    looks_like: [
      { type: 2, reason: 'Warmth and relational focus can look like 2' },
      { type: 9, reason: 'Agreeableness and desire for harmony can resemble 9' },
    ],
    discriminators: [
      'SP 6s are warm from anxiety (seeking safety); 2s are warm from pride (seeking love)',
      'SP 6s test trustworthiness; 9s accept readily',
      'SP 6s\' warmth has a vigilant quality; 2s\' warmth has a giving quality',
    ],
  },
  {
    type_id: 6,
    variant: 'SO',
    keyword: 'Duty / Ideology',
    countertype: false,
    description: 'SO 6s find security through belonging to groups, following rules, and adhering to ideologies or systems. They are the most rule-following and authority-referencing 6s. They manage anxiety by knowing the rules, following the protocol, and being a good member of the group.',
    key_patterns: [
      'Finds security through group membership and shared ideology',
      'Rule-following and protocol-adherent',
      'References authority and group norms',
      'Dutiful and responsible to institutions',
      'Anxiety managed through knowing and following the rules',
      'Can be dogmatic about group beliefs',
    ],
    looks_like: [
      { type: 1, reason: 'Rule-following and duty can look like 1 principled behavior' },
      { type: 3, reason: 'Group conformity and role-playing can resemble 3' },
    ],
    discriminators: [
      'SO 6s follow rules from anxiety; 1s follow rules from inner conviction',
      'SO 6s reference external authority; 1s are their own authority',
      'SO 6s\' rule-following is about safety; 3s\' conformity is about image',
    ],
  },
  {
    type_id: 6,
    variant: 'SX',
    keyword: 'Strength / Beauty (Counterphobic)',
    countertype: true,
    description: 'The countertype 6. SX 6s (counterphobic 6s) manage fear by confronting it directly. They move toward danger rather than away from it, can appear bold and aggressive, and often look like 8s. However, their assertiveness is reactive (driven by underlying anxiety) rather than proactive. They test their own courage by challenging authority and facing their fears.',
    key_patterns: [
      'Confronts fear directly - moves toward danger',
      'Bold, assertive, sometimes aggressive presentation',
      'Reactive rather than proactive strength',
      'Tests own courage through challenging situations',
      'Challenges authority to test its legitimacy',
      'Underneath aggression lies anxiety and doubt',
      'Attracted to intensity and risk',
      'Can be intimidating despite underlying insecurity',
    ],
    looks_like: [
      { type: 8, reason: 'Assertiveness, confrontation, and physical presence strongly resemble 8' },
      { type: 3, reason: 'Drive and competitiveness can look like 3' },
      { type: 1, reason: 'Righteous anger and challenging injustice can look like SX 1' },
    ],
    discriminators: [
      'CP 6s are reactive (fear-driven); 8s are proactive (instinct-driven)',
      'CP 6s doubt underneath; 8s have certainty underneath',
      'CP 6s test authority to verify it; 8s challenge authority to overthrow it',
      'CP 6s question their own strength; 8s trust their own strength',
      'CP 6s\' aggression is compensatory; 8s\' aggression is natural',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TYPE 7 SUBTYPES
  // ═══════════════════════════════════════════════════════════════════
  {
    type_id: 7,
    variant: 'SP',
    keyword: 'Keeper of the Castle / Network',
    countertype: false,
    description: 'SP 7s are the most practical and grounded of the 7 subtypes. They create networks of opportunities and alliances to ensure they always have options for comfort and security. They are pragmatic about getting their needs met, and their gluttony manifests in collecting practical advantages and pleasurable experiences.',
    key_patterns: [
      'Practical opportunity-seeking and networking',
      'Creates safety nets and backup plans',
      'Grounded and resourceful compared to other 7s',
      'Collects practical advantages and pleasant experiences',
      'Strategic about comfort and security',
      'Less flighty than other 7s - more follow-through',
    ],
    looks_like: [
      { type: 3, reason: 'Pragmatic networking and efficiency can look like 3' },
      { type: 6, reason: 'Planning and security-focus can resemble 6' },
    ],
    discriminators: [
      'SP 7s plan for pleasure/options; 6s plan for safety/worst cases',
      'SP 7s network to expand options; 3s network to advance status',
      'SP 7s are fundamentally optimistic; 6s are fundamentally cautious',
    ],
  },
  {
    type_id: 7,
    variant: 'SO',
    keyword: 'Sacrifice / Service',
    countertype: true,
    description: 'The countertype 7. SO 7s suppress their gluttony through service to others and idealistic causes. They are the most selfless-appearing 7s, channeling their desire for stimulation into making the world better. They can look like 2s in their service orientation, but their underlying motivation is still about avoiding personal pain through staying busy with worthy pursuits.',
    key_patterns: [
      'Service-oriented and idealistic',
      'Channels desire for stimulation into causes',
      'Suppresses personal gluttony through sacrifice',
      'Appears less selfish than other 7 subtypes',
      'Guilt about pursuing personal pleasure',
      'Busy with worthy pursuits that happen to be stimulating',
      'Anti-gluttony stance that masks gluttony for meaning',
    ],
    looks_like: [
      { type: 2, reason: 'Service orientation and apparent selflessness look like 2' },
      { type: 1, reason: 'Idealism and self-sacrifice can resemble 1' },
    ],
    discriminators: [
      'SO 7s serve to avoid personal pain; 2s serve to earn love',
      'SO 7s\' idealism is about having stimulating purpose; 1s\' idealism is about moral correctness',
      'SO 7s still avoid pain (through meaning); 2s avoid acknowledging needs',
    ],
  },
  {
    type_id: 7,
    variant: 'SX',
    keyword: 'Fascination / Suggestibility',
    countertype: false,
    description: 'SX 7s are the most idealistic and fantasy-oriented of the 7 subtypes. They seek stimulation through intense one-on-one connections, new ideas, and visionary possibilities. They are dreamers who see the world through rose-colored glasses, especially in relationships. They can be suggestible, easily fascinated, and prone to idealizing.',
    key_patterns: [
      'Idealistic and fantasy-oriented, especially in relationships',
      'Fascinated by new ideas, people, and possibilities',
      'Rose-colored glasses view of the world',
      'Enthusiastic and visionary energy',
      'Easily bored, constantly seeking novelty',
      'Suggestible and drawn to charismatic ideas/people',
    ],
    looks_like: [
      { type: 4, reason: 'Romantic idealization and intensity in relationships can look like 4' },
      { type: 2, reason: 'Enthusiasm about people can resemble 2' },
    ],
    discriminators: [
      'SX 7s idealize what they might gain; 4s idealize what they have lost',
      'SX 7s are future-focused (what could be); 4s are past-focused (what is missing)',
      'SX 7s reframe pain as possibility; 4s dwell in pain as authenticity',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TYPE 8 SUBTYPES
  // ═══════════════════════════════════════════════════════════════════
  {
    type_id: 8,
    variant: 'SP',
    keyword: 'Satisfaction / Survival',
    countertype: false,
    description: 'SP 8s are the most pragmatic and self-sufficient of the 8 subtypes. They focus their intensity on securing material resources, physical comfort, and practical survival. They are the most grounded and least ideological 8s, focused on getting what they need to survive and thrive.',
    key_patterns: [
      'Pragmatic focus on material security and comfort',
      'Self-sufficient and resourceful',
      'Grounded and practical intensity',
      'Direct about getting needs met',
      'Less interested in power over others, more in self-provision',
      'Can appear less aggressive than other 8s in non-survival situations',
    ],
    looks_like: [
      { type: 3, reason: 'Practical drive and results-orientation can look like 3' },
      { type: 1, reason: 'Grounded self-sufficiency can resemble 1 discipline' },
    ],
    discriminators: [
      'SP 8s secure resources for independence; 3s achieve for recognition',
      'SP 8s are direct about needs; 1s are principled about standards',
      'SP 8s\' drive is instinctual; 3s\' drive is image-based',
    ],
  },
  {
    type_id: 8,
    variant: 'SO',
    keyword: 'Solidarity / Social Protection',
    countertype: true,
    description: 'The countertype 8. SO 8s channel their intensity into protecting groups, communities, and causes. They are the most idealistic and least personally aggressive of the 8 subtypes. They look less like typical 8s because their power is directed outward toward social justice rather than personal dominance. They can appear almost gentle in personal interactions while being fierce about their cause.',
    key_patterns: [
      'Protects groups, communities, and underdogs',
      'Channels intensity into social causes and justice',
      'Less personally aggressive than other 8 subtypes',
      'Idealistic about protecting the vulnerable',
      'Can appear gentle in personal settings',
      'Fierce about causes while being kind to individuals',
      'Leadership through solidarity rather than domination',
    ],
    looks_like: [
      { type: 2, reason: 'Protective nurturing of groups can look like 2' },
      { type: 1, reason: 'Social justice orientation can resemble 1 moral reforming' },
      { type: 6, reason: 'Group loyalty and protectiveness can look like 6' },
    ],
    discriminators: [
      'SO 8s protect from strength; 2s nurture from need to be needed',
      'SO 8s fight for justice instinctually; 1s fight for justice principally',
      'SO 8s lead from power; 6s organize from anxiety about group safety',
    ],
  },
  {
    type_id: 8,
    variant: 'SX',
    keyword: 'Possession / Surrender',
    countertype: false,
    description: 'SX 8s are the most intense and emotionally raw of the 8 subtypes. They focus their power and control on intimate relationships, where they can be both dominating and surprisingly vulnerable. They want to possess and be possessed by their intimate partner. Their intensity in one-on-one connection is unmatched.',
    key_patterns: [
      'Extreme intensity in intimate relationships',
      'Desire to possess and be possessed',
      'Most emotionally raw and vulnerable 8 subtype (in private)',
      'Dominating presence in close relationships',
      'All-or-nothing approach to intimacy',
      'Can alternate between control and surrender',
    ],
    looks_like: [
      { type: 4, reason: 'Emotional intensity and possessiveness in relationships can look like SX 4' },
      { type: 2, reason: 'Intense focus on partner can resemble SX 2' },
    ],
    discriminators: [
      'SX 8s possess from strength; 4s cling from fear of abandonment',
      'SX 8s surrender as a choice; 2s surrender to be loved',
      'SX 8s\' vulnerability is earned by their partner; 4s\' vulnerability is their default state',
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // TYPE 9 SUBTYPES
  // ═══════════════════════════════════════════════════════════════════
  {
    type_id: 9,
    variant: 'SP',
    keyword: 'Appetite / Comfort',
    countertype: false,
    description: 'SP 9s narcotize through physical comfort, routine, and simple pleasures. They are the most grounded and least ambitious 9s, finding peace through familiar activities, food, nature, and physical comfort. They can appear the most stubborn when their routines are disrupted.',
    key_patterns: [
      'Narcotizes through physical comfort and routine',
      'Grounded in simple, familiar pleasures',
      'Strong attachment to habits and comfort activities',
      'Stubborn resistance to change or disruption',
      'Uses food, sleep, TV, or nature to self-soothe',
      'Content with very little - low ambition',
    ],
    looks_like: [
      { type: 5, reason: 'Low-energy withdrawal and simplicity can look like 5' },
      { type: 7, reason: 'Appetite and pleasure-seeking can superficially resemble 7' },
    ],
    discriminators: [
      'SP 9s seek comfort to numb; 5s withdraw to conserve energy',
      'SP 9s\' pleasure is routine-based; 7s\' pleasure is novelty-based',
      'SP 9s are passive about pleasure; 7s are active about stimulation',
    ],
  },
  {
    type_id: 9,
    variant: 'SO',
    keyword: 'Participation / Belonging',
    countertype: false,
    description: 'SO 9s find peace through group belonging and social participation. They merge with the group identity and work hard to maintain harmony within their communities. They are the most social and outwardly engaged 9s, but they sacrifice personal agenda for group cohesion.',
    key_patterns: [
      'Merges with group identity and priorities',
      'Hard worker who serves group harmony',
      'Sacrifices personal agenda for group cohesion',
      'Active social participation to maintain belonging',
      'Can be quite busy and productive (for the group)',
      'Loses self in group activities and relationships',
    ],
    looks_like: [
      { type: 2, reason: 'Service to others and group participation can look like 2' },
      { type: 6, reason: 'Group loyalty and belonging-focus can look like 6' },
      { type: 3, reason: 'Busyness and productivity can look like 3' },
    ],
    discriminators: [
      'SO 9s serve to belong; 2s serve to be loved',
      'SO 9s merge passively with group; 6s engage anxiously with group',
      'SO 9s are busy to avoid self; 3s are busy to achieve',
    ],
  },
  {
    type_id: 9,
    variant: 'SX',
    keyword: 'Fusion / Union',
    countertype: true,
    description: 'The countertype 9. SX 9s are the most intense and least obviously "9-like" subtype. They merge completely with a significant other, taking on their partner\'s interests, energy, and identity. They can appear passionate and engaged (through their partner) while still losing themselves. They are the least lazy-looking 9s because they borrow their partner\'s drive.',
    key_patterns: [
      'Complete merger with a significant other',
      'Takes on partner\'s interests, energy, and identity',
      'Can appear passionate and driven (through partner)',
      'Least obviously "9-like" of the subtypes',
      'Intensity focused on one-on-one fusion',
      'Loses self in relationship more than any other subtype',
      'Borrows partner\'s agenda as their own',
    ],
    looks_like: [
      { type: 2, reason: 'Intense relational focus and merger can look like 2' },
      { type: 4, reason: 'Romantic intensity and longing for union can resemble 4' },
    ],
    discriminators: [
      'SX 9s merge to dissolve self; 2s merge to be needed',
      'SX 9s lose themselves in the other; 4s intensify themselves through the other',
      'SX 9s\' intensity is borrowed; 2s\' intensity is their own',
      'SX 9s feel complete through fusion; 4s feel incomplete despite fusion',
    ],
  },
];

// ── Lookup Functions ────────────────────────────────────────────────

/**
 * Get all three subtypes for a given type.
 */
export function getSubtypesForType(typeId: EnneagramType): SubtypeSignature[] {
  return SUBTYPE_SIGNATURES.filter(s => s.type_id === typeId);
}

/**
 * Get a specific subtype.
 */
export function getSubtype(typeId: EnneagramType, variant: 'SP' | 'SO' | 'SX'): SubtypeSignature | undefined {
  return SUBTYPE_SIGNATURES.find(s => s.type_id === typeId && s.variant === variant);
}

/**
 * Get all countertypes across all types.
 */
export function getCountertypes(): SubtypeSignature[] {
  return SUBTYPE_SIGNATURES.filter(s => s.countertype);
}

/**
 * Get all subtypes of a given variant.
 */
export function getSubtypesByVariant(variant: 'SP' | 'SO' | 'SX'): SubtypeSignature[] {
  return SUBTYPE_SIGNATURES.filter(s => s.variant === variant);
}

/**
 * Get types that a specific subtype could be confused with.
 */
export function getLookAlikes(typeId: EnneagramType, variant: 'SP' | 'SO' | 'SX'): { type: EnneagramType; reason: string }[] {
  const subtype = getSubtype(typeId, variant);
  return subtype?.looks_like ?? [];
}
