import Ajouter from "@/components/Ajouter";
import { getTerms } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ajouter une image · Leksik" };

export default async function Page() {
  return <Ajouter terms={await getTerms()} />;
}
