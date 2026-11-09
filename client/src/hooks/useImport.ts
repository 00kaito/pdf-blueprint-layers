import {useDocument} from '@/lib/editor-context';
import {queryClient} from '@/lib/queryClient';
import {useToast} from '@/hooks/use-toast';
import {describeImport, importZip} from '@/components/editor/ZipImport';

/** A project from a file / folder starts unsaved: the next save creates a new project (never overwrites the open one). */
const AS_NEW_PROJECT = { projectId: null, pdfFileId: null, overlayPdfFileId: null };

export const useImport = () => {
  const { dispatch } = useDocument();
  const { toast } = useToast();

  /**
   * Project ZIP: imported by the server as a new project — this app's export (plan, PDFs, photos,
   * icons, shares) or an older in-browser bundle (its inlined photos become stored files). Then the
   * project list opens with the new project in it.
   */
  const handleZipImport = async (zipFile: File) => {
    try {
      // From another server it first asks who is who (ZipImportHost); the overlay waits for the upload.
      const report = await importZip(zipFile, '/api/projects/import', () => dispatch({ type: 'SET_IMPORTING', payload: true }));
      if (!report) return; // cancelled
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/icons'] });
      dispatch({ type: 'RESET_EDITOR' });
      toast({
        variant: report.missingFiles ? 'destructive' : undefined,
        title: `Imported: ${report.imported.join(', ') || 'nothing'}`,
        description: describeImport(report) || 'The project is in the list.',
      });
    } catch (error) {
      console.error("Error importing ZIP:", error);
      toast({ variant: 'destructive', title: 'Import failed', description: error instanceof Error ? error.message : String(error) });
    } finally {
      dispatch({ type: 'SET_IMPORTING', payload: false });
    }
  };

  const handleDirectoryImport = async (files: FileList | File[]) => {
    dispatch({ type: 'SET_IMPORTING', payload: true });
    try {
      const fileArray = Array.from(files);
      const assetCache = new Map<string, string>();
      
      const findFileByPath = (relativePath: string) => {
        const normalizedTarget = relativePath.replace(/\\/g, '/');
        return fileArray.find(f => {
          const path = (f.webkitRelativePath || f.name).replace(/\\/g, '/');
          return path === normalizedTarget || path.endsWith('/' + normalizedTarget);
        });
      };

      const resolveAsset = async (path: string) => {
        if (!path || !path.startsWith('assets/')) return path;
        if (assetCache.has(path)) return assetCache.get(path)!;

        const assetFile = findFileByPath(path);
        if (assetFile) {
            const blobUrl = URL.createObjectURL(assetFile);
            assetCache.set(path, blobUrl);
            return blobUrl;
        }
        return path;
      };

      const jsonFile = findFileByPath('project.json');
      if (!jsonFile) {
        alert("project.json not found in selected directory");
        return;
      }

      const projectData = JSON.parse(await jsonFile.text());
      
      // Find PDF
      const pdfFile = findFileByPath('document.pdf');
      
      // Find Overlay PDF
      const overlayPdfFile = findFileByPath('overlay.pdf');

      // Resolve assets in objects
      const resolvedObjects = await Promise.all((projectData.objects || []).map(async (obj: any) => {
        if (obj.content && (obj.type === 'image' || (obj.type === 'icon' && obj.content.startsWith('assets/')))) {
          return { ...obj, content: await resolveAsset(obj.content) };
        }
        return obj;
      }));

      // Resolve assets in custom icons
      const resolvedCustomIcons = await Promise.all((projectData.customIcons || []).map(async (icon: any) => {
        if (icon.url) {
          return { ...icon, url: await resolveAsset(icon.url) };
        }
        return icon;
      }));

      dispatch({ 
        type: 'IMPORT_PROJECT', 
        payload: { 
          ...projectData, ...AS_NEW_PROJECT,
          pdfFile: pdfFile || projectData.pdfFile || null,
          overlayPdfFile: overlayPdfFile || projectData.overlayPdfFile || null,
          objects: resolvedObjects, 
          customIcons: resolvedCustomIcons 
        } 
      });
    } catch (error) {
      console.error("Error importing directory:", error);
      alert("Failed to import project directory");
    } finally {
      dispatch({ type: 'SET_IMPORTING', payload: false });
    }
  };

  const handleFileImport = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const firstFile = files[0];

    // Check if it's a directory upload (multiple files from a directory)
    if (files.length > 1 && !firstFile.name.endsWith('.pdf') && !firstFile.name.endsWith('.zip') && !firstFile.name.endsWith('.json')) {
      await handleDirectoryImport(files);
      return;
    }

    // Handle single file uploads
    if (firstFile.name.endsWith('.pdf')) {
      dispatch({ type: 'SET_IMPORTING', payload: true });
      try {
        dispatch({ type: 'SET_PDF', payload: firstFile });
      } finally {
        dispatch({ type: 'SET_IMPORTING', payload: false });
      }
    } else if (firstFile.name.endsWith('.json')) {
      dispatch({ type: 'SET_IMPORTING', payload: true });
      try {
        const text = await firstFile.text();
        const projectData = JSON.parse(text);
        dispatch({ type: 'IMPORT_PROJECT', payload: { ...projectData, ...AS_NEW_PROJECT } });
      } catch (e) {
        alert("Invalid project JSON");
      } finally {
        dispatch({ type: 'SET_IMPORTING', payload: false });
      }
    } else if (firstFile.name.endsWith('.zip')) {
      await handleZipImport(firstFile);
    } else if ((files[0] as any).webkitRelativePath && (files[0] as any).webkitRelativePath.includes('/')) {
        // This is likely a directory upload triggered via directory input
        await handleDirectoryImport(files);
    }
  };

  return { handleZipImport, handleDirectoryImport, handleFileImport };
};
