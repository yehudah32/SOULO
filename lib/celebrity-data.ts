export interface CelebrityProfile {
  name: string;
  type: number;
  profession: string;
  hook: string;
  description: string;
  photoUrl: string;  // Computed via /api/wiki-image proxy at runtime
  wikiSlug?: string; // Optional — auto-derived from name if not set
  source: string;
}

// All type assignments cross-referenced from Riso-Hudson, Palmer, Enneagram Institute, and Fauvre.
// Photos fetched via Wikipedia REST API (server-side proxy at /api/wiki-image).
// Descriptions framed through the Defiant Spirit lens: wound/gift dynamic, how they defy limitations.

export const CELEBRITY_DATABASE: CelebrityProfile[] = [
  // ═══ TYPE 1 — The Reformer ═══
  {
    name: 'Mahatma Gandhi',
    type: 1,
    profession: 'Political Leader & Activist',
    hook: 'Turned moral conviction into a weapon that toppled an empire.',
    description: 'Gandhi\'s One energy is unmistakable — the relentless inner critic channeled into a force for justice. His gift was seeing exactly what was wrong with the world and refusing to look away. His wound was the same thing: the inability to rest until things were right. He defied the One\'s trap of rigidity by choosing nonviolence over righteous fury — proving that integrity doesn\'t require anger.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Mahatma-Gandhi%2C_studio%2C_1931.jpg/440px-Mahatma-Gandhi%2C_studio%2C_1931.jpg',
    source: 'Riso-Hudson, Palmer',
  },
  {
    name: 'Michelle Obama',
    type: 1,
    profession: 'Author & Former First Lady',
    hook: 'Made excellence look like warmth instead of pressure.',
    description: 'Michelle Obama embodies the One\'s drive for high standards, but she defies the stereotype of the cold perfectionist. Her gift is modeling what principled living looks like without losing your humanity. The wound — the constant awareness of being watched and judged — became fuel for authenticity. She turned "when they go low, we go high" from a slogan into a lived practice.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Michelle_Obama_2013_official_portrait.jpg/440px-Michelle_Obama_2013_official_portrait.jpg',
    source: 'Riso-Hudson, Enneagram Institute',
  },
  {
    name: 'Martha Stewart',
    type: 1,
    profession: 'Entrepreneur & Media Personality',
    hook: 'Built a lifestyle empire from the belief that everything can be done better.',
    description: 'Stewart\'s One pattern is her superpower and her kryptonite in the same breath. The drive to perfect every detail — from tablescaping to business deals — created an empire. But the shadow side surfaced too: the rigidity, the difficulty delegating, the inner critic that accepts nothing less. She defies by reinventing herself after setbacks, proving that perfectionism can coexist with resilience.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Martha_Stewart_2011_Shankbone.JPG/440px-Martha_Stewart_2011_Shankbone.JPG',
    source: 'Riso-Hudson',
  },
  {
    name: 'Nelson Mandela',
    type: 1,
    profession: 'President of South Africa & Activist',
    hook: 'Spent 27 years in prison and came out choosing reconciliation over revenge.',
    description: 'Mandela\'s One energy shows in his unshakable moral compass — the clarity about right and wrong that sustained him through decades of imprisonment. His wound was the weight of responsibility, the knowledge that compromise felt like betrayal. His gift was the rare One capacity to hold principle and pragmatism simultaneously. He defied the One\'s limitation by choosing forgiveness when righteousness demanded fury.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Nelson_Mandela_1994.jpg/440px-Nelson_Mandela_1994.jpg',
    source: 'Palmer, Riso-Hudson',
  },
  {
    name: 'Tina Fey',
    type: 1,
    profession: 'Comedian & Writer',
    hook: 'Weaponized the inner critic and made the world laugh at perfection\'s absurdity.',
    description: 'Fey\'s comedy is pure One energy turned inside out — she sees every flaw, every hypocrisy, every gap between how things are and how they should be. Instead of being crushed by it, she makes it funny. The wound is visible: the self-deprecation, the impossible standards she jokes about. The gift is using that precision to cut through pretense. She defies by laughing at the very perfectionism that drives her.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Tina_Fey_Muppets_Most_Wanted_Premiere_%28cropped%29.jpg/440px-Tina_Fey_Muppets_Most_Wanted_Premiere_%28cropped%29.jpg',
    source: 'Riso-Hudson',
  },

  // ═══ TYPE 2 — The Helper ═══
  {
    name: 'Mother Teresa',
    type: 2,
    profession: 'Humanitarian & Nobel Laureate',
    hook: 'Gave everything to others and wrestled privately with feeling unseen.',
    description: 'Mother Teresa is the Two archetype at its most extreme — total devotion to the needs of others. Her gift was an almost supernatural ability to see suffering and respond to it. Her wound, revealed in her private letters, was the ache of feeling disconnected from the very love she gave. She defied the Two\'s limitation by continuing to serve even when she felt spiritually empty — choosing love as an action, not just a feeling.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Mother_Teresa_1.jpg/440px-Mother_Teresa_1.jpg',
    source: 'Riso-Hudson, Palmer',
  },
  {
    name: 'Dolly Parton',
    type: 2,
    profession: 'Singer-Songwriter & Philanthropist',
    hook: 'Built a giving empire disguised as a music career.',
    description: 'Parton\'s Two energy shows in everything she touches — from her Imagination Library sending free books to children, to how she makes everyone feel like the most important person in the room. The wound is there: the need to be needed, the warmth that can mask real feelings. But she defies the Two\'s trap by maintaining fierce business sense beneath the generosity. She gives freely and still keeps herself whole.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Dolly_Parton_2011.jpg/440px-Dolly_Parton_2011.jpg',
    source: 'Riso-Hudson, Enneagram Institute',
  },
  {
    name: 'Desmond Tutu',
    type: 2,
    profession: 'Archbishop & Human Rights Activist',
    hook: 'Made compassion a revolutionary act.',
    description: 'Tutu\'s Two pattern channeled through justice work — his warmth and emotional attunement weren\'t just personal traits but political tools. He could connect with anyone, from world leaders to township residents, because his Two instinct to meet people where they are was genuine. His wound was carrying others\' pain. His gift was transforming that empathy into moral authority that couldn\'t be ignored.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Desmond_Tutu_2004.jpg/440px-Desmond_Tutu_2004.jpg',
    source: 'Palmer',
  },
  {
    name: 'Stevie Wonder',
    type: 2,
    profession: 'Musician & Songwriter',
    hook: 'Channeled deep emotional connection into music that heals.',
    description: 'Wonder\'s music radiates Two energy — it\'s built on connection, empathy, and the desire to bring people together. Songs like "I Just Called to Say I Love You" are the Two\'s love language made universal. His wound shows in the emotional intensity, the need for reciprocated love. His gift is making others feel seen through sound. He defies by channeling the Two\'s emotional depth into art rather than codependence.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Stevie_Wonder_1973.JPG/440px-Stevie_Wonder_1973.JPG',
    source: 'Riso-Hudson',
  },
  {
    name: 'Eleanor Roosevelt',
    type: 2,
    profession: 'First Lady & Diplomat',
    hook: 'Transformed the need to help into reshaping the world\'s conscience.',
    description: 'Roosevelt\'s Two energy went far beyond personal helping — she channeled it into human rights work that changed international law. Her wound was the childhood of emotional neglect that made connection essential. Her gift was turning that hunger for meaningful relationship into advocacy for people who had no voice. She defied the Two\'s limitation by insisting on her own opinions, even when it cost her popularity.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Eleanor_Roosevelt_portrait_1933.jpg/440px-Eleanor_Roosevelt_portrait_1933.jpg',
    source: 'Palmer, Riso-Hudson',
  },

  // ═══ TYPE 3 — The Achiever ═══
  {
    name: 'Oprah Winfrey',
    type: 3,
    profession: 'Media Mogul & Philanthropist',
    hook: 'Turned the drive to succeed into permission for millions to be real.',
    description: 'Oprah is the Three who cracked the code — she discovered that authenticity IS the ultimate achievement. Her wound was the childhood of poverty and abuse that made success feel like survival. Her gift was an uncanny ability to read what people need and deliver it at scale. She defies the Three\'s trap of image management by consistently choosing vulnerability on the biggest stage in the world.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Oprah_in_2014.jpg/440px-Oprah_in_2014.jpg',
    source: 'Riso-Hudson, Palmer, Enneagram Institute',
  },
  {
    name: 'Muhammad Ali',
    type: 3,
    profession: 'Boxer & Activist',
    hook: 'Made greatness a performance art — then proved it was real.',
    description: 'Ali\'s Three energy was the most charismatic version of the achiever\'s drive — "I am the greatest" wasn\'t just bravado, it was a Three\'s strategy for shaping reality through self-presentation. His wound was the need for validation in a world that tried to diminish him. His gift was turning that need into defiance. He defied the Three\'s limitation by sacrificing his title for his beliefs — proving his identity was bigger than his image.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Muhammad_Ali_NYWTS.jpg/440px-Muhammad_Ali_NYWTS.jpg',
    source: 'Riso-Hudson, Palmer',
  },
  {
    name: 'Taylor Swift',
    type: 3,
    profession: 'Singer-Songwriter',
    hook: 'Mastered reinvention — and made the strategy itself into the brand.',
    description: 'Swift is a textbook Three — the strategic awareness of image, the work ethic that outpaces everyone, the ability to read a room and deliver exactly what it wants. Her wound is the sensitivity to criticism that fuels her reinventions. Her gift is turning that adaptive instinct into art. She defies the Three\'s limitation by being increasingly transparent about the machinery behind the magic, letting the audience see the effort.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_3.png/440px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_3.png',
    source: 'Enneagram Institute',
  },
  {
    name: 'Dwayne Johnson',
    type: 3,
    profession: 'Actor & Entrepreneur',
    hook: 'Transformed rejection into the most bankable brand in entertainment.',
    description: 'Johnson\'s Three pattern is the engine beneath everything — the discipline, the relentless work, the charm that makes success look effortless. His wound was the early failures in football that taught him achievement isn\'t guaranteed. His gift is making people believe that effort always pays off. He defies the Three\'s shadow by being openly emotional about struggles, refusing the "always winning" mask.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Dwayne_Johnson_2014_%28cropped%29.jpg/440px-Dwayne_Johnson_2014_%28cropped%29.jpg',
    source: 'Riso-Hudson',
  },
  {
    name: 'Beyonce',
    type: 3,
    profession: 'Musician & Cultural Icon',
    hook: 'Turned perfectionism into an art form the world couldn\'t look away from.',
    description: 'Beyonce is the Three operating at peak capacity — the preparation, the performance, the seamless image. Her wound is the relentless standard she holds herself to, the private intensity behind the public grace. Her gift is showing millions of people what excellence actually costs and making them want to pay it too. She defies by using the Three\'s image-craft in service of Black identity and empowerment, making her success a statement.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Beyonc%C3%A9_at_The_Lion_King_European_Premiere_2019.png/440px-Beyonc%C3%A9_at_The_Lion_King_European_Premiere_2019.png',
    source: 'Palmer, Enneagram Institute',
  },

  // ═══ TYPE 4 — The Individualist ═══
  {
    name: 'Frida Kahlo',
    type: 4,
    profession: 'Artist',
    hook: 'Turned pain into the most honest mirror art has ever seen.',
    description: 'Kahlo is the Four archetype made visible — every canvas is a confrontation with suffering, identity, and the refusal to look away from what hurts. Her wound was physical and emotional: the accident, the betrayals, the body that wouldn\'t cooperate. Her gift was making that pain universal. She defied the Four\'s trap of wallowing by transforming anguish into beauty that outlived her.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg/440px-Frida_Kahlo%2C_by_Guillermo_Kahlo.jpg',
    source: 'Riso-Hudson, Palmer',
  },
  {
    name: 'Prince',
    type: 4,
    profession: 'Musician & Producer',
    hook: 'Made otherness the most magnetic force in music.',
    description: 'Prince was the Four who refused to be understood on anyone else\'s terms. His gift was an originality so complete it created its own genre. His wound was the intense privacy, the feeling of being fundamentally different that isolated him even at the peak of fame. He defied the Four\'s limitation by channeling melancholy into productivity — over 40 albums of raw creative output, turning feeling too much into a superpower.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Prince_at_Coachella_%28cropped%29.jpg/440px-Prince_at_Coachella_%28cropped%29.jpg',
    source: 'Riso-Hudson, Enneagram Institute',
  },
  {
    name: 'Virginia Woolf',
    type: 4,
    profession: 'Author',
    hook: 'Mapped the interior landscape of consciousness with devastating precision.',
    description: 'Woolf\'s Four energy shaped both her genius and her torment. Her gift was an ability to render inner experience in language that no one before her had achieved — stream of consciousness as a literary form. Her wound was the depression and sensitivity that made ordinary life feel unbearable. She defied the Four\'s self-absorption by using her interior world to illuminate universal human experience.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/George_Charles_Beresford_-_Virginia_Woolf_in_1902_-_Restoration.jpg/440px-George_Charles_Beresford_-_Virginia_Woolf_in_1902_-_Restoration.jpg',
    source: 'Palmer, Riso-Hudson',
  },
  {
    name: 'Amy Winehouse',
    type: 4,
    profession: 'Singer-Songwriter',
    hook: 'Sang the truth about heartbreak so raw it scared people.',
    description: 'Winehouse embodied the Four\'s raw emotional honesty — her voice carried a pain that felt almost too real for pop music. Her gift was an authenticity that cut through every layer of artifice. Her wound was the emotional intensity that made everyday life feel like too much. She defied the Four\'s stereotype of preciousness — there was nothing delicate about her truth. It was loud, messy, and impossible to ignore.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Amy_Winehouse_f5105378.jpg/440px-Amy_Winehouse_f5105378.jpg',
    source: 'Enneagram Institute',
  },
  {
    name: 'Rumi',
    type: 4,
    profession: 'Poet & Mystic',
    hook: 'Turned longing itself into the doorway to the divine.',
    description: 'Rumi is the Four at the highest level of integration — the wound of separation from the beloved transformed into poetry that has guided seekers for 800 years. His gift was articulating the ache of being human with such beauty that the ache itself became healing. He defied the Four\'s limitation of getting stuck in loss by using longing as a compass pointing toward something greater than the self.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Mevlana_Konya.jpg/440px-Mevlana_Konya.jpg',
    source: 'Palmer',
  },

  // ═══ TYPE 5 — The Investigator ═══
  {
    name: 'Albert Einstein',
    type: 5,
    profession: 'Physicist',
    hook: 'Saw the universe differently — then proved he was right.',
    description: 'Einstein is the Five archetype at its most transcendent — the withdrawal into thought that produces world-changing insight. His gift was the ability to hold complex problems in his mind for years, turning them over until the structure revealed itself. His wound was the emotional detachment that strained every close relationship. He defied the Five\'s limitation of pure abstraction by insisting that physics must be beautiful and intuitive, not just correct.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/440px-Albert_Einstein_Head.jpg',
    source: 'Riso-Hudson, Palmer, Enneagram Institute',
  },
  {
    name: 'Jane Goodall',
    type: 5,
    profession: 'Primatologist & Conservationist',
    hook: 'Watched in silence until the chimpanzees revealed what scientists couldn\'t.',
    description: 'Goodall\'s Five energy manifested as patient, radical observation — she sat and watched when everyone else wanted to test and measure. Her gift was the willingness to be an outsider, to approach understanding on its own terms. Her wound was the isolation that comes with that kind of dedication. She defied the Five\'s retreat from engagement by becoming one of the world\'s most tireless activists.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Jane_Goodall_2015.jpg/440px-Jane_Goodall_2015.jpg',
    source: 'Riso-Hudson',
  },
  {
    name: 'Stephen Hawking',
    type: 5,
    profession: 'Theoretical Physicist & Author',
    hook: 'Explored the boundaries of the universe from a wheelchair.',
    description: 'Hawking\'s Five pattern is the mind as ultimate refuge — when the body failed, the intellect expanded into black holes and the origin of time. His gift was making the incomprehensible accessible without dumbing it down. His wound was the physical limitation that enforced the Five\'s natural tendency toward mental over physical existence. He defied by refusing to retreat — engaging with popular culture, humor, and fame on his own terms.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Stephen_Hawking.StarChild.jpg/440px-Stephen_Hawking.StarChild.jpg',
    source: 'Palmer, Riso-Hudson',
  },
  {
    name: 'Bill Gates',
    type: 5,
    profession: 'Technologist & Philanthropist',
    hook: 'Hoarded knowledge — then gave the profits to save lives.',
    description: 'Gates is the Five who took the investigator\'s drive to master systems and applied it at civilizational scale. His gift was seeing patterns in technology and business that others missed. His wound was the social awkwardness and intensity that came with living primarily in his head. He defied the Five\'s scarcity mindset by becoming the world\'s most generous philanthropist — proving that understanding can be a gift, not just a shield.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Bill_Gates_2017_%28cropped%29.jpg/440px-Bill_Gates_2017_%28cropped%29.jpg',
    source: 'Enneagram Institute',
  },
  {
    name: 'Emily Dickinson',
    type: 5,
    profession: 'Poet',
    hook: 'Never left home — and mapped infinity from her bedroom.',
    description: 'Dickinson is the Five who turned withdrawal into a creative strategy. Her gift was an inner world so rich that a small house in Amherst contained multitudes. Her wound was the reclusion that kept her from the world she wrote about so precisely. She defied the Five\'s limitation of hoarding by leaving behind 1,800 poems — a lifetime of observation poured out for others to discover.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Emily_Dickinson_daguerreotype_%28Restored_and_cropped%29.jpg/440px-Emily_Dickinson_daguerreotype_%28Restored_and_cropped%29.jpg',
    source: 'Palmer, Riso-Hudson',
  },

  // ═══ TYPE 6 — The Loyalist ═══
  {
    name: 'Bruce Springsteen',
    type: 6,
    profession: 'Musician',
    hook: 'Turned working-class anxiety into anthems of defiant hope.',
    description: 'Springsteen\'s Six energy is woven through everything — the loyalty to his band, his hometown, his audience. His gift is giving voice to the fears and aspirations of ordinary people. His wound is the anxiety and self-doubt he\'s written about openly in his autobiography. He defies the Six\'s tendency toward paralysis by running straight at his fears on stage, night after night, for fifty years.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Bruce_Springsteen_-_Roskilde_Festival_2012.jpg/440px-Bruce_Springsteen_-_Roskilde_Festival_2012.jpg',
    source: 'Riso-Hudson, Palmer',
  },
  {
    name: 'Princess Diana',
    type: 6,
    profession: 'Humanitarian & Royal',
    hook: 'Sought safety in a castle and found purpose outside its walls.',
    description: 'Diana\'s Six pattern shows in her search for security in a system that ultimately betrayed her, and her loyalty to causes larger than herself. Her gift was an emotional radar that connected instantly with suffering. Her wound was the doubt and insecurity that the royal institution amplified. She defied the Six\'s tendency to seek safety by walking through minefields — literally — and challenging the very authority she\'d married into.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Diana%2C_Princess_of_Wales_1997_%282%29.jpg/440px-Diana%2C_Princess_of_Wales_1997_%282%29.jpg',
    source: 'Palmer, Enneagram Institute',
  },
  {
    name: 'Tom Hanks',
    type: 6,
    profession: 'Actor & Filmmaker',
    hook: 'America\'s most trusted face — because his doubt is genuine.',
    description: 'Hanks radiates Six energy: the everyman quality, the trustworthiness, the ability to play characters who do the right thing despite being afraid. His gift is making vulnerability feel safe. His wound is the childhood instability he\'s spoken about — the constant moving, the uncertainty. He defies the Six\'s need for external authority by becoming the authority himself, someone people trust precisely because he doesn\'t seem to want the power.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Tom_Hanks_TIFF_2019.jpg/440px-Tom_Hanks_TIFF_2019.jpg',
    source: 'Riso-Hudson',
  },
  {
    name: 'Malala Yousafzai',
    type: 6,
    profession: 'Activist & Nobel Laureate',
    hook: 'Faced the thing she feared most — and it made her voice louder.',
    description: 'Malala embodies the counterphobic Six — moving toward danger rather than away from it. Her gift is the clarity that comes from having already survived the worst thing. Her wound was real and physical: the bullet that was meant to silence her. She defies the Six\'s limitation by turning fear into fuel, advocating for education with a courage that isn\'t the absence of fear but the mastery of it.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Shinz%C5%8D_Abe_and_Malala_Yousafzai_%281%29.jpg/440px-Shinz%C5%8D_Abe_and_Malala_Yousafzai_%281%29.jpg',
    source: 'Enneagram Institute',
  },
  {
    name: 'Mark Twain',
    type: 6,
    profession: 'Author & Humorist',
    hook: 'Used laughter to expose every hypocrisy he was afraid to confront directly.',
    description: 'Twain\'s Six energy shows in his humor — it\'s the humor of someone who sees through everything and is anxious about all of it. His gift was using wit to dismantle authority without appearing to threaten it. His wound was a deep pessimism about human nature that darkened with age. He defied the Six\'s loyalty to convention by becoming America\'s most beloved critic of American hypocrisy.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Mark_Twain_by_AF_Bradley.jpg/440px-Mark_Twain_by_AF_Bradley.jpg',
    source: 'Palmer, Riso-Hudson',
  },

  // ═══ TYPE 7 — The Enthusiast ═══
  {
    name: 'Robin Williams',
    type: 7,
    profession: 'Actor & Comedian',
    hook: 'Made the whole world laugh to outrun the darkness he couldn\'t escape.',
    description: 'Williams was the Seven at maximum wattage — the rapid-fire brilliance, the inability to sit still, the mind that moved faster than anyone could follow. His gift was joy itself, weaponized and distributed to millions. His wound was what the joy was running from — the depression and loneliness that the manic energy was designed to outpace. He defied by letting the pain into his acting, creating performances of devastating depth.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Robin_Williams_2011a_%282%29.jpg/440px-Robin_Williams_2011a_%282%29.jpg',
    source: 'Riso-Hudson, Palmer, Enneagram Institute',
  },
  {
    name: 'Amelia Earhart',
    type: 7,
    profession: 'Aviator & Author',
    hook: 'Couldn\'t sit still — so she crossed oceans.',
    description: 'Earhart\'s Seven energy is pure restlessness transformed into history. Her gift was the refusal to accept limitations — on women, on what was possible, on where the horizon ended. Her wound was the same restlessness — the inability to be content with what she had, always needing the next adventure. She defied the Seven\'s tendency toward superficiality by putting her life on the line for every flight. There was nothing casual about her pursuit of freedom.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Amelia_Earhart_standing_under_nose_of_her_Lockheed_Model_10-E_Electra%2C_small.jpg/440px-Amelia_Earhart_standing_under_nose_of_her_Lockheed_Model_10-E_Electra%2C_small.jpg',
    source: 'Palmer',
  },
  {
    name: 'Richard Branson',
    type: 7,
    profession: 'Entrepreneur & Adventurer',
    hook: 'Built a business empire by following every shiny object — and catching most of them.',
    description: 'Branson is the Seven entrepreneur archetype — dozens of ventures across unrelated industries, each one launched with the enthusiasm of someone discovering the idea for the first time. His gift is infectious optimism that makes impossible things seem fun. His wound is the difficulty with depth — the restlessness that moves on before mastery. He defies by building real companies, not just having ideas, proving the Seven can finish what they start.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Richard_Branson_March_2015_%28cropped%29.jpg/440px-Richard_Branson_March_2015_%28cropped%29.jpg',
    source: 'Riso-Hudson, Enneagram Institute',
  },
  {
    name: 'Mozart',
    type: 7,
    profession: 'Composer',
    hook: 'Channeled pure joy into compositions that contain every human emotion.',
    description: 'Mozart\'s Seven energy produced over 600 compositions in 35 years — the sheer output of a mind that couldn\'t slow down. His gift was making complexity sound effortless, translating inner exuberance into music that balances light and shadow. His wound was the inability to manage the practical side of life — money, relationships, health. He defied the Seven\'s emotional avoidance by writing Requiem, proving he could face the darkness.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Wolfgang-amadeus-mozart_1.jpg/440px-Wolfgang-amadeus-mozart_1.jpg',
    source: 'Palmer, Riso-Hudson',
  },
  {
    name: 'Jim Carrey',
    type: 7,
    profession: 'Actor & Artist',
    hook: 'Proved you can be the funniest person alive and still search for meaning.',
    description: 'Carrey\'s Seven pattern is visible in the physical comedy, the manic energy, the refusal to be pinned down to one register. His gift is the capacity to make people forget their pain through laughter. His wound surfaced publicly — the depression, the spiritual searching, the realization that achieving everything he wanted didn\'t fill the void. He defied by going public with the struggle, breaking the Seven\'s rule of keeping things light.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Jim_Carrey_2008.jpg/440px-Jim_Carrey_2008.jpg',
    source: 'Riso-Hudson',
  },

  // ═══ TYPE 8 — The Challenger ═══
  {
    name: 'Martin Luther King Jr.',
    type: 8,
    profession: 'Civil Rights Leader',
    hook: 'Used his intensity to bend the moral arc of the universe.',
    description: 'King\'s Eight energy shows in the confrontational courage, the willingness to face violence without backing down, the protective instinct for his community. His gift was channeling raw power into disciplined nonviolent resistance. His wound was the toll of constant vigilance — the knowledge that strength was required every moment. He defied the Eight\'s tendency toward domination by insisting that true power lies in the refusal to use force.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Martin_Luther_King%2C_Jr..jpg/440px-Martin_Luther_King%2C_Jr..jpg',
    source: 'Riso-Hudson, Palmer',
  },
  {
    name: 'Serena Williams',
    type: 8,
    profession: 'Tennis Champion',
    hook: 'Dominated her sport by refusing to apologize for her power.',
    description: 'Williams is the Eight on the court — controlled intensity, the refusal to yield, the fire that burns hotter when challenged. Her gift is making strength beautiful and unapologetic. Her wound is the constant battle against a world that tried to diminish her — the racism, the sexism, the body policing. She defied the Eight\'s limitation by showing vulnerability through motherhood and advocacy, proving strength and tenderness coexist.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Serena_Williams_at_2013_US_Open.jpg/440px-Serena_Williams_at_2013_US_Open.jpg',
    source: 'Enneagram Institute',
  },
  {
    name: 'Winston Churchill',
    type: 8,
    profession: 'Prime Minister & Author',
    hook: 'Refused to surrender when the entire world was falling.',
    description: 'Churchill\'s Eight energy defined the 20th century\'s most critical moment — the blunt force of will that held Britain together when defeat seemed certain. His gift was the ability to inspire through sheer refusal to quit. His wound was the "black dog" of depression and the excess that accompanied his intensity. He defied the Eight\'s tendency toward tyranny by channeling his dominance into the defense of democracy.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Sir_Winston_Churchill_-_19086236948.jpg/440px-Sir_Winston_Churchill_-_19086236948.jpg',
    source: 'Riso-Hudson, Palmer',
  },
  {
    name: 'Toni Morrison',
    type: 8,
    profession: 'Author & Nobel Laureate',
    hook: 'Wielded language like a weapon to protect the stories no one else would tell.',
    description: 'Morrison\'s Eight energy is in every sentence — the controlled power, the refusal to explain or apologize, the protective instinct toward Black American experience. Her gift was using words to confront injustice without flinching. Her wound was the weight of carrying stories that the culture wanted to forget. She defied the Eight\'s tendency toward aggression by making her power lyrical — force expressed as beauty.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Toni_Morrison_2008-2.jpg/440px-Toni_Morrison_2008-2.jpg',
    source: 'Palmer',
  },
  {
    name: 'Cleopatra',
    type: 8,
    profession: 'Pharaoh of Egypt',
    hook: 'Commanded empires by understanding that power is presence.',
    description: 'Cleopatra\'s Eight pattern is visible across millennia — the strategic use of force, the refusal to be a puppet, the willingness to risk everything rather than submit. Her gift was making alliances through strength, not subordination. Her wound was the impossibility of being a woman ruling in a man\'s world without constant threat. She defied the Eight\'s tendency toward isolation by building partnerships that reshaped the ancient world.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kleopatra-VII.-Altes-Museum-Berlin1.jpg/440px-Kleopatra-VII.-Altes-Museum-Berlin1.jpg',
    source: 'Palmer',
  },

  // ═══ TYPE 9 — The Peacemaker ═══
  {
    name: 'Abraham Lincoln',
    type: 9,
    profession: 'President of the United States',
    hook: 'The quietest man in the room held a nation together through its worst war.',
    description: 'Lincoln\'s Nine energy is in his legendary patience, his ability to hold opposing forces together, his preference for listening over speaking. His gift was seeing all sides of a conflict and finding the path through. His wound was the depression and the emotional numbness that came from absorbing everyone else\'s pain. He defied the Nine\'s tendency toward inaction by making the hardest decision in American history — and seeing it through.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Abraham_Lincoln_O-77_matte_collodion_print.jpg/440px-Abraham_Lincoln_O-77_matte_collodion_print.jpg',
    source: 'Riso-Hudson, Palmer, Enneagram Institute',
  },
  {
    name: 'Bob Marley',
    type: 9,
    profession: 'Musician & Cultural Icon',
    hook: 'Made peace a revolution and a rhythm.',
    description: 'Marley\'s Nine energy infuses every song — the desire for harmony, the merging with something greater, the dream of "one love." His gift was making unity feel not just possible but inevitable through music. His wound was the conflict between his peaceful nature and the violent reality of Jamaican politics. He defied the Nine\'s avoidance of conflict by writing protest songs that confronted injustice while maintaining the vision of peace.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Bob-Marley.jpg/440px-Bob-Marley.jpg',
    source: 'Palmer, Riso-Hudson',
  },
  {
    name: 'Queen Elizabeth II',
    type: 9,
    profession: 'Monarch',
    hook: 'Reigned for 70 years by mastering the art of being present without being imposing.',
    description: 'Elizabeth II is the Nine on the throne — duty expressed through steadiness, not assertion. Her gift was the ability to be a unifying symbol by never making it about herself. Her wound was the suppression of personal desire that the role demanded — a lifetime of merging with the institution. She defied the Nine\'s tendency toward disappearing by being quietly, stubbornly present through every crisis for seven decades.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Queen_Elizabeth_II_in_March_2015.jpg/440px-Queen_Elizabeth_II_in_March_2015.jpg',
    source: 'Palmer, Enneagram Institute',
  },
  {
    name: 'Dalai Lama',
    type: 9,
    profession: 'Spiritual Leader',
    hook: 'Lost his country and responded with laughter and compassion.',
    description: 'The Dalai Lama\'s Nine energy is visible in his warmth, his humor, his ability to make everyone feel at ease. His gift is modeling what it looks like to hold peace as a practice, not just an ideal. His wound is the exile — the loss of Tibet that he carries without bitterness. He defies the Nine\'s tendency toward complacency by being a tireless advocate for his people while genuinely maintaining inner peace.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Dalailama1_20121014_4639.jpg/440px-Dalailama1_20121014_4639.jpg',
    source: 'Riso-Hudson, Palmer',
  },
  {
    name: 'Keanu Reeves',
    type: 9,
    profession: 'Actor',
    hook: 'Became Hollywood\'s biggest star by being the least Hollywood person in it.',
    description: 'Reeves radiates Nine energy — the quiet presence, the lack of ego, the comfort with silence. His gift is making space for others without diminishing himself. His wound is the series of personal tragedies he\'s carried with extraordinary grace — loss processed through stillness rather than spectacle. He defies the Nine\'s tendency toward invisibility by being genuinely, authentically present in an industry built on performance.',
    photoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Keanu_Reeves_2017.jpg/440px-Keanu_Reeves_2017.jpg',
    source: 'Enneagram Institute',
  },

  // ═══ EXPANDED DATABASE — 3+ additional per type for diversity & demographics ═══

  // TYPE 1 additions
  { name: 'Ruth Bader Ginsburg', type: 1, profession: 'Supreme Court Justice', hook: 'Fought for equality with surgical precision and infinite patience.', description: 'RBG\'s One energy channeled through decades of legal strategy — the meticulous, principled work of dismantling discrimination one case at a time. Her wound was the frustration of a system that moved too slowly. Her gift was the discipline to keep going anyway.', photoUrl: '', source: 'Riso-Hudson' },
  { name: 'Confucius', type: 1, profession: 'Philosopher', hook: 'Built an ethical framework that shaped half the world for 2,500 years.', description: 'Confucius embodies the One\'s drive to establish moral order. His gift was seeing how personal virtue scales into societal harmony. His wound was the lifelong disappointment that the world refused to meet his standards.', photoUrl: '', source: 'Palmer' },
  { name: 'Greta Thunberg', type: 1, profession: 'Climate Activist', hook: 'Saw the world burning and refused to pretend it was fine.', description: 'Thunberg\'s One energy is unmistakable — the moral clarity, the refusal to compromise, the anger that isn\'t anger but precision. Her gift is making hypocrisy visible. Her wound is the weight of carrying what adults won\'t.', photoUrl: '', source: 'Enneagram Institute' },

  // TYPE 2 additions
  { name: 'Princess Diana', type: 2, profession: 'Humanitarian & Royal', hook: 'Used her platform to make the invisible seen.', description: 'Diana\'s Two energy showed in her instinct to connect with suffering — the landmine fields, the AIDS wards, the places royalty wasn\'t supposed to go. Her wound was the unmet need for the love she so freely gave others.', photoUrl: '', source: 'Palmer' },
  { name: 'Fred Rogers', type: 2, profession: 'Television Host & Educator', hook: 'Made every child feel like the most important person in the world.', description: 'Mr. Rogers is the Two at integration — giving without agenda, seeing without judgment. His gift was radical acceptance broadcast at scale. His wound was the quiet knowledge that the world needed more kindness than one person could provide.', photoUrl: '', source: 'Riso-Hudson' },
  { name: 'Malala Yousafzai', type: 2, profession: 'Activist & Nobel Laureate', hook: 'Risked everything so other girls could learn.', description: 'Malala\'s Two energy drives her advocacy — the helping instinct scaled to global education. Her gift is making the personal political. Her wound was having to sacrifice her childhood for the cause.', photoUrl: '', source: 'Enneagram Institute' },

  // TYPE 3 additions
  { name: 'Cristiano Ronaldo', type: 3, profession: 'Footballer', hook: 'Made greatness look like it was inevitable — because he worked harder than anyone.', description: 'Ronaldo is the Three\'s drive made physical — the discipline, the body as achievement, the refusal to be outworked. His gift is showing what relentless commitment produces. His wound is the fear that stopping means disappearing.', photoUrl: '', source: 'Enneagram Institute' },
  { name: 'Sheryl Sandberg', type: 3, profession: 'Tech Executive & Author', hook: 'Leaned in — then learned what leaning in costs.', description: 'Sandberg\'s Three energy built a career on optimization and achievement. Her gift was making ambition accessible. Her wound surfaced in grief — the discovery that no amount of achievement protects you from loss.', photoUrl: '', source: 'Riso-Hudson' },
  { name: 'Jay-Z', type: 3, profession: 'Musician & Entrepreneur', hook: 'Turned survival into an empire and hustle into art.', description: 'Jay-Z is the Three who made the strategy itself into the product. His gift is making reinvention look effortless. His wound is the constant calculation — the inability to turn off the achiever even in intimacy.', photoUrl: '', source: 'Palmer' },

  // TYPE 4 additions
  { name: 'Leonard Cohen', type: 4, profession: 'Singer-Songwriter & Poet', hook: 'Found the crack in everything and called it the light.', description: 'Cohen\'s Four energy produced art that sat with darkness without flinching. His gift was making melancholy beautiful and bearable. His wound was the depression that drove him to a monastery for five years.', photoUrl: '', source: 'Riso-Hudson' },
  { name: 'Billie Eilish', type: 4, profession: 'Singer-Songwriter', hook: 'Made feeling everything into the sound of a generation.', description: 'Eilish\'s Four energy is raw and unapologetic — the emotional honesty that refuses to perform happiness. Her gift is making the inner world visible. Her wound is the intensity that makes the world feel like too much.', photoUrl: '', source: 'Enneagram Institute' },
  { name: 'Fyodor Dostoevsky', type: 4, profession: 'Author', hook: 'Mapped the darkest corners of the human soul — and found God there.', description: 'Dostoevsky\'s Four energy produced literature that goes deeper into suffering than almost anyone else dared. His gift was finding meaning in anguish. His wound was the anguish itself.', photoUrl: '', source: 'Palmer' },

  // TYPE 5 additions
  { name: 'Marie Curie', type: 5, profession: 'Physicist & Chemist', hook: 'Pursued knowledge so intensely it literally killed her — and she wouldn\'t have stopped.', description: 'Curie\'s Five energy is the investigator at full power — the complete absorption in understanding, the willingness to sacrifice everything for discovery. Her gift was seeing what no one else could. Her wound was the isolation that came with it.', photoUrl: '', source: 'Riso-Hudson' },
  { name: 'Mark Zuckerberg', type: 5, profession: 'Tech Entrepreneur', hook: 'Built the world\'s social network from the mind of someone who finds socializing exhausting.', description: 'Zuckerberg\'s Five energy shows in the systems thinking, the social awkwardness, the preference for building tools over using them. His gift is pattern recognition at scale. His wound is the gap between understanding systems and understanding people.', photoUrl: '', source: 'Enneagram Institute' },
  { name: 'Nikola Tesla', type: 5, profession: 'Inventor & Engineer', hook: 'Saw the future in his mind — and couldn\'t explain it to the present.', description: 'Tesla is the Five at peak visionary capacity — the ability to hold entire inventions in his mind before building them. His gift was seeing what was possible. His wound was the inability to function in a world that valued salesmanship over genius.', photoUrl: '', source: 'Palmer' },

  // TYPE 6 additions
  { name: 'Sigmund Freud', type: 6, profession: 'Psychoanalyst', hook: 'Questioned everything — starting with the human mind itself.', description: 'Freud\'s Six energy shows in the systematic doubt, the need to understand hidden motivations, the building of frameworks to manage anxiety. His gift was making the unconscious visible. His wound was the paranoia that shadowed his relationships.', photoUrl: '', source: 'Riso-Hudson' },
  { name: 'Ellen DeGeneres', type: 6, profession: 'Comedian & Television Host', hook: 'Found safety by making everyone laugh — then risked it all by being honest.', description: 'DeGeneres\'s Six energy shows in the humor as shield, the loyalty to her audience, and the courage of coming out when it cost her career. Her gift is making vulnerability feel safe. Her wound is the anxiety beneath the warmth.', photoUrl: '', source: 'Enneagram Institute' },
  { name: 'J.R.R. Tolkien', type: 6, profession: 'Author & Professor', hook: 'Built an entire world because the real one felt too uncertain.', description: 'Tolkien\'s Six energy created Middle-earth — a world with clear good and evil, loyalty rewarded, and courage tested. His gift was making safety feel possible through story. His wound was the war that taught him safety is always provisional.', photoUrl: '', source: 'Palmer' },

  // TYPE 7 additions
  { name: 'Walt Disney', type: 7, profession: 'Animator & Entrepreneur', hook: 'Believed in magic so hard he built a kingdom around it.', description: 'Disney\'s Seven energy is the enthusiast who couldn\'t be contained by one medium — animation, theme parks, television, the future itself. His gift was making imagination tangible. His wound was the restlessness that kept him from ever being satisfied.', photoUrl: '', source: 'Riso-Hudson' },
  { name: 'Freddie Mercury', type: 7, profession: 'Musician', hook: 'Lived louder than anyone and made even dying look like a performance.', description: 'Mercury\'s Seven energy filled stadiums — the excess, the joy, the refusal to be ordinary. His gift was making everyone feel like life should be celebrated. His wound was the loneliness behind the spectacle.', photoUrl: '', source: 'Palmer' },
  { name: 'Sadhguru', type: 7, profession: 'Spiritual Leader & Author', hook: 'Made enlightenment feel like the most interesting thing you could possibly do.', description: 'Sadhguru\'s Seven energy reframes spirituality as adventure rather than renunciation. His gift is making inner work feel exciting. His wound is the restlessness that spiritual practice is supposed to address.', photoUrl: '', source: 'Enneagram Institute' },

  // TYPE 8 additions
  { name: 'Indira Gandhi', type: 8, profession: 'Prime Minister of India', hook: 'Led a billion people with an iron will that bent for no one.', description: 'Indira Gandhi\'s Eight energy is visible in the consolidation of power, the willingness to make unpopular decisions, the protective instinct for national sovereignty. Her gift was decisive action. Her wound was the isolation that comes with being feared more than loved.', photoUrl: '', source: 'Palmer' },
  { name: 'Rosa Parks', type: 8, profession: 'Civil Rights Activist', hook: 'Sat down when every force in the world told her to stand.', description: 'Parks\'s Eight energy is quiet power — the refusal to submit that doesn\'t need volume. Her gift was showing that a single act of defiance can move history. Her wound was the decades of injustice she endured before that moment.', photoUrl: '', source: 'Riso-Hudson' },
  { name: 'Gordon Ramsay', type: 8, profession: 'Chef & Television Personality', hook: 'Turned intensity into excellence and made kitchens into battlefields.', description: 'Ramsay\'s Eight energy is the challenger in its most visible form — the confrontation, the demand for excellence, the protection of standards. His gift is pushing people past what they thought they could do. His wound is the inability to dial it down.', photoUrl: '', source: 'Enneagram Institute' },

  // TYPE 9 additions
  { name: 'Barack Obama', type: 9, profession: 'President of the United States', hook: 'Made calm the most powerful force in the room.', description: 'Obama\'s Nine energy shows in the deliberation, the ability to see all sides, the calm that infuriated those who wanted him to fight harder. His gift was making consensus feel possible. His wound was the tendency to merge with process at the expense of urgency.', photoUrl: '', source: 'Riso-Hudson' },
  { name: 'Carl Jung', type: 9, profession: 'Psychologist & Author', hook: 'Held every contradiction in the human psyche without choosing sides.', description: 'Jung\'s Nine energy produced a psychology of integration — the shadow and the self held together, not split apart. His gift was seeing wholeness where others saw conflict. His wound was the difficulty of living in a world that demands you pick a side.', photoUrl: '', source: 'Palmer' },
  { name: 'Audrey Hepburn', type: 9, profession: 'Actress & Humanitarian', hook: 'Radiated grace so naturally it looked like she wasn\'t even trying.', description: 'Hepburn\'s Nine energy is visible in the effortless elegance, the peace she brought to every room, the humanitarian work that felt like an extension of who she was. Her gift was making goodness look beautiful. Her wound was the childhood of war and hunger she never fully left behind.', photoUrl: '', source: 'Enneagram Institute' },
];

