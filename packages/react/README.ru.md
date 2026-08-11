# @vetojs/react

Привязки к React для [`@vetojs`](https://github.com/ivan-yuldashev/veto/blob/main/README.ru.md) — **[English](README.md) · [Русский](README.ru.md)**.

Те же правила, что защищают сервер, решают, что доступно пользователю в интерфейсе.

```sh
npm add @vetojs/react @vetojs/core
```

React 18 и новее.

## Один раз создайте привязки

`createVetoContext(ac)` запоминает вашу схему ресурсов и возвращает привязки, которые про неё знают:

```ts
// src/authz.ts
import { createVetoContext } from "@vetojs/react";
import { ac } from "./abilities";

export const { AbilityProvider, useAbility, useCan, useSetRules, Can } =
	createVetoContext(ac);
```

Это фабрика, а не обычный импорт, потому что типизированным привязкам нужен ваш `ac`. Взамен `<Can>` подсказывает действия для каждого ресурса и не пропускает те, которых нет.

## На сервере ничего этого не нужно

У серверного компонента ability уже есть — значит не нужны ни провайдер, ни контекст, ни клиентская граница:

```tsx
import { Can } from "@vetojs/react/server";

const ability = await getAbility();

<Can ability={ability} I="update" a="post" this={post} fallback={<ReadOnly />}>
	<EditForm post={post} />
</Can>
```

Ни директивы, ни хуков, ни фабрики — схема ресурсов выводится из переданного ability. Обе ветки решаются во время рендера, поэтому в браузер не уезжает ни одна.

## Как пользоваться

Оберните дерево один раз, поближе к корню:

```tsx
<AbilityProvider rules={rules}>
	<App />
</AbilityProvider>
```

`rules` — это массив правил из `ability.rules`, ровно то, что прислал сервер. Если ability у вас уже есть, передайте его вместо правил: эти два свойства взаимоисключающие.

```tsx
<Can I="update" a="post" this={post} fallback={<DisabledButton />}>
	<EditButton />
</Can>
```

Читается как фраза: *я* могу **обновить** *пост*, вот этот. Уберите `this`, когда строки ещё нет: для кнопки «создать» вопрос в том, доступно ли действие в принципе.

```tsx
const ability = useAbility();

const visible = posts.filter((post) => ability.can("read", "post", post));
const writable = ability.permittedFields("update", "post", ["title", "status"]);
```

`useAbility` возвращает ability целиком, так что доступны все проверки. Вне провайдера он сразу бросает исключение, а не притворяется, что всё запрещено.

Когда нужен один ответ «да/нет», берите `useCan`: он подписывается на этот вердикт и перерисовывает компонент, только когда тот меняется. На списке из 50 закрытых строк, где меняется один вердикт, `useAbility` разбудит все 50, а `useCan` — одну. `<Can>` пользуется им внутри.

```tsx
const canEdit = useCan("update", "post", post);
```

## Смена пользователя

Передать провайдеру новые `rules` можно, но проп живёт в состоянии предка, поэтому смена перерисует и предка, и всё под ним. `useSetRules` пишет прямо в стор:

```tsx
const setRules = useSetRules();

const onSwitchActor = async (id: string) => {
	setRules(await fetchRulesFor(id));
};
```

Выше не перерисовывается ничего, обновляются только строки с изменившимся вердиктом. Проп `rules` — чтобы засеять данными с сервера, `useSetRules` — для смен без нового запроса.

## Спрятать — не значит защитить

Скрытая кнопка — это вежливость к пользователю, а не защита: запрос, который она бы отправила, всё равно можно отправить руками. Каждое действие по-прежнему нужно проверять на сервере. Ценность общего массива правил в том, что обе стороны читают один источник, и интерфейс не может разойтись с тем, что на самом деле разрешает сервер.

## Документация

- **[Полное руководство](https://github.com/ivan-yuldashev/veto/blob/main/docs/react.ru.md)** — провайдер, `<Can>`, `useAbility` и работа с серверными компонентами.
- **[О проекте](https://github.com/ivan-yuldashev/veto/blob/main/README.ru.md)** — что такое `@vetojs` и как устроен движок.

## Лицензия

MIT
