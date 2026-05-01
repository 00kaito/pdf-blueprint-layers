import {Route, Switch, Redirect} from "wouter";
import {queryClient} from "./lib/queryClient";
import {QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "@/components/ui/toaster";
import {TooltipProvider} from "@/components/ui/tooltip";
import {EditorProvider} from "@/lib/editor-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/AuthPage";
import {useCurrentUser} from "@/hooks/useAuth";
import {Loader2} from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const {data: user, isLoading, isError, error, refetch} = useCurrentUser();

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

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route>
          <Redirect to="/auth" />
        </Route>
      </Switch>
    );
  }

  return (
    <EditorProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </EditorProvider>
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
