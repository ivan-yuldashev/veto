# @vetojs/next

**[English](README.md) · [Русский](README.ru.md)**

> ## Больше не поддерживается
>
> Гвард из этого пакета никогда не импортировал ни `next`, ни `react`, поэтому переехал в движок как **`@vetojs/core/guard`** — там он обслуживает ещё и HTTP-обработчики, и вызовы инструментов агентом. Пакет остаётся реэкспортом и меняться больше не будет.

## Как перейти

Поменяйте импорт. Больше ничего: API тот же, а пакет, в котором он теперь живёт, у вас уже в зависимостях.

```ts
import { createGuard } from "@vetojs/core/guard";
```

После этого уберите `@vetojs/next` из зависимостей. Нужна версия `@vetojs/core` не ниже `0.7.0`.

## Куда переехала документация

- **[Гвард](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/guard.ru.md)** — всё, что описывал этот README, плюс HTTP-обработчики и вызовы инструментов.
- **[Express, Fastify, Hono](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/http.ru.md)** — гвард за пределами Next.
- **[Агенты](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/agents.ru.md)** — как охранять то, что может вызвать модель.

## Лицензия

MIT
