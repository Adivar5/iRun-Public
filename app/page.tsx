import { redirect } from "next/navigation";

// proxy.ts already sends "/" to /today (or /login when signed out); this is the fallback if it is bypassed.
export default function Home() {
  redirect("/today");
}
