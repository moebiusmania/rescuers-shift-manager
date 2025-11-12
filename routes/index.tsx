import { Head } from "fresh/runtime";
import { define } from "../utils.ts";
import ShiftPlanner from "../islands/ShiftPlanner.tsx";

export default define.page(function Home() {
  return (
    <>
      <Head>
        <title>Pianificatore Turni</title>
        <meta
          name="description"
          content="Genera rotazioni di quattro settimane con controlli di conformita integrati per autisti e RPCO."
        />
      </Head>
      <main class="page">
        <ShiftPlanner />
      </main>
    </>
  );
});
