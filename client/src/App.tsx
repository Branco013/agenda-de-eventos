import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import AuthPage from "./pages/Auth";
import Eventos from "./pages/Eventos";
import Clientes from "./pages/Clientes";
import Menus from "./pages/Menus";
import Configuracoes from "./pages/Configuracoes";
import Relatorios from "./pages/Relatorios";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Eventos} />
        <Route path="/clientes" component={Clientes} />
        <Route path="/menus" component={Menus} />
        <Route path="/relatorios" component={Relatorios} />
        <Route path="/configuracoes" component={Configuracoes} />
        <Route path="/404" component={NotFound} />
        <Route path="/auth" component={AuthPage} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
