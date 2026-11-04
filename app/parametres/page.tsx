import Parametres from "@/components/Parametres";
import { getImages, getTerms } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paramètres · Leksik" };

export default async function Page() {
  const [terms, images] = await Promise.all([getTerms(), getImages()]);
  return <Parametres terms={terms} images={images.filter((i) => i.statut === "validée")} />;
}
