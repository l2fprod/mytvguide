import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { StoreProvider } from './store'
import './styles.css'

const container = document.getElementById('app')
if (container) {
  createRoot(container).render(
    <StoreProvider>
      <App />
    </StoreProvider>
  )
} else {
  console.error('No #app element found')
}
