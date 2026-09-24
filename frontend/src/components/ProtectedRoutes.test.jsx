import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import ProtectedRoute from './ProtectedRoutes'
import { ACCESS_TOKEN, REFRESH_TOKEN } from '../constants'
import { API, server } from '../test/server'

// jwtDecode only reads the payload, so an unsigned token is enough.
const b64 = (obj) => btoa(JSON.stringify(obj)).replace(/=+$/, '')
const jwtExpiringIn = (seconds) =>
  `${b64({ alg: 'none' })}.${b64({ exp: Math.floor(Date.now() / 1000) + seconds })}.sig`

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/login" element={<div>Login page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Secret dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  test('no token: redirects to /login', async () => {
    renderRoute()
    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument()
  })

  test('valid token: renders the children without calling the API', async () => {
    localStorage.setItem(ACCESS_TOKEN, jwtExpiringIn(600))
    // onUnhandledRequest is 'error', so any network call would fail this test
    renderRoute()
    expect(await screen.findByText('Secret dashboard')).toBeInTheDocument()
  })

  test('expired token with a good refresh token: refreshes, stores it, renders children', async () => {
    const fresh = jwtExpiringIn(600)
    localStorage.setItem(ACCESS_TOKEN, jwtExpiringIn(-60))
    localStorage.setItem(REFRESH_TOKEN, 'old-refresh')
    server.use(
      http.post(`${API}/checklists/token/refresh/`, async ({ request }) => {
        expect(await request.json()).toEqual({ refresh: 'old-refresh' })
        return HttpResponse.json({ access: fresh, refresh: 'new-refresh' })
      }),
    )

    renderRoute()

    expect(await screen.findByText('Secret dashboard')).toBeInTheDocument()
    expect(localStorage.getItem(ACCESS_TOKEN)).toBe(fresh)
    expect(localStorage.getItem(REFRESH_TOKEN)).toBe('new-refresh')
  })

  test('expired token and the refresh is rejected: redirects to /login', async () => {
    localStorage.setItem(ACCESS_TOKEN, jwtExpiringIn(-60))
    localStorage.setItem(REFRESH_TOKEN, 'dead-refresh')
    server.use(
      http.post(`${API}/checklists/token/refresh/`, () => new HttpResponse(null, { status: 401 })),
    )

    renderRoute()

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Secret dashboard')).not.toBeInTheDocument()
  })

  test('expired token and no refresh token: redirects to /login', async () => {
    localStorage.setItem(ACCESS_TOKEN, jwtExpiringIn(-60))
    renderRoute()
    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  test('a malformed token redirects to /login instead of crashing', async () => {
    localStorage.setItem(ACCESS_TOKEN, 'not-a-jwt')
    renderRoute()
    expect(await screen.findByText('Login page')).toBeInTheDocument()
  })

  test('shows a loading state while the check is in flight', () => {
    localStorage.setItem(ACCESS_TOKEN, jwtExpiringIn(-60))
    localStorage.setItem(REFRESH_TOKEN, 'r')
    server.use(http.post(`${API}/checklists/token/refresh/`, () => new Promise(() => {})))
    renderRoute()
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
