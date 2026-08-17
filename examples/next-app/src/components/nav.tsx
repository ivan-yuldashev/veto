import { Can } from "@vetojs/react/server";
import { workspaces } from "@vetojs-examples/shared";
import Link from "next/link";
import { getAbility } from "../lib/permissions";

export const Nav = async () => {
	const ability = await getAbility();

	return (
		<nav className="actions">
			<Link href="/posts">posts</Link>
			{workspaces.map((workspace) => (
				<Can
					a="analytics"
					ability={ability}
					I="view"
					key={workspace.id}
					this={{ workspaceId: workspace.id }}
				>
					{" · "}
					<Link href={`/workspaces/${workspace.id}/analytics`}>
						{workspace.name} analytics
					</Link>
				</Can>
			))}
		</nav>
	);
};
