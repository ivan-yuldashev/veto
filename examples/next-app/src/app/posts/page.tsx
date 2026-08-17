import Link from "next/link";
import { getDb, postsTable, schema } from "../../lib/db";
import { getAbility } from "../../lib/permissions";

const PostsPage = async () => {
	const ability = await getAbility();
	const db = await getDb();
	const rows = await db
		.select()
		.from(postsTable)
		.where(schema.filter(ability, "read", "post"))
		.orderBy(postsTable.id);

	return (
		<section>
			<h2>Posts you can read ({rows.length}) — filtered by SQL, not in JS</h2>
			{rows.map((post) => (
				<article className="card" key={post.id}>
					<header>
						<span>
							<Link href={`/posts/${post.id}`}>
								<strong>{post.title}</strong>
							</Link>{" "}
							<span className="badge" data-status={post.status}>
								{post.status}
							</span>
						</span>
					</header>
				</article>
			))}
		</section>
	);
};

export default PostsPage;
