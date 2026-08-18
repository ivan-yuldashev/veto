export const nothing = <N>(): { or: N[] } => ({ or: [] });

export const everything = <N>(): { and: N[] } => ({ and: [] });
