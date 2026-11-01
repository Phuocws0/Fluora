import { FlowPlaceholder } from "../../components/FlowPlaceholder";

export default function WelcomeScreen() {
  return <FlowPlaceholder title="Welcome to Fluora" description="Start a small daily habit and grow your language skills." links={[{ label: "Sign in", href: "/login" }, { label: "Create account", href: "/register" }]} />;
}
