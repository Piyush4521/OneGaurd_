import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/app/AppShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and conditions | OneGuard LPG" },
      { name: "description", content: "Terms for using the OneGuard LPG app and device." },
      { property: "og:title", content: "Terms and conditions | OneGuard LPG" },
      { property: "og:description", content: "Terms for using the OneGuard LPG app and device." },
    ],
  }),
  component: () => (
    <Screen kicker="Legal" title="Terms and conditions">
      <article className="glass tile space-y-4 text-sm leading-relaxed">
        <Sec h="Not a certified safety device">OneGuard is a prototype that supplements certified LPG safety equipment. It does not replace regulators, certified detectors or professional inspection.</Sec>
        <Sec h="Estimates">Gas level and refill dates are estimates based on sensor readings and past usage. They are not guarantees.</Sec>
        <Sec h="Alerts">Alerts depend on power, network and third-party providers. Delivery cannot be guaranteed.</Sec>
        <Sec h="In an emergency">If you smell gas, turn off the regulator, avoid flames and switches, open windows and call 1906.</Sec>
        <Sec h="Your account">Keep your login private. You are responsible for contacts you add having agreed to receive alerts.</Sec>
        <Sec h="Changes">These terms are a draft and must be reviewed before public launch.</Sec>
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
