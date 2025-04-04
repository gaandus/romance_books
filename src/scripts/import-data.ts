import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface BookRecord {
  id: string;
  title: string;
  url: string;
  title_scraped: string;
  author_scraped: string;
  series_name?: string | null;
  series_number?: string | null;
  rating?: string | null;
  num_ratings?: string | null;
  pages?: string | null;
  published_date?: string | null;
  spice_level?: string | null;
  summary?: string | null;
  filters?: string | null;
  tags?: string | null;
  content_warnings?: string | null;
  scraped_status?: string | null;
}

async function main() {
  try {
    const csvPath = join(process.cwd(), 'data', 'scraped_books_details.csv');
    console.log(`Reading CSV file from: ${csvPath}`);
    
    const fileContent = readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as BookRecord[];

    console.log(`Found ${records.length} records to import`);

    for (const record of records) {
      try {
        // Ensure required fields are not null
        if (!record.title || !record.url || !record.title_scraped || !record.author_scraped) {
          console.error(`Skipping record with missing required fields: ${record.title || 'unknown'}`);
          continue;
        }

        await prisma.book.create({
          data: {
            id: record.id,
            title: record.title,
            url: record.url,
            titleScraped: record.title_scraped,
            authorScraped: record.author_scraped,
            seriesName: record.series_name || null,
            seriesNumber: record.series_number ? parseInt(record.series_number) : null,
            rating: record.rating ? parseFloat(record.rating) : null,
            numRatings: record.num_ratings ? parseInt(record.num_ratings) : null,
            pages: record.pages ? parseInt(record.pages) : null,
            publishedDate: record.published_date ? new Date(record.published_date) : null,
            spiceLevel: record.spice_level || null,
            summary: record.summary || null,
            filters: record.filters ? {
              create: record.filters.split(',').map((f: string) => ({
                name: f.trim()
              }))
            } : undefined,
            tags: record.tags ? {
              create: record.tags.split(',').map((t: string) => ({
                name: t.trim()
              }))
            } : undefined,
            contentWarnings: record.content_warnings ? {
              create: record.content_warnings.split(',').map((w: string) => ({
                name: w.trim()
              }))
            } : undefined,
            scrapedStatus: record.scraped_status || null,
          },
        });
        console.log(`Imported book: ${record.title}`);
      } catch (error) {
        console.error(`Error importing book ${record.title}:`, error);
      }
    }

    console.log('Data import completed');
  } catch (error) {
    console.error('Error during data import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 