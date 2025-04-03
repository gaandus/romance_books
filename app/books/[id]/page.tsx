import { getBookById } from '@/app/utils/dataLoader';

export const dynamic = 'force-static';
export const revalidate = 3600; // Revalidate every hour

async function Page({ params }: { params: { id: string } }) {
  const book = await getBookById(params.id);

  if (!book) {
    return <div className="container mx-auto p-4">Book not found</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-8">
          {/* Book Details */}
          <div>
            <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
            <p className="text-xl text-gray-700 mb-4">by {book.author}</p>

            {/* Series Info */}
            {book.series && (
              <p className="text-lg text-gray-600 mb-4">
                Series: {book.series} {book.seriesNumber ? `#${book.seriesNumber}` : ''}
              </p>
            )}

            {/* Basic Info */}
            <div className="flex flex-wrap gap-4 text-lg mb-6">
              <span>⭐ {book.averageRating.toFixed(1)}/5 ({book.ratingsCount} ratings)</span>
              <span>
                {book.spiceLevel ? (
                  <>
                    {'🔥'.repeat(parseInt(book.spiceLevel))}
                    {'⚪'.repeat(5 - parseInt(book.spiceLevel))}
                  </>
                ) : (
                  'Not specified'
                )}
              </span>
              {book.pageCount && <span>📚 {book.pageCount} pages</span>}
            </div>

            {/* Summary */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2">Summary</h2>
              <p className="text-gray-800">{book.summary}</p>
            </div>

            {/* Tags */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-2">Tags</h2>
              <div className="flex flex-wrap gap-2">
                {book.tags.map((tag: string, index: number) => (
                  <span 
                    key={index}
                    className="bg-secondary-light bg-opacity-20 text-secondary-dark px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Content Warnings */}
            {book.contentWarnings && book.contentWarnings.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Content Warnings</h2>
                <div className="flex flex-wrap gap-2">
                  {book.contentWarnings.map((warning: string, index: number) => (
                    <span 
                      key={index}
                      className="bg-red-100 text-red-800 px-3 py-1 rounded-full"
                    >
                      {warning}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* External Link */}
            <div className="mt-8">
              <a 
                href={book.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary inline-flex items-center"
              >
                View on Romance.io
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Page; 