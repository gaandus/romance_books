#!/bin/bash

# Create data directory if it doesn't exist
mkdir -p data/split

# Split the CSV file into chunks of 50MB each
split -b 50m data/scraped_books_details.csv data/split/scraped_books_details_

# Add .csv extension to all split files
for file in data/split/scraped_books_details_*; do
    mv "$file" "$file.csv"
done

echo "CSV file has been split into chunks in data/split/" 