# Feature Specification: GPUScout Weekly Pulse (Automated Podcast)

## 1. Feature Overview

The "GPUScout Weekly Pulse" is an automated, AI-generated 5-minute audio summary of the week's most important events in the GPU rental market. It serves as a powerful user engagement tool and a content marketing asset to attract new users.

## 2. User Story (US-021)

**As a** busy GPU host (Alex)
**I want to** listen to a quick, weekly audio brief on market trends
**So that** I can stay informed and identify opportunities without having to read through data and reports.

## 3. Automated Generation Pipeline

The podcast is generated automatically every Friday evening (UTC).

1.  **Data Aggregation:** A scheduled Cloudflare Worker runs a script that queries the D1 database for the last 7 days of market data. It identifies:
    - Top 3 price increases/decreases by GPU model.
    - Significant changes in market share or availability.
    - New GPU models that have appeared on the market.
    - Overall market demand trends.

2.  **AI Script Generation:** The aggregated data is formatted and sent to an AI model (e.g., Claude 3.5 Sonnet) with a detailed prompt.
    - **Prompt Goal:** "You are a financial news podcaster. Write a clear, engaging 5-minute script summarizing these key GPU market events for the past week. Start with a market overview, then dive into the biggest movers, and end with an outlook for next week."

3.  **Personalization (Professional Tier):** For professional users, a second AI call is made to generate a personalized 30-second segment.
    - **Prompt Goal:** "Based on this user's portfolio (RTX 4090, A6000) and the weekly market data, write a short, personal update on how the trends affected their specific hardware."

4.  **Text-to-Speech (TTS) Generation:** The final script is sent to a high-quality TTS AI service (e.g., ElevenLabs, OpenAI TTS).
    - The standard script and personalized segments are generated as separate audio files.

5.  **Audio Assembly & Distribution:**
    - The audio files are assembled. For professional users, their personal segment is stitched into the main podcast.
    - The final MP3 is stored in Cloudflare R2.
    - The public version is added to an RSS feed for distribution on platforms like Spotify and Apple Podcasts.

## 4. User Experience

### 4.1. Dashboard Component
- A new "Weekly Pulse" card appears on the main dashboard every Saturday morning.
- It features an embedded audio player to listen to the latest episode.
- **Free/Individual Tiers:** Hear the standard public version.
- **Professional Tier:** Hear their personalized version. The player will have a small "Personalized for you" badge.

### 4.2. Public Distribution
- The public RSS feed helps establish GPUScout as a market authority and acts as a funnel for new user acquisition.

## 5. Acceptance Criteria
- The podcast is generated reliably every week.
- The content is accurate and reflects the real market data from the past week.
- The audio quality is clear and professional.
- The personalized segments for professional users are relevant and correctly inserted.
- The podcast player on the dashboard works correctly for all user tiers.