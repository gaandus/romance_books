#!/bin/bash

# Combine all split CSV files
cat data/split/scraped_books_details_*.csv > data/scraped_books_details.csv

echo "CSV files have been combined into data/scraped_books_details.csv" 