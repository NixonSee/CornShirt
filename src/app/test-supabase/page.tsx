import { supabase } from "@/lib/supabaseClient";

export default async function TestSupabasePage() {
  const { data, error } = await supabase.from("events").select("*");

  return (
    <main style={{ padding: "24px" }}>
      <h1>Supabase Connection Test</h1>

      {error && (
        <div>
          <h2>Error</h2>
          <pre>{error.message}</pre>
        </div>
      )}

      {!error && (
        <div>
          <h2>Connected Successfully</h2>
          <p>Events table data:</p>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}