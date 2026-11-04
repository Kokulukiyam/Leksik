import Gerer from "@/components/Gerer";
import { getImages, getTerms } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gérer · Leksik" };

export default async function Page() {
  const [terms, images] = await Promise.all([getTerms(), getImages()]);
  return <Gerer terms={terms} images={images} />;
}
