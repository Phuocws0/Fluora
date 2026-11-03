import { useLocalSearchParams } from "expo-router";
import { useAuth } from "../../features/auth/AuthContext";
import { PracticeGate, PracticePage, Empty } from "../../features/practice/practice-ui";
import { DeckListScreen } from "../../features/practice/VocabularyScreens";
import { ImportScreen } from "../../features/practice/ImportScreen";
import { ReviewScreen } from "../../features/practice/ReviewScreen";
import { StoryLibraryScreen, BookmarkShelfScreen } from "../../features/practice/StoryScreens";
import { DictionaryScreen } from "../../features/practice/DictionaryPanel";
import { StudyToolsCatalog } from "../../features/practice/StudyToolsScreen";
import { DownloadsScreen } from "../../features/practice/DownloadsScreen";
export default function PracticeSectionRoute() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const { user } = useAuth();
  if (section === "stories") return <StoryLibraryScreen key={user?.id ?? "guest"} />;
  const screens = { vocabulary: DeckListScreen, import: ImportScreen, review: ReviewScreen, bookmarks: BookmarkShelfScreen, dictionary: DictionaryScreen, tools: StudyToolsCatalog, downloads: DownloadsScreen };
  const Screen = screens[section as keyof typeof screens];
  return <PracticeGate>{Screen ? <Screen key={`${user?.id}:${section}`} /> : <PracticePage title="Practice"><Empty text="This practice destination is unavailable." /></PracticePage>}</PracticeGate>;
}
