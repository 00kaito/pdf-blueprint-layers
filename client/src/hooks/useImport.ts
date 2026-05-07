import {useDocument} from '@/lib/editor-context';
import JSZip from 'jszip';

export const useImport = () => {
  const { dispatch } = useDocument();

  const getMimeType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'svg': return 'image/svg+xml';
      default: return 'application/octet-stream';
    }
  };

  const handleZipImport = async (zipFile: File) => {
    dispatch({ type: 'SET_IMPORTING', payload: true });
    try {
      const zip = await JSZip.loadAsync(zipFile);
      const jsonFile = zip.file('project.json');
      if (!jsonFile) {
        alert("Invalid project ZIP: project.json not found");
        return;
      }

      const projectData = JSON.parse(await jsonFile.async('string'));
      const assetCache = new Map<string, string>();

      const resolveAsset = async (path: string) => {
        if (!path || !path.startsWith('assets/')) return path;
        if (assetCache.has(path)) return assetCache.get(path)!;

        const assetEntry = zip.file(path);
        if (assetEntry) {
            const blob = await assetEntry.async('blob');
            const mime = getMimeType(path);
            const blobUrl = URL.createObjectURL(new Blob([blob], { type: mime }));
            assetCache.set(path, blobUrl);
            return blobUrl;
        }
        return path;
      };
      
      // Load PDF if exists
      let pdfFile: File | null = null;
      const pdfEntry = zip.file('document.pdf');
      if (pdfEntry) {
        const pdfBlob = await pdfEntry.async('blob');
        pdfFile = new File([pdfBlob], 'document.pdf', { type: 'application/pdf' });
      }

      // Load Overlay PDF if exists
      let overlayPdfFile: File | null = null;
      const overlayPdfEntry = zip.file('overlay.pdf');
      if (overlayPdfEntry) {
        const overlayPdfBlob = await overlayPdfEntry.async('blob');
        overlayPdfFile = new File([overlayPdfBlob], 'overlay.pdf', { type: 'application/pdf' });
      }

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
          ...projectData, 
          pdfFile: pdfFile || projectData.pdfFile,
          overlayPdfFile: overlayPdfFile || projectData.overlayPdfFile,
          objects: resolvedObjects, 
          customIcons: resolvedCustomIcons 
        } 
      });
    } catch (error) {
      console.error("Error importing ZIP:", error);
      alert("Failed to import project ZIP");
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
          ...projectData, 
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
        dispatch({ type: 'IMPORT_PROJECT', payload: projectData });
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
