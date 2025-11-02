import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AppRadar from './app-radar'
import './index.css'

const params = new URLSearchParams(window.location.search)
const RootApp = params.get('ui') === 'radar' ? AppRadar : App

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<RootApp />
	</React.StrictMode>
)
