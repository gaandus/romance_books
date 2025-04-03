import { prisma } from './prisma';

class CacheService {
    private static instance: CacheService;
    private tags: string[] = [];
    private contentWarnings: string[] = [];
    private lastUpdate: number = 0;
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private readonly MAX_ITEMS = 50; // Reduced from 100 to 50

    private constructor() {}

    public static getInstance(): CacheService {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService();
        }
        return CacheService.instance;
    }

    public async getTags(): Promise<string[]> {
        if (this.needsUpdate()) {
            await this.updateCache();
        }
        return this.tags;
    }

    public async getContentWarnings(): Promise<string[]> {
        if (this.needsUpdate()) {
            await this.updateCache();
        }
        return this.contentWarnings;
    }

    private needsUpdate(): boolean {
        return this.tags.length === 0 || 
               this.contentWarnings.length === 0 || 
               Date.now() - this.lastUpdate > this.CACHE_DURATION;
    }

    private async updateCache(): Promise<void> {
        try {
            const [tags, contentWarnings] = await Promise.all([
                prisma.tag.findMany({
                    select: { name: true },
                    orderBy: { count: 'desc' },
                    take: this.MAX_ITEMS
                }),
                prisma.contentWarning.findMany({
                    select: { name: true },
                    orderBy: { count: 'desc' },
                    take: this.MAX_ITEMS
                })
            ]);

            this.tags = tags.map(t => t.name);
            this.contentWarnings = contentWarnings.map(w => w.name);
            this.lastUpdate = Date.now();

            console.log('Cache updated with:', {
                tagsCount: this.tags.length,
                warningsCount: this.contentWarnings.length,
                totalCharacters: this.tags.join('').length + this.contentWarnings.join('').length
            });
        } catch (error) {
            console.error('Error updating cache:', error);
        }
    }
}

export const cacheService = CacheService.getInstance(); 