import { prisma } from '../lib/prisma';

async function checkTagsAndWarnings() {
    try {
        // Get all tags
        const tags = await prisma.tag.findMany({
            select: {
                name: true,
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Get all content warnings
        const warnings = await prisma.contentWarning.findMany({
            select: {
                name: true,
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Extract unique tag names without count information
        const uniqueTags = Array.from(new Set(tags.map(tag => {
            const match = tag.name.match(/^(.*?)\s*\(\d+\)$/);
            return match ? match[1].trim() : tag.name;
        }))).sort();

        // Extract unique warning names without count information
        const uniqueWarnings = Array.from(new Set(warnings.map(warning => {
            const match = warning.name.match(/^(.*?)\s*\(\d+\)$/);
            return match ? match[1].trim() : warning.name;
        }))).sort();

        console.log('\nUnique Tags (comma-separated):');
        console.log(uniqueTags.map(tag => `"${tag}"`).join(', '));
        
        console.log('\nUnique Content Warnings (comma-separated):');
        console.log(uniqueWarnings.map(warning => `"${warning}"`).join(', '));

        await prisma.$disconnect();
    } catch (error) {
        console.error('Error checking tags and warnings:', error);
        await prisma.$disconnect();
    }
}

checkTagsAndWarnings(); 