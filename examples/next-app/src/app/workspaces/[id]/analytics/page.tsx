import { workspaces } from "@vetojs-examples/shared";
import { forbidden, notFound } from "next/navigation";
import { getAbility } from "../../../../lib/permissions";

const AnalyticsPage = async ({
	params,
}: {
	params: Promise<{ id: string }>;
}) => {
	const { id } = await params;
	const workspace = workspaces.find((candidate) => candidate.id === id);
	if (workspace === undefined) {
		notFound();
	}

	const ability = await getAbility();
	if (!ability.can("view", "analytics", { workspaceId: id })) {
		forbidden();
	}

	return (
		<section>
			<h2>{workspace.name} — analytics</h2>
			<p className="muted">
				A phantom resource: no table behind it (declared `analytics: null` in
				the drizzle map), gated purely by policy.
			</p>
		</section>
	);
};

export default AnalyticsPage;
