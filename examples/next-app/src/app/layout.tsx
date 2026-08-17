import type { actors } from "@vetojs-examples/shared";
import type { ReactNode } from "react";
import { Nav } from "../components/nav";
import { switchActor } from "../lib/actions";
import { actorNames, getActorName } from "../lib/auth";
import "./globals.css";

export const metadata = { title: "@vetojs next demo" };

const roleLabel: Record<keyof typeof actors, string> = {
	alice: "admin of Acme",
	bob: "editor of Acme",
	carol: "viewer of Acme, editor of archived Legacy",
};

const RootLayout = async ({ children }: { children: ReactNode }) => {
	const actorName = await getActorName();

	return (
		<html lang="en">
			<body>
				<main>
					<h1>@vetojs — next flagship demo</h1>
					<form action={switchActor} className="actor-switch">
						{actorNames.map((name) => (
							<button
								data-active={name === actorName}
								key={name}
								name="actor"
								type="submit"
								value={name}
							>
								{name}
							</button>
						))}
					</form>
					<p className="muted">
						{actorName} — {roleLabel[actorName]}
					</p>
					<Nav />
					{children}
				</main>
			</body>
		</html>
	);
};

export default RootLayout;
