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
  const {data: user, isLoading} = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
