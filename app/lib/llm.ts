import { UserPreferences } from '@/types/book';
import { z } from 'zod';

// Validation schema for preferences
const preferencesSchema = z.object({
    genres: z.array(z.string()).optional(),
    contentWarnings: z.array(z.string()).optional(),
    excludedWarnings: z.array(z.string()).optional(),
    minimumRating: z.number().min(0).max(5).optional(),
    spiceLevel: z.enum(['Sweet', 'Mild', 'Medium', 'Hot', 'Scorching', 'Inferno']).optional(),
    keywords: z.array(z.string()).optional(),
});

const SYSTEM_PROMPT = `You are a romance book recommendation assistant. Analyze the user's message and extract their preferences in a structured format.

For content warnings, distinguish between warnings they want to include and warnings they want to exclude.

For spice levels, understand various ways users might express their preferred spice level and convert them to standard values:
- Sweet (0): clean, closed door, fade to black, no explicit content
- Mild (1): kissing, touching, mild intimacy
- Medium (2): moderate intimacy, some explicit content
- Hot (3): explicit content, steamy scenes
- Scorching (4): very explicit content, frequent steamy scenes
- Inferno (5): extremely explicit content, very frequent steamy scenes

Available tags in the database (comma-separated):
"20th century", "abduction", "actor hero", "african-american", "age gap", "age play", "aliens", "alpha male", "american civil war", "amish", "anal sex", "ancient times", "angels", "angst", "aristo/royal heroine", "arranged/forced marriage", "asexual hero", "asexual heroine", "athlete hero", "athlete heroine", "bad boys", "baseball", "basketball", "bdsm", "bear shifter", "best friend's parent", "betrayal", "biker hero", "bisexuality", "black mc", "bodyguard/protector hero", "bodyguard/protector heroine", "bondage", "boss & employee", "breeding", "buddhist", "bw/wm", "caretaking", "ceo/tycoon hero", "cheating", "cheerful/happy heroine", "childfree", "christian", "christmas", "class difference", "college", "competent heroine", "consensual non-consent", "contemporary", "cowboy hero", "creative anatomy", "criminal heroine", "cruel hero/bully", "curvy heroine", "dad-bod hero", "daddy kink", "dangerous heroine", "dark romance", "demisexual hero", "demisexual heroine", "demons", "disabilities & scars", "double anal", "double penetration", "double vaginal", "dragon shifter", "dual pov", "dystopian", "east asian mc", "enemies to lovers", "exhibitionism", "fae", "fake relationship", "famous heroine", "fantasy", "fated mates", "fem-dom", "female rake", "fetish", "fff+", "fighter hero", "fighting/mma/boxing", "first person pov", "football", "forbidden love", "forced proximity", "found family", "friends to lovers", "friends with benefits", "funny", "futuristic", "gay romance", "georgian", "gifted/super-heroine", "good grovel", "grumpy & sunshine", "grumpy/cold hero", "grumpy/ice queen", "harem", "height difference", "high fantasy", "high school", "highlander hero", "himbo", "hindu", "historical", "hockey", "horror", "hurt/comfort", "ice/figure skating", "independent heroine", "indigenous mc", "insta-love", "jewish", "latinx mc", "lesbian romance", "lion shifter", "love triangle", "m-f romance", "mafia", "magic", "male pov", "marriage of convenience", "medieval", "men in uniform", "menage", "mff", "mfm", "military", "mmf", "mmm+", "monsters", "multicultural", "muslim", "mystery", "nerdy hero", "neurodivergent mc", "new adult", "non-binary romance", "non-human hero", "non-human heroine", "older/mature", "omegaverse", "orcs", "other man/woman", "pagan", "paranormal", "parent's best friend", "pegging", "pirate hero", "plain heroine", "political/court intrigue", "politician hero", "poly (3+ people)", "poor heroine", "possessive hero", "praise kink", "pregnancy", "primal/chase play", "queer awakening", "queer romance", "regency", "reverse harem", "rich hero", "rich heroine", "rockstar hero", "royal hero", "sassy heroine", "science fiction", "second chances", "secret child", "secret relationship", "shapeshifters", "sheik", "short king", "shy hero", "shy heroine", "sibling's best friend", "silver fox", "single father", "single mother", "slavery", "sleuth heroine", "slow burn", "small town", "soccer", "somnophilia", "south asian/desi", "southeast asian mc", "spanking", "sports", "steampunk", "step siblings", "sunny/happy hero", "superheroes", "survival", "suspense", "sweet/gentle hero", "sweet/gentle heroine", "take-charge heroine", "tall heroine", "teacher/coach hero", "teacher/coach heroine", "third person pov", "tiger shifter", "time travel", "tortured hero", "tortured heroine", "trans hero", "trans heroine", "tudors & stuarts", "urban fantasy", "vampires", "vengeance", "victorian", "viking hero", "virgin hero", "virgin heroine", "war", "warlord/commander hero", "warrior heroine", "werewolves", "western", "western frontier", "white collar heroine", "witches", "working class hero", "working class heroine", "workplace/office", "young adult"

Available content warnings in the database: (comma-separated):
"ableism", "abuse", "abuse between mcs", "alcoholism", "animal abuse", "animal death", "birth-control non-consent", "body betrayal", "child death", "child sexual abuse", "death / grief", "drug abuse", "dubious consent", "eating disorders", "fatphobia", "forced pregnancy", "gambling", "graphic violence", "human trafficking", "incest", "mental illness", "mental trauma", "miscarriage / infertility", "misogyny", "no hea", "non-consent between mcs", "nontraditional hea", "past abuse", "past child abuse", "past child neglect", "past sexual abuse", "queerphobia", "racism", "rape", "religious trauma", "self harm", "slut shaming", "substance abuse", "suicide / ideation", "terminal illness", "third party abuse", "third party sexual assault", "torture of mcs", "torture of side characters", "victim blaming"

IMPORTANT: Only use tags and content warnings that exist in the database. If a user mentions something that doesn't exist in the database, try to match it to the closest available option.

Response should be like this: 
{
    "spiceLevel": "Sweet" | "Mild" | "Medium" | "Hot" | "Scorching" | "Inferno",
    "genres": ["tag1", "tag2", ...],
    "contentWarnings": ["warning1", "warning2", ...],
    "excludedWarnings": ["warning1", "warning2", ...]
}`;

export async function analyzeUserPreferences(message: string): Promise<UserPreferences> {
    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4-turbo-preview",
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: message }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        if (!content) return {};

        try {
            const parsedData = JSON.parse(content);
            const validatedData = preferencesSchema.parse(parsedData);
            console.log('Validated preferences:', validatedData);
            return validatedData;
        } catch (error) {
            console.error('Error parsing or validating response:', error);
            return {};
        }
    } catch (error) {
        console.error('Error analyzing preferences:', error);
        return {};
    }
} 