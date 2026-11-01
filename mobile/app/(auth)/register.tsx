import { FlowPlaceholder } from "../../components/FlowPlaceholder";

export default function RegisterScreen() {
  return <FlowPlaceholder title="Create an account" description="Create a learner account to keep your course progress together." links={[{ label: "Go to sign in", href: "/login" }]} />;
}
