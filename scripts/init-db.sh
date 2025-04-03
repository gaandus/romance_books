#!/bin/bash

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! pg_isready -h db -U romance -d romance; do
  sleep 1
done

# Run Prisma migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Import initial data if it exists
if [ -f "/app/data/scraped_books_details.csv" ]; then
  echo "Importing initial data..."
  npx ts-node scripts/import-data.ts
fi

echo "Database initialization complete!" 