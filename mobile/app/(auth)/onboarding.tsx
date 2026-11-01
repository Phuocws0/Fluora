import { FlowPlaceholder } from "../../components/FlowPlaceholder";

export default function OnboardingScreen() {
  return <FlowPlaceholder title="Set up your learning plan" description="Choose your language, study goal, and starting level." links={[{ label: "Go to sign in", href: "/login" }]} />;
}
