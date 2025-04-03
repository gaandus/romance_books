# Romance Book Recommender

A personalized romance book recommendation system powered by OpenAI's LLM technology.

## Project Structure

```
romance-book-recommender/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── components/        # React components
│   └── page.tsx          # Main page
├── data/                  # Data directory
│   └── scraped_books_details.csv  # Main book dataset
├── lib/                   # Utility functions and shared code
│   └── llm.ts            # OpenAI integration
├── public/               # Static assets
├── prisma/               # Database schema and migrations
├── scripts/              # Utility scripts
├── scraping/             # Data scraping scripts
├── docker/               # Docker configuration
└── .cursor/              # Cursor rules and documentation
```

## Features

- User preference-based book recommendations using OpenAI's LLM
- Ability to mark books as read or not interested
- Dynamic recommendation replacement based on user feedback
- Book cover image display
- Filtering by tags and content warnings
- Series information tracking
- Spice level indicators

## Tech Stack

### Frontend
- Next.js 14 with App Router for server-side rendering and API routes
- React Server Components for improved performance
- Tailwind CSS for styling
- Shadcn/ui for pre-built components
- React Query for client-side data management
- Zustand for state management

### Backend
- Next.js API Routes for backend functionality
- OpenAI API for LLM integration
- Prisma ORM with PostgreSQL for database
- CSV parsing with papaparse for data import
- Zod for runtime type validation

### Development Tools
- TypeScript for type safety
- ESLint and Prettier for code formatting
- Jest and React Testing Library for testing
- Husky for git hooks
- GitHub Actions for CI/CD

## Data Scraping Process

The project uses pre-scraped book data from romance.io. The scraping process is implemented in Python and uses a modular architecture for maintainability and extensibility.

### Scraping Architecture

The scraping system consists of several components:

1. **Main Scraper (`scraping/main.py`)**
   - Orchestrates the scraping process
   - Manages rate limiting and concurrency
   - Handles error recovery and retries
   - Coordinates data collection and storage

2. **Book Parser (`scraping/parsers/book_parser.py`)**
   - Extracts detailed book information from individual book pages
   - Handles HTML parsing and data extraction
   - Manages data cleaning and normalization
   - Implements error handling for malformed pages

3. **List Parser (`scraping/parsers/list_parser.py`)**
   - Scrapes book lists and categories
   - Extracts book URLs and basic metadata
   - Implements pagination handling
   - Manages category traversal

4. **Data Storage (`scraping/storage/csv_storage.py`)**
   - Handles data persistence
   - Implements incremental updates
   - Manages data validation
   - Provides data export functionality

### Scraping Setup

1. Install Python dependencies:
   ```bash
   cd scraping
   pip install -r requirements.txt
   ```

2. Configure scraping parameters in `scraping/config.py`:
   ```python
   # Rate limiting configuration
   RATE_LIMIT = {
       'requests_per_minute': 30,
       'delay_between_requests': 2.0
   }

   # Scraping targets
   TARGETS = {
       'base_url': 'https://www.romance.io',
       'categories': ['contemporary', 'fantasy', 'historical'],
       'max_pages_per_category': 50
   }

   # Output configuration
   OUTPUT = {
       'data_dir': '../data',
       'filename': 'scraped_books_details.csv',
       'backup_dir': 'backups'
   }
   ```

3. Run the scraper:
   ```bash
   # Basic scraping
   python main.py

   # Scrape specific categories
   python main.py --categories contemporary fantasy

   # Resume interrupted scraping
   python main.py --resume

   # Update existing data
   python main.py --update
   ```

### Data Collection Process

1. **Initialization**
   - Load configuration
   - Initialize storage
   - Set up rate limiting
   - Create backup of existing data

2. **Category Traversal**
   - Visit each configured category page
   - Extract book URLs and basic metadata
   - Handle pagination
   - Implement retry logic for failed requests

3. **Book Data Collection**
   - Visit each book page
   - Extract detailed information:
     - Basic metadata (title, author, URL)
     - Series information
     - Ratings and reviews
     - Book details (pages, publication date)
     - Content summary
     - Tags and filters
     - Content warnings
   - Clean and normalize data
   - Handle missing or malformed data

4. **Data Storage**
   - Validate collected data
   - Store in CSV format
   - Create incremental backups
   - Log scraping progress and errors

