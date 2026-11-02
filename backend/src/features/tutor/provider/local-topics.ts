/** Curated answers for the local demo tutor. Keywords are matched as whole words or phrases. */
export type LocalTopic = { keywords: string[]; answer: string; example: string };

export const LOCAL_TOPICS: LocalTopic[] = [
  {
    keywords: ["hello", "hi", "greet", "greeting", "greetings", "good morning", "good afternoon", "good evening", "good night"],
    answer: "Use “Good morning” before noon, “Good afternoon” after noon, and “Good evening” at night. “Good night” is only for saying goodbye before bed.",
    example: "Good morning! How are you?",
  },
  {
    keywords: ["introduce", "introduction", "myself", "my name", "name is"],
    answer: "Introduce yourself with “My name is…” or the shorter “I'm…”, then add “Nice to meet you.”",
    example: "Hi, I'm Mia. Nice to meet you.",
  },
  {
    keywords: ["how are you", "i'm fine", "fine thank you", "fine thanks"],
    answer: "“How are you?” is a friendly question. Answer with “I'm fine, thank you” or “I'm good, thanks”, then ask back with “And you?”",
    example: "I'm fine, thank you. And you?",
  },
  {
    keywords: ["order", "ordering", "coffee", "tea", "cafe", "café", "polite", "politely", "could i have"],
    answer: "To order politely, use “Could I have…, please?”. It sounds friendlier than “I want…”.",
    example: "Could I have a coffee, please?",
  },
  {
    keywords: ["a an", "a or an", "an", "article", "articles"],
    answer: "Use “a” before a consonant sound (a coffee, a book) and “an” before a vowel sound (an apple, an hour).",
    example: "I'd like an orange juice and a sandwich.",
  },
  {
    keywords: ["direction", "directions", "left", "right", "straight", "where is", "way to", "get to"],
    answer: "Ask “Excuse me, where is…?” or “How do I get to…?”. Directions often use “turn left”, “turn right”, and “go straight on”.",
    example: "Go straight on, then turn left at the traffic lights.",
  },
];

export const LOCAL_FALLBACK =
  "I'm Flo's demo tutor, so I know a few topics well: greetings, introductions, “How are you?”, ordering at a café, “a” and “an”, and directions. Ask about one of them, or practise a role-play.";
