#!/bin/sh

echo "Waiting for PostgreSQL to be ready..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "PostgreSQL is ready!"

echo "Running migrations..."
# First, create the migration if it doesn't exist
npx prisma migrate dev --name init --create-only

# Then apply the migration
npx prisma migrate deploy

echo "Importing initial data..."
node dist/scripts/import-data.js

echo "Database initialization complete!" 