import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const watches = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/watches' }),
  schema: z.object({
    slug: z.string(),
    ownerNumber: z.string(),
    brand: z.string(),
    model: z.string(),
    catch: z.array(z.string()).length(2),
    ownersNote: z.object({
      image: z.string(),
      imageParts: z.array(z.string()).optional(),
      zoomHref: z.string().optional(),
      lead: z.array(z.string()),
      guideTitle: z.string(),
      guide: z.array(z.string()),
      noteTitle: z.string(),
      note: z.array(z.string())
    }),
    spec: z.object({
      era: z.string(),
      caseSize: z.string(),
      caliber: z.string(),
      jewels: z.string(),
      frequency: z.string(),
      barrels: z.string(),
      winding: z.string(),
      acoustic: z.string(),
      notes: z.string()
    }),
    video: z.object({
      youtubeId: z.string(),
      xUrl: z.string().url()
    }).optional(),
    deepDive: z.array(z.object({
      number: z.string(),
      title: z.string(),
      subtitle: z.string().optional(),
      paragraphs: z.array(z.string()),
      images: z.array(z.object({
        src: z.string(),
        caption: z.string().optional(),
        alt: z.string().optional()
      })).optional()
    })),
    sources: z.array(z.string())
  })
});

export const collections = { watches };
