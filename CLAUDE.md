# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Astro-based website for tracking two unofficial Chilean football tournaments: **Falopa Cup** and **Copa Pablo Milad**. The site follows the "Unofficial Football World Championships" concept where a championship title is contested in every official match.

## Commands

```bash
pnpm dev          # Start local dev server at localhost:4321
pnpm build        # Build production site to ./dist/
pnpm preview      # Preview build locally
pnpm astro check  # Run Astro type checking
```

## Architecture

### Content Collections

The project uses Astro Content Collections with JSON loaders:

- **`blog`** - Blog posts (Markdown/MDX files in `src/content/blog/`)
- **`falopa-cup`** - Falopa Cup tournament data (JSON in `src/content/falopa-cup/`)
- **`copa-pablo-milad`** - Copa Pablo Milad tournament data (JSON in `src/content/copa-pablo-milad/`)
- **`clubs`** - Chilean football club info (JSON in `src/content/clubs/`)

### Data Schema

Tournament matches use this schema (defined in `src/content.config.ts`):
- `type`: "seeding" | "match"
- `date`: Match date
- `competition`: Competition name (e.g., "Liga de Primera · Fecha 1")
- `holderId`: Current champion's club ID
- `challengerId`: Opponent's club ID
- `scoreHolder` / `scoreChallenger`: Final score
- `penalties`: Optional penalty shootout scores
- `newHolderId`: Who holds the title after this match
- `reason`: Explanation for seeding matches

### Key Files

- `astro.config.mjs` - Astro config with MDX, sitemap, and Tailwind v4
- `src/content.config.ts` - Content collection schemas
- `src/consts.ts` - Site title and description
- `src/pages/index.astro` - Homepage showing current champions
- `src/pages/falopa-cup/index.astro` - Falopa Cup history
- `src/pages/copa-pablo-milad/index.astro` - Copa Pablo Milad history

### Club Data

Each club JSON in `src/content/clubs/` contains:
```json
{
  "id": "club-id",
  "name": "Full Club Name",
  "shortName": "Short Name",
  "stadium": "Stadium Name",
  "logo": "/logos/club-name.svg"
}
```

### Adding Match Data

To add a new match:
1. Edit the appropriate year's JSON file in `src/content/falopa-cup/` or `src/content/copa-pablo-milad/`
2. Add a match object with the required fields
3. For Falopa Cup: title transfers on any loss (defender loses = new holder)
4. For Copa Pablo Milad: title only transfers if defender wins (defender wins = keeps title and challenger becomes worst)
