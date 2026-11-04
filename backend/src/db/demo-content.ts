import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./prisma.js";

type Activity = { type: string; prompt: string; instruction?: string; content: Prisma.InputJsonObject; answerKey: Prisma.InputJsonObject; explanation: string; options?: string[] };
type DemoLesson = { slug: string; title: string; skill: string; exercises: Activity[] };
type DemoCourse = { slug: string; title: string; level: string; description: string; units: Array<{ slug: string; title: string; lessons: DemoLesson[] }> };

function choice(prompt: string, options: string[], explanation: string, transcript?: string): Activity {
  return { type: transcript ? "listening_choice" : "multiple_choice", prompt, content: transcript ? { transcript } : { mode: "single_choice" }, answerKey: { optionValue: "option-1" }, explanation, options };
}
function tiles(prompt: string, tokens: string[]): Activity {
  return { type: "sentence_tiles", prompt, content: { tiles: [...tokens].reverse() }, answerKey: { tokens }, explanation: `The sentence is: ${tokens.join(" ")}` };
}
function dictation(text: string): Activity {
  return { type: "dictation", prompt: "Listen and write the sentence.", instruction: "You can replay the audio. Punctuation at the end is optional.", content: { transcript: text }, answerKey: { accepted: [text, text.replace(/[.!?]$/, "")] }, explanation: `The speaker says: ${text}` };
}
function speaking(text: string): Activity {
  return { type: "speaking", prompt: `Say: “${text}”`, content: { suggestedPhrase: text }, answerKey: { scoring: "self_assessed" }, explanation: "Listen, record your attempt, and assess it yourself. No automatic pronunciation score is claimed." };
}
function gap(transcript: string, accepted: string): Activity {
  return { type: "transcript_gap", prompt: "Complete the sentence.", content: { transcript, gaps: [1] }, answerKey: { accepted: [accepted] }, explanation: `The missing word is “${accepted}”.` };
}
function matching(pairs: Array<{ left: string; right: string }>): Activity {
  return { type: "matching", prompt: "Match each phrase with its meaning.", content: { leftItems: pairs.map(p => p.left), rightItems: pairs.map(p => p.right).reverse() }, answerKey: { pairs }, explanation: "Compare each phrase with its meaning in the conversation." };
}

/** Keep the four original A1 lessons stable; these courses broaden the demo without changing their IDs or scoring. */
export const ADDITIONAL_COURSES: DemoCourse[] = [
  { slug: "everyday-conversations", title: "Everyday Conversations", level: "A2", description: "Make plans, ask politely, and talk about your experiences.", units: [
    { slug: "plans-and-invitations", title: "Plans and invitations", lessons: [
      { slug: "making-plans", title: "Making plans", skill: "listening", exercises: [
        choice("Where and when will the friends meet?", ["At the library on Saturday", "At the station on Monday", "At home tonight"], "The speaker suggests the library on Saturday.", "Let's meet at the library on Saturday."),
        dictation("I am going to visit my friend tomorrow."),
      ] },
      { slug: "polite-requests", title: "Polite requests", skill: "speaking", exercises: [speaking("Could you help me, please?"), tiles("Build a polite request.", ["Could", "you", "help", "me,", "please?"])] },
    ] },
    { slug: "experiences-and-travel", title: "Experiences and travel", lessons: [
      { slug: "past-experiences", title: "Past experiences", skill: "reading", exercises: [choice("I have ___ to Da Nang twice.", ["been", "be", "being"], "Use the past participle after have."), gap("I have ___ to Da Nang twice.", "been")] },
      { slug: "at-the-station", title: "At the station", skill: "listening", exercises: [choice("Which platform does the train leave from?", ["Platform two", "Platform five", "Platform ten"], "The announcement says platform two.", "The train to the city centre leaves from platform two."), matching([{ left: "platform", right: "where you board a train" }, { left: "return ticket", right: "a ticket for both directions" }])] },
    ] },
  ] },
  { slug: "confident-communication", title: "Confident Communication", level: "B1", description: "Share opinions, explain problems, and tell connected stories.", units: [
    { slug: "work-together", title: "Work together", lessons: [
      { slug: "sharing-opinions", title: "Sharing opinions", skill: "reading", exercises: [choice("Which sentence politely expresses an opinion?", ["I think we should try another approach.", "You must agree with me.", "Only my idea is right."], "I think introduces an opinion without demanding agreement."), tiles("Build an opinion.", ["In", "my", "opinion,", "practice", "helps."])] },
      { slug: "explaining-a-problem", title: "Explaining a problem", skill: "speaking", exercises: [speaking("I could not finish because the connection was slow."), dictation("We should discuss the problem together.")] },
    ] },
    { slug: "tell-a-story", title: "Tell a story", lessons: [
      { slug: "narrative-tenses", title: "Narrative tenses", skill: "writing", exercises: [choice("When I arrived, the train ___ already left.", ["had", "has", "was"], "Past perfect describes the earlier past event."), gap("When I arrived, the train ___ already left.", "had")] },
      { slug: "making-comparisons", title: "Making comparisons", skill: "reading", exercises: [choice("This route is ___ than the old one.", ["more convenient", "most convenient", "convenientest"], "Use more with longer adjectives in a comparison."), matching([{ left: "although", right: "introduces a contrast" }, { left: "because", right: "introduces a reason" }, { left: "therefore", right: "introduces a result" }])] },
    ] },
  ] },
];

