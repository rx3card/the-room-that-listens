import '@fontsource-variable/host-grotesk'
import '@fontsource/courier-prime/400.css'
import './styles.css'
import { App } from './app'

const app = new App()
if (new URLSearchParams(location.search).has('fast')) (window as unknown as { room: App }).room = app
