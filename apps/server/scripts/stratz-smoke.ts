import { loadEnv } from '../src/config/env'
import { StratzClient } from '../src/modules/stratz'

const STEAM_ID = process.argv[2] ?? '76561198060268899'

async function main() {
  const env = loadEnv()
  if (!env.STRATZ_API_KEY) {
    throw new Error('STRATZ_API_KEY is not set')
  }

  const client = new StratzClient({ apiKey: env.STRATZ_API_KEY })

  console.log(`[player] steamId=${STEAM_ID}`)
  const player = await client.getPlayer(STEAM_ID)
  console.log(`  accountId=${player.accountId} name=${player.name}`)
  console.log(`  avatar=${player.avatar}`)
  console.log(`  profileUrl=${player.profileUrl}`)

  console.log('[playerMatches]')
  const matches = await client.getPlayerMatches(STEAM_ID, { take: 5 })
  console.log(`  count=${matches.length}`)
  for (const m of matches) {
    const self = m.players?.find((p) => p.steamAccountId === player.accountId)
    console.log(
      `  match=${m.id} hero=${self?.heroId} kda=${self?.kills}/${self?.deaths}/${self?.assists} ` +
        `win=${self?.isVictory} dur=${m.durationSeconds}s parsed=${Boolean(m.parsedDateTime)}`,
    )
  }

  if (matches.length === 0) {
    console.log('  no matches, skip match detail test')
    return
  }

  const matchId = matches[0]!.id
  console.log(`[match] id=${matchId}`)
  const match = await client.getMatch(matchId)
  const radiantScore = match.radiantKills?.reduce((a, b) => a + b, 0)
  const direScore = match.direKills?.reduce((a, b) => a + b, 0)
  console.log(`  gameMode=${match.gameMode} lobbyType=${match.lobbyType}`)
  console.log(`  radiant=${radiantScore} dire=${direScore}`)
  console.log(`  players=${match.players?.length ?? 0}`)
  const first = match.players?.[0]
  if (first) {
    console.log(`  first=${first.steamAccount?.name ?? first.steamAccountId} hero=${first.heroId}`)
  }

  console.log('[done]')
}

main().catch((err) => {
  console.error('smoke test failed:', err)
  process.exit(1)
})
