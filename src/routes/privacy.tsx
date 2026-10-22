import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/app/AppShell";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy | OneGuard LPG" },
      { name: "description", content: "How OneGuard LPG collects and protects your data." },
      { property: "og:title", content: "Privacy policy | OneGuard LPG" },
      { property: "og:description", content: "How OneGuard LPG collects and protects your data." },
    ],
  }),
  component: () => (
    <Screen kicker="Legal" title="Privacy policy">
      <article className="glass tile space-y-4 text-sm leading-relaxed">
        <Sec h="What we collect">Account email, cylinder settings (tare weight, capacity), device readings (weight, gas sensor value, battery, signal) and the emergency contacts you add.</Sec>
        <Sec h="Why">To show your gas level, detect leaks, estimate refills and send alerts to you and your contacts.</Sec>
        <Sec h="Sharing">We do not sell your data. Alert details are shared only with the contacts you add and the messaging or calling providers needed to reach them.</Sec>
        <Sec h="Storage and security">Data is stored with access restricted to your account. Service keys stay on the server.</Sec>
        <Sec h="Your choices">You can edit or delete contacts and request deletion of your account and readings at any time.</Sec>
        <Sec h="Contact">Questions about privacy can be sent to the project team. This policy is a draft and must be reviewed before public launch.</Sec>
      </article>
    </Screen>
  ),
});

function Sec({ h, children }: { h: string; children: string }) {
  return (
    <section>
      <h2 className="font-display text-lg font-black">{h}</h2>
      <p className="text-muted-foreground">{children}</p>
    </section>
  );
}
