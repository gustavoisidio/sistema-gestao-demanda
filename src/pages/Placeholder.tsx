import { useRoute } from '../hooks/useRoute'

export default function Placeholder() {
  const { route } = useRoute()
  return <p data-testid="placeholder">{route.title}</p>
}
