import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
		}),
});

const matchSchema = z.object({
    type: z.enum(['seeding', 'match']),
    status: z.enum(['played', 'pending']).optional(),
    date: z.coerce.date(),
    competition: z.string().optional(),
    reason: z.string().optional(),
    holderId: z.string().optional(),
    challengerId: z.string().optional(),
    scoreHolder: z.number().optional(),
    scoreChallenger: z.number().optional(),
    penalties: z.object({
        holder: z.number(),
        challenger: z.number(),
    }).optional(),
    newHolderId: z.string().optional(),
});

const tournamentSchema = z.object({
    year: z.number(),
    branch: z.string().optional(),
    championReason: z.string().optional(),
    whatIf: z.array(matchSchema).optional(),
    matches: z.array(matchSchema),
});

const falopaCup = defineCollection({
    loader: glob({ base: './src/content/falopa-cup', pattern: '**/*.json' }),
    schema: tournamentSchema,
});

const copaPabloMilad = defineCollection({
    loader: glob({ base: './src/content/copa-pablo-milad', pattern: '**/*.json' }),
    schema: tournamentSchema,
});

const clubs = defineCollection({
    loader: glob({ base: './src/content/clubs', pattern: '**/*.json' }),
    schema: z.object({
        id: z.string(),
        name: z.string(),
        shortName: z.string(),
        stadium: z.string(),
        logo: z.string(),
    }),
});

const conferenceClubSeedSchema = z.object({
    clubId: z.string(),
    name: z.string(),
    country: z.string(),
    entryType: z.enum(['base', 'libertadores-f1', 'libertadores-f2', 'sudamericana-f1']),
    conmebolRank: z.number().int().positive(),
    conmebolCoefficient: z.number().nonnegative().nullable().optional(),
    coefficientLabel: z.string().optional(),
    directToMainStage: z.boolean(),
    allocationCategory: z.enum([
        'league-direct',
        'coefficient-direct',
        'preliminary-pot-1',
        'preliminary-pot-2',
    ]),
    pot: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
});

const conferenceClubsSchema = z.object({
    kind: z.literal('clubs'),
    edition: z.number().int().positive(),
    seeds: z.array(conferenceClubSeedSchema),
});

const conferenceStageSchema = z.object({
    kind: z.literal('stage'),
    edition: z.number().int().positive(),
    directQualifiedIds: z.array(z.string()),
    preliminaryPot1Ids: z.array(z.string()).length(21),
    preliminaryPot2Ids: z.array(z.string()).length(21),
    preliminaryTies: z.array(z.object({
        id: z.string(),
        clubAId: z.string(),
        clubBId: z.string(),
        winnerClubId: z.string(),
        scoreA: z.number(),
        scoreB: z.number(),
        resolvedBy: z.enum(['fantasy-score', 'card-deductions', 'goals-for', 'away-condition', 'conmebol-rank', 'administrative']),
    })),
    mainStageQualifiedIds: z.array(z.string()),
});

const conferenceOfficialMatchSourceSchema = z.object({
    id: z.string(),
    clubId: z.string(),
    roundId: z.string(),
    windowStart: z.coerce.date(),
    windowEnd: z.coerce.date(),
    sourceCompetitionType: z.enum(['local-league', 'local-cup', 'conmebol', 'friendly']),
    sourceCompetition: z.string(),
    sourceDate: z.coerce.date(),
    homeClub: z.string(),
    awayClub: z.string(),
    goalsFor: z.number(),
    goalsAgainst: z.number(),
    isHome: z.boolean(),
    counted: z.boolean(),
});

const conferenceGroupsSchema = z.object({
    kind: z.literal('groups'),
    edition: z.number().int().positive(),
    groups: z.array(z.object({
        group: z.string(),
        clubIds: z.array(z.string()),
    })),
    roundWindows: z.array(z.object({
        roundId: z.string(),
        windowStart: z.coerce.date(),
        windowEnd: z.coerce.date(),
        extendedWindowEnd: z.coerce.date(),
        fixture: z.array(z.object({
            group: z.string(),
            club1Id: z.string(),
            club2Id: z.string(),
        })).optional(),
        windowMatchSources: z.array(conferenceOfficialMatchSourceSchema),
        fantasyScores: z.array(z.object({
            clubId: z.string(),
            roundId: z.string(),
            sourceMatchId: z.string(),
            basePoints: z.number(),
            bonusPoints: z.number(),
            penaltyPoints: z.number(),
            total: z.number(),
            explanation: z.string(),
        })),
    })),
    standings: z.array(z.object({
        group: z.string(),
        clubId: z.string(),
        played: z.number().int(),
        wins: z.number().int(),
        draws: z.number().int(),
        losses: z.number().int(),
        points: z.number().int(),
        fantasyFor: z.number(),
        fantasyAgainst: z.number(),
        fantasyDiff: z.number(),
        goalsFor: z.number().int(),
        goalsAgainst: z.number().int(),
        awayBonusWins: z.number().int(),
    })).optional(),
});

const conferenceKnockoutSchema = z.object({
    kind: z.literal('knockout'),
    edition: z.number().int().positive(),
    status: z.enum(['planned', 'in-progress', 'completed']),
    ties: z.array(z.object({
        id: z.string(),
        round: z.string(),
        clubAId: z.string(),
        clubBId: z.string(),
        scoreA: z.number().optional(),
        scoreB: z.number().optional(),
        winnerClubId: z.string().optional(),
        tiebreakReason: z.string().optional(),
    })),
});

const conferenceWindowCutSchema = z.object({
    kind: z.literal('window-cut'),
    edition: z.number().int().positive(),
    label: z.string(),
    windowStart: z.string(),
    windowEnd: z.string(),
    entries: z.array(z.object({
        clubId: z.string(),
        pot: z.enum(['Bombo 1', 'Bombo 2']),
        status: z.enum(['ok', 'no-match']),
        total: z.number(),
        gd: z.number().int().nullable().optional(),
        gf: z.number().int().nullable().optional(),
        sourceDate: z.string().nullable().optional(),
        competition: z.string().nullable().optional(),
        opponent: z.string().nullable().optional(),
        homeAway: z.enum(['home', 'away']).nullable().optional(),
        goalsFor: z.number().int().nullable().optional(),
        goalsAgainst: z.number().int().nullable().optional(),
        yellowCards: z.number().int().nonnegative().nullable().optional(),
        redCards: z.number().int().nonnegative().nullable().optional(),
        sourceUrl: z.string().url().nullable().optional(),
    })),
});

const conferenceLeagueSudamericana = defineCollection({
    loader: glob({ base: './src/content/conference-league-sudamericana', pattern: '**/*.json' }),
    schema: z.discriminatedUnion('kind', [
        conferenceClubsSchema,
        conferenceStageSchema,
        conferenceGroupsSchema,
        conferenceKnockoutSchema,
        conferenceWindowCutSchema,
    ]),
});

export const collections = {
    blog,
    'falopa-cup': falopaCup,
    'copa-pablo-milad': copaPabloMilad,
    clubs,
    'conference-league-sudamericana': conferenceLeagueSudamericana,
};
