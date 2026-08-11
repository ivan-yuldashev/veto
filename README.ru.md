# @vetojs

[English](README.md) | [Русский](README.ru.md)

**Type-safe авторизация без классов и скрытого состояния.**

Политика — это чистая функция, которая принимает пользователя (и не только) и возвращает массив правил (JSON). Этот массив легко пересекает границу между сервером и клиентом. Одни и те же данные проверяют доступ с полным выводом типов и превращаются в SQL `WHERE` для базы.

- **Дружит с React Server Components.** Правила — это плоские данные. Их можно отправить с сервера на клиент как есть.
- **Превращается в SQL.** Та же политика, что отвечает на `can()`, становится условием `WHERE` — база вернёт ровно те строки, которые доступны пользователю.
- **Не ломается на плохих данных.** Значение не того типа или отсутствующее поле может только сузить доступ, но никогда не расширить.
- **0 зависимостей.**

```sh
npm add @vetojs/core
```

## Как использовать

```ts
import { defineAbilities, type, createRules, buildAbility } from "@vetojs/core";

// 1. Опишите схему один раз.
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

// 3. Передайте правила в движок и можно проверять доступы.
const ability = buildAbility(ac, policyFor(currentUser));

ability.can("update", "post", post);  // ✓ типизировано
ability.can("delete", "post");        // ✗ ошибка компиляции — у "post" нет "delete"
```

Опечатки не доедут до продакшена: если действие, ресурс, поле или оператор не соответствуют вашим объявлениям, код просто не соберётся.

## Почему не CASL?

CASL — признанный лидер и хорошая библиотека. Она же старше React Server Components, и ability там — экземпляр класса; отсюда и расходятся пути. Сверено с `@casl/ability@7.0.1`.

| | CASL | @vetojs |
|---|---|---|
| **Сервер → клиент** | ability это экземпляр `PureAbility`, и RSC его не пропускает: *«Only plain objects… Classes or null prototypes are not supported»* ([#999](https://github.com/stalniy/casl/issues/999)) | `ability.rules` — обычный JSON, клиент пересобирает ability из него |
| **Пометка объекта** | `subject("Post", post)` **меняет** сам `post`, а добавленная метка неперечислима — поэтому `JSON.stringify` её теряет, и тип пропадает молча | `can("update", "post", post)` — имя ресурса просто аргумент, ничего не оборачивается и не меняется |
| **Типы** | действия по ресурсу сузить можно, но объединение пишется руками: `MongoAbility<["create" \| "manage", "campaign"] \| ["create" \| "delete", "user"]>`, и формы тоже | действия, ресурсы и формы выводятся из одного объявления `defineAbilities` |
| **Запросы к базе** | `accessibleBy` через адаптер под каждую ORM — SQL [открыт с 2017 года](https://github.com/stalniy/casl/issues/8), а новый мажор ORM означает ожидание нового релиза адаптера | `ability.where()` возвращает обычное дерево условий, которое можно обойти самому; `@vetojs/drizzle` превращает его в SQL с проверенной гарантией: запрос вернёт ровно то, что разрешает `can()` |
| **Зависимости** | 4 | 0 |
| **Плохие данные** | `views: "100"` проходит `$gt: 50`, а `deny` по `secret: true` не срабатывает на `secret: "true"` | значение, не подходящее условию, даёт «неизвестно»: `allow` не даёт ничего, а `deny` всё равно срабатывает |

Переходите с CASL? [Переход с CASL](docs/migrate-from-casl.ru.md) сопоставляет API, называет операторы без аналогов и разбирает два отличия в поведении, которые меняют смысл вашей политики.

## Пакеты

| Пакет | Статус | Что делает |
|---|---|---|
| [`@vetojs/core`](packages/core) | ✅ Готов | Движок: правила, вычисление, операторы, сборка условия для запроса. Без зависимостей. |
| [`@vetojs/react`](packages/react) | ✅ Готов | [`<Can>`, `useAbility`, `AbilityProvider`](docs/react.ru.md) — те же правила решают, что доступно пользователю в интерфейсе. |
| `@vetojs/next` | 🚧 В работе | `createGuard` — одна обёртка определяет пользователя, загружает строку, проверяет её и валидирует данные до того, как отработает ваш server action. |
| `@vetojs/drizzle` | 🚧 В работе | Условия → SQL `WHERE` (Postgres), связи → `EXISTS`. |
| `@vetojs/prisma` · `@vetojs/kysely` | 🔜 В планах | Другие адаптеры и диалекты. |

## Единые правила на всех уровнях

Забираем из базы только те строки, которые пользователю можно видеть, — вычисленные правила превращаются в условие `WHERE`:

```ts
const rows = await db.select().from(posts)
  .where(schema.filter(ability, "read", "post"));
```

Проверяем доступ в серверном компоненте и отдаём правила клиенту как данные:

```tsx
const ability = buildAbility(ac, policyFor(user));
if (!ability.can("read", "post", post)) notFound();

return (
  <AbilityProvider rules={ability.rules}>
    <Toolbar post={post} />
  </AbilityProvider>
);
```

Клиент теми же правилами решает, что показать пользователю в интерфейсе:

```tsx
"use client";

<Can I="update" a="post" this={post} fallback={<DisabledButton />}>
  <EditButton />
</Can>
```

И клиент, и сервер читают один и тот же массив правил, поэтому разойтись не получится.

## Дальше

- **[Документация](docs/README.ru.md)** — по странице на каждое понятие: от объявления ресурсов до фильтрации в SQL.
- **[Для агентов](docs/for-agents.ru.md)** — весь API на одной странице, для ассистентов (плюс [llms.txt](llms.txt)).
- **Примеры** — рабочие демо на одном мультитенантном домене выйдут вместе с адаптерами.

## Разработка

```sh
pnpm install
pnpm test           # vitest
pnpm test:coverage
pnpm typecheck      # tsc по всему workspace
pnpm check          # biome
pnpm knip           # поиск неиспользуемых экспортов
```

## Лицензия

MIT
