import { FlowPlaceholder } from "../../components/FlowPlaceholder";

export default function ForgotPasswordScreen() {
  return <FlowPlaceholder title="Reset your password" description="Recover access to your Fluora account." links={[{ label: "Go to sign in", href: "/login" }]} />;
}
