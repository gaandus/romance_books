import { PrismaClient, Prisma } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface BookRecord {
  id: string;
  title: string;
  url: string;
  title_scraped: string | null;
  author_scraped: string | null;
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
        if (!record.id || !record.title || !record.url) {
          console.error(`Skipping record with missing required fields: ${record.title || 'unknown'}`);
          continue;
        }

        const bookData: Prisma.BookCreateInput = {
          id: record.id,
          title: record.title,
          url: record.url,
          titleScraped: record.title_scraped || record.title,
          authorScraped: record.author_scraped || 'Unknown Author',
          seriesName: record.series_name || null,
          seriesNumber: record.series_number ? parseInt(record.series_number) : null,
          rating: record.rating ? parseFloat(record.rating) : null,
          numRatings: record.num_ratings ? parseInt(record.num_ratings) : null,
          pages: record.pages ? parseInt(record.pages) : null,
          publishedDate: record.published_date ? new Date(record.published_date) : null,
          spiceLevel: record.spice_level || null,
          summary: record.summary || null,
          filters: record.filters ? {
            connectOrCreate: record.filters.split(',').map((f: string) => ({
              where: { name: f.trim() },
              create: { name: f.trim() }
            }))
          } : undefined,
          tags: record.tags ? {
            connectOrCreate: record.tags.split(',').map((t: string) => ({
              where: { name: t.trim() },
              create: { name: t.trim() }
            }))
          } : undefined,
          contentWarnings: record.content_warnings ? {
            connectOrCreate: record.content_warnings.split(',').map((w: string) => ({
              where: { name: w.trim() },
              create: { name: w.trim() }
            }))
          } : undefined,
          scrapedStatus: record.scraped_status || null,
        };

        await prisma.book.create({
          data: bookData
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