# Multiplayer Backend — Required WebSocket Events

This document specifies every new and existing WS event the backend must handle
for full 2-player multiplayer: character sync, position/shooting relay, and
shared enemy spawning.

---

## Existing events (already working — verify they include `charId`)

### `room:player_joined`  ← server → all clients in room
Sent when a player joins a room.  The `player` object **must include `charId`**
so the front-end can render their character correctly.

```json
{
  "type": "room:player_joined",
  "payload": {
    "player": {
      "userId":   "abc123",
      "username": "Zaven",
      "charId":   "gangster",
      "hp":       120,
      "maxHp":    120
    }
  }
}
```

### `room:state`  ← server → rejoining client
Sent after a client sends `room:rejoin`.  The `room.players` array **must
include `charId`** for every player.

```json
{
  "type": "room:state",
  "payload": {
    "room": {
      "roomId": "room_xyz",
      "players": [
        { "userId": "abc123", "username": "Zaven", "charId": "gangster", "hp": 120, "maxHp": 120 },
        { "userId": "def456", "username": "Bob",   "charId": "hacker",   "hp": 80,  "maxHp": 80  }
      ]
    }
  }
}
```

---

## Position relay (already working)

### `player:pos`  ← client → server → all OTHER clients in room
Client sends their position every ~50 ms.

**Client → server:**
```json
{
  "type": "player:pos",
  "payload": {
    "x": 1240,
    "y": 880,
    "angle": 1.57,
    "hp": 95,
    "weaponId": "pistol"
  }
}
```

**Server relays to every OTHER client in the same room** (add `userId` of sender):
```json
{
  "type": "player:pos",
  "payload": {
    "userId":   "abc123",
    "x":        1240,
    "y":        880,
    "angle":    1.57,
    "hp":       95,
    "weaponId": "pistol"
  }
}
```

---

## Shooting relay (already working)

### `player:shoot`  ← client → server → all OTHER clients in room

**Client → server:**
```json
{
  "type": "player:shoot",
  "payload": {
    "x":        1240,
    "y":        880,
    "angle":    1.57,
    "weaponId": "pistol",
    "bulletId": "k2x9a"
  }
}
```

**Server relays to every OTHER client in the same room** (add `userId`):
```json
{
  "type": "player:shoot",
  "payload": {
    "userId":   "abc123",
    "x":        1240,
    "y":        880,
    "angle":    1.57,
    "weaponId": "pistol",
    "bulletId": "k2x9a"
  }
}
```

---

## NEW — Shared enemy events

These three events make enemies shared between all players in a room.
The **host** (the player who created the room) is the authority for spawning.
All other clients receive spawns from the host and kills from any player.

---

### `bot:spawn`  ← HOST client → server → all OTHER clients in room

The host sends this whenever it spawns a new enemy.  The server must relay it
to every other client **in the same room**.

**Host → server:**
```json
{
  "type": "bot:spawn",
  "payload": {
    "id":       "ab3f7c",
    "x":        1500,
    "y":        900,
    "type":     "normal",
    "wave":     3,
    "waveSize": 8
  }
}
```

**Server relays to every OTHER client in the room** (no extra fields needed):
```json
{
  "type": "bot:spawn",
  "payload": {
    "id":       "ab3f7c",
    "x":        1500,
    "y":        900,
    "type":     "normal",
    "wave":     3,
    "waveSize": 8
  }
}
```

`type` is one of: `mini`, `normal`, `big`, `police`, `swat`, `heavyswat`,
`sniper`, `bomber`, `juggernaut`.

---

### `bot:dead`  ← ANY client → server → all OTHER clients in room

Any client sends this when their local simulation kills a bot.
The server relays it to every other client so they remove the same enemy.

**Client → server:**
```json
{
  "type": "bot:dead",
  "payload": {
    "id": "ab3f7c"
  }
}
```

**Server relays to every OTHER client in the room:**
```json
{
  "type": "bot:dead",
  "payload": {
    "id": "ab3f7c"
  }
}
```

**Important:** If the same `bot:dead` arrives twice (race condition — both
players kill the same bot), the front-end is idempotent: it just ignores the
second message.  The server can relay duplicates safely.

---

## Summary table

| Event           | Direction                        | Purpose                          |
|-----------------|----------------------------------|----------------------------------|
| `room:player_joined` | server → all clients         | Must include `charId`            |
| `room:state`    | server → rejoining client        | Must include `charId` per player |
| `player:pos`    | client → server → others         | Position/angle/HP relay          |
| `player:shoot`  | client → server → others         | Bullet origin relay              |
| `bot:spawn`     | host → server → non-host clients | Enemy spawn sync (NEW)           |
| `bot:dead`      | any client → server → others     | Enemy kill sync (NEW)            |

---

## Notes for the backend developer

1. **Host identity**: the room object already tracks `hostId`.  Use that to
   decide which client is the authority for `bot:spawn`.  Non-host clients
   send `bot:dead` only.

2. **Room isolation**: relay events only within the same `roomId`.  Never
   cross rooms.

3. **`bot:spawn` relay**: do NOT echo `bot:spawn` back to the sender (the
   host).  Only relay to the other clients.

4. **`bot:dead` relay**: do NOT echo back to the sender.  Relay to everyone
   else.  Duplicates are harmless.

5. **No server-side bot simulation needed**: the front-end runs the AI.  The
   server is a pure relay for these events.

6. **`charId` in join/state**: this is the most important fix.  Without it
   remote players render as a generic shape.  Make sure `charId` is persisted
   on the room's player record when the player calls `/rooms/:id/join` (they
   already send `charId` in the request body — just store and echo it).
