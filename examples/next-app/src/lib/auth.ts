import { type Actor, actors } from "@vetojs-examples/shared";
import { cookies } from "next/headers";

export type ActorName = keyof typeof actors;

export const actorNames = Object.keys(actors) as ActorName[];

const isActorName = (value: string): value is ActorName => value in actors;

export const getActorName = async (): Promise<ActorName> => {
	const jar = await cookies();
	const raw = jar.get("actor")?.value ?? "";
	return isActorName(raw) ? raw : "carol";
};

export const getActor = async (): Promise<Actor> =>
	actors[await getActorName()];
