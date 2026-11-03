import { useAuth } from "../../../features/auth/AuthContext";
import { PracticeGate } from "../../../features/practice/practice-ui";
import { DeckDetailScreen } from "../../../features/practice/VocabularyScreens";
export default function DeckRoute() { const { user } = useAuth(); return <PracticeGate><DeckDetailScreen key={user?.id} /></PracticeGate>; }
