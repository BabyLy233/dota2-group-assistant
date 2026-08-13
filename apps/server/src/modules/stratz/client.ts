import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { steamIdToAccountId } from './steam'
import { RateLimiter, type RateLimitConfig } from './rate-limiter'
import type {
  GetMatchResponse,
  GetPlayerMatchesResponse,
  GetPlayerResponse,
  StratzMatch,
  StratzMatchGroupRequest,
  StratzPlayerInfo,
} from './types'

const STRATZ_ENDPOINT = 'https://api.stratz.com/graphql'

// 官方文档（https://api.stratz.com/graphiql）要求所有请求携带 `User-Agent: STRATZ_API`。
// 传输层用系统 curl 是因为 Node/undici 的 TLS 指纹会被 Cloudflare 拦截（403/500），
// curl 实测可通过。
const STRATZ_USER_AGENT = 'STRATZ_API'
const execFileAsync = promisify(execFile)

const GET_PLAYER_QUERY = /* GraphQL */ `
  query GetPlayer($steamAccountId: Long!) {
    player(steamAccountId: $steamAccountId) {
      steamAccountId
      names {
        name
      }
      steamAccount {
        id
        name
        avatar
        profileUri
      }
    }
  }
`

const GET_PLAYER_MATCHES_QUERY = /* GraphQL */ `
  query GetPlayerMatches($steamAccountId: Long!, $request: PlayerMatchesRequestType!) {
    player(steamAccountId: $steamAccountId) {
      matches(request: $request) {
        id
        startDateTime
        durationSeconds
        gameMode
        lobbyType
        radiantKills
        direKills
        didRadiantWin
        parsedDateTime
        players {
          steamAccountId
          playerSlot
          heroId
          kills
          deaths
          assists
          numLastHits
          numDenies
          goldPerMinute
          networth
          experiencePerMinute
          heroDamage
          towerDamage
          heroHealing
          isVictory
        }
      }
    }
  }
`

const GET_MATCH_QUERY = /* GraphQL */ `
  query GetMatch($id: Long!) {
    match(id: $id) {
      id
      didRadiantWin
      startDateTime
      durationSeconds
      gameMode
      lobbyType
      radiantKills
      direKills
      parsedDateTime
      firstBloodTime
      towerStatusRadiant
      towerStatusDire
      barracksStatusRadiant
      barracksStatusDire
      clusterId
      gameVersionId
      numHumanPlayers
      radiantNetworthLeads
      radiantExperienceLeads
      winRates
      pickBans {
        isPick
        heroId
        bannedHeroId
        order
        isRadiant
        wasBannedSuccessfully
      }
      laneReport {
        radiant {
          midLane {
            meleeCount
            rangeCount
            siegeCount
            denyCount
            neutralCount
          }
          offLane {
            meleeCount
            rangeCount
            siegeCount
            denyCount
            neutralCount
          }
          safeLane {
            meleeCount
            rangeCount
            siegeCount
            denyCount
            neutralCount
          }
        }
        dire {
          midLane {
            meleeCount
            rangeCount
            siegeCount
            denyCount
            neutralCount
          }
          offLane {
            meleeCount
            rangeCount
            siegeCount
            denyCount
            neutralCount
          }
          safeLane {
            meleeCount
            rangeCount
            siegeCount
            denyCount
            neutralCount
          }
        }
      }
      players {
        steamAccountId
        playerSlot
        heroId
        kills
        deaths
        assists
        numLastHits
        numDenies
        goldPerMinute
        networth
        experiencePerMinute
        heroDamage
        towerDamage
        heroHealing
        isVictory
        imp
        position
        level
        gold
        goldSpent
        item0Id
        item1Id
        item2Id
        item3Id
        item4Id
        item5Id
        neutral0Id
        abilities {
          abilityId
          time
          level
          isTalent
        }
        playbackData {
          killEvents {
            time
            attacker
            target
            byAbility
            byItem
            gold
            xp
            assist
            isSolo
            isGank
          }
        }
        steamAccount {
          id
          name
          avatar
          profileUri
        }
      }
    }
  }
`

