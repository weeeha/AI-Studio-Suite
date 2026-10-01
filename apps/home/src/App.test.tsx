import { render, screen, within } from '@testing-library/react'
import { App, type SuiteTool } from './App'
import registry from '../../../tools.json'

const tools = registry.tools as SuiteTool[]

test('lists the six tools in pipeline order', () => {
  render(<App tools={tools} />)
  const names = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)
  expect(names).toEqual(['Cork Board', 'ScriptBreak', 'Slate', 'Storyboard Reference Studio', 'Motion Previs Studio', 'Blockout'])
})

test('enabled tools link to their path; disabled tools say desktop only and link the fork', () => {
  render(<App tools={tools} />)
  const cork = screen.getByRole('article', { name: 'Cork Board' })
  expect(within(cork).getByRole('link', { name: 'Open Cork Board' })).toHaveAttribute('href', './cork/')
  const slate = screen.getByRole('article', { name: 'Slate' })
  expect(within(slate).getByRole('link', { name: 'Open Slate' })).toHaveAttribute('href', './slate/')
  const storyboard = screen.getByRole('article', { name: 'Storyboard Reference Studio' })
  expect(within(storyboard).getByText('Desktop only for now')).toBeInTheDocument()
  expect(within(storyboard).getByRole('link', { name: 'Storyboard Reference Studio fork on GitHub' })).toHaveAttribute('href', 'https://github.com/weeeha/storyboard-reference-studio')
})

test('credits the author with license and donation links', () => {
  render(<App tools={tools} />)
  expect(screen.getByText(/Sam Wasserman/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'wassermanproductions.com' })).toHaveAttribute('href', 'https://wassermanproductions.com')
  expect(screen.getByRole('link', { name: 'ko-fi.com/samwasserman' })).toHaveAttribute('href', 'https://ko-fi.com/samwasserman')
})

test('the credits footer is the #credits anchor target', () => {
  const { container } = render(<App tools={tools} />)
  expect(container.querySelector('footer#credits')).not.toBeNull()
})
