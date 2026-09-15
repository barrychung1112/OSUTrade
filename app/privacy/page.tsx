import TrustPage from "../components/TrustPage";
import { trustPageMetadata } from "../lib/trustPages";

export const metadata = trustPageMetadata("privacy");

export default function PrivacyPage() {
  return <TrustPage pageKey="privacy" />;
}
