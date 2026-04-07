# Defy Your Number — Enneagram System Architecture

> **Authority level:** This document is authoritative for all assessment logic, scoring models, tier prioritization, terminology, and results delivery in the Soulo app. If this document conflicts with other references, this document wins.

---

## How This Document Works

This architecture has two parts: **four Core Tiers** and **The Vault**.

The four Core Tiers are numbered because **order matters**. They build on each other. They govern:

1. **What the assessment engine prioritizes** (internal weight)
2. **What gets built in what order** (development sequence)
3. **What the customer receives and when** (results delivery)

Tier 1 carries the most weight. Tier 2 is less important than Tier 1. Tier 3 is less important than Tier 2. Tier 4 is less important than Tier 3. **Each tier must always be additive to the tiers above it, never contradictory.**

The Vault is **not** a fifth tier. It is a separate, living library of deeper content that enriches the Core Tiers. It has no build sequence, no fixed release order, and grows over time.

---

## Two Applications of the Same Architecture

### 1. Building the Assessment (Internal/Operational)

Each Core Tier represents an internal order of importance for the assessment engine. Tier 1 is the most critical data and carries the most weight. The system must always prioritize higher tiers. Build Tier 1 first. Get it working. Then layer on Tier 2, then 3, then 4. Do not pull data from later tiers unless it directly improves the current tier's accuracy.

### 2. Delivering Results to the Customer (Deployment)

The tier system does **not** currently map to a paywall or access-gating system. That will come later (blurring/locking information by subscription level). For now, tiers define internal importance and the sequence in which results layer onto the customer experience. Never overwhelm the customer — let each layer land before the next arrives.

---

### General Guiding Principle: Tier Cascade

> **The prior tier always lightens the load in determination for the next tier.**

Data and patterns from higher tiers should be mined to reduce the assessment burden in lower tiers. For example, Tier 1 patterns can inform Tier 2 instinct determination, reducing token cost and API calls.

**However:** Prior-tier data is a **secondary** measuring tool, not an absolute one. The system must have safeguards against overrelying on previous tiers.

---

### Product Packaging (Future Reference — Not Yet Implemented)

| Package | Price | Contents |
|---|---|---|
| **Free** | $0 | Core Type only |
| **Defiant Spirit** | ~$20 | Tiers 1–3 (core type, whole type, instinct/subtype, wings/lines) + cultural anchors, famous examples from The Vault |
| **Deep Dive / Masterclass** | ~$100 | Tier 4 + full Vault (triads, shadow architecture, communication/relationship architecture, all type profiles) |

---

## Tier 1: Core Identity & Whole Identity

> **Build priority:** MVP. Must deliver first. Carries the most weight in the entire system.
>
> **Customer deployment:** Core Type is always included at every level. Whole Type is Tier 1 material (derived from the same core typing process).

The goal of Tier 1 is to identify the person's **Core Enneagram Type** in as few assessment moves as possible. Once the Core Type is determined, the system has necessarily rank-ordered all nine types, which means the **Whole Type** (centers of intelligence) is derived from the same data. Core Type and Whole Type are inseparable as Tier 1 material.

### Core Type

The primary Enneagram number (1–9). **The single most important data point in the entire system.**

#### Design Philosophy — The Circle