export async function seedAdditionalContent() {
  for (const [courseIndex, data] of ADDITIONAL_COURSES.entries()) {
    const fields = { slug: data.slug, title: data.title, description: data.description, language: "English", level: data.level, estimatedMinutes: 40, order: courseIndex + 2, isPublished: true };
    const course = await prisma.course.upsert({ where: { slug: data.slug }, create: fields, update: fields });
    for (const [unitIndex, unitData] of data.units.entries()) {
      const fields = { courseId: course.id, slug: unitData.slug, title: unitData.title, description: `Practice ${unitData.title.toLowerCase()} in English.`, order: unitIndex + 1 };
      const unit = await prisma.unit.upsert({ where: { courseId_slug: { courseId: course.id, slug: unitData.slug } }, create: fields, update: fields });
      for (const [lessonIndex, lessonData] of unitData.lessons.entries()) {
        const fields = { unitId: unit.id, slug: lessonData.slug, title: lessonData.title, description: `A short ${data.level} lesson about ${lessonData.title.toLowerCase()}.`, skill: lessonData.skill, level: data.level, durationMinutes: 10, order: lessonIndex + 1 };
        const lesson = await prisma.lesson.upsert({ where: { unitId_slug: { unitId: unit.id, slug: lessonData.slug } }, create: fields, update: fields });
        for (const [exerciseIndex, item] of lessonData.exercises.entries()) {
          const fields = { lessonId: lesson.id, order: exerciseIndex + 1, type: item.type, prompt: item.prompt, instruction: item.instruction ?? "Take your time and use the hint if needed.", content: { ...item.content, hints: ["Read or listen to the whole prompt.", "Think about the meaning and sentence structure.", item.instruction ?? "Compare the available words or phrases carefully."] }, answerKey: item.answerKey, explanation: item.explanation };
          const exercise = await prisma.exercise.upsert({ where: { lessonId_order: { lessonId: lesson.id, order: exerciseIndex + 1 } }, create: fields, update: fields });
          for (const [optionIndex, label] of (item.options ?? []).entries()) {
            const fields = { exerciseId: exercise.id, label, value: `option-${optionIndex + 1}`, order: optionIndex + 1, isCorrect: optionIndex === 0 };
            await prisma.exerciseOption.upsert({ where: { exerciseId_order: { exerciseId: exercise.id, order: optionIndex + 1 } }, create: fields, update: fields });
          }
        }
      }
    }
    const path = { courseId: course.id, slug: `${data.slug}-path`, title: data.title, summary: data.description, careerGoal: courseIndex ? "Work and study communication" : "Everyday communication", targetLanguage: "English", level: data.level, estimatedMinutes: 40, estimatedWeeks: 2, outcomes: data.units.map(u => u.title), order: courseIndex + 3, isPublished: true };
    await prisma.learningPath.upsert({ where: { slug: path.slug }, create: path, update: path });
    const first = await prisma.lesson.findFirstOrThrow({ where: { unit: { courseId: course.id } }, orderBy: [{ unit: { order: "asc" } }, { order: "asc" }], select: { id: true, exercises: { orderBy: { order: "asc" }, take: 1, select: { id: true, prompt: true, options: { orderBy: { order: "asc" }, select: { id: true, label: true } } } } } });
    const mission = { slug: `${data.slug}-mission`, title: courseIndex ? "Share your opinion" : "Make a plan", description: "Complete the first lesson of this course to earn a passport stamp.", requiredLessonId: first.id };
    await prisma.mission.upsert({ where: { slug: mission.slug }, create: mission, update: mission });
    const goal = { slug: `${data.slug}-evidence`, title: courseIndex ? "Explain an opinion politely" : "Make plans in English", description: data.description, skill: courseIndex ? "writing" : "listening" };
    await prisma.canDoGoal.upsert({ where: { slug: goal.slug }, create: goal, update: goal });
    const story = { slug: `${data.slug}-story`, title: courseIndex ? "A better way to work" : "A weekend at the library", kind: courseIndex ? "article" : "dialogue", content: {
      paragraphs: courseIndex ? [{ text: "Our team had tried several ideas before we found a better approach." }, { text: "Although the first plan was convenient, it did not solve the problem." }, { text: "We shared our opinions politely and decided to practise together." }] : [{ speaker: "Mai", text: "Let's meet at the library on Saturday." }, { speaker: "An", text: "Good idea. Could you help me choose a book?" }, { speaker: "Mai", text: "Of course. I have been there twice this month." }],
      comprehension: [{ question: courseIndex ? "How did the team find a solution?" : "Where will the learners meet?", options: courseIndex ? ["By discussing their ideas", "By refusing to listen"] : ["At the library", "At the station"] }],
      challenge: { lessonId: first.id, exerciseId: first.exercises[0].id, prompt: first.exercises[0].prompt, options: first.exercises[0].options },
    } };
    await prisma.story.upsert({ where: { slug: story.slug }, create: story, update: story });
  }
}
