# @vetojs/core

Движок [`@vetojs`](https://github.com/ivan-yuldashev/vetojs/blob/main/README.ru.md) — **[English](README.md) · [Русский](README.ru.md)**.

**Type-safe авторизация без классов, магии и скрытого состояния.**

В основе `@vetojs/core` лежит простая идея: политика доступа должна быть чистой функцией. Вы передаёте ей пользователя (или любой другой контекст), а она возвращает массив правил в виде обычного JSON. Эти правила универсальны: они работают как на сервере, так и на клиенте, обеспечивают строгую типизацию и элегантно транслируются в условие `WHERE` для вашей базы данных.

- **Правила — это плоские данные.** Их легко сериализовать, отправлять на клиент по сети или безопасно хранить в базе.
- **Никакого скрытого состояния.** Забудьте про непредсказуемые инстансы классов и общее состояние между запросами.
- **Ноль зависимостей.** Библиотека не тянет за собой лишнего кода и не использует классы, за исключением двух типов ошибок.

```sh
npm install @vetojs/core
```

Библиотека поставляется только в формате ESM и требует Node.js версии 20+.

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

// 3. Передайте правила в движок — и проверяйте доступ.
const ability = buildAbility(ac, policyFor(currentUser));

ability.can("update", "post", post);  // ✓ типизировано по вашей схеме
ability.can("delete", "post");        // ✗ ошибка компиляции — у "post" нет "delete"
```

## Что под капотом?

Мы спроектировали API так, чтобы он был интуитивно понятным.

- [`defineAbilities`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/define-abilities.ru.md): Единый источник правды для схемы ресурсов, из которого выводятся все типы (формы, действия, связи).
- `type<T>()`: Утилита для объявления формы ресурса. Для runtime-проверок сюда можно передать любую схему, совместимую со [Standard Schema](https://standardschema.dev) (например, Zod, Valibot или ArkType).
- [`createRules(ac)`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/create-rules.ru.md): Генератор строго типизированных функций `allow` и `deny` — ваши действия, ресурсы и `where` автоматически сверяются со схемой.
- [`buildAbility(ac, rules)`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/ability.ru.md): Превращает массив плоских правил в готовый к использованию объект `ability`.
- [`parseRules(json, ac)`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/parse.ru.md): Безопасно валидирует JSON-правила, пришедшие по сети или из базы.
- [`markLoaded`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/relations.ru.md): Помечает связь как загруженную (полезно для данных, которые вы собирали вручную, а не через ORM).
- `ConditionOperator`: Доступные операторы сравнения (`eq`, `ne`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`, `contains`, `exists`, `has`, `hasAny`, `hasAll`).
- `ForbiddenError`, `RelationNotLoadedError`: Те самые два единственных класса в библиотеке.

У пакета есть вторая точка входа — [`@vetojs/core/guard`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/guard.ru.md). `createGuard` один раз настраивает, как найти пользователя и какую политику ему собрать, а возвращённая обёртка находит пользователя, загружает строку, проверяет payload и только потом запускает ваш обработчик — одна и та же для server action, [HTTP-обработчика](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/http.ru.md) и [вызова инструмента агентом](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/agents.ru.md).

```ts
import { createGuard } from "@vetojs/core/guard";

export const withPermission = createGuard({
	ac: accessControl,
	getActor: currentActor,
	policy: policyFor,
});
```

Что умеет `ability`:

- **Проверка прав:** `can`, `cannot` и `authorize` проверяют, разрешено ли действие в целом или для конкретной строки.
- **Мутации:** `canMutate` и `validatePayload` определяют, [можно ли записать данные](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/mutations.ru.md) (и какие именно поля/значения).
- **Интерфейс:** `permittedFields` подскажет, какие поля оставить доступными для пользователя в форме.
- **База данных:** `where` генерирует готовое [условие для запроса к БД](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/where.ru.md).
- **Валидация и экспорт:** `validate` проверяет входящие данные на соответствие схеме, а `rules` возвращает исходный плоский массив правил, готовый к отправке на клиент.

## Предсказуемое поведение на плохих данных

В реальных базах встречаются `NULL`, а с клиента может прийти текст вместо ожидаемого числа. В таких ситуациях, когда честно ответить на условие нельзя, `@vetojs` не гадает, а возвращает статус **«неизвестно»**.

Это безопасно в обе стороны: правило `allow` в таком случае просто ничего не разрешит, а запрет `deny` — всё равно отработает надёжно. Плохие данные могут лишь сузить доступ, но никогда не расширят его ([подробнее об операторах](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/operators.ru.md)).

### Строгость в работе со связями

Со связями (relations) движок работает ещё строже. Если правило проверяет поле `post.author.role`, то автор обязан быть загружен вместе с постом. Если вы забыли его загрузить, функция `can()` не станет тихо отвечать «не совпало», а **бросит исключение**. Забытый `include` в ORM — это ошибка в запросе, а не повод молча поменять права доступа пользователя.

```ts
const post = await db.query.posts.findFirst({ with: { author: true } });
ability.can("update", "post", post);
```

Движок опирается на те же конвенции, что и ваш ORM: `undefined` означает, что данные не загружены, а `null` — что они загружены, но их нет (пусто). Если вы собрали данные руками, просто укажите это явно через `markLoaded` ([подробнее о связях](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/relations.ru.md)).

## Что дальше?

- **[Документация](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/README.ru.md)** — подробные страницы по каждому концепту: от объявления ресурсов до SQL-фильтрации.
- **[Для агентов](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/for-agents.ru.md)** — весь API собран на одной странице, чтобы его было удобно скармливать ассистентам.
- **Примеры** — три рабочих демо на одной мультитенантной модели: [react-spa](https://github.com/ivan-yuldashev/vetojs/tree/main/examples/react-spa), [next-app](https://github.com/ivan-yuldashev/vetojs/tree/main/examples/next-app) и [drizzle-pg](https://github.com/ivan-yuldashev/vetojs/tree/main/examples/drizzle-pg), где `can()` и скомпилированный `WHERE` сверяются построчно.

## Лицензия

MIT
