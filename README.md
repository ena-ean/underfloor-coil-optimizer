# Калькулятор бухт тёплого пола

Оптимизация закупки трубки ⌀16 мм. Распределяет контурные петли по бухтам с минимальным остатком.

## Запуск через Docker

### Требования

- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) 2.0+

### Быстрый старт

1. Клонируйте репозиторий:

```bash
git clone <url-репозитория>
cd warm-floor-calc
```

2. Соберите и запустите:

```bash
docker compose up -d --build
```

3. Откройте в браузере:

```
http://localhost:3000
```

### Управление

| Команда | Описание |
|---|---|
| `docker compose up -d --build` | Собрать и запустить в фоновом режиме |
| `docker compose up` | Запустить с логами в консоли |
| `docker compose down` | Остановить и удалить контейнер |
| `docker compose logs -f` | Посмотреть логи в реальном времени |
| `docker compose restart` | Перезапустить контейнер |
| `docker compose build --no-cache` | Пересобрать образ без кэша |

### Изменение порта

По умолчанию приложение доступно на порту **3000**. Чтобы изменить, отредактируйте `docker-compose.yml`:

```yaml
services:
  warm-floor-calc:
    ports:
      - "8080:3000"   # приложение будет на http://localhost:8080
```
