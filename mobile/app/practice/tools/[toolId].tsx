import { useAuth } from "../../../features/auth/AuthContext";
import { PracticeGate } from "../../../features/practice/practice-ui";
import { StudyToolScreen } from "../../../features/practice/StudyToolsScreen";
export default function ToolRoute() { const { user } = useAuth(); return <PracticeGate><StudyToolScreen key={user?.id} /></PracticeGate>; }