// Map celebrity names to Wikipedia slugs for the image proxy
const WIKI_SLUGS: Record<string, string> = {
  'Mahatma Gandhi': 'Mahatma_Gandhi',
  'Michelle Obama': 'Michelle_Obama',
  'Martha Stewart': 'Martha_Stewart',
  'Nelson Mandela': 'Nelson_Mandela',
  'Tina Fey': 'Tina_Fey',
  'Mother Teresa': 'Mother_Teresa',
  'Dolly Parton': 'Dolly_Parton',
  'Desmond Tutu': 'Desmond_Tutu',
  'Stevie Wonder': 'Stevie_Wonder',
  'Eleanor Roosevelt': 'Eleanor_Roosevelt',
  'Oprah Winfrey': 'Oprah_Winfrey',
  'Muhammad Ali': 'Muhammad_Ali',
  'Taylor Swift': 'Taylor_Swift',
  'Dwayne Johnson': 'Dwayne_Johnson',
  'Beyonce': 'Beyoncé',
  'Frida Kahlo': 'Frida_Kahlo',
  'Prince': 'Prince_(musician)',
  'Virginia Woolf': 'Virginia_Woolf',
  'Amy Winehouse': 'Amy_Winehouse',
  'Rumi': 'Rumi',
  'Albert Einstein': 'Albert_Einstein',
  'Jane Goodall': 'Jane_Goodall',
  'Stephen Hawking': 'Stephen_Hawking',
  'Bill Gates': 'Bill_Gates',
  'Emily Dickinson': 'Emily_Dickinson',
  'Bruce Springsteen': 'Bruce_Springsteen',
  'Princess Diana': 'Diana,_Princess_of_Wales',
  'Tom Hanks': 'Tom_Hanks',
  'Malala Yousafzai': 'Malala_Yousafzai',
  'Mark Twain': 'Mark_Twain',
  'Robin Williams': 'Robin_Williams',
  'Amelia Earhart': 'Amelia_Earhart',
  'Richard Branson': 'Richard_Branson',
  'Mozart': 'Wolfgang_Amadeus_Mozart',
  'Jim Carrey': 'Jim_Carrey',
  'Martin Luther King Jr.': 'Martin_Luther_King_Jr.',
  'Serena Williams': 'Serena_Williams',
  'Winston Churchill': 'Winston_Churchill',
  'Toni Morrison': 'Toni_Morrison',
  'Cleopatra': 'Cleopatra',
  'Abraham Lincoln': 'Abraham_Lincoln',
  'Bob Marley': 'Bob_Marley',
  'Queen Elizabeth II': 'Elizabeth_II',
  'Dalai Lama': '14th_Dalai_Lama',
  'Keanu Reeves': 'Keanu_Reeves',
  // Expanded database
  'Ruth Bader Ginsburg': 'Ruth_Bader_Ginsburg',
  'Confucius': 'Confucius',
  'Greta Thunberg': 'Greta_Thunberg',
  'Fred Rogers': 'Fred_Rogers',
  'Cristiano Ronaldo': 'Cristiano_Ronaldo',
  'Sheryl Sandberg': 'Sheryl_Sandberg',
  'Jay-Z': 'Jay-Z',
  'Leonard Cohen': 'Leonard_Cohen',
  'Billie Eilish': 'Billie_Eilish',
  'Fyodor Dostoevsky': 'Fyodor_Dostoevsky',
  'Marie Curie': 'Marie_Curie',
  'Mark Zuckerberg': 'Mark_Zuckerberg',
  'Nikola Tesla': 'Nikola_Tesla',
  'Sigmund Freud': 'Sigmund_Freud',
  'Ellen DeGeneres': 'Ellen_DeGeneres',
  'J.R.R. Tolkien': 'J._R._R._Tolkien',
  'Walt Disney': 'Walt_Disney',
  'Freddie Mercury': 'Freddie_Mercury',
  'Sadhguru': 'Sadhguru',
  'Indira Gandhi': 'Indira_Gandhi',
  'Rosa Parks': 'Rosa_Parks',
  'Gordon Ramsay': 'Gordon_Ramsay',
  'Barack Obama': 'Barack_Obama',
  'Carl Jung': 'Carl_Jung',
  'Audrey Hepburn': 'Audrey_Hepburn',
};

export function getWikiSlug(name: string): string {
  return WIKI_SLUGS[name] || name.replace(/ /g, '_');
}

export function getPhotoUrl(name: string): string {
  return `/api/wiki-image?person=${encodeURIComponent(getWikiSlug(name))}`;
}

export function getCelebritiesByType(type: number): CelebrityProfile[] {
  return CELEBRITY_DATABASE
    .filter(c => c.type === type)
    .map(c => ({
      ...c,
      photoUrl: getPhotoUrl(c.name),  // Override with proxy URL
    }));
}
