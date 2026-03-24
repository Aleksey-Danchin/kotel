---
name: Починка Expo LAN QR
overview: Стабилизировать запуск Expo в LAN для сценария `scripts/dev-start.sh` + Android Expo Go, чтобы QR всегда публиковал доступный IP хоста и подключение не ломалось из-за авто-детекта сети.
todos:
  - id: harden-host-ip
    content: Укрепить детект и валидацию HOST_IP в scripts/dev-start.sh для LAN-сценария с телефоном
    status: completed
  - id: align-mobile-env
    content: Согласовать дефолтные mobile env в scripts/dev-start.sh (API base + host header) с текущим runbook
    status: completed
  - id: verify-compose-vars
    content: Проверить и при необходимости уточнить mobile env в infra/compose/dev.yml под Expo SDK 54 LAN в Docker
    status: completed
  - id: update-docs-lan
    content: Обновить README.md и apps/mobile/README.md с минимальным чеклистом диагностики LAN QR
    status: completed
  - id: post-change-smoke
    content: Проверить запуск scripts/dev-start.sh и корректность QR/доступности bundle с телефона
    status: completed
isProject: false
---

# План исправления Expo QR (LAN)

## Что именно ломается в текущем коде

- В [scripts/dev-start.sh](/home/aleksey/Desktop/kotel/scripts/dev-start.sh) `HOST_IP` определяется эвристикой (`ip route get`/`hostname -I`), которая часто выбирает неверный интерфейс (VPN, docker, второй NIC).
- В [infra/compose/dev.yml](/home/aleksey/Desktop/kotel/infra/compose/dev.yml) Expo URL/QR полностью завязан на `HOST_IP` через `REACT_NATIVE_PACKAGER_HOSTNAME` и `EXPO_PACKAGER_PROXY_URL`.
- В документации [README.md](/home/aleksey/Desktop/kotel/README.md) и [apps/mobile/README.md](/home/aleksey/Desktop/kotel/apps/mobile/README.md) ожидаются `https://<HOST_IP>/api` и host header, но скрипт сейчас по умолчанию выставляет `http://<HOST_IP>:3000`, что усложняет диагностику после сканирования QR.

## Изменения

- Обновить [scripts/dev-start.sh](/home/aleksey/Desktop/kotel/scripts/dev-start.sh):
  - сделать более надежный выбор LAN IPv4 (исключить loopback/docker/veth/br/tailscale/wg; брать адрес активного интерфейса);
  - добавить явную валидацию `HOST_IP` и понятный fail-fast с подсказкой, как переопределить вручную (`HOST_IP=... scripts/dev-start.sh`);
  - привести дефолт `EXPO_PUBLIC_API_BASE_URL` и `EXPO_PUBLIC_API_HOST_HEADER` к значениям из runbook (`https://<HOST_IP>/api`, `kotel.localhost`).
- Уточнить сетевые переменные mobile в [infra/compose/dev.yml](/home/aleksey/Desktop/kotel/infra/compose/dev.yml) при необходимости (без смены режима на tunnel):
  - сохранить LAN-путь через `REACT_NATIVE_PACKAGER_HOSTNAME=${HOST_IP}`;
  - добавить только недостающие безопасные параметры, если для Expo SDK 54 это улучшает публикацию URL в Docker.
- Актуализировать инструкции в [README.md](/home/aleksey/Desktop/kotel/README.md) и [apps/mobile/README.md](/home/aleksey/Desktop/kotel/apps/mobile/README.md):
  - короткий LAN-checklist (одна Wi‑Fi сеть, порты `8081/19000-19002`, override `HOST_IP`);
  - команда быстрого ручного запуска с явным `HOST_IP` для диагностики.

## Проверка после правок

- Поднять окружение `scripts/dev-start.sh` и убедиться, что в Expo QR фигурирует корректный IP хоста.
- Проверить достижимость с телефона: загрузка bundle по LAN и запуск приложения через Expo Go.
- Проверить, что API-конфиг в mobile соответствует ожидаемому маршруту через Traefik (`https://<HOST_IP>/api`, host header `kotel.localhost`).
- Прогнать точечную проверку линтера по измененным файлам (shell/yaml/md — по месту).