"Core Type" is our proprietary term (the market doesn't use it). We chose it because everything in this system is framed around a circle. The nine types are nine energies; the tenth is the circle itself — wholeness. "Whole Type" (not TriType) reinforces the same principle: we want people to live holistically, with access to all nine energies, not pinned to a single number. This circular, holistic framing is the philosophical backbone of every naming decision.

#### HARD RULES — Core Type

- Core Type means the **single number only**. Never combined with a wing, instinct, or subtype at this level.
- "Self-Preservation Nine" is **not** a Core Type. Core Type is one of nine choices, period.
- **No ties in Core Type.** If scores are too close, the system must keep pressure testing until it achieves a sufficient gap. This is non-negotiable.

#### Official Type Names (Locked)

Always use these names. They follow the Riso-Hudson (RHETI) tradition.

| Number | Name |
|---|---|
| 1 | The Reformer |
| 2 | The Helper |
| 3 | The Achiever |
| 4 | The Individualist |
| 5 | The Investigator |
| 6 | The Loyalist |
| 7 | The Enthusiast |
| 8 | The Challenger |
| 9 | The Peacemaker |

**Why these names:** We chose archetype-style names over identity-style labels. An archetype describes an energy; a label pins an identity. "The Loyalist" is an energy. "The Loyal Skeptic" is an adjective and a noun — it becomes an identity. Our names leave room for the descriptions to speak.

### Nine-Type Spectrum

All nine types ranked **highest to lowest**, displayed as percentage bars (never a pie chart).

- **Underlying math:** Shared-resource model — the person has only 100% total to distribute across all nine types. Scores must add up to 100%.
- **Why not independent 0–100 scales:** Scores like 90%, 75%, 50% across types mean nothing relative to each other. The shared model forces hierarchical clarity.
- **Why not pie charts:** Even a dominant Core Type looks small when eight other slices eat into it. Ranked bars are clearer.
- **Visual:** Each type displays a small icon (head, heart, or fist) and subtle color gradient indicating its center of intelligence. This lets the user see emotional/thinking/action representation at a glance.
- **Repressed Type:** The **last-place** type is named and called out as the person's Repressed Type. This is key data that very few systems surface. The bottom of the spectrum matters for guiding holistic living. Middle-tier numbers are less interesting; top and bottom carry the most meaning.

### Whole Type

How the person acts, thinks, and feels. The system takes the highest-ranking type in each center of intelligence:

| Center | Name | Types |
|---|---|---|
| Action | Gut | 8, 9, 1 |
| Feeling | Heart | 2, 3, 4 |
| Thinking | Head | 5, 6, 7 |

> **TERMINOLOGY RULE:** "TriType" is copyrighted (Katherine Fauvre). We always brand this as **Whole Type**. We draw heavily from Fauvre's TriType work but reframe with our definitions and language. When sourcing research, lean heavily on Fauvre's TriType material.

The Whole Type is expressed as three numbers: one from each center, **ordered by dominance** (not by center). The person also receives a percentage allocation across act/think/feel out of 100%.

#### HARD RULES — Whole Type

- **No ties within any center.** The system must declare one dominant type per center with certainty.
- **Depth-of-access matters.** In a perfect assessment, the top three ranked types each come from a different center. This is infrequent. Often the ranking is action, action, feeling, head — meaning the system had to dig deeper to find the first representative of a center. **A Type 5 in second place is a far more powerful "thinking center" signal than a Type 5 buried in sixth place.** Two people can both be a 1-4-5 Whole Type, but if one person's 5 was third-ranked and the other's was sixth-ranked, those are meaningfully different profiles. The system must decrease centrality weighting for types found deeper in the ranking. This depth information must be available for results generation and coaching.
- **Counter-type awareness.** Certain types do not look like their center:
  - Enneagram 9 does not look like an action type
  - Enneagram 3 does not look like a feeling type
  - Enneagram 7 does not look like a thinking type
  
  These create false positives. The system must account for why these types present differently and cannot let it throw off the data.

### Tier 1 Build Note

Zero in on Core Type as efficiently as possible. The nine-type spectrum and Whole Type are derived from the same assessment inputs — once you've ranked all nine types with sufficient confidence, you already have Whole Type data. Do not add questions that serve Tier 2, 3, or 4 unless they also sharpen Tier 1 accuracy. **Speed and precision are the priorities.**

**Display:** Rank-ordered highest to lowest for the Core Type view. Whole Type is a separate section that reorganizes the same data by centers of intelligence.

---

## Tier 2: Instinct & Subtype

> **Build priority:** Second phase. Layer on after Tier 1 is functional.
>
> **Customer deployment:** First upgrade beyond Core Type.

Tier 1 tells someone *what type they are*. Tier 2 tells them *how that type expresses in their specific life*. This tier is unique to our system and to CP Enneagram (another credible system that prioritizes instinct). Instinct is one of the most underrated aspects of the Enneagram.

### Dominant Instinct

Which of the three instincts drives this person most. **Always presented in evolutionary order:**

| Instinct | Abbreviation | Description | Evolutionary Origin |
|---|---|---|---|
| **Self-Preservation** | SP (sometimes "Self-Preserving") | Survival, resources, physical security | ~50 million years ago |
| **Sexual** | SX [One-to-One] | Intensity, chemistry, one-to-one bonding | ~50 thousand years ago |
| **Social** | SO | Belonging, role, group dynamics | ~10 thousand years ago |

#### TERMINOLOGY RULES — Instinct

- Sexual is **always** abbreviated as **SX** and **always** carries the bracketed descriptor **[One-to-One]**. It is not about sex — it is about making a bond one-to-one.
- Social is **not** about extroversion/introversion. It is about instinctual survival patterns relevant to group dynamics across all species.

### Instinct Stack

All three instincts ranked with percentages. **Total must add up to 100%** (shared-resource model).

| Position | Meaning |
|---|---|
| **Dominant** (1st) | Tends to be overused |
| **Middle** (2nd) | Equilibrium — the most comfortable and balanced |
| **Repressed** (3rd) | Tends to be underused — significant blindspot |

#### HARD RULES — Instinct Stack

- **No ties.** Dominant, middle, and repressed must each be distinct. If ties emerge, keep differentiating.
- Someone **SP > SX > SO** is very different from **SP > SO > SX**. The order matters. The degree of spread matters.
- Data on the repressed instinct is critical — surface it explicitly.

#### Using Tier 1 Data to Lighten the Load

There are patterns in Tier 1 data that inform instinct determination. Example: an Enneagram 6 with lots of 8, 4, and reactive/aggressive energy in top scores is more likely counterphobic (correlates with SX or SO dominant) than phobic (correlates with SP). The system should mine Tier 1 patterns as a **secondary input** to reduce token cost — but the **primary** measuring tool is instinct-specific assessment data.

### Subtype

> **Core Type × Instinct = Subtype**

27 total subtypes (9 types × 3 instincts). Each has a named profile, description, and characteristics from our proprietary subtype wheel.

**Stereotype vs. Counter-type:** Each type has a stereotypical subtype (looks most like that type) and a counter-type (looks least like that type). Example: stereotypical Enneagram 8 = Sexual 8. Counter-type = Social 8. The system should identify and communicate which is which.

### Tier 2 Build Note

Instinct requires its own assessment questions, separate from core type. If instinct questions also help disambiguate close Tier 1 scores, they can serve double duty. Leverage Tier 1 data via the vector system to reduce burden, but safeguard against overreliance on prior-tier inferences.

---

## Tier 3: Wings & Lines

> **Build priority:** Third phase. Builds on Core Type data from Tier 1.
>
> **Customer deployment:** Part of the Defiant Spirit Package. Energy and growth path.

Tiers 1 and 2 are about **identity** (more static, more fixed). Tier 3 is about **energy** (more fluid, more dynamic). Wings and Lines are energetic movements, not static labels.

### Wings (Evolutionary Growth)

The numbers on either side of the Core Type. Lower effort to access, subtler impact. The salt and pepper of personality. Wings move faster and are more readily accessible than lines. Think **evolutionary** change: gradual, nearby, natural.

#### CRITICAL FRAMING — Wings

> **You are not a "One Wing Nine."**
>
> This is a mistake many enneagram teachers make. Wings are **energetic leanings**, not identities. The system must **never** brand someone as "a 1w9" as a fixed label.
>
> Correct framing: *You are a One who is currently leaning on your Nine wing. That leaning is your default, your autopilot, your comfort zone, your reaction. But you have both wings and can move between them.*
>
> **If you are not living in holistic balance between both wings, you are in reaction by definition.** Our job is to help people see the lean and take back their power to choose.

- **Display:** Slider (binary, two options). Show which wing the person leans toward and relative weight.
- **Confidence:** Ties are acceptable. Lower confidence requirement than Core Type or Whole Type. The goal is to show tendency, not pin identity.
- **Reaction/Response:** Each wing has a reaction expression (unconscious default) and response expression (conscious choice).
- **Data value:** The gap between wing scores tells a story about energetic imbalance and where there's room to become more fluid.

### Lines (Revolutionary Growth)

The two numbers connected to the Core Type by the Enneagram's internal lines. Harder to access, bigger transformation. Think **revolutionary** change: a bigger jump, more disruptive, more powerful. Same framing: lines are not identities, they are energetic movements.

#### Arrow Directionality

| Direction | Traditional Name | Defiant Spirit Name | Orientation | Description |
|---|---|---|---|---|
| **With the Arrow** | Stress Line | Energizing Point | Future-oriented, adult self | Natural energy flow direction. When in stress, energy carries you here in reaction. Both high-side (response) and low-side (reaction) expressions exist. |
| **Against the Arrow** | Security Line | Resolution Point | Past-oriented, childhood self | Going back against natural flow. This is your childhood point — where energy originated before you built your survival strategy. Heart and healing path. Both expressions exist. |

**Arrow path examples (with the arrow):** 8→5, 5→7, 7→1, 1→4, 4→2, 2→8, 9→6, 6→3, 3→9. So for an 8: with-the-arrow (stress/energizing) goes to 5; against-the-arrow (security/resolution/childhood) goes to 2.

#### KEY PRINCIPLE

**Neither direction is good or bad.** Both carry reaction and response expressions. You can act from the high side or low side of either endpoint. The arrows show where energy naturally flows and where you need to deliberately go to grow.

- **Display:** Slider or relative weight. Same lower confidence requirement as wings.
- **Consistency:** Wings and lines must be treated with the **same framing** — both are energetic expressions, not identities. Both have a dominant lean and a less-accessed side. Both have reaction/response expressions. The only difference is accessibility: wings are evolutionary (closer, easier, faster), lines are revolutionary (farther, harder, bigger impact).

### Tier 3 Build Note

Wing data can often be partially derived from the Tier 1 nine-type spectrum (adjacent high scores indicate wing strength). Line data may require additional questions or behavioral inference. This tier enriches Tier 1 data rather than requiring a separate instrument. **Lines never change and wings never change** — what changes is which one the person leans on at any given time.

---

## Tier 4: Triads

> **Build priority:** Fourth phase. Structural overlay on Core Type.
>
> **Customer deployment:** Premium/Deep Dive tier. Systems-level understanding.

Triads group the nine types into sets of three based on shared strategies. The **primary triad** (Center of Intelligence: Gut/Heart/Head) is already covered in Tier 1 as part of Whole Type. The three below are **secondary triads**.

### Harmony Triad (Energy Strategy)

*How do you move through the world?*

| Group | Types |
|---|---|
| Idealist | 1, 4, 7 |
| Relationist | 2, 5, 8 |
| Pragmatist | 3, 6, 9 |

### Hornevian Triad (Needs Strategy)

*How do you get your needs met?* Based on the work of Karen Horney.

| Group | Types |
|---|---|
| Assertive | 3, 7, 8 |
| Compliant / Dutiful / Dependent | 1, 2, 6 |
| Withdrawn | 4, 5, 9 |

> **Note:** IEQ9 uses "Compliant," "Dutiful," and "Dependent" interchangeably for this triad. All three refer to types 1, 2, and 6 — types that are compliant to their own superego/conscience, not necessarily compliant to others. Source: integrative9.com sample reports. Use whichever term best fits the context; "Compliant" is the most widely recognized.

### Harmonic Triad (Conflict Strategy)

*How do you handle conflict? What happens when needs aren't met?*

| Group | Types |
|---|---|
| Reactive | 4, 6, 8 |
| Competency / Methodical | 1, 3, 5 |
| Positive Outlook | 2, 7, 9 |

> **Note on Competency / Methodical:** IEQ9 uses both terms interchangeably. "Competency" is the historical Riso-Hudson name; "Methodical" is the IEQ9 alternate. Both refer to types 1, 3, 5.

> **Note on Positive Outlook (2, 7, 9):** This triad has been renamed multiple times. Originally "Positive Outlook" (Riso-Hudson), then briefly "Avoidant" (IEQ9), and IEQ9 has reportedly renamed it again. The current IEQ9 internal term is in their accreditation materials but not on their public website. **ACTION:** Confirm with an IEQ9-accredited practitioner before publishing this triad publicly. Until confirmed, use "Positive Outlook" — it remains the most widely recognized term across Enneagram literature.

### Tier 4 Build Note

Triad placement is **entirely determined by Core Type**. No additional assessment questions needed. This is a delivery and content layer, not an assessment layer. Minimal token usage — draws from pre-established vector data.

---

## The Vault

The Vault is **not a tier**. It is a separate, expandable library of deeper Enneagram content alongside the Core Tiers. None of it is required for the core assessment.

> Core Tiers = skeleton. The Vault = muscle, connective tissue, nerve endings. The skeleton stands alone. The Vault makes it move, feel, and fight.

No fixed build sequence. Content can attach to any Core Tier as premium enrichment, unlock at higher engagement levels, or be reserved for coaching/consulting. Designed to grow forever without destabilizing the core system.

**Token usage:** The assessment does not search for Vault items. Most token cost goes toward taking the person's Core Tier results and fitting Vault content to them in a personalized way — adapting pre-established items to the individual.

### Shadow Architecture

The deeper psychological and spiritual dimensions. Central to Defiant Spirit methodology.

| Element | Description | Example (Type 1 / 2 / 3) |
|---|---|---|
| **Holy Idea** | Essential spiritual energy; soul's purpose; core calling | Perfection / Service / Hope-Flow |
| **Passion (Vice)** | Shadow energy; consequence of living unconsciously; emotional reaction pattern | Anger / Pride / Self-Deceit |
| **Virtue** | Awakened heart expression; antidote to Passion; emotional response pattern | Serenity / Humility / Veracity |
| **Fixation** | Cognitive shadow; ego-filtered thought patterns; mental reaction pattern | Resentment / Flattery-Manipulation / Vanity-Superficiality |
| **Defense Mechanism** | Primary unconscious strategy for difficult situations | Reaction Formation / Repression / Identification-Shapeshifting |
| **Superpower & Kryptonite** | Core driving force (the "why") + corresponding vulnerability | Integrity-Perfectionism / Love-Abandonment / Victory-Competition |

### Communication & Relationship Architecture

- **Communication Architecture:** Full profile per type — style, focus, time orientation, intensity, frequency, process. Includes Communicating As (growth edges), Communicating With (dos/don'ts), and Communication Danger Zones.
- **Core Relationships Matrix:** How each type reacts and responds to every other type. 9 pairings per type, 81 total combinations.
- **Communication Style Preferences:** Performance across modalities — groups, video, one-on-one, phone.

### Type Profiles & Cultural Anchors

> **Note:** Some content here (famous examples, cultural anchors, hobbies/professions) may be included in the ~$20 Defiant Spirit Package as accessible, engaging material.

- **27 Named Subtypes (Full Profiles):** Descriptions, famous examples, profession associations from the proprietary subtype wheel.
- **Superpowers & Super-Responses:** Signature strengths in response mode. Aspirational anchors.
- **Levels of Integration:** The ladder concept — why two people with the same type look completely different. Philosophical wrapper for the system, anchored in Frankl's space between stimulus and response.
- **Type-Specific Trigger Words:** Word banks each type reacts/responds to. Coaching tools.
- **Behind the Scenes Profiles:** Counterintuitive truths that disrupt surface assumptions.
- **Hobbies, Professions & Companies:** Vocational/cultural anchors grounding abstract descriptions.
- **Famous Examples by Subtype:** Public figures organized by wing and subtype.
- **Reaction Quotations:** Curated quotes specific to each type's reckoning.
- **Channeled Messages:** Spiritual messages from the DOD program materials.

### Vault Build Note

No assessment data collection needed. Content/delivery layer only. Organize as a content library indexed by type, subtype, and topic. New content can be deposited at any time without touching Core Tiers.

---

## Scoring & Confidence Framework

### Shared-Resource Model (100% Total)

For any dimension with **3+ options** (nine-type spectrum, instinct stack): scores must add up to 100%. This forces hierarchical clarity and prevents the meaninglessness of independent 0–100 scales.

### Slider Model (Binary Choices)

For any dimension with **exactly 2 options** (wings, lines): slider between endpoints, summing to 100%.

### Confidence Requirements

| Dimension | Tier | Confidence | Ties Allowed? |
|---|---|---|---|
| Core Type | 1 | Highest | **No** — must pressure test until gap is sufficient |
| Whole Type (per center) | 1 | High | **No** — one dominant per center required |
| Instinct Stack | 2 | High | **No** — all three positions must be distinct |
| Wings | 3 | Lower | **Yes** — showing tendency, not identity |
| Lines | 3 | Lower | **Yes** — same framing as wings |

### Display Rules

- **Core Type results:** Rank-ordered highest to lowest with percentage bars. Center-of-intelligence icons (head/heart/fist) and color gradients on each bar.
- **No pie charts.** Ever. Ranked bars only.
- **Whole Type view:** Separate section reorganizing the same nine-type data by centers of intelligence.

---

## Summary

### The Structure

Four Core Tiers (numbered, sequential, load-bearing) + The Vault (unnumbered, expandable, enriching).

### The Build Rules

Build Tier 1 first. Lean, fast, accurate. Layer each subsequent tier in order. Only pull later-tier data if it directly improves current-tier accuracy. The Vault builds in parallel. Each prior tier lightens the load for the next, but no tier overrelies on the one above it.

### The Deployment Rules

Tier 1 ships with everything. Tiers 2–4 unlock by engagement and investment. Vault content attaches as premium enrichment. Never dump later-tier data on someone still absorbing their Core Type. Let each layer land before the next arrives.

### The Assessment Engine Rules

- Tier 1 carries the most weight
- Each tier is additive, never contradictory
- Prior-tier data is always available as secondary input to lighten subsequent assessment burden
- **No ties** in Core Type, Whole Type, or Instinct Stack
- Wings and lines have lower confidence requirements — framed as energetic leanings, not identities
- Always use our language, our type names, our framing

### The Token Efficiency Rules

- Tier 1 and Tier 2 are where the majority of LLM assessment energy is spent
- Between Tier 1 and Tier 2 is the meat of the assessment
- After Tier 2, the system shifts to vector-based lookups and pre-established content delivery (far fewer tokens)
- The Vault is almost entirely content-delivery with minimal generative cost beyond personalization