const GET_CONSTANTS_QUERY = /* GraphQL */ `
  query GetConstants {
    constants {
      heroes {
        id
        displayName
      }
      gameModes {
        id
        name
      }
      lobbyTypes {
        id
        name
      }
      items {
        id
        displayName
        shortName
      }
    }
  }
`

export interface StratzConstantsData {
  heroes: Array<{ id: number; displayName: string }>
  gameModes: Array<{ id: number; name: string }>
  lobbyTypes: Array<{ id: number; name: string }>
  items: Array<{ id: number; displayName: string; shortName: string }>
}

const CONSTANTS_TTL_MS = 24 * 60 * 60 * 1000

let constantsCache: { data: StratzConstantsData; fetchedAt: number } | undefined

export class StratzApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StratzApiError'
  }
}

export class StratzRateLimitError extends Error {
  constructor() {
    super('STRATZ API rate limit exceeded')
    this.name = 'StratzRateLimitError'
  }
}

export interface StratzClientOptions {
  apiKey?: string
  maxRetries?: number
  retryDelayMs?: number
  rateLimits?: RateLimitConfig
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export interface StratzQuota {
  local: {
    second: number
    minute: number
    hour: number
    day: number
  }
  remote: {
    remainingSecond: number | null
    remainingMinute: number | null
    remainingHour: number | null
    remainingDay: number | null
  }
}

export class StratzClient {
  private readonly endpoint = STRATZ_ENDPOINT
  private readonly apiKey?: string
  private readonly maxRetries: number
  private readonly retryDelayMs: number
  private readonly limiter: RateLimiter
  private remoteQuota = {
    remainingSecond: null as number | null,
    remainingMinute: null as number | null,
    remainingHour: null as number | null,
    remainingDay: null as number | null,
  }

  constructor(options: StratzClientOptions) {
    this.apiKey = options.apiKey
    this.maxRetries = options.maxRetries ?? 3
    this.retryDelayMs = options.retryDelayMs ?? 1000
    this.limiter = new RateLimiter(
      options.rateLimits ?? {
        perSecond: 5,
        perMinute: 100,
        perHour: 1000,
        perDay: 10000,
      },
    )
  }

  getQuota(): StratzQuota {
    return {
      local: this.limiter.windowCounts,
      remote: { ...this.remoteQuota },
    }
  }

  async getPlayer(steamId: string): Promise<StratzPlayerInfo> {
    const accountId = steamIdToAccountId(steamId)
    const data = await this.query<GetPlayerResponse>(GET_PLAYER_QUERY, {
      steamAccountId: accountId,
    })

    const player = data.player
    if (!player) {
      throw new StratzApiError(`Player not found: ${steamId}`)
    }

    return {
      steamId,
      accountId: player.steamAccountId,
      name: player.steamAccount?.name ?? player.names?.[0]?.name ?? steamId,
      avatar: player.steamAccount?.avatar ?? '',
      profileUrl:
        player.steamAccount?.profileUri ?? `https://steamcommunity.com/profiles/${steamId}`,
    }
  }

  async getPlayerMatches(
    steamId: string,
    request: StratzMatchGroupRequest = {},
  ): Promise<StratzMatch[]> {
    const accountId = steamIdToAccountId(steamId)
    const data = await this.query<GetPlayerMatchesResponse>(GET_PLAYER_MATCHES_QUERY, {
      steamAccountId: accountId,
      request: { take: 20, skip: 0, ...request },
    })

    return data.player?.matches ?? []
  }

  async getMatch(matchId: number): Promise<StratzMatch> {
    const data = await this.query<GetMatchResponse>(GET_MATCH_QUERY, {
      id: matchId,
    })

    const match = data.match
    if (!match) {
      throw new StratzApiError(`Match not found: ${matchId}`)
    }

    return match
  }

