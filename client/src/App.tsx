import {Route, Switch} from "wouter";
import {queryClient} from "./lib/queryClient";
import {QueryClientProvider} from "@tanstack/react-query";
import {Toaster} from "@/components/ui/toaster";
import {TooltipProvider} from "@/components/ui/tooltip";
import {EditorProvider} from "@/lib/editor-context";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import {UserIdentificationModal} from "@/components/UserIdentificationModal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home}/>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <EditorProvider>
        <TooltipProvider>
          <UserIdentificationModal />
          <Toaster />
          <Router />
        </TooltipProvider>
      </EditorProvider>
    </QueryClientProvider>
  );
}

export default App;
