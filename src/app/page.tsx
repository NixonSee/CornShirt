import { redirect } from "next/navigation";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const code = firstValue(params.code);

  // Supabase falls back to the configured Site URL when a requested redirect
  // is not allowlisted. Preserve the one-time auth code instead of losing it
  // in the normal visitor-home redirect.
  if (code) {
    const callbackParams = new URLSearchParams({ code, intent: "setup" });
    const type = firstValue(params.type);

    if (type) callbackParams.set("type", type);

    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  redirect("/visitor");
}
