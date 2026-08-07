# Для агентов

**[English](for-agents.md) · [Русский](for-agents.ru.md)**

Всё, что нужно, чтобы написать корректный код на Veto, — на одной странице. Если вы генерируете код для чужого проекта, начните отсюда: в последнем разделе собраны ошибки, которые выглядят правдоподобно, но неверны.

## Установка

```sh
npm add @vetojs/core          # движок
npm add @vetojs/react         # по желанию: <Can>, useAbility, AbilityProvider
```

Только ESM, Node 20+. Для `@vetojs/react` нужен React 18+ как peer-зависимость.

## Весь путь целиком

```ts
import { defineAbilities, type, createRules, buildAbility } from "@vetojs/core";

// 1. Опишите схему ресурсов один раз. Все типы ниже выводятся отсюда.
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

// 2. Политика — чистая функция от пользователя, возвращающая массив правил.
const { allow, deny } = createRules(ac);

const policyFor = (user: { id: string }) => [
  allow("read", "post", { where: { status: "published" } }),
  allow(["update", "publish"], "post", { where: { authorId: user.id } }),
  deny("update", "post", { payload: { fields: ["featured"] } }),
];

// 3. Соберите на запрос — и проверяйте доступ.
const ability = buildAbility(ac, policyFor(currentUser));

ability.can("update", "post", post);
```

## Поверхность API

### `@vetojs/core`

| Экспорт | Сигнатура | Зачем |
|---|---|---|
| `defineAbilities` | `({ resources }) => AC` | объявляет ресурсы, действия, связи |
| `type<T>()` | `() => Schema<T>` | несёт форму строки; замените на Standard Schema, чтобы проверять данные в рантайме |
| `createRules` | `(ac, { maxDepth? }?) => { allow, deny }` | типизированные фабрики правил |
| `buildAbility` | `(ac, rules) => AbilitySet` | превращает политику в объект, который вы вызываете |
| `parseRules` | `(json, vocabulary) => RuleParseResult` | проверяет недоверенный JSON с правилами |
| `toVocabulary` | `(ac) => Vocabulary` | сериализуемые имена, если словарь хранится отдельно |
| `markLoaded` | `(row, relation, value) => row` | сообщает, что связь загружена |
| `ConditionOperator` | объект-константа | `eq ne in nin gt gte lt lte contains exists` |
| `ForbiddenError` | класс | `.action`, `.resource`, `.violations?` |
| `RelationNotLoadedError` | класс | `.relation` |

Методы `ability`:

| Метод | Возвращает | Для чего |
|---|---|---|
| `can(action, resource, row?)` | `boolean` | ветвление |
| `cannot(action, resource, row?)` | `boolean` | ранний выход |
| `authorize(action, resource, row?)` | `void`, бросает `ForbiddenError` | границы на сервере |
| `canMutate(action, resource, row)` | `boolean` | можно ли писать в эту строку |
| `validatePayload(action, resource, row, data)` | `{ ok: true, data } \| { ok: false, violations }` | можно ли записать эти данные |
| `permittedFields(action, resource, fields)` | подмножество `fields` | для формы |
| `where(action, resource)` | `ConditionNode` | фильтр для базы |
| `validate(resource, data)` | `{ ok: true, value } \| { ok: false, issues }` | проверка по схеме |
| `rules` | `CheckedRules` | отправить клиенту |

### `@vetojs/react`

```ts
// src/veto.ts — вызовите фабрику один раз, импортируйте привязки отсюда
import { createVetoContext } from "@vetojs/react";
export const { AbilityProvider, useAbility, Can } = createVetoContext(ac);
```

```tsx
<AbilityProvider rules={ability.rules}>
  <Can I="update" a="post" this={post} fallback={<Disabled />}>
    <EditButton />
  </Can>
</AbilityProvider>
```

## Как писать условия

Соседние ключи объединяются через И. Голое значение означает «равно».

```ts
where: {
  status: "published",                  // eq
  views: { gte: 100 },                  // объект с оператором
  title: { contains: "release" },        // только для строк
  authorId: { in: ["u1", "u2"] },
  deletedAt: { exists: false },
  author: { role: "admin" },            // связь «к одному»
  comments: { none: { spam: true } },   // «ко многим»: some | every | none
  or: [{ pinned: true }, { views: { gt: 1000 } }],
}
```

