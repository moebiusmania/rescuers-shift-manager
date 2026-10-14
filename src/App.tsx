import ThemeSwitcher from "./components/ThemeSwitcher.tsx";
import ShiftPlanner from "./components/ShiftPlanner.tsx";
import InstallPrompt from "./components/InstallPrompt.tsx";

export default function App() {
  return (
    <>
      <ThemeSwitcher />
      <div class="app-content">
        <main class="page">
          <ShiftPlanner />
        </main>
        <InstallPrompt />
      </div>
      <footer class="app-footer">
        <p class="app-footer__text">
          Questa applicazione utilizza il <code>localStorage</code> del browser per memorizzare tutti i dati localmente sul tuo dispositivo. Nessun dato viene inviato a nessun server, tutte le informazioni rimangono sul computer dell'utente e non vengono mai trasmesse attraverso la rete.
        </p>
      </footer>
    </>
  );
}
