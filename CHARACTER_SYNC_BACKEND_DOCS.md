# Character Sync — Backend Requirements

The frontend needs to know which character each player selected so it can
render the correct skin.  Send `playerCharacterId` (a number **1–27**) in
every event that carries player data.

---

## Character number → character name mapping

| playerCharacterId | Character name   | Internal ID       |
|:-----------------:|------------------|-------------------|
| 1                 | THE GANGSTER     | gangster          |
| 2                 | THE HACKER       | hacker            |
| 3                 | THE MERCENARY    | mercenary         |
| 4                 | THE GHOST        | ghost             |
| 5                 | THE ENGINEER     | engineer          |
| 6                 | SNIPER ELITE     | sniper_elite      |
| 7                 | DRONE PILOT      | drone_pilot       |
| 8                 | THE CHEMIST      | chemist           |
| 9                 | CYBER NINJA      | cyber_ninja       |
| 10                | CYBER WOLF       | cyber_wolf        |
| 11                | NEON PANTHER     | neon_panther      |
| 12                | MECHA BULLDOG    | mecha_bulldog     |
| 13                | TIMEBREAKER      | timebreaker       |
| 14                | AI AVATAR        | ai_avatar         |
| 15                | THE OVERLORD     | overlord          |
| 16                | ELECTRIC EEL     | electric_eel      |
| 17                | THE MEDIC        | medic             |
| 18                | THE RONIN        | ronin             |
| 19                | THE PYRO         | pyro              |
| 20                | THE PHANTOM      | phantom           |
| 21                | SPIDER DRONE     | spider_drone      |
| 22                | ROBO HAWK        | robo_hawk         |
| 23                | NANO RAT         | nano_rat          |
| 24                | MINI DRONE BEE   | mini_bee          |
| 25                | TANK COMMANDER   | tank_commander    |
| 26                | BLADE DANCER     | blade_dancer      |
| 27                | FROST WALKER     | frost_walker      |

---

## What the backend must do

When a player joins a room (`POST /rooms/:id/join`) the request body contains
`charId` (the string, e.g. `"hacker"`).  Convert that string to its number
using the table above and store `playerCharacterId` on the player record.

Then include `playerCharacterId` in **every** event that carries player data:

---

### `room:player_joined`  ← server → all clients in room

```json
{
  "type": "room:player_joined",
  "payload": {
    "player": {
      "userId":            "abc123",
      "username":          "Bob",
      "playerCharacterId": 2,
      "hp":                80,
      "maxHp":             80
    }
  }
}
```

---

### `room:state`  ← server → rejoining client

```json
{
  "type": "room:state",
  "payload": {
    "room": {
      "roomId": "room_xyz",
      "players": [
        { "userId": "abc123", "username": "Zaven", "playerCharacterId": 1, "hp": 120, "maxHp": 120 },
        { "userId": "def456", "username": "Bob",   "playerCharacterId": 2, "hp": 80,  "maxHp": 80  }
      ]
    }
  }
}
```

---

### `room:player_rejoined`  ← server → all OTHER clients

```json
{
  "type": "room:player_rejoined",
  "payload": {
    "userId":            "abc123",
    "username":          "Zaven",
    "playerCharacterId": 1
  }
}
```

---

## Summary

- Store `playerCharacterId` (integer 1–27) on each player record when they join
- Send it in `room:player_joined`, `room:state`, and `room:player_rejoined`
- The frontend reads this number, looks up `CONFIG.CHARACTERS[playerCharacterId - 1]`,
  and renders the correct skin automatically — no other changes needed on the backend
