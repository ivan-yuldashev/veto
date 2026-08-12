# @vetojs/next

Защита для Next.js на [`@vetojs`](https://github.com/ivan-yuldashev/veto/blob/main/README.ru.md) — **[English](README.md) · [Русский](README.ru.md)**.

Server action — это публичная точка входа. Что бы ни показывал интерфейс, вызвать её может кто угодно и с любыми аргументами. Поэтому каждой нужны одни и те же шаги: понять, кто спрашивает, загрузить то, над чем действуют, проверить и только затем выполнить. Этот пакет пишет их один раз.

```sh
npm add @vetojs/next @vetojs/core
```

Только ESM, Node 20+.

## Настраиваем один раз

```ts
// lib/permissions.ts
import { createGuard } from "@vetojs/next";
import { ac, policyFor } from "./abilities";
import { getActor } from "./auth";

export const withPermission = createGuard({ ac, getActor, policy: policyFor });
```

## Оборачиваем действие

```ts
"use server";

export const updatePost = withPermission(
	{
		action: "update",
		resource: "post",
		load: (formData) => loadPost(formData.get("id")),
		payload: (formData) => ({ title: String(formData.get("title")) }),
	},
	async (ctx, formData) => {
		await db.update(posts).set(ctx.payload).where(eq(posts.id, ctx.row.id));
		revalidatePath("/posts");
	},
);
```

Пользователь определён, политика собрана, строка загружена и проверена, данные провалидированы — всё до того, как начнёт работать ваш обработчик. Если что-то из этого не прошло, до обработчика дело не дойдёт.

Обработчик получает сначала контекст, а следом исходные аргументы без изменений:

| `ctx` | |
|---|---|
| `actor` | то, что вернул `getActor` |
| `ability` | собранный ability, если нужны дополнительные проверки |
| `row` | то, что вернул `load` |
| `payload` | **проверенные** данные — записывайте их, а не исходный ввод |

Аргументы проходят насквозь в любой форме, поэтому действию под `useActionState` — а туда приходит `(previousState, formData)` — переходник не нужен; route handlers работают так же с `(request, context)`.

## Что именно проверяется

| Вы объявили | Защита проверяет |
|---|---|
| `load` + `payload` | можно ли писать в эту строку **и** допустимы ли эти поля и значения |
| только `load` | можно ли выполнить действие над этой строкой |
| только `payload` | разрешена ли запись вообще и допустимы ли эти поля и значения |
| ничего | можно ли выполнить действие в принципе |

Если `load` вернул не строку, вызов отклоняется, а не проваливается тихо на более слабую проверку без строки.

## Отказ

Непройденная проверка бросает `ForbiddenError` с полями `action`, `resource` и — для отказов по данным — точным списком `violations`. Опознавайте его через `ForbiddenError.is(error)`, а не через `instanceof`: последний ответит `false`, если в дереве окажутся две копии `@vetojs/core`. Либо обрабатывайте централизованно:

```ts
createGuard({
	ac,
	getActor,
	policy: policyFor,
	onDeny: () => notFound(),
	onUnauthenticated: () => redirect("/login"),
});
```

Ни один из хуков не должен возвращать управление: `notFound()`, `redirect()` и `throw` этому удовлетворяют. Если всё же вернёт, защита бросит исключение сама — хук сообщает об отказе, но не отменяет его.

## Документация

- **[Полное руководство](https://github.com/ivan-yuldashev/veto/blob/main/docs/next.ru.md)** — все опции, `useActionState`, route handlers и почему списки фильтруются в базе.
- **[О проекте](https://github.com/ivan-yuldashev/veto/blob/main/README.ru.md)** — что такое `@vetojs` и как устроен движок.

## Лицензия

MIT
