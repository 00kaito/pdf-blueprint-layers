import React from 'react';
import {useDocument} from '@/lib/editor-context';
import {useProjectList} from '@/hooks/useProjects';
import {cn} from '@/lib/utils';

/** Which project is open: small, truncated; the full name on hover. Unsaved: the PDF's file name. */
export const ProjectName = ({ className }: { className?: string }) => {
  const { state: docState } = useDocument();
  const { data: projects } = useProjectList();
  const name = projects?.find(p => p.id === docState.projectId)?.name
    || docState.pdfFile?.name?.replace(/\.pdf$/i, '');
  if (!name) return null;
  return (
    <span className={cn("truncate text-xs text-muted-foreground", className)} title={name} data-testid="project-name">
      {name}
    </span>
  );
};
