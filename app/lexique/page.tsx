import Lexique from "@/components/Lexique";
import { getImages, getTerms } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lexique · Leksik" };

export default async function Page() {
  const [terms, images] = await Promise.all([getTerms(), getImages()]);
  return <Lexique terms={terms} images={images.filter((i) => i.statut === "validée").map((i) => ({ ...i, note: "" }))} />;
}
