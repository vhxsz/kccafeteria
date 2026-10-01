import { redirect } from "next/navigation";

export default async function TablePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect("/site/rate/" + encodeURIComponent(token));
}
