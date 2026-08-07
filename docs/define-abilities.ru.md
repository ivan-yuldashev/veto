# Объявление ресурсов — `defineAbilities`

**[English](define-abilities.md) · [Русский](define-abilities.ru.md)**

Всё, что библиотека знает о ваших ресурсах, берётся из одной схемы: какие есть ресурсы, что с ними можно делать и как они связаны. Отсюда же выводятся и все типы — имена ресурсов, доступные каждому действия, форма строки. Ни одного объединения или кортежа писать руками не придётся.

```ts
import { defineAbilities, type } from "@vetojs/core";

const ac = defineAbilities({
	resources: {
		post: {
			schema: type<Post>(),
			actions: ["read", "create", "update", "delete", "publish"],
			relations: {
				blog: { resource: "blog", kind: "one" },
				comments: { resource: "comment", kind: "many" },
			},
		},
		blog: { schema: type<Blog>(), actions: ["read", "update"] },
		comment: { schema: type<Comment>(), actions: ["read", "create", "delete"] },
	},
});
```

В рантайме функция просто возвращает `resources` без изменений — по сути это типизированная тождественная функция. Вся польза в типе, который она запоминает.

## Из чего состоит ресурс

| Поле | Что означает |
|---|---|
| `schema` | собственные поля строки. `type<T>()` — метка, которая ничего не делает во время работы и только несёт тип; передайте настоящую [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType), если хотите ещё и проверять данные |
| `actions` | что можно делать с этим ресурсом; запоминается как литералы |
| `relations` | именованные связи с другими ресурсами — `{ resource, kind }`, где `kind` это `"one"` или `"many"` |

**Имена** связей выбираете вы, а **цель** обязана быть объявленным ресурсом. Имена связей живут отдельно от полей схемы — ровно так же ваш ORM разделяет колонки и `include`/`with`.

## Что получается на выходе

```ts
type AC = typeof ac;

ResourceName<AC>;      // "post" | "blog" | "comment"
ActionFor<AC, "post">; // "read" | "create" | "update" | "delete" | "publish" | "manage"
ShapeOf<AC, "post">;   // Post
```

Дальше эти типы уходят в `createRules(ac)` и `buildAbility(ac, …)`. Поэтому опечатка в названии действия или поля оборачивается ошибкой компиляции, а не правилом, которое молча никогда не сработает.

## Почему так устроено

- **Параметр типа `const` вместо `as const`.** Литеральные названия действий запоминаются сами собой, и объявление остаётся чистым.
- **У каждого ресурса своя форма.** Общий параметр формы слепил бы разные ресурсы в один, а `ShapeOf` читает каждую `schema` по отдельности.
- **`schema` несёт тип, а не данные.** `type<T>()` нужна лишь затем, чтобы протащить `T` в систему типов, и в рантайме не стоит ничего. Подставьте Standard Schema, когда понадобится, чтобы `ability.validate` действительно проверял входящие данные — см. [ability](./ability.ru.md).
- **Правило, ссылающееся на необъявленное, не пройдёт.** У типизированных фабрик это ошибка компиляции; для правил, приходящих в виде JSON, та же проверка выполняется на границе доверия — см. [parse](./parse.ru.md).

## Исходники

[`api/define-abilities.ts`](../packages/core/src/api/define-abilities.ts) · [`api/schema.ts`](../packages/core/src/api/schema.ts) · [тесты](../packages/core/tests/api/define-abilities.test.ts)
