import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  try {
    const csvPath = join(process.cwd(), 'data', 'scraped_books_details.csv');
    console.log(`Reading CSV file from: ${csvPath}`);
    
    const fileContent = readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    console.log(`Found ${records.length} records to import`);

    for (const record of records) {
      try {
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
            filters: record.filters ? record.filters.split(',').map(f => f.trim()) : [],
            tags: record.tags || null,
            contentWarnings: record.content_warnings || null,
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