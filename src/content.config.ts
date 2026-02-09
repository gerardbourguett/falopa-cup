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

export const collections = { blog, 'falopa-cup': falopaCup, 'copa-pablo-milad': copaPabloMilad, clubs };
