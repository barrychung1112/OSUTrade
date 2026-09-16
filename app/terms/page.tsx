import TrustPage from "../components/TrustPage";
import { trustPageMetadata } from "../lib/trustPages";

export const metadata = trustPageMetadata("terms");

export default function TermsPage() {
  return <TrustPage pageKey="terms" />;
}