Операторы по типу поля: любому доступны `eq ne in nin exists`; `number` и `Date` получают ещё `gt gte lt lte`; `string` — `contains`.

## Проверка записи

Два вопроса, которые держат раздельно:

```ts
if (!ability.canMutate("update", "post", row)) throw new ForbiddenError("update", "post");

const result = ability.validatePayload("update", "post", row, data);
if (!result.ok) return badRequest(result.violations); // [{ field, reason }]

await db.update(posts).set(result.data).where(eq(posts.id, row.id));
```

Пишите `result.data`, а не исходный ввод: это проверенная копия.

## Фильтрация в базе

```ts
const filter = ability.where("read", "post"); // обычное дерево условий
```

Фильтр отбирает ровно те строки, которые разрешил бы `can()`. Передайте его адаптеру базы; без адаптера считайте это данными и не пытайтесь разбирать дерево вручную.

## Правила извне

```ts
const result = parseRules(JSON.parse(raw), ac);
if (!result.ok) throw new Error(result.errors.join("\n"));
const ability = buildAbility(ac, result.rules);
```

`buildAbility` ждёт проверенные правила — от `createRules` либо от `parseRules` **со словарём**. Система типов следит за этим везде, где у значения ещё есть тип (см. оговорку про `any` ниже).

## Чего делать не надо

Всё перечисленное выглядит правдоподобно и при этом неверно.

**Голый массив у поля-массива.** Он означает «равно этому массиву» и сравнивается по ссылке, поэтому со строкой из базы не совпадёт никогда. Типы это отклоняют — берите оператор.

```ts
where: { tags: ["a", "b"] }              // ✗ типы отклонят
where: { tags: { in: [["a"], ["b"]] } }  // ✓ вхождение
```

**Передавать сырой JSON в `buildAbility`.** Всегда идите через `parseRules(json, ac)`.

```ts
buildAbility(ac, JSON.parse(raw));                       // ✗ скомпилируется, но без проверки
buildAbility(ac, parseRules(JSON.parse(raw), ac).rules); // ✓
```

Обратите внимание на комментарий: этот вызов **скомпилируется**, потому что `JSON.parse` возвращает `any`. Типы отклонят литерал или обычный `Rule[]`, но значение, потерявшее свой тип, поймать нечем. Полагаться здесь на компилятор нельзя.

**Использовать проверку без строки как защиту строки.** `can("update", "post")` и `authorize("update", "post")` отвечают на вопрос *возможно ли это хоть для какой-то строки*. Это для решений об отрисовке, а не для защиты операции над конкретной строкой. Если строка есть — передайте её.

**Забыть загрузить связь, которая нужна правилу.** Если правило читает `post.author.role`, автор должен лежать на объекте, иначе `can()` бросит `RelationNotLoadedError`. Загружайте в запросе:

```ts
const post = await db.query.posts.findFirst({ with: { author: true } });
```

Для объектов, собранных руками, есть `markLoaded(post, "author", author)`; для «загружено и пусто» передавайте `null`. Передача `undefined` бросает исключение — именно это и означает «не загружено».

**Считать скрытую кнопку защитой.** `<Can>` и `permittedFields` решают, что отрисовать. Запрос, который они прячут, всё равно можно отправить руками, поэтому на сервере нужна своя проверка каждый раз.

**Ждать, что `deny` отступит на плохих данных.** Запрет срабатывает и на «неизвестно»: значение неверного типа мимо него не проскользнёт. Битые данные способны только сузить доступ, но не расширить.

**Искать настройку, чтобы поменять приоритет.** Запрет всегда сильнее, а всё неразрешённое запрещено; ни то ни другое не настраивается. Именно это позволяет тем же правилам компилироваться в SQL.

## Куда что класть

| Место | Что использовать |
|---|---|
| Серверный компонент, route handler | `buildAbility` на запрос, затем `can` / `authorize` |
| Получение списка | `ability.where(...)` в запросе; не фильтруйте в JS постфактум |
| Обработчик мутации | `canMutate` + `validatePayload` |
| Клиентский компонент | `<AbilityProvider rules={ability.rules}>`, `<Can>` / `useAbility` |
| Граница сервер → клиент | отправляйте `ability.rules`, это обычный JSON |

## Полная документация

Страницы по каждому понятию, на английском и русском, собраны в [docs/README.ru.md](./README.ru.md).
