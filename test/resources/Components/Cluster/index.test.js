/**
 * @jest-environment jsdom
 */
import { render, screen } from '../../../componentSetup'
import {
  ClusterValue,
  ClusterRow,
  ClusterColumn,
  Cluster,
  ClusterBox
} from '../../../../resources/Components/Cluster'

// ClusterValue tests
it('renders children correctly', () => {
  render(<ClusterValue>hello</ClusterValue>)
  expect(screen.getByText('hello')).toBeDefined()
})

it("applies 'clusterValue' base class", () => {
  render(<ClusterValue>x</ClusterValue>)
  expect(document.querySelector('.clusterValue').className).toBe('clusterValue')
})

it("onClick prop adds 'clusterValueClickable' class", () => {
  render(<ClusterValue onClick={() => {}}>x</ClusterValue>)
  const el = document.querySelector('.clusterValue')
  expect(el.className).toContain('clusterValueClickable')
  expect(el.className).toContain('clusterValue')
})

it("pointerEvents prop adds 'clusterValueInteractable' class", () => {
  render(<ClusterValue pointerEvents>x</ClusterValue>)
  expect(document.querySelector('.clusterValue').className).toContain('clusterValueInteractable')
})

it("transparent prop adds 'clusterValueTransparent' class", () => {
  render(<ClusterValue transparent>x</ClusterValue>)
  expect(document.querySelector('.clusterValue').className).toContain('clusterValueTransparent')
})

it('grow prop sets style.flexGrow', () => {
  render(<ClusterValue grow={3}>x</ClusterValue>)
  expect(document.querySelector('.clusterValue').style.flexGrow).toBe('3')
})

it('onClick handler fires when clicked', async () => {
  const onClick = jest.fn()
  const { user } = render(<ClusterValue onClick={onClick}>x</ClusterValue>)
  await user.click(screen.getByText('x'))
  expect(onClick).toHaveBeenCalled()
})

it('no onClick — renders without click handler (no error on click)', async () => {
  const { user } = render(<ClusterValue>x</ClusterValue>)
  expect(document.querySelector('.clusterValue').onclick).toBeNull()
  await user.click(screen.getByText('x'))
})

// ClusterRow tests
it("renders children with 'clusterRow' class", () => {
  render(<ClusterRow>row content</ClusterRow>)
  expect(document.querySelector('.clusterRow').className).toBe('clusterRow')
  expect(screen.getByText('row content')).toBeDefined()
})

it('passes custom style prop through', () => {
  render(<ClusterRow style={{ color: 'red' }}>x</ClusterRow>)
  expect(document.querySelector('.clusterRow').style.color).toBe('red')
})

// ClusterColumn tests
it("renders children with 'clusterColumn' class", () => {
  render(<ClusterColumn>col</ClusterColumn>)
  expect(document.querySelector('.clusterColumn').className).toBe('clusterColumn')
  expect(screen.getByText('col')).toBeDefined()
})

it('sets flexGrow from grow prop', () => {
  render(<ClusterColumn grow={2}>x</ClusterColumn>)
  expect(document.querySelector('.clusterColumn').style.flexGrow).toBe('2')
})

it('width prop sets width/minWidth/maxWidth', () => {
  render(<ClusterColumn width='200px'>x</ClusterColumn>)
  const style = document.querySelector('.clusterColumn').style
  expect(style.width).toBe('200px')
  expect(style.minWidth).toBe('200px')
  expect(style.maxWidth).toBe('200px')
})

it('no width prop — width styles not set', () => {
  render(<ClusterColumn>x</ClusterColumn>)
  const style = document.querySelector('.clusterColumn').style
  expect(style.width).toBe('')
  expect(style.minWidth).toBe('')
  expect(style.maxWidth).toBe('')
})

// Cluster tests
it("renders children with 'cluster' class", () => {
  render(<Cluster>cluster content</Cluster>)
  expect(document.querySelector('.cluster').className).toBe('cluster')
  expect(screen.getByText('cluster content')).toBeDefined()
})

// ClusterBox tests
it('renders title in label div', () => {
  render(<ClusterBox title='My Title'>x</ClusterBox>)
  expect(screen.getByText('My Title')).toBeDefined()
})

it('renders subtitle in parens when provided', () => {
  render(<ClusterBox title='T' subtitle='sub'>x</ClusterBox>)
  expect(screen.getByText('(sub)')).toBeDefined()
})

it('no title — label div not rendered', () => {
  render(<ClusterBox>x</ClusterBox>)
  expect(document.querySelector('._txLabel')).toBeNull()
})

it('animationSlot=0 sets animationDelay to 0s', () => {
  render(<ClusterBox animationSlot={0}>x</ClusterBox>)
  expect(document.querySelector('._txMain').style.animationDelay).toBe('0s')
})

it('animationSlot=3 sets animationDelay to 0.3s', () => {
  render(<ClusterBox animationSlot={3}>x</ClusterBox>)
  expect(document.querySelector('._txMain').style.animationDelay).toBe('0.3s')
})

it('renders children inside inner container', () => {
  render(<ClusterBox>inner child</ClusterBox>)
  const inner = document.querySelector('._txMainInner')
  expect(inner).toBeDefined()
  expect(inner.textContent).toContain('inner child')
})
