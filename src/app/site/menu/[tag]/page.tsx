import { permanentRedirect } from "next/navigation";

export default function LegacyStudentMenuPage() {
  permanentRedirect("/menu");
}
