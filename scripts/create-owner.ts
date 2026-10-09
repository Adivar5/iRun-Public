import { createInterface } from "node:readline";
import { Writable } from "node:stream";
import { createClient } from "@supabase/supabase-js";

function ask(prompt: string, hidden: boolean): Promise<string> {
  return new Promise((resolve) => {
    if (!hidden) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }
    const sink = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    });
    const rl = createInterface({ input: process.stdin, output: sink, terminal: true });
    process.stdout.write(prompt);
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the shell.");
    process.exit(1);
  }
  const email = await ask("Email: ", false);
  const password = await ask("Password: ", true);
  if (!email || !password) {
    console.error("Email and password are required.");
    process.exit(1);
  }
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    console.error(error?.message ?? "Could not create the user.");
    process.exit(1);
  }
  const { error: profileError } = await supabase.from("profiles").insert({ user_id: data.user.id });
  if (profileError) {
    console.error(profileError.message);
    process.exit(1);
  }
  console.log(`Owner created: ${data.user.id}`);
}

void main();
