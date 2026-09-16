import TrustPage from "../components/TrustPage";
import { trustPageMetadata } from "../lib/trustPages";

export const metadata = trustPageMetadata("safety");

export default function SafetyPage() {
  return <TrustPage pageKey="safety" />;
}
