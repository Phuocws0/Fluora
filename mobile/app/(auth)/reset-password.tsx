import { FlowPlaceholder } from "../../components/FlowPlaceholder";

export default function ResetPasswordScreen() {
  return <FlowPlaceholder title="Choose a new password" description="Choose a new password to secure your account." links={[{ label: "Go to sign in", href: "/login" }]} />;
}
