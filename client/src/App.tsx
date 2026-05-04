import {Route, Switch, Redirect} from "wouter";
import {queryClient} from "./lib/queryClient";
import {QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "@/components/ui/toaster";
import {TooltipProvider} from "@/components/ui/tooltip";
import {EditorProvider} from "@/lib/editor-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/AuthPage";
import AdminPage from "@/pages/AdminPage";
import {useCurrentUser} from "@/hooks/useAuth";
import {Loader2} from "lucide-react";

function AppContent() {
  const {data: user, isLoading, isError, error, refetch} = useCurrentUser();

  console.log('[App] Current path:', window.location.pathname);
  console.log('[App] User state:', user ? { username: user.username, role: user.role } : 'null');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive mb-2">Failed to load session</h1>
        <p className="text-muted-foreground mb-4 max-w-md">
          Something went wrong while trying to check your login status. 
          Please try again or check your connection.
        </p>
        <div className="bg-muted p-4 rounded-md mb-6 text-left max-w-md w-full overflow-auto">
          <code className="text-sm">
            {error instanceof Error ? error.message : "Unknown error"}
          </code>
        </div>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/auth">
        {user ? <Redirect to="/" /> : <AuthPage />}
      </Route>
      
      <Route path="/admin">
        {() => {
          console.log('[App] Matching /admin route. User role:', user?.role);
          if (!user) return <Redirect to="/auth" />;
          if (user.role !== 'admin') {
            console.warn('[App] User is not admin, redirecting to /');
            return <Redirect to="/" />;
          }
          return <AdminPage />;
        }}
      </Route>

      <Route path="/">
        {!user ? <Redirect to="/auth" /> : (
          <EditorProvider>
            <TooltipProvider>
              <Toaster />
              <Home />
            </TooltipProvider>
          </EditorProvider>
        )}
      </Route>

      <Route>
        {() => {
          console.log('[App] No route matched, showing NotFound. Path:', window.location.pathname);
          return <NotFound />;
        }}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