  async getConstants(): Promise<StratzConstantsData> {
    const now = Date.now()
    if (constantsCache && now - constantsCache.fetchedAt < CONSTANTS_TTL_MS) {
      return constantsCache.data
    }

    const data = await this.query<{ constants: StratzConstantsData }>(GET_CONSTANTS_QUERY, {})
    constantsCache = { data: data.constants, fetchedAt: now }
    return data.constants
  }

  private async query<T>(queryText: string, variables: Record<string, unknown>): Promise<T> {
    let delayMs = this.retryDelayMs

    for (let attempt = 0; ; attempt++) {
      try {
        const res = await this.httpPost(JSON.stringify({ query: queryText, variables }))

        if (res.status === 429) {
          if (attempt >= this.maxRetries) {
            throw new StratzRateLimitError()
          }
          await sleep((res.retryAfter ?? delayMs / 1000) * 1000)
          delayMs *= 2
          continue
        }

        if (res.status < 200 || res.status >= 300) {
          throw new Error(
            `STRATZ API HTTP error: ${res.status}${
              res.status === 403 ? ' (blocked by Cloudflare)' : ''
            }`,
          )
        }

        const body = JSON.parse(res.text) as {
          data?: T
          errors?: Array<{ message?: string }>
        }

        if (body.errors?.length) {
          throw new StratzApiError(body.errors[0]?.message ?? 'Unknown GraphQL error')
        }

        return body.data as T
      } catch (err) {
        if (err instanceof StratzApiError || err instanceof StratzRateLimitError) {
          throw err
        }
        if (attempt >= this.maxRetries) {
          throw err
        }
        await sleep(delayMs)
        delayMs *= 2
      }
    }
  }

  private async httpPost(bodyText: string): Promise<{
    status: number
    retryAfter?: number
    text: string
  }> {
    await this.limiter.acquire()

    const args = [
      '-sS',
      '-i',
      '--max-time',
      '60',
      '-X',
      'POST',
      this.endpoint,
      '-H',
      'content-type: application/json',
      '-H',
      'accept: application/json',
      '-H',
      `user-agent: ${STRATZ_USER_AGENT}`,
      ...(this.apiKey ? ['-H', `authorization: Bearer ${this.apiKey}`] : []),
      '--data',
      bodyText,
    ]

    const { stdout } = await execFileAsync('curl', args, {
      maxBuffer: 128 * 1024 * 1024,
    })

    const sep = stdout.indexOf('\r\n\r\n')
    const headerBlock = sep >= 0 ? stdout.slice(0, sep) : stdout
    const text = sep >= 0 ? stdout.slice(sep + 4) : ''

    const statusMatch = / (\d{3}) /.exec(headerBlock.split('\r\n')[0] ?? '')
    const status = Number(statusMatch?.[1])
    const retryAfterMatch = /^retry-after: (\d+)/im.exec(headerBlock)
    const retryAfter = retryAfterMatch ? Number(retryAfterMatch[1]) : undefined

    const remaining = (key: string): number | null => {
      const m = new RegExp(`^x-ratelimit-remaining-${key}: (\\d+)`, 'im').exec(headerBlock)
      return m ? Number(m[1]) : null
    }
    const remainingSecond = remaining('second')
    const remainingMinute = remaining('minute')
    const remainingHour = remaining('hour')
    const remainingDay = remaining('day')
    if (remainingSecond != null) this.remoteQuota.remainingSecond = remainingSecond
    if (remainingMinute != null) this.remoteQuota.remainingMinute = remainingMinute
    if (remainingHour != null) this.remoteQuota.remainingHour = remainingHour
    if (remainingDay != null) this.remoteQuota.remainingDay = remainingDay

    return {
      status: Number.isFinite(status) ? status : 0,
      retryAfter: Number.isFinite(retryAfter) ? retryAfter : undefined,
      text,
    }
  }
}
