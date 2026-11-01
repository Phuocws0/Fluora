import { FlowPlaceholder } from "../../components/FlowPlaceholder";

export default function LoginScreen() {
  return <FlowPlaceholder title="Sign in" description="Access your learning plan and keep your progress together." links={[{ label: "Create account", href: "/register" }, { label: "Forgot password", href: "/forgot-password" }, { label: "Continue to onboarding", href: "/onboarding" }]} />;
}
