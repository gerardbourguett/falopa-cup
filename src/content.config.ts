import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	// Type-check frontmatter using a schema
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			// Transform string to Date object
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			heroImage: image().optional(),
		}),
});

const falopaCup = defineCollection({
    // Load JSON files in the `src/content/falopa-cup/` directory.
    loader: glob({ base: './src/content/falopa-cup', pattern: '**/*.json' }),
    // Define JSON schema
    schema: z.object({
        year: z.number(),
        matches: z.array(
            z.object({
                type: z.enum(['seeding', 'match']),
                date: z.coerce.date(),
                competition: z.string().optional(),
                reason: z.string().optional(),
                holderId: z.string().optional(),
                challengerId: z.string().optional(),
                scoreHolder: z.number().optional(),
                scoreChallenger: z.number().optional(),
                newHolderId: z.string().optional(),
            }),
        ),
    }),
});

const clubs = defineCollection({
    // Load JSON files in the `src/content/clubs/` directory.
    loader: glob({ base: './src/content/clubs', pattern: '**/*.json' }),
    schema: z.object({
        id: z.string(),
        name: z.string(),
        shortName: z.string(),
        stadium: z.string(),
        logo: z.string(),
    }),
});

export const collections = { blog, 'falopa-cup': falopaCup, clubs };
