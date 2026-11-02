/** Curated, versioned placement questions. Answer keys never leave the server. */

export type PlacementSkill = "vocabulary" | "grammar" | "reading" | "listening";

export type PlacementQuestion = {
  id: string;
  skill: PlacementSkill;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  answer: string;
};

export const PLACEMENT_VERSION = 1;

export const PLACEMENT_SKILLS: readonly PlacementSkill[] = ["vocabulary", "grammar", "reading", "listening"];

export const PLACEMENT_QUESTIONS: readonly PlacementQuestion[] = [
  {
    id: "vocab-1",
    skill: "vocabulary",
    prompt: "Choose the word that means a place where you buy bread.",
    options: [{ id: "a", label: "Bakery" }, { id: "b", label: "Library" }, { id: "c", label: "Pharmacy" }, { id: "d", label: "Garage" }],
    answer: "a",
  },
  {
    id: "vocab-2",
    skill: "vocabulary",
    prompt: "Which word is the opposite of \"expensive\"?",
    options: [{ id: "a", label: "Heavy" }, { id: "b", label: "Cheap" }, { id: "c", label: "Quiet" }, { id: "d", label: "Early" }],
    answer: "b",
  },
  {
    id: "vocab-3",
    skill: "vocabulary",
    prompt: "\"I need to ___ an appointment with the doctor.\"",
    options: [{ id: "a", label: "do" }, { id: "b", label: "take" }, { id: "c", label: "make" }, { id: "d", label: "give" }],
    answer: "c",
  },
  {
    id: "grammar-1",
    skill: "grammar",
    prompt: "\"She ___ to work every day.\"",
    options: [{ id: "a", label: "go" }, { id: "b", label: "goes" }, { id: "c", label: "going" }, { id: "d", label: "gone" }],
    answer: "b",
  },
  {
    id: "grammar-2",
    skill: "grammar",
    prompt: "\"Yesterday we ___ a great film.\"",
    options: [{ id: "a", label: "see" }, { id: "b", label: "have seen" }, { id: "c", label: "saw" }, { id: "d", label: "seeing" }],
    answer: "c",
  },
  {
    id: "grammar-3",
    skill: "grammar",
    prompt: "\"If I ___ more time, I would learn Japanese.\"",
    options: [{ id: "a", label: "have" }, { id: "b", label: "had" }, { id: "c", label: "will have" }, { id: "d", label: "am having" }],
    answer: "b",
  },
  {
    id: "reading-1",
    skill: "reading",
    prompt: "\"The café opens at 8 and closes at 3 on weekdays.\" When can you get coffee at 4 pm on Tuesday?",
    options: [{ id: "a", label: "Yes, it is open" }, { id: "b", label: "No, it is closed" }, { id: "c", label: "Only on Tuesday" }],
    answer: "b",
  },
  {
    id: "reading-2",
    skill: "reading",
    prompt: "\"Tom missed the bus, so he walked and arrived late.\" Why was Tom late?",
    options: [{ id: "a", label: "He overslept" }, { id: "b", label: "He missed the bus" }, { id: "c", label: "The bus was late" }],
    answer: "b",
  },
  {
    id: "listening-1",
    skill: "listening",
    prompt: "Transcript: \"Excuse me, the station is two blocks ahead, on your left.\" Where is the station?",
    options: [{ id: "a", label: "Two blocks ahead, on the left" }, { id: "b", label: "Behind you" }, { id: "c", label: "Two blocks ahead, on the right" }],
    answer: "a",
  },
  {
    id: "listening-2",
    skill: "listening",
    prompt: "Transcript: \"Could I get a small latte to take away, please?\" What does the speaker want?",
    options: [{ id: "a", label: "A large tea" }, { id: "b", label: "A small latte to go" }, { id: "c", label: "A table for two" }],
    answer: "b",
  },
];
