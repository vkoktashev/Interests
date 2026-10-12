# Telegram backups

Production uses the local Telegram Bot API (Bot API 10.3, image pinned by digest).
The API has no published host port. It reads `/app/backups` through a read-only
mount and stores its state in the `telegram_bot_api_data` Docker volume.

Set `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` in the server's root `.env`.
Keep the existing `TELEGRAM_TOKEN` and `CHAT_ID`. Never commit these credentials.

Compose defaults to `http://telegram-bot-api:8081`, local file references, and
1,990,000,000 bytes per document. Larger archives are split. The send timeout is
3,600 seconds and can be overridden with `TELEGRAM_SEND_TIMEOUT` in `.env`.
There are no automatic upload retries because an ambiguous timeout can otherwise
produce duplicate documents. Check the chat before retrying.

## First migration

1. Build `pg_backup` and start `telegram-bot-api` without stopping the database.
2. Wait for any existing backup job to finish. Call `logOut` once on the cloud
   Bot API with the existing token before making authenticated local API calls.
3. Recreate `pg_backup` and verify `getMe` on the local endpoint.
4. Send an existing archive without creating a new dump:
   `docker compose exec -T pg_backup /app/backup_and_send.sh --send-existing /app/backups/ARCHIVE.sql.gz`.
5. Check the returned message ID, document size and the next scheduled run.

Regular backups and deployment share `backups/.backup.lock`. Deployment must
use `flock` around `docker compose up -d` and must not run `docker compose down`
during an upload. Do not remove the API volume with `down -v`.

## Cloud rollback

Stop the sender and log out on the local API. Allow at least 10 minutes since
the original cloud logout before returning to the cloud. Set these in `.env`:

```dotenv
TELEGRAM_API_URL=https://api.telegram.org
TELEGRAM_UPLOAD_LIMIT=49000000
TELEGRAM_LOCAL_FILES=0
```

Recreate `pg_backup`; archives will again be sent in 49 MB parts. Coordinate all
other scripts using the same bot token before moving between API servers.

Archives are retained as before. Monitor free disk space and establish a retention
policy separately; this migration does not automatically delete old backups.
