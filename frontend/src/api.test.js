import { beforeEach, describe, expect, test, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import api from './api'
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants'
import { redirectToLogin } from './navigation'
import { API, server } from './test/server'

vi.mock('./navigation', () => ({ redirectToLogin: vi.fn() }))

// Serves /checklists/projects/ only for the fresh access token.
const protectedEndpoint = http.get(`${API}/checklists/projects/`, ({ request }) =>
  request.headers.get('Authorization') === 'Bearer new-access'
    ? HttpResponse.json([{ id: 1 }])
    : new HttpResponse(null, { status: 401 }),
)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.setItem(ACCESS_TOKEN, 'expired-access')
  localStorage.setItem(REFRESH_TOKEN, 'old-refresh')
})

describe('token refresh interceptor', () => {
  test('401 triggers a refresh and the request is retried', async () => {
    let refreshCalls = 0
    server.use(
      protectedEndpoint,
      http.post(`${API}/checklists/token/refresh/`, async ({ request }) => {
        refreshCalls++
        expect(await request.json()).toEqual({ refresh: 'old-refresh' })
        return HttpResponse.json({ access: 'new-access', refresh: 'new-refresh' })
      }),
    )

    const res = await api.get('checklists/projects/')

    expect(res.data).toEqual([{ id: 1 }])
    expect(refreshCalls).toBe(1)
    expect(localStorage.getItem(ACCESS_TOKEN)).toBe('new-access')
    expect(localStorage.getItem(REFRESH_TOKEN)).toBe('new-refresh') // rotated
  })

  test('concurrent 401s share a single refresh', async () => {
    let refreshCalls = 0
    server.use(
      protectedEndpoint,
      http.post(`${API}/checklists/token/refresh/`, async () => {
        refreshCalls++
        await new Promise((r) => setTimeout(r, 20))
        return HttpResponse.json({ access: 'new-access', refresh: 'new-refresh' })
      }),
    )

    const results = await Promise.all([
      api.get('checklists/projects/'),
      api.get('checklists/projects/'),
      api.get('checklists/projects/'),
    ])

    expect(results.map((r) => r.status)).toEqual([200, 200, 200])
    expect(refreshCalls).toBe(1)
  })

  test('a failed refresh clears storage and redirects to login', async () => {
    server.use(
      protectedEndpoint,
      http.post(`${API}/checklists/token/refresh/`, () => new HttpResponse(null, { status: 401 })),
    )

    await expect(api.get('checklists/projects/')).rejects.toBeTruthy()

    expect(localStorage.getItem(ACCESS_TOKEN)).toBeNull()
    expect(localStorage.getItem(REFRESH_TOKEN)).toBeNull()
    expect(redirectToLogin).toHaveBeenCalledTimes(1)
  })

  test('a request that still 401s after refreshing is not retried forever', async () => {
    let calls = 0
    server.use(
      http.get(`${API}/checklists/projects/`, () => {
        calls++
        return new HttpResponse(null, { status: 401 })
      }),
      http.post(`${API}/checklists/token/refresh/`, () =>
        HttpResponse.json({ access: 'new-access', refresh: 'new-refresh' }),
      ),
    )

    await expect(api.get('checklists/projects/')).rejects.toMatchObject({
      response: { status: 401 },
    })
    expect(calls).toBe(2) // original + exactly one retry
  })

  test('401 from the login endpoint does not trigger a refresh', async () => {
    let refreshCalls = 0
    server.use(
      http.post(`${API}/checklists/token/`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API}/checklists/token/refresh/`, () => {
        refreshCalls++
        return HttpResponse.json({ access: 'x' })
      }),
    )

    await expect(
      api.post('checklists/token/', { username: 'a', password: 'b' }),
    ).rejects.toMatchObject({ response: { status: 401 } })
    expect(refreshCalls).toBe(0)
    expect(redirectToLogin).not.toHaveBeenCalled()
  })

  test('no stored refresh token: reject and redirect without calling the API', async () => {
    localStorage.removeItem(REFRESH_TOKEN)
    server.use(protectedEndpoint)

    await expect(api.get('checklists/projects/')).rejects.toBeTruthy()
    expect(redirectToLogin).toHaveBeenCalledTimes(1)
  })
})
