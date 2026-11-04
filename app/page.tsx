import Jeu from "@/components/Jeu";
import { getImages, getTerms } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [terms, images] = await Promise.all([getTerms(), getImages()]);
  return <Jeu terms={terms} images={images.filter((i) => i.statut === "validée")} />;
}
