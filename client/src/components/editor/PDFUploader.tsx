import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, FolderOpen, Plus, FileText, Share2, Trash2, Loader2, LogOut, Shield, Settings, User } from 'lucide-react';
import { useImport } from '@/hooks/useImport';
import { useProjectList, useCreateProject, useDeleteProject, useShareProject, useUploadFile } from '@/hooks/useProjects';
import { useDocument, useUI } from '@/lib/editor-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';

export const PDFUploader = () => {
  const { handleFileImport } = useImport();
  const { dispatch } = useDocument();
  const { state: uiState } = useUI();
  const { data: user } = useCurrentUser();
  const isTech = user?.role === 'TECH';
  const { data: projects, isLoading } = useProjectList();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const shareProject = useShareProject();
  const uploadFile = useUploadFile();
  const logout = useLogout();
  const { toast } = useToast();

  const [newProjectName, setNewProjectName] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [overlayFile, setOverlayFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState(false);
  
  const [shareUsername, setShareUsername] = useState("");
  const [sharingProjectId, setSharingProjectId] = useState<string | null>(null);

  const dirInputRef = useRef<HTMLInputElement>(null);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await handleFileImport(e.target.files);
    e.target.value = '';
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      toast({ variant: "destructive", title: "PDF required", description: "Please select a PDF file." });
      return;
    }
    
    setIsCreating(true);
    try {
      const project = await createProject.mutateAsync({ name: newProjectName });
      
      const { fileId: pdfFileId } = await uploadFile.mutateAsync({ file: pdfFile, projectId: project.id });
      
      let overlayPdfFileId = null;
      if (overlayFile) {
        const res = await uploadFile.mutateAsync({ file: overlayFile, projectId: project.id });
        overlayPdfFileId = res.fileId;
      }
      
      const initialState = {
        layers: [],
        objects: [],
        customIcons: [],
        exportSettings: { labelFontSize: 1 },
        autoNumbering: { enabled: false, prefix: 'IDF1-P1-', counter: 1, template: null },
        overlayOpacity: 0.5,
        pdfFileId,
        overlayPdfFileId
      };

      await apiRequest("PUT", `/api/projects/${project.id}`, initialState);

      dispatch({ type: 'SET_PROJECT_ID', payload: project.id });
      dispatch({ type: 'SET_PDF', payload: pdfFile });
      if (overlayFile) dispatch({ type: 'SET_OVERLAY_PDF', payload: overlayFile });
      dispatch({ type: 'SET_PDF_FILE_IDS', payload: { pdfFileId, overlayPdfFileId } });

      toast({ title: "Project created", description: "Your new project is ready." });
      setNewProjectName("");
      setPdfFile(null);
      setOverlayFile(null);
      setNewProjectDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to create project", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenProject = async (projectId: string) => {
    dispatch({ type: 'SET_IMPORTING', payload: true });
    try {
      const res = await apiRequest("GET", `/api/projects/${projectId}`);
      const state = await res.json();
      
      let mainPdfFile = null;
      if (state.pdfFileId) {
        const pdfRes = await fetch(`/api/files/${state.pdfFileId}`);
        const blob = await pdfRes.blob();
        mainPdfFile = new File([blob], "blueprint.pdf", { type: "application/pdf" });
      }
      
      let overlayPdfFile = null;
      if (state.overlayPdfFileId) {
        const overlayRes = await fetch(`/api/files/${state.overlayPdfFileId}`);
        const blob = await overlayRes.blob();
        overlayPdfFile = new File([blob], "overlay.pdf", { type: "application/pdf" });
      }

      if (mainPdfFile) dispatch({ type: 'SET_PDF', payload: mainPdfFile });
      if (overlayPdfFile) dispatch({ type: 'SET_OVERLAY_PDF', payload: overlayPdfFile });
      dispatch({ type: 'SET_PDF_FILE_IDS', payload: { 
        pdfFileId: state.pdfFileId, 
        overlayPdfFileId: state.overlayPdfFileId 
      }});
      dispatch({ type: 'IMPORT_PROJECT', payload: { ...state, projectId } });
      
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to open project", description: e.message });
    } finally {
      dispatch({ type: 'SET_IMPORTING', payload: false });
    }
  };

  const handleShare = async () => {
    if (!sharingProjectId) return;
    try {
      await shareProject.mutateAsync({ id: sharingProjectId, username: shareUsername });
      toast({ title: "Project shared", description: `Shared with ${shareUsername}` });
      setShareUsername("");
      setSharingProjectId(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Sharing failed", description: e.message });
    }
  };

  console.log('[PDFUploader] Rendering. User:', user ? { username: user.username, role: user.role } : 'null');

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col p-4 md:p-8">
      {uiState.isImporting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-xl font-semibold">Loading Project...</p>
          <p className="text-muted-foreground text-sm">Processing large files may take a moment</p>
        </div>
      )}
      <div className="max-w-6xl mx-auto w-full space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">PDF Blueprint Editor</h1>
            <p className="text-muted-foreground">Welcome back, {user?.username}. Manage your blueprint projects.</p>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md bg-white border border-border shadow-sm mr-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex flex-col -space-y-1">
                  <span className="text-sm font-bold">{user.username}</span>
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{user.role}</span>
                </div>
              </div>
            )}
            {user?.role === 'admin' && (
              <Link href="/admin">
                <Button variant="outline" className="border-primary/50 hover:bg-primary/5">
                  <Settings className="h-4 w-4 mr-2 text-primary" />
                  Zarządzaj użytkownikami
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={() => logout.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            {!isTech && (
              <Dialog open={newProjectDialogOpen} onOpenChange={setNewProjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateProject} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Project Name</Label>
                      <Input id="name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pdf">Blueprint PDF</Label>
                      <Input id="pdf" type="file" accept="application/pdf" onChange={e => setPdfFile(e.target.files?.[0] || null)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overlay">Overlay PDF (Optional)</Label>
                      <Input id="overlay" type="file" accept="application/pdf" onChange={e => setOverlayFile(e.target.files?.[0] || null)} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isCreating}>
                        {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Project"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects?.map(project => (
              <Card key={project.id} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{project.name}</CardTitle>
                      <CardDescription>
                        Updated {format(new Date(project.updatedAt), 'MMM d, yyyy HH:mm')}
                      </CardDescription>
                    </div>
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1">
                       {project.ownerId !== user?.id && (
                        <span className="text-[10px] bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full font-medium">Shared with me</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isTech && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => setSharingProjectId(project.id)}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteProject.mutate(project.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button onClick={() => handleOpenProject(project.id)}>
                        Open
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {!isTech && (
              <Card className="border-dashed flex flex-col items-center justify-center py-10 text-muted-foreground hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setNewProjectDialogOpen(true)}>
                <Plus className="h-10 w-10 mb-2" />
                <p className="font-medium">Create another project</p>
              </Card>
            )}
          </div>
        )}

        {!isTech && (
          <div className="pt-8 border-t space-y-4">
            <h2 className="text-xl font-semibold">More Options</h2>
            <div className="flex flex-wrap gap-4">
              <div className="relative group">
                <input
                  type="file"
                  accept=".json,.zip"
                  onChange={onFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import from ZIP / JSON
                </Button>
              </div>
              <Button 
                variant="outline" 
                onClick={() => dirInputRef.current?.click()}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                Import Project Folder
              </Button>
              <input
                type="file"
                ref={dirInputRef}
                multiple
                {...{ webkitdirectory: "", directory: "" } as any}
                onChange={onFileChange}
                className="hidden"
              />
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!sharingProjectId} onOpenChange={(open) => !open && setSharingProjectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="share-username">Username</Label>
              <Input 
                id="share-username" 
                placeholder="Enter username to share with" 
                value={shareUsername}
                onChange={e => setShareUsername(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={handleShare} disabled={!shareUsername || shareProject.isPending}>
              {shareProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Share"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

