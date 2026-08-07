# @vetojs/core

Движок [`@vetojs`](https://github.com/ivan-yuldashev/veto/blob/main/README.ru.md) — **[English](README.md) · [Русский](README.ru.md)**.

**Type-safe авторизация без классов и скрытого состояния.**

Политика — это чистая функция, которая принимает пользователя (и не только) и возвращает массив правил (JSON). Одни и те же правила работают и на сервере, и на клиенте, проверяются с полным выводом типов и превращаются в условие `WHERE` для базы.

- **Правила — это плоские данные.** Их можно сериализовать, отдать клиенту, хранить в базе.
- **Никакого скрытого состояния.** Ни экземпляров классов, ни общего состояния между запросами.
- **0 зависимостей.** И ни одного класса, кроме двух типов ошибок.

```sh
npm add @vetojs/core
```

Только ESM, Node 20+.

## Быстрый старт

```ts
import { defineAbilities, type, createRules, buildAbility } from "@vetojs/core";

// 1. Опишите схему ресурсов один раз.
const ac = defineAbilities({
  resources: {
    post: {
      schema: type<{ id: string; authorId: string; status: "draft" | "published" }>(),
      actions: ["read", "update", "publish"],
      relations: { author: { resource: "user", kind: "one" } },
    },
    user: { schema: type<{ id: string; role: string }>(), actions: ["read"] },
  },
});

// 2. Политика — это функция, возвращающая массив правил.
const { allow, deny } = createRules(ac);

const policyFor = (user: { id: string }) => [
  allow("read", "post", { where: { status: "published" } }),
  allow(["update", "publish"], "post", { where: { authorId: user.id } }),
];

// 3. Передайте правила в движок и проверяйте доступ.
const ability = buildAbility(ac, policyFor(currentUser));

ability.can("update", "post", post);  // ✓ типизировано по вашей схеме
ability.can("delete", "post");        // ✗ ошибка компиляции — у "post" нет "delete"
```

## Что внутри

| Экспорт | Что делает |
|---|---|
| [`defineAbilities`](https://github.com/ivan-yuldashev/veto/blob/main/docs/define-abilities.ru.md) | Схема ресурсов: формы, действия, связи. Единственный источник, из которого выводятся все типы. |
| `type<T>()` | Объявляет форму ресурса. Передайте вместо него [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType), если хотите ещё и проверять данные во время работы. |
| [`createRules(ac)`](https://github.com/ivan-yuldashev/veto/blob/main/docs/create-rules.ru.md) | Типизированные `allow` и `deny` — действие, ресурс и `where` сверяются с вашей схемой. |
| [`buildAbility(ac, rules)`](https://github.com/ivan-yuldashev/veto/blob/main/docs/ability.ru.md) | Превращает массив правил в объект, который вы вызываете. |
| [`parseRules(json, ac)`](https://github.com/ivan-yuldashev/veto/blob/main/docs/parse.ru.md) | Проверяет правила в JSON, пришедшие из базы или по сети. |
| [`markLoaded`](https://github.com/ivan-yuldashev/veto/blob/main/docs/relations.ru.md) | Помечает связь загруженной — для данных, которые собрал не ORM. |
| `ConditionOperator` | `eq`, `ne`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`, `contains`, `exists`. |
| `ForbiddenError`, `RelationNotLoadedError` | Единственные два класса. |

Что умеет `ability`:

| | |
|---|---|
| `can` / `cannot` / `authorize` | можно ли это сделать — по конкретной строке или вообще |
| `canMutate` / `validatePayload` | [можно ли это записать](https://github.com/ivan-yuldashev/veto/blob/main/docs/mutations.ru.md) — какие поля и какие значения |
| `permittedFields` | какие поля оставить доступными в форме |
| `where` | [условие для запроса к базе](https://github.com/ivan-yuldashev/veto/blob/main/docs/where.ru.md) |
| `validate` | подходят ли входящие данные под схему ресурса |
| `rules` | исходный массив правил — плоские данные, готовые к отправке клиенту |

## Не ломается на плохих данных

В настоящих строках попадаются `NULL`, а в настоящих запросах — строка там, где ждали число. Если честно ответить на условие нельзя, движок отвечает **«неизвестно»**, а не гадает. И это безопасно в обе стороны: `allow` не даёт ничего, а `deny` всё равно срабатывает. Плохие данные могут только сузить доступ. ([Подробнее](https://github.com/ivan-yuldashev/veto/blob/main/docs/operators.ru.md).)

Со связями движок строже. Если правило смотрит на `post.author.role`, автор должен быть загружен вместе с постом. Если вы его не загрузили, `can()` **бросит исключение**, а не ответит тихо «не совпало»: забытый `include` — это ошибка в запросе, а не повод молча поменять права.

```ts
const post = await db.query.posts.findFirst({ with: { author: true } });
ability.can("update", "post", post);
```

Движок опирается на то же соглашение, что и ваш ORM: `undefined` — не загружено, `null` — загружено и пусто. Если данные вы собрали руками, скажите это явно через `markLoaded`. ([Подробнее](https://github.com/ivan-yuldashev/veto/blob/main/docs/relations.ru.md).)

## Дальше

- **[Документация](https://github.com/ivan-yuldashev/veto/blob/main/docs/README.ru.md)** — по странице на каждое понятие: от объявления ресурсов до фильтрации в SQL.
- **[Для агентов](https://github.com/ivan-yuldashev/veto/blob/main/docs/for-agents.ru.md)** — весь API на одной странице, для ассистентов.
- **Примеры** — рабочие демо на одном мультитенантном домене выйдут вместе с адаптерами.

## Лицензия

MIT
