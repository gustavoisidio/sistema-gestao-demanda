import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './components/App'
import { startDebug } from './debug'

// Depois de um novo deploy, a aba aberta ainda aponta para arquivos antigos: ao falhar o carregamento de uma tela,
// recarrega a página uma única vez para pegar a versão nova (e não ficar em "Carregando…").
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  try {
    if (sessionStorage.getItem('preload-reloaded')) return
    sessionStorage.setItem('preload-reloaded', '1')
  } catch {
    /* sem sessionStorage: recarrega mesmo assim */
  }
  window.location.reload()
})

startDebug()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
