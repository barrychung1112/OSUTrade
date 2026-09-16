import TrustPage from "../components/TrustPage";
import { trustPageMetadata } from "../lib/trustPages";

export const metadata = trustPageMetadata("contact");

export default function ContactPage() {
  return <TrustPage pageKey="contact" />;
}
