import {useEffect, useRef} from "react";
import {useDocument} from "@/lib/editor-context";
import {useCurrentUser} from "@/hooks/useAuth";
import {dataUrlToFile, useIconLibrary} from "@/hooks/useIconLibrary";

/**
 * Older projects (and imported ZIPs) keep their "My Icons" inline in the project. Once such a project
 * is open, move those icons into the shared library (the server skips images it already has) and
 * drop them from the project — so an icon deleted from the library does not come back from a project.
 * Only users who may add icons (PM / admin); for others the project keeps them untouched.
 */
export const useLegacyIconMigration = () => {
  const { state: docState, dispatch } = useDocument();
  const { data: user } = useCurrentUser();
  const { upload } = useIconLibrary();
  const runningRef = useRef<unknown>(null);
  const canUpload = user?.role === 'PM' || user?.role === 'admin';

  useEffect(() => {
    const legacy = docState.customIcons;
    if (!canUpload || legacy.length === 0 || runningRef.current === legacy) return;
    runningRef.current = legacy;
    (async () => {
      try {
        const files = await Promise.all(legacy.map(icon => dataUrlToFile(icon.url, icon.name)));
        await upload.mutateAsync(files);
        dispatch({ type: 'CLEAR_CUSTOM_ICONS' });
        console.log(`[Icons] Moved ${legacy.length} project icon(s) into the shared library`);
      } catch (e) {
        // Kept in the project; tried again next time it is opened.
        console.error("[Icons] Moving project icons into the library failed", e);
      }
    })();
  }, [docState.customIcons, canUpload]); // eslint-disable-line react-hooks/exhaustive-deps
};
