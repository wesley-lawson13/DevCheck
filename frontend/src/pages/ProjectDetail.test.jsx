import { beforeEach, describe, expect, test, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import ProjectDetail from './ProjectDetail'
import { API, server } from '../test/server'

const DETAIL = `${API}/checklists/projects/1/detail/`

const makeTree = () => ({
  id: 1,
  name: 'Demo',
  description: 'A demo',
  link: null,
  project_status: 'MVP',
  image: 'http://api.test/logo.png',
  pages: [
    {
      id: 10,
      name: 'Home',
      sections: [
        { id: 100, title: 'MVP', tasks: [{ id: 1000, title: 'Write tests', completed: false }] },
        { id: 101, title: 'DEV', tasks: [] },
        { id: 102, title: 'DEPLOY', tasks: [] },
      ],
    },
  ],
})

let tree
let detailGets

// Serves `tree` (mutable, so handlers can change what the next refetch returns).
function serveTree() {
  detailGets = 0
  server.use(
    http.get(DETAIL, () => {
      detailGets++
      return HttpResponse.json(structuredClone(tree))
    }),
  )
}

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/projects/1']}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

const checkbox = () => screen.getByRole('checkbox', { name: '' }) // unlabeled in the markup

beforeEach(() => {
  tree = makeTree()
  serveTree()
  vi.spyOn(window, 'alert').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('ProjectDetail', () => {
  test('renders the project, its page and its tasks', async () => {
    renderDetail()
    expect(await screen.findByText('To Do: Demo')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Write tests')).toBeInTheDocument()
    expect(screen.getByText('No development tasks')).toBeInTheDocument()
  })

  test('toggling a task updates the checkbox immediately, before the server answers', async () => {
    const user = userEvent.setup()
    let release
    let patchBody
    server.use(
      http.patch(`${API}/checklists/tasks/1000/`, async ({ request }) => {
        patchBody = await request.json()
        await new Promise((resolve) => (release = resolve))
        return HttpResponse.json({ id: 1000, completed: true })
      }),
    )
    renderDetail()
    await screen.findByText('Write tests')
    expect(checkbox()).not.toBeChecked()

    await user.click(checkbox())

    expect(checkbox()).toBeChecked() // optimistic: PATCH is still pending
    await waitFor(() => expect(patchBody).toEqual({ completed: true }))
    release()
    expect(checkbox()).toBeChecked()
    expect(detailGets).toBe(1) // success does not need a refetch
  })

  test('a failed toggle rolls back to the server state', async () => {
    const user = userEvent.setup()
    server.use(
      http.patch(`${API}/checklists/tasks/1000/`, () => new HttpResponse(null, { status: 500 })),
    )
    renderDetail()
    await screen.findByText('Write tests')

    await user.click(checkbox())

    await waitFor(() => expect(detailGets).toBe(2)) // refetched to resync
    await waitFor(() => expect(checkbox()).not.toBeChecked())
  })

  test('adding a task posts to the section and shows the new task', async () => {
    const user = userEvent.setup()
    let postBody
    server.use(
      http.post(`${API}/checklists/projects/100/tasks/`, async ({ request }) => {
        postBody = await request.json()
        tree.pages[0].sections[0].tasks.push({ id: 1001, title: postBody.title, completed: false })
        return HttpResponse.json({ id: 1001, ...postBody, section: 100 }, { status: 201 })
      }),
    )
    renderDetail()
    await screen.findByText('Write tests')

    await user.click(screen.getAllByRole('button', { name: '+ Add' })[0]) // MVP column
    await user.type(screen.getByPlaceholderText('New task...'), 'Ship it')
    await user.click(screen.getByRole('button', { name: '✓' }))

    expect(await screen.findByText('Ship it')).toBeInTheDocument()
    expect(postBody).toEqual({ title: 'Ship it', completed: false })
    expect(screen.queryByPlaceholderText('New task...')).not.toBeInTheDocument()
  })

  test('a blank task title is not submitted', async () => {
    const user = userEvent.setup()
    let posted = false
    server.use(
      http.post(`${API}/checklists/projects/100/tasks/`, () => {
        posted = true
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    renderDetail()
    await screen.findByText('Write tests')

    await user.click(screen.getAllByRole('button', { name: '+ Add' })[0])
    await user.type(screen.getByPlaceholderText('New task...'), '   ')
    await user.click(screen.getByRole('button', { name: '✓' }))

    expect(posted).toBe(false)
  })

  test('deleting a task removes it', async () => {
    const user = userEvent.setup()
    let deleted = false
    server.use(
      http.delete(`${API}/checklists/tasks/1000/`, () => {
        deleted = true
        tree.pages[0].sections[0].tasks = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderDetail()
    const row = (await screen.findByText('Write tests')).closest('li')

    await user.click(within(row).getByRole('button'))

    await waitFor(() => expect(screen.queryByText('Write tests')).not.toBeInTheDocument())
    expect(deleted).toBe(true)
  })

  describe('deleting a page', () => {
    async function deleteHomePage(user) {
      let deleted = false
      server.use(
        http.delete(`${API}/checklists/pages/10/`, () => {
          deleted = true
          tree.pages = []
          return new HttpResponse(null, { status: 204 }) // what the API really returns
        }),
      )
      renderDetail()
      await screen.findByText('Home')
      // the page header's trash button is the only button next to the page title
      await user.click(screen.getByText('Home').parentElement.querySelector('button'))
      await user.click(await screen.findByRole('button', { name: 'Delete' }))
      return () => deleted
    }

    test('removes the page and closes the confirmation modal', async () => {
      const user = userEvent.setup()
      const wasDeleted = await deleteHomePage(user)

      await waitFor(() => expect(screen.queryByText('Home')).not.toBeInTheDocument())
      expect(wasDeleted()).toBe(true)
      expect(screen.queryByText('Delete Page?')).not.toBeInTheDocument()
    })

    // KNOWN BUG B11: the code checks for 200/201 but DELETE returns 204, so the message never
    // shows. `test.fails` keeps the suite green while documenting it; when 4.6 fixes the status
    // check this starts failing, which is the cue to change it to a plain `test`.
    test.fails('shows "Page deleted successfully." (B11, fixed in 4.6)', async () => {
      const user = userEvent.setup()
      await deleteHomePage(user)

      expect(await screen.findByText('Page deleted successfully.', {}, { timeout: 500 })).toBeInTheDocument()
    })
  })

  test('changing status confirms first, then PATCHes the status code as JSON', async () => {
    const user = userEvent.setup()
    let patch
    server.use(
      http.patch(DETAIL, async ({ request }) => {
        patch = { type: request.headers.get('content-type'), body: await request.json() }
        tree.project_status = 'DEV'
        return HttpResponse.json({ project_status: 'DEV' })
      }),
    )
    renderDetail()
    await screen.findByText('To Do: Demo')

    await user.click(screen.getByRole('button', { name: 'In Development' }))
    expect(patch).toBeUndefined() // nothing sent until the modal is confirmed
    await user.click(screen.getByRole('button', { name: 'Update' }))

    expect(await screen.findByText(/Project status updated to "In Development"/)).toBeInTheDocument()
    expect(patch.type).toContain('application/json')
    expect(patch.body).toEqual({ project_status: 'DEV' })
  })

  test('adding a page posts the page, then its three sections', async () => {
    // Current client-orchestrated behaviour (B8). Item 4.1 moves this server-side and
    // should rewrite this test to expect a single request.
    const user = userEvent.setup()
    const calls = []
    server.use(
      http.post(`${API}/checklists/projects/1/pages/`, async ({ request }) => {
        calls.push(['page', await request.json()])
        return HttpResponse.json({ id: 11, name: 'About', project: 1 }, { status: 201 })
      }),
      http.post(`${API}/checklists/projects/11/sections/`, async ({ request }) => {
        calls.push(['section', (await request.json()).title])
        return HttpResponse.json({}, { status: 201 })
      }),
    )
    renderDetail()
    await screen.findByText('Home')

    await user.click(screen.getByRole('button', { name: '+ Add New Page' }))
    await user.type(screen.getByPlaceholderText('Enter page name...'), 'About')
    await user.click(screen.getByRole('button', { name: 'Create Page' }))

    await waitFor(() => expect(calls).toHaveLength(4))
    expect(calls[0]).toEqual(['page', { name: 'About' }])
    expect(calls.slice(1).map((c) => c[1]).sort()).toEqual(['DEPLOY', 'DEV', 'MVP'])
  })
})
