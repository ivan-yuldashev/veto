export const isPayloadScoped = (rule: {
	payload?: { fields?: unknown; constraints?: unknown };
}): boolean => {
	return (
		rule.payload?.fields !== undefined ||
		rule.payload?.constraints !== undefined
	);
};
