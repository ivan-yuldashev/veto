import { Can } from "@vetojs/react/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EditForm } from "../../../components/edit-form";
import { loadComposedPost } from "../../../lib/db";
import { getAbility, getRules } from "../../../lib/permissions";

const PostPage = async ({ params }: { params: Promise<{ id: string }> }) => {
	const { id } = await params;
	const ability = await getAbility();
	const post = await loadComposedPost(id);

	if (post === undefined || !ability.can("read", "post", post)) {
		notFound();
	}

	return (
		<section>
			<h2>
				{post.title}{" "}
				<span className="badge" data-status={post.status}>
					{post.status}
				</span>
			</h2>
			<p className="muted">
				{post.blog?.name} · by {post.author?.name} · {post.comments.length}{" "}
				comment(s)
			</p>
			<Can
				a="post"
				ability={ability}
				fallback={<p className="muted">read-only for the current actor</p>}
				I="update"
				this={post}
			>
				<EditForm post={post} rules={await getRules()} />
			</Can>
			<p>
				<Link href="/posts">← all posts</Link>
			</p>
		</section>
	);
};

export default PostPage;
