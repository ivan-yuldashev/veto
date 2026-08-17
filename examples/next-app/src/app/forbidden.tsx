import Link from "next/link";

const Forbidden = () => (
	<section className="card">
		<strong>403</strong>
		<p className="muted">
			The current actor may not view this. The nav link was hidden by the same
			rule — hiding is UX, this guard is the boundary, and the response carries
			the status to match.
		</p>
		<p>
			<Link href="/posts">← all posts</Link>
		</p>
	</section>
);

export default Forbidden;
