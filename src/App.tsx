import { AppShell } from './app/AppShell'
import { DataProvider } from './app/DataProvider'
import { ThemeProvider } from './app/ThemeProvider'

function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <AppShell />
      </DataProvider>
    </ThemeProvider>
  )
}

export default App