### Data Structure

The scraped data is stored in `data/scraped_books_details.csv` with the following structure:

#### Basic Information
- `id`: Unique identifier for the book
- `title`: Book title
- `url`: Direct link to the book on romance.io
- `title_scraped`: Original title as scraped
- `author_scraped`: Author name as scraped

#### Series Information
- `series_name`: Name of the book series
- `series_number`: Position in the series

#### Ratings
- `rating`: Average rating (0-5)
- `num_ratings`: Total number of ratings

#### Book Details
- `pages`: Number of pages
- `published_date`: Publication date
- `spice_level`: Heat level (1-5)

#### Content
- `summary`: Book description/summary

#### Categorization
- `filters`: Comma-separated list of book attributes
  - Format: "attribute1,attribute2,attribute3"
  - Example: "contemporary,small-town,second-chance"

#### Tags
- `tags`: Weighted tags with counts
  - Format: "tag1(count1),tag2(count2)"
  - Example: "witches(22),fae(22),magic(15)"

#### Content Warnings
- `content_warnings`: Specific warnings with counts
  - Format: "warning1(count1),warning2(count2)"
  - Example: "violence(5),sexual-content(3)"

#### Status
- `scraped_status`: Status of the scraping process
  - Values: "complete", "partial", "failed"

### Error Handling and Recovery

The scraping system implements robust error handling:

1. **Rate Limiting**
   - Respects website's rate limits
   - Implements exponential backoff
   - Handles temporary bans

2. **Error Recovery**
   - Automatic retries for failed requests
   - Saves progress at regular intervals
   - Can resume from last successful point
   - Logs errors for manual review

3. **Data Validation**
   - Validates data before storage
   - Handles missing or malformed data
   - Implements data cleaning routines
   - Creates data quality reports

### Maintenance and Updates

To update the book database:

1. **Incremental Updates**
   ```bash
   python main.py --update
   ```
   - Only scrapes new or modified books
   - Updates existing records
   - Preserves user feedback

2. **Full Rescrape**
   ```bash
   python main.py --force
   ```
   - Performs complete rescrape
   - Creates new backup
   - Preserves existing data until successful completion

3. **Data Validation**
   ```bash
   python main.py --validate
   ```
   - Validates existing data
   - Generates quality report
   - Identifies missing or invalid data

## Web Application

### Features

#### Chat Interface
- Natural conversation flow with the AI assistant
- User can freely type their preferences and questions
- Assistant responds with personalized book recommendations
- Follow-up questions and responses based on user feedback

#### Book Recommendations
- Displayed as cards with:
  - Book cover image (placeholder)
  - Title with clickable link to romance.io
  - Author name
  - Rating and number of ratings
  - Spice level indicator
  - Book summary (limited to 3 lines)
  - Top 3 most relevant tags by count
  - Content warnings with warning emoji
  - "Mark as Read" and "Mark as Not Interested" buttons

#### User Interaction
- Ability to mark books as read
- Ability to mark books as not interested
- Feedback is used to improve future recommendations
- Excludes read and not interested books from new recommendations

### Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Add your OpenAI API key to `.env.local`

4. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

## Deployment

The application is containerized using Docker for easy deployment. The Docker configuration is located in the `docker/` directory.

### Prerequisites
- Docker and Docker Compose installed on the server
- PostgreSQL database
- OpenAI API key

### Server Configuration

1. Set up environment variables on the server:
   ```bash
   # Create .env file with the following variables
   DATABASE_URL="postgresql://user:password@host:5432/dbname"
   OPENAI_API_KEY="your-api-key"
   NODE_ENV="production"
   ```

2. Build and run the Docker container:
   ```bash
   docker-compose -f docker/docker-compose.prod.yml up -d --build
   ```

3. Run database migrations:
   ```bash
   docker-compose -f docker/docker-compose.prod.yml exec web npx prisma migrate deploy
   ```

### Docker Configuration

The project includes two Docker Compose files:
- `docker-compose.dev.yml`: For local development
- `docker-compose.prod.yml`: For production deployment

The production configuration includes:
- Multi-stage builds for optimized images
- Health checks
- Environment variable management
- Volume mounts for persistent data

## License

This project is licensed under the MIT License - see the LICENSE file for details. 