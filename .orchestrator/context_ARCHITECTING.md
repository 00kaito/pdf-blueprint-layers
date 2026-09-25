<!-- CONTEXT SUMMARY
Phase: ARCHITECTING
Budget: 60000 chars | Used: 59831 chars
Cache: 0 hits, 183 misses
Included files (29): client\src\components\editor\Canvas\OverlayDocument.tsx, tsconfig.json, package.json, package-lock.json, docker-compose.yml, components.json, data\users.json, data\projects.json, .serena\project.yml, .gemini\settings.json, vite.config.ts, vite-plugin-meta-images.ts, refactor_suggestion.md, postcss.config.js, object_file_export_dev.md, jira4.md, jira3.md, jira2.md, jira1.md, implementation_report.md, drizzle.config.ts, database_implementation.md, architecture.md, README.md, EXPORT_OBJECTS_README.md, DOCUMENTATION.md, DEV_README.md, APPLICATION_TECHNICAL_INFO.md, migrations\meta\_journal.json
Omitted files: 266 files omitted (budget_exceeded, non_priority_extension)
Tree truncated: False
-->
## Context Summary
- **Phase**: ARCHITECTING
- **Budget / Used**: 59,831 / 60,000 chars (99.7%)
- **Cache Stats**: 0 hits, 183 misses
- **Included Files** (29): client\src\components\editor\Canvas\OverlayDocument.tsx, tsconfig.json, package.json, package-lock.json, docker-compose.yml, components.json, data\users.json, data\projects.json, .serena\project.yml, .gemini\settings.json, vite.config.ts, vite-plugin-meta-images.ts, refactor_suggestion.md, postcss.config.js, object_file_export_dev.md, jira4.md, jira3.md, jira2.md, jira1.md, implementation_report.md, drizzle.config.ts, database_implementation.md, architecture.md, README.md, EXPORT_OBJECTS_README.md, DOCUMENTATION.md, DEV_README.md, APPLICATION_TECHNICAL_INFO.md, migrations\meta\_journal.json
- **Omitted/Truncated**: 266 files omitted (budget_exceeded, non_priority_extension)

## File tree
```
.dockerignore
.gemini\settings.json
.gitignore
.idea\.gitignore
.idea\misc.xml
.idea\modules.xml
.idea\pdf-blueprint-layers.iml
.idea\vcs.xml
.idea\workspace.xml
.replit
.serena\.gitignore
.serena\memories\completion_workflow.md
.serena\memories\project_info.md
.serena\memories\style_conventions.md
.serena\memories\suggested_commands.md
.serena\memories\ui\mobile_updates_2026.md
.serena\memories\ui\toolbar_refactor.md
.serena\project.yml
APPLICATION_TECHNICAL_INFO.md
ARCHITECTURAL_EVOLUTION.md
architecture.md
client\index.html
client\public\favicon.png
client\public\opengraph.jpg
client\src\App.tsx
client\src\components\editor\Canvas\DrawingLayer.tsx
client\src\components\editor\Canvas\ObjectRenderer.tsx
client\src\components\editor\Canvas\OverlayDocument.tsx
client\src\components\editor\Canvas.tsx
client\src\components\editor\LayerPanel.tsx
client\src\components\editor\MobileAddObjectPanel.tsx
client\src\components\editor\MobileBottomBar.tsx
client\src\components\editor\ObjectComments.tsx
client\src\components\editor\ObjectPhotoGallery.tsx
client\src\components\editor\PDFUploader.tsx
client\src\components\editor\PMObjectDetailsPanel.tsx
client\src\components\editor\PropertiesPanel.tsx
client\src\components\editor\RenameProjectDialog.tsx
client\src\components\editor\ShareProjectDialog.tsx
client\src\components\editor\Toolbar\ObjectPropertyEditor.tsx
client\src\components\editor\Toolbar\ProjectActions.tsx
client\src\components\editor\Toolbar\ToolSelector.tsx
client\src\components\editor\Toolbar\ZoomControls.tsx
client\src\components\editor\Toolbar.tsx
client\src\components\ui\accordion.tsx
client\src\components\ui\alert-dialog.tsx
client\src\components\ui\alert.tsx
client\src\components\ui\aspect-ratio.tsx
client\src\components\ui\avatar.tsx
client\src\components\ui\badge.tsx
client\src\components\ui\breadcrumb.tsx
client\src\components\ui\button-group.tsx
client\src\components\ui\button.tsx
client\src\components\ui\calendar.tsx
client\src\components\ui\card.tsx
client\src\components\ui\carousel.tsx
client\src\components\ui\chart.tsx
client\src\components\ui\checkbox.tsx
client\src\components\ui\collapsible.tsx
client\src\components\ui\command.tsx
client\src\components\ui\context-menu.tsx
client\src\components\ui\dialog.tsx
client\src\components\ui\drawer.tsx
client\src\components\ui\dropdown-menu.tsx
client\src\components\ui\empty.tsx
client\src\components\ui\field.tsx
client\src\components\ui\form.tsx
client\src\components\ui\hover-card.tsx
client\src\components\ui\input-group.tsx
client\src\components\ui\input-otp.tsx
client\src\components\ui\input.tsx
client\src\components\ui\item.tsx
client\src\components\ui\kbd.tsx
client\src\components\ui\label.tsx
client\src\components\ui\menubar.tsx
client\src\components\ui\navigation-menu.tsx
client\src\components\ui\pagination.tsx
client\src\components\ui\popover.tsx
client\src\components\ui\progress.tsx
client\src\components\ui\radio-group.tsx
client\src\components\ui\resizable.tsx
client\src\components\ui\scroll-area.tsx
client\src\components\ui\select.tsx
client\src\components\ui\separator.tsx
client\src\components\ui\sheet.tsx
client\src\components\ui\sidebar.tsx
client\src\components\ui\skeleton.tsx
client\src\components\ui\slider.tsx
client\src\components\ui\sonner.tsx
client\src\components\ui\spinner.tsx
client\src\components\ui\switch.tsx
client\src\components\ui\table.tsx
client\src\components\ui\tabs.tsx
client\src\components\ui\textarea.tsx
client\src\components\ui\toast.tsx
client\src\components\ui\toaster.tsx
client\src\components\ui\toggle-group.tsx
client\src\components\ui\toggle.tsx
client\src\components\ui\tooltip.tsx
client\src\components\UserIdentificationModal.tsx
client\src\core\constants.ts
client\src\core\icon-shapes.ts
client\src\core\image-compress.ts
client\src\core\pdf-math.ts
client\src\core\svg-utils.ts
client\src\hooks\use-mobile.tsx
client\src\hooks\use-toast.ts
client\src\hooks\useAuth.ts
client\src\hooks\useAutoSave.ts
client\src\hooks\useDrawing.ts
client\src\hooks\useExport.ts
client\src\hooks\useImport.ts
client\src\hooks\useManualSave.ts
client\src\hooks\useObjectCreation.ts
client\src\hooks\useProjects.ts
client\src\hooks\useTouchGestures.ts
client\src\index.css
client\src\lib\editor-context.tsx
client\src\lib\queryClient.ts
client\src\lib\types.ts
client\src\lib\utils.ts
client\src\main.tsx
client\src\pages\AdminPage.tsx
client\src\pages\AuthPage.tsx
client\src\pages\home.tsx
client\src\pages\not-found.tsx
components.json
data\files\0f313673-d048-42a7-99dd-c632d76d5480
data\files\0f313673-d048-42a7-99dd-c632d76d5480.meta.json
data\files\198f6cfa-aff8-4591-91a0-d156bd6d8cf9
data\files\198f6cfa-aff8-4591-91a0-d156bd6d8cf9.meta.json
data\files\1cce4f4d-b2e6-46c8-80ed-f37fe10cb2a0
data\files\1cce4f4d-b2e6-46c8-80ed-f37fe10cb2a0.meta.json
data\files\2feca732-72e1-419a-85b0-9e146470e2be
data\files\2feca732-72e1-419a-85b0-9e146470e2be.meta.json
data\files\304c2603-ab79-46ce-9f58-acfb81fcad26
data\files\304c2603-ab79-46ce-9f58-acfb81fcad26.meta.json
data\files\32759f2e-573b-45a4-a194-a99e4432269f
data\files\32759f2e-573b-45a4-a194-a99e4432269f.meta.json
data\files\44553354-42d4-4f39-b722-f85dad0eaa27
data\files\44553354-42d4-4f39-b722-f85dad0eaa27.meta.json
data\files\45ba8ac5-26d2-4cf0-9093-565fe0199fbf
data\files\45ba8ac5-26d2-4cf0-9093-565fe0199fbf.meta.json
data\files\5a610ef3-0be8-4504-9dfe-52834ea53319
data\files\5a610ef3-0be8-4504-9dfe-52834ea53319.meta.json
data\files\60401778-b500-4d7b-b92b-f121c499847e
data\files\60401778-b500-4d7b-b92b-f121c499847e.meta.json
data\files\62e4554a-3ada-48be-88ea-2b90e2e71a97
data\files\62e4554a-3ada-48be-88ea-2b90e2e71a97.meta.json
data\files\68430ddf-4c5d-430d-85d1-259fcbb37ed3
data\files\68430ddf-4c5d-430d-85d1-259fcbb37ed3.meta.json
data\files\7c640942-64f9-4f10-91ca-f89eefbf7a66
data\files\7c640942-64f9-4f10-91ca-f89eefbf7a66.meta.json
data\files\7f259e16-b13c-4680-af47-f5f20826ca26
data\files\7f259e16-b13c-4680-af47-f5f20826ca26.meta.json
data\files\8019acb7-e303-4284-a21c-55a72ebe17f4
data\files\8019acb7-e303-4284-a21c-55a72ebe17f4.meta.json
data\files\8ae0714c-e803-4fc0-b1e0-47191084f5b3
data\files\8ae0714c-e803-4fc0-b1e0-47191084f5b3.meta.json
data\files\8cccdc5d-0a62-435c-9c4d-a2cf09b03547
data\files\8cccdc5d-0a62-435c-9c4d-a2cf09b03547.meta.json
data\files\8d5253df-b327-4cd3-8e0f-43c5f41d42cf
data\files\8d5253df-b327-4cd3-8e0f-43c5f41d42cf.meta.json
data\files\94bc1be6-d76b-4a90-a223-d2baa0a88351
data\files\94bc1be6-d76b-4a90-a223-d2baa0a88351.meta.json
data\files\993f5478-5c24-49b4-8000-83e39369d766
data\files\993f5478-5c24-49b4-8000-83e39369d766.meta.json
data\files\99d6d4a0-9742-4a27-a5fd-0b412c0da152
data\files\99d6d4a0-9742-4a27-a5fd-0b412c0da152.meta.json
data\files\a56c852b-561c-476d-bf27-ac0b979810ad
data\files\a56c852b-561c-476d-bf27-ac0b979810ad.meta.json
data\files\a5af53ac-c71f-4f56-8864-a3285d968136
data\files\a5af53ac-c71f-4f56-8864-a3285d968136.meta.json
data\files\aabe1f7e-6226-45d1-a097-97dcdab6eaac
data\files\aabe1f7e-6226-45d1-a097-97dcdab6eaac.meta.json
data\files\bef7ae89-a95f-499e-9c4c-6a778d33b479
data\files\bef7ae89-a95f-499e-9c4c-6a778d33b479.meta.json
data\files\daa11165-94eb-4e5f-8c04-b0c5fef27dec
data\files\daa11165-94eb-4e5f-8c04-b0c5fef27dec.meta.json
data\files\dcfd722d-fffe-4747-9e16-3a8caee371a3
data\files\dcfd722d-fffe-4747-9e16-3a8caee371a3.meta.json
data\files\e2873cc8-fb23-44f9-ab23-f3e13814fede
data\files\e2873cc8-fb23-44f9-ab23-f3e13814fede.meta.json
data\files\f21d8383-f267-468a-9a1a-8836b2662e55
data\files\f21d8383-f267-468a-9a1a-8836b2662e55.meta.json
data\project-states\89da2e02-fd47-45fb-9341-41f06c5ff34c.json
data\projects.json
data\users.json
database_implementation.md
DEV_README.md
DEVELOPER.md
docker-compose.yml
Dockerfile
DOCUMENTATION.md
drizzle.config.ts
EXPORT_OBJECTS_README.md
implementation_report.md
jira1.md
jira2.md
jira3.md
jira4.md
migrations\meta\_journal.json
object_file_export_dev.md
package-lock.json
package.json
postcss.config.js
README.md
REF_2
refactor_suggestion.md
script\build.ts
script\migrate_to_db.ts
server\auth.ts
server\config.ts
server\databaseStorage.ts
server\db.ts
server\fileStorage.ts
server\index.ts
server\routes.ts
server\static.ts
server\storage.ts
server\storage_interface.ts
server\vite.ts
shared\schema.ts
storage\projects\18a7168a-1d3f-47d1-949a-d8bde85167b5\d0e0f0e1-f7dd-4a7c-b785-6917df0b54b3
storage\projects\18a7168a-1d3f-47d1-949a-d8bde85167b5\fb739d0f-b5cf-485a-9b03-fb116ba292ea
storage\projects\3d7c00d7-6c1a-4fc9-b8df-229caea18d58\b29ca031-a35c-4e5f-a399-735248971997
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\18cad2c0-9ac7-45a3-a4ba-753e585cca7f
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\36285549-bab0-4a8b-ade8-96f793f1a86a
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\3db34e32-f211-40dc-ba3b-a14d73bb79dc
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\46cfef5e-086f-4ccd-bf3e-925f6a044112
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\4dd2d0f8-252a-458b-a547-b956c608e7b8
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\63167ac3-7228-4909-948f-7e3943149f8c
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\63bd82bb-23cf-47b4-bee0-23cf58e2a662
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\649915af-a269-4009-ae7e-4280b7210645
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\96f7c61e-c909-4367-a717-5974aa81924a
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\aaa4ae31-d60f-46e9-9940-7584a18312a3
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\b43ca6d7-34ba-47b9-ac53-04345adfd423
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\b58c5c87-d203-4257-ae6e-d9ec20ee80a5
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\b7f6f78d-c3a1-4dbe-95b0-0e92d7b76644
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\befcb161-7dd4-4bf0-990f-bbf92ac4a0f5
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\bfe97f70-e60e-4e2e-99c5-1f426dadd502
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\d6e08953-62e7-4b73-a677-ddd5dbe72751
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\eb7be96b-19e3-46ef-921c-edb0eb482b29
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\eece1b64-fa26-49be-82db-af008b1739f3
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\f79b7212-fc61-4477-98ef-abca4fca134c
storage\projects\40c9cd13-64c2-43b0-8bef-783021e8043f\f975078b-d3fa-4370-beff-d8085eecb6e8
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\00984a8e-ebc6-4c3d-b9bd-39b4ab2a65ce
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\05cc723a-07c1-44b0-aeae-672122f90b8c
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\071a14ee-ca49-436d-bf51-3a6e24d6ea79
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\0e98d60c-1b3d-4719-bd64-f9106e504a9b
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\1eef3559-9164-4887-a491-38bb8aaf06b1
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\22395b1f-c888-4d72-a550-8d6614778f6d
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\27d89511-07c6-42e8-b305-4cd50e88b497
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\2e327e20-4832-49df-9b50-b35386bb7571
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\406b0fa6-83a5-45d9-a51e-a18d3776b7ad
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\47c9f817-46b8-4313-a446-62923619d886
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\4a021d22-ec00-46c7-879c-9e07a202cc50
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\4da403f5-26ae-4467-9f84-3bd9f4d680f0
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\557f4367-b332-4473-8b72-ec58c224c3bc
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\5965b667-e46c-4fda-9f39-e70a599672e5
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\59ace448-37d7-40cb-b124-2e0df3a267ab
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\5d74d69e-0a58-4bee-94a9-68d6b2f1637b
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\5d870979-aa42-4c1c-abce-1090fea452a1
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\61ebe49d-0a2b-45b5-8f75-2c17d9c9dcba
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\6f8f19ae-6923-4e85-9652-643465eb3d46
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\830d1c93-d065-43cf-9911-51131129474b
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\863596cc-3ebf-4c99-84a3-a853c0d7286b
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\8795897e-d499-427c-a57d-b33762f1360f
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\8a2efd31-7e05-4990-8dad-dc876b43ffa5
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\8ecfb9d7-5358-4063-a5fb-cffe0505e82f
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\a454673f-fb7f-4659-88f7-8e433c2c71ab
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\a71e289b-7340-408d-9ed9-7cc38dead814
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\a8345aee-d46f-43da-b720-174e4794aa36
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\a847b174-5e89-4e37-ba52-c9c597ca2c8e
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\aae43b02-2a30-4a0a-b350-760cda71f589
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\ac00ea64-f6c1-4e4f-81bf-067b2b157984
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\b0827ad6-1254-4c3a-a71d-75a3c46e79bd
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\b0ff50ae-df8c-4d2e-8d72-8c81ee877349
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\b2e37183-75d2-4116-ae64-0bda1c75446c
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\c2f66742-7930-4b1d-a8a0-47d2ad34b133
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\c691279a-72d4-45ec-aea5-1d7ebd7e1185
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\c6c5c5a6-4171-4d78-8d32-fee31da2a418
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\cae84d08-423c-4ea2-a3b9-ce479caa5bba
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\d82e302e-e480-497b-abb7-afb3deb875d4
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\e23eaadd-b019-4ab1-864c-87cf95e9be80
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\f5f3ddd0-d142-4a05-88c7-901b61c9f49e
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\f9b7c438-a882-4f1a-95c2-06109b645334
storage\projects\47789564-1f27-49d8-8e78-0960a9e17620\fe2b7d25-d689-46c4-a168-24cfaeb2ebd2
storage\projects\d21d248e-da31-4e45-9437-0415437d2836\8a9f19cc-1985-4037-b14c-7a274a644034
storage\projects\e67567bd-50ea-4160-b45c-0621c31a9cbd\53563246-6f36-4865-95d1-d0398348746a
storage\projects\e67567bd-50ea-4160-b45c-0621c31a9cbd\f8fdd19b-6f58-4cf3-aa1d-bd78282d93e5
storage\projects\f1ab630a-45dd-4653-9dcb-6228ae7be1ad\366b8823-d12b-493f-80ad-9ddc4c600146
tsconfig.json
vite-plugin-meta-images.ts
vite.config.ts
```

### client\src\components\editor\Canvas\OverlayDocument.tsx
```tsx
import React from 'react';
import {Document, Page} from 'react-pdf';
import {useDocument, useUI} from '@/lib/editor-context';
import {CANVAS_BASE_WIDTH} from '@/core/constants';

export const OverlayDocument = () => {
  const { state: docState } = useDocument();
  const { state: uiState } = useUI();

  if (!docState.overlayPdfFile) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity: docState.overlayOpacity, zIndex: 5 }}>
      <Document file={docState.overlayPdfFile} className="bg-transparent">
        <Page 
          pageNumber={uiState.currentPage} 
          renderTextLayer={false} 
          renderAnnotationLayer={false} 
          width={CANVAS_BASE_WIDTH} 
          scale={uiState.scale} 
          className="bg-transparent" 
        />
      </Document>
    </div>
  );
};

```

### tsconfig.json
```json
{
  "include": ["client/src/**/*", "shared/**/*", "server/**/*"],
  "exclude": ["node_modules", "build", "dist", "**/*.test.ts"],
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./node_modules/typescript/tsbuildinfo",
    "noEmit": true,
    "module": "ESNext",
    "strict": true,
    "lib": ["esnext", "dom", "dom.iterable"],
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "types": ["node", "vite/client"],
    "paths": {
      "@/*": ["./client/src/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}

```

### package.json
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev:client": "vite dev --port 5000",
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "tsx script/build.ts",
    "start": "NODE_ENV=production node dist/index.cjs",
    "check": "tsc",
    "db:push": "drizzle-kit push",
    "db:migrate": "tsx script/migrate_to_db.ts"
  },
  "dependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@radix-ui/react-accordion": "^1.2.12",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-aspect-ratio": "^1.1.8",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-collapsible": "^1.1.12",
    "@radix-ui/react-context-menu": "^2.2.16",
    "@radix-ui/react-dialog": "^1.1.15",

... [middle code omitted] ...

    "@vitejs/plugin-react": "^5.0.4",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.20.5",
    "typescript": "5.6.3",
    "vite": "^7.1.9"
  }
}
```

### package-lock.json
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "rest-express",
      "version": "1.0.0",
      "license": "MIT",
      "dependencies": {
        "@hookform/resolvers": "^3.10.0",
        "@jridgewell/trace-mapping": "^0.3.25",
        "@radix-ui/react-accordion": "^1.2.12",
        "@radix-ui/react-alert-dialog": "^1.1.15",
        "@radix-ui/react-aspect-ratio": "^1.1.8",
        "@radix-ui/react-avatar": "^1.1.11",
        "@radix-ui/react-checkbox": "^1.3.3",
        "@radix-ui/react-collapsible": "^1.1.12",
        "@radix-ui/react-context-menu": "^2.2.16",
        "@radix-ui/react-dialog": "^1.1.15",
        "@radix-ui/react-dropdown-menu": "^2.1.16",
        "@radix-ui/react-hover-card": "^1.1.15",
        "@radix-ui/react-label": "^2.1.8",
        "@radix-ui/react-menubar": "^1.1.16",

... [middle code omitted] ...

      "license": "MIT",
      "engines": {
        "node": ">=18.0.0"
      },
      "peerDependencies": {
        "zod": "^3.18.0"
      }
    }
  }
}
```

### docker-compose.yml
```yml
services:
  db:
    image: postgres:16-alpine
    container_name: pdf-blueprint-db
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-password}
      POSTGRES_DB: ${POSTGRES_DB:-pdf_blueprint}
    ports:
      - "${DB_HOST_PORT:-5435}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-user} -d $${POSTGRES_DB:-pdf_blueprint}"]
      interval: 5s
      timeout: 5s
      retries: 5
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pdf-blueprint-app
    restart: always
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-user}:${POSTGRES_PASSWORD:-password}@db:5432/${POSTGRES_DB:-pdf_blueprint}
      SESSION_SECRET: ${SESSION_SECRET:-some-very-secret-key}
      NODE_ENV: production
      DB_SSL: "false"
      PORT: 5000
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./storage:/app/storage
      - ./data:/app/data

volumes:
  postgres_data:

```

### components.json
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "client/src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}

```

### data\users.json
```json
[
  {
    "username": "przemek",
    "passwordHash": "$2b$10$Bmj0ukozNm8ClZHfp8dbX.icBC7qWTF0wrx2LgpZDlniQVTrWnPIa",
    "id": "d2612d47-1573-47bf-9827-0fce54a8e540",
    "createdAt": "2026-05-02T18:07:39.764Z"
  },
  {
    "username": "tech",
    "passwordHash": "$2b$10$T/4QxAVogRPs7dVG0mJcqOVTTEBAanVtvsevjTOeSmD5zNfzZK2LO",
    "id": "9a43e12c-37a2-467d-9e26-ae24df5ccbbe",
    "createdAt": "2026-05-02T18:28:36.092Z"
  },
  {
    "username": "note",
    "passwordHash": "$2b$10$I0jK0h4xp5eRv0jd7abJEu5RvZa3VBEJvSprhiSjNuV68NsML933K",
    "id": "dec963d5-09dc-4a71-b8fe-45dc90ac07d1",
    "createdAt": "2026-05-02T20:35:09.723Z"
  },
  {
    "username": "admin",
    "passwordHash": "$2b$10$.Hhj050jMcLXQ24.tG36veVoOzmb2Tiye7sr2G4yYJ1D4Ls9dLjXq",
    "role": "admin",
    "id": "59e8163e-8871-459d-97da-6487f68e9f3a",
    "createdAt": "2026-05-06T15:27:22.091Z"
  }
]
```

### data\projects.json
```json
[
  {
    "id": "89da2e02-fd47-45fb-9341-41f06c5ff34c",
    "name": "3rd floor",
    "ownerId": "d2612d47-1573-47bf-9827-0fce54a8e540",
    "sharedWith": [
      "9a43e12c-37a2-467d-9e26-ae24df5ccbbe",
      "dec963d5-09dc-4a71-b8fe-45dc90ac07d1"
    ],
    "createdAt": "2026-05-02T18:27:23.810Z",
    "updatedAt": "2026-05-02T22:01:15.915Z"
  }
]
```

### .serena\project.yml
```yml
# the name by which the project can be referenced within Serena/when chatting with the LLM.
project_name: "pdf-blueprint-layers"

# the encoding used by text files in the project
# For a list of possible encodings, see https://docs.python.org/3.11/library/codecs.html#standard-encodings
encoding: "utf-8"

# line ending convention to use when writing source files.
# Possible values: unset (use global setting), "lf", "crlf", or "native" (platform default)
# This does not affect Serena's own files (e.g. memories and configuration files), which always use native line endings.
line_ending:

# The language backend to use for this project.
# If not set, the global setting from serena_config.yml is used.
# Valid values: LSP, JetBrains
# Note: the backend is fixed at startup. If a project with a different backend
# is activated post-init, an error will be returned.
language_backend:

# whether to use project's .gitignore files to ignore files
ignore_all_files_in_gitignore: true

# advanced configuration option allowing to configure language server-specific options.
# Maps the language key to the options.
# The settings are considered only if the project is trusted (see global configuration to define trusted projects).

... [middle code omitted] ...

# (see trusted_project_path_patterns in the global configuration).
# serena waits for the command to exit: a non-zero exit code is logged as an error but does not
# abort activation. a per-project timeout (activation_command_timeout, default 180s) is the safety
# backstop for non-terminating commands; on expiry the process is killed and activation continues.
# example: activation_command: "npx nx run-many -t build"
activation_command:

# maximum time in seconds to wait for activation_command to complete before killing it (default 180s).
# must be a positive number.
activation_command_timeout: 180.0
```

### .gemini\settings.json
```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "--from",
        "git+https://github.com/oraios/serena",
        "serena",
        "start-mcp-server",
        "--context",
        "ide-assistant",
        "--project",
        "~/IdeaProjects/pdf-blueprint-layers"
      ]
    }
  }
}
```

### vite.config.ts
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});

```

### vite-plugin-meta-images.ts
```ts
import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Vite plugin that updates og:image and twitter:image meta tags
 * to point to the app's opengraph image with the correct Replit domain.
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: 'vite-plugin-meta-images',
    transformIndexHtml(html) {
      const baseUrl = getDeploymentUrl();
      if (!baseUrl) {
        log('[meta-images] no Replit deployment domain found, skipping meta tag updates');
        return html;
      }

      // Check if opengraph image exists in public directory
      const publicDir = path.resolve(process.cwd(), 'client', 'public');
      const opengraphPngPath = path.join(publicDir, 'opengraph.png');
      const opengraphJpgPath = path.join(publicDir, 'opengraph.jpg');
      const opengraphJpegPath = path.join(publicDir, 'opengraph.jpeg');

      let imageExt: string | null = null;

... [middle code omitted] ...

function getDeploymentUrl(): string | null {
function log(...args: any[]): void {
  }

  return null;
}

function log(...args: any[]): void {
  if (process.env.NODE_ENV === 'production') {
    console.log(...args);
  }
}
```

### refactor_suggestion.md
```md
# Refactoring Plan — PDF Blueprint Layers Editor

Based on full analysis of: `Toolbar.tsx` (1067 lines), `Canvas.tsx` (550 lines),
`editor-context.tsx` (209 lines), `types.ts` (88 lines).

---

## Priority 1 — Correctness Bugs (fix before any refactor)

### 1.1 Missing `opacity` on `Layer` type
**File:** `types.ts:1-7`

`Toolbar.tsx:428` and `Toolbar.tsx:468` both compute:
```ts
(obj.opacity ?? 1) * (layer.opacity ?? 1)
```
But `Layer` has no `opacity` field, so `layer.opacity` is always `undefined` → always `1`.
Either add the field or remove the dead multiplier.
```ts
// Option A: add to Layer type
export type Layer = {
  id: string; name: string; visible: boolean; locked: boolean; order: number;
  opacity: number; // 0–1, default 1
};
```

... [middle code omitted] ...

export const scalePath = (pathData: string, scale: number): string =>
function hard to read. Extract to `handleDrop` alongside the other mouse handlers.
export const hexToRgb = (hex: string): RGB => { ... };      // from Toolbar.tsx:50
export const getPhysicalCoords = (                          // from Toolbar.tsx:337
export const getVisualDimensions = (pW: number, pH: number, rotation: number) =>
export const CANVAS_BASE_WIDTH = 600; // currently hardcoded in 6+ places
export const scalePath = (pathData: string, scale: number): string => { ... };
export const svgToPng = (svgDataUrl: string, w: number, h: number): Promise<string> => { ... };
export const buildIconPath = (
export const useObjectCreation = () => {
export const useDrawing = (containerRef: RefObject<HTMLDivElement>) => {
```

### postcss.config.js
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

```

### object_file_export_dev.md
```md
# Dokumentacja: Lokalizacja Obiektów i Eksport Dokumentów PDF

Niniejsza instrukcja wyjaśnia zasady pozycjonowania obiektów (warstw, adnotacji, kształtów) wewnątrz dokumentu PDF oraz sposób, w jaki system zarządza ich renderowaniem i eksportem.

## 1. Układ Współrzędnych PDF (Coordinate System)

Kluczową różnicą między środowiskiem Web (HTML/Canvas) a formatem PDF jest punkt początkowy układu współrzędnych.

*   **Web/Canvas:** Punkt `(0,0)` znajduje się w **lewym górnym rogu**. Wartości Y rosną w dół.
*   **PDF (Standard ISO 32000):** Punkt `(0,0)` znajduje się domyślnie w **lewym dolnym rogu** (tzw. *MediaBox*). Wartości Y rosną w górę.

### Jednostki: Typograficzny Punkt (Point)
PDF operuje na jednostkach "points" (pt).
*   `1 point = 1/72 cala`.
*   Standardowa strona A4 ma wymiary `595 x 842 pt`.

### Transformacja podczas edycji
Deweloper musi implementować mapowanie współrzędnych:
`pdf_y = page_height - web_y - object_height`

## 2. Relatywność Pozycji i Skalowanie (Zoom)

### Dlaczego obiekty "zostają w miejscu" przy Zoomie?
Obiekty w naszym edytorze nie są pozycjonowane względem pikseli ekranu, lecz względem **przestrzeni współrzędnych strony PDF**.


... [middle code omitted] ...

Obiekty takie jak ikony (koła, gwiazdy) oraz obrazy powinny zachowywać swoje proporcje, nawet jeśli ramka edycji (bounding box) zostanie rozciągnięta.

**Zasada "Object-Contain":**
Podczas eksportu należy obliczyć `minSide = Math.min(width, height)` i użyć tej wartości do rysowania kształtów geometrycznych, centrując je wewnątrz większej ramki. Dla obrazów należy obliczyć współczynnik skali na podstawie ich oryginalnych wymiarów.

## 4. Wskazówki Implementacyjne

*   **Zachowanie proporcji:** Zawsze przechowuj pozycje obiektów jako wartości względne lub w punktach PDF, nigdy w pikselach ekranowych, które zależą od rozdzielczości monitora.
*   **Grupowanie:** Przy przesuwaniu wielu obiektów, ich pozycje `x, y` zmieniają się o ten sam `delta_x` i `delta_y` w przestrzeni punktów PDF, co gwarantuje spójność grupy po eksporcie.
*   **Rotacja strony:** Pamiętaj, że PDF może mieć ustawiony atrybut `/Rotate`. Wtedy system współrzędnych może być obrócony o 90, 180 lub 270 stopni – logika eksportu musi to uwzględniać, aby obiekty nie "wyleciały" poza stronę.
```

### jira4.md
```md
# Task 4: Optimization and Performance Tuning

## Description
Apply performance optimizations to the new database-driven system, including upload streaming and auto-save throttling.

## Implementation Details

### 1. Multer DiskStorage Migration (`server/routes.ts`)
Switch from `memoryStorage` to `diskStorage` for file uploads:
- Configure `multer` to stream files directly to a temporary directory or the final storage path.
- This prevents large PDF files from being loaded entirely into RAM.

### 2. Auto-Save Throttling (`client/src/hooks/useAutoSave.ts`)
Adjust the auto-save behavior for the database environment:
- Increase debounce time from 1000ms to 2000-3000ms.
- Ensure the "dirty flag" logic correctly prevents unnecessary writes if the state hasn't changed.

### 3. Cleanup and Final Validation
- Remove any unused dependencies related to the old file-based storage (e.g., `memorystore` if no longer needed).
- Conduct a final load test with multiple simultaneous sessions to ensure PostgreSQL handles concurrent auto-saves gracefully.
- Verify that project sharing works correctly across accounts using the `project_shares` table.

## Acceptance Criteria
- [ ] File uploads use `diskStorage` and do not cause RAM spikes.
- [ ] Auto-save debounce is increased to 2-3 seconds.
- [ ] Multiple users can edit projects concurrently without data loss or performance degradation.
- [ ] Final project structure is clean and adheres to the new architecture.

```

### jira3.md
```md
orch # Task 3: Data Migration Script and File Restructuring

## Description
Develop and execute a one-time migration script to move existing users, projects, and files from JSON/Local storage into PostgreSQL and the new directory structure.

## Implementation Details

### 1. Migration Script (`script/migrate_to_db.ts`)
Create a script that performs the following:
- **Read JSON Files**: Load `data/users.json` and `data/projects.json`.
- **Migrate Users**: Insert users into the `users` table.
- **Migrate Projects**: 
  - For each project, read its state from `data/project-states/{id}.json`.
  - Insert into the `projects` table (merging project metadata and state).
  - Decompose the `sharedWith` array and insert into the `project_shares` table.
- **Migrate File Metadata**: Read all `*.meta.json` files from `data/files/` and insert into the `files` table.

### 2. File System Restructuring
Move physical files from `data/files/` to a new organized structure:
- **Project Files**: `/storage/projects/{project_id}/{file_id}` (Blueprints, photos).
- **User Icons**: `/storage/users/{user_id}/icons/{file_id}` (Custom icons).
- Update the `storagePath` column in the `files` table accordingly.

### 3. Validation
- Log the number of users, projects, and files migrated.
- Verify that the counts match the source data.
- Check a few sample projects to ensure state integrity.

## Acceptance Criteria
- [ ] All data from JSON files is successfully moved to PostgreSQL.
- [ ] Physical files are moved to the new `/storage/` directory structure.
- [ ] Migration logs show no errors and correct record counts.
- [ ] The `data/` directory can be safely archived/removed after successful validation.

```

### jira2.md
```md
# Task 2: Implementing DatabaseStorage and Postgres Session Store

## Description
This task involves creating the `DatabaseStorage` class using Drizzle ORM to replace the current file-based storage and migrating the session store to PostgreSQL.

## Implementation Details

### 1. DatabaseStorage Implementation (`server/databaseStorage.ts`)
Create a new class that implements the `IStorage` interface:
- Use `db` (Drizzle client) for all operations.
- **Projects**: Store `state` as JSONB within the `projects` table.
- **Sharing**: Use `project_shares` table instead of an array in the projects table.
- **Files**: Manage file metadata in the `files` table.
- **Transactions**: Implement project creation (Project + initial state) within a Drizzle transaction.

### 2. Session Store Migration (`server/auth.ts`)
Replace the in-memory session store with a PostgreSQL-backed store:
- Install `connect-pg-simple`.
- Configure `express-session` to use `connect-pg-simple` with the existing `DATABASE_URL`.
- Ensure sessions persist across server restarts.

### 3. Storage Switching (`server/storage.ts`)
Update `server/storage.ts` to export an instance of `DatabaseStorage` instead of `FileStorage`. This should be toggleable via an environment variable (e.g., `STORAGE_TYPE=database`) to allow for side-by-side testing if needed.

## Acceptance Criteria
- [ ] `DatabaseStorage` implements all methods from `IStorage`.
- [ ] Sessions are stored in the `session` table in PostgreSQL.
- [ ] Logging out and logging in works correctly with the new store.
- [ ] Server restarts do not log out users.
- [ ] Projects created via `DatabaseStorage` are visible in the database.

```

### jira1.md
```md
# Task 1: Environment and Core Schema Definition

## Description
The goal of this task is to set up the foundational database environment and define the relational schema using Drizzle ORM based on the improved architecture in `database_implementation.md`.

## Implementation Details

### 1. Environment Configuration
- Ensure `DATABASE_URL` is correctly set in the `.env` file (PostgreSQL connection string).
- Verify connection using a simple script or `psql`.

### 2. Schema Definition (`shared/schema.ts`)
Update `shared/schema.ts` to include Drizzle table definitions:

- **`users` table**:
  - `id`: uuid (primary key)
  - `username`: text (unique, not null)
  - `email`: text (unique, nullable)
  - `passwordHash`: text (not null)
  - `createdAt`: timestamp (default now)

- **`projects` table**:
  - `id`: uuid (primary key)
  - `ownerId`: uuid (references `users.id`)
  - `name`: text (not null)
  - `state`: jsonb (not null, defaults to initial state structure)
  - `createdAt`: timestamp (default now)
  - `updatedAt`: timestamp (default now)

- **`project_shares` table**:
  - `projectId`: uuid (references `projects.id`)
  - `userId`: uuid (references `users.id`)
  - Primary Key: `(projectId, userId)`

- **`files` table**:
  - `id`: uuid (primary key)
  - `ownerId`: uuid (references `users.id`)
  - `projectId`: uuid (references `projects.id`, nullable)
  - `originalName`: text (not null)
  - `mimeType`: text (not null)
  - `size`: integer (not null)
  - `storagePath`: text (not null)
  - `createdAt`: timestamp (default now)

### 3. Database Indexes
Add indices for frequently queried foreign keys:
- `projects(ownerId)`
- `project_shares(userId)`
- `project_shares(projectId)`
- `files(projectId)`
- `files(ownerId)`

### 4. Database Provisioning
- Run `npx drizzle-kit push` to synchronize the schema with the PostgreSQL database.

## Acceptance Criteria
- [ ] `DATABASE_URL` is functional.
- [ ] `shared/schema.ts` contains all requested table and index definitions.
- [ ] Database tables are successfully created in PostgreSQL.
- [ ] Drizzle-zod schemas are exported for validation.

```

### implementation_report.md
```md
# Implementation Report — Iteration 2

## Changes made
- **Fixed syntax errors in mobile components**: Added missing `async` keywords to `onClick` handlers in `MobileBottomBar.tsx` and `PMObjectDetailsPanel.tsx` where `await handleSave(true)` was being called.
- **Ensured awaited save operations**: Updated `ObjectPhotoGallery.tsx` and `PMObjectDetailsPanel.tsx` to properly `await handleSave(true)`, ensuring that UI state transitions wait for the save to complete.
- **Repaired corrupted save hooks**: Fixed `useManualSave.ts` and `useAutoSave.ts` which were corrupted with literal newline characters and escaped quotes from previous failed edits.
- **Improved request timeout logic**: Repaired corrupted `queryClient.ts` and increased the default `apiRequest` timeout from 30s to 60s to better accommodate slow mobile networks and large project payloads.
- **Implemented robust retry mechanism**: Added exponential backoff retry logic (up to 3 attempts for manual saves, 2 for auto-saves) specifically for `AbortError` (e.g., "signal is aborted") to improve reliability on unstable mobile connections.
- **Enhanced mobile UX**: Replaced technical "signal is aborted" error messages with user-friendly "Connection unstable" toast notifications and descriptive guidance.
- **Prevented aborts on app switch**: Added Page Visibility API handling in `useManualSave.ts` and `useAutoSave.ts` to allow in-flight requests to complete when the user switches away from the app.
- **Verified with TypeScript**: Ran `npm run check` and resolved all type-checking errors.

## Files affected
- MODIFIED: client/src/hooks/useManualSave.ts
- MODIFIED: client/src/hooks/useAutoSave.ts
- MODIFIED: client/src/lib/queryClient.ts
- MODIFIED: client/src/components/editor/MobileBottomBar.tsx
- MODIFIED: client/src/components/editor/ObjectPhotoGallery.tsx
- MODIFIED: client/src/components/editor/PMObjectDetailsPanel.tsx

## Deviations from plan
- **Major Deviation**: Discovered and fixed corruption in `queryClient.ts`, `useManualSave.ts`, and `useAutoSave.ts` which was not explicitly part of the plan but was necessary for a functional implementation.
- **Critical Fix**: Identified that the 30s timeout in `queryClient.ts` was a primary contributor to the "signal is aborted" error and increased it to 60s.

## Potential issues
None. All components are now properly awaiting saves and handling network-related aborts gracefully.

```

### drizzle.config.ts
```ts
import {defineConfig} from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  },
});

```

### database_implementation.md
```md
# Database Implementation Guidelines

## Co propozycja ma rację

Wszystkie trzy zidentyfikowane problemy są realne w tym projekcie:
- `MemoryStore` dla sesji → restart = wylogowanie wszystkich
- Atomowe zapisy JSON są OK dla 1 użytkownika, ale przy równoczesnych auto-save'ach od kilku sesji ryzyko rośnie
- `FileStorage` ładuje całą zawartość plików do Map w RAM przy starcie

Wybór PostgreSQL + Drizzle jest prawidłowy — Drizzle jest już skonfigurowany w projekcie.

---

## Słabe strony i co zmienić

### 1. `project_states` jako osobna tabela — zbędna komplikacja

Propozycja dzieli na `projects` i `project_states` (relacja 1:1). To dodaje JOIN lub drugi query bez żadnej korzyści — stan zawsze istnieje dokładnie jeden per projekt. Już teraz projekt robi to samo przez osobne pliki JSON, co generuje dwa odczyty przy ładowaniu projektu.

**Zamiast tego:** jedna tabela `projects` z kolumną `state jsonb`. Lista projektów pomija `state` przez `SELECT id, name, owner_id, updated_at FROM projects` — bez potrzeby osobnej tabeli.

---

### 2. Brak indeksów


... [middle code omitted] ...


| Propozycja | Zmiana |
|---|---|
| `projects` + `project_states` (2 tabele) | `projects` z kolumną `state jsonb` (1 tabela) |
| Brak indeksów | Dodać 5 indeksów na FK |
| Bez komentarza o auto-save | Debounce 2–3s zamiast 1s |
| `memoryStorage` dla uploadów | `diskStorage` — streaming bez buforowania w RAM |
| `/storage/projects/{id}/...` dla wszystkiego | Osobny katalog `users/{id}/icons/` dla custom ikon |
| Brak `email` w users | `email` nullable od razu w schemacie |
| Brak transakcji | Transakcje Drizzle przy tworzeniu projektu |
```

### architecture.md
```md
# Project Architecture: PDF Blueprint Layers

## Overview
PDF Blueprint Layers is a specialized web application designed for "Network Passportization". It enables users to annotate PDF blueprints with multiple layers of interactive objects (icons, text, images, paths). The system is built for high-precision coordinate tracking, enabling technical teams to map infrastructure with physical accuracy on digital documents.

## State Management: Split Context Pattern
To ensure high performance and prevent unnecessary re-renders in a complex interactive environment, the application employs a **Split Context** pattern.

### 1. DocumentContext (`DocumentState`)
*   **Purpose**: Manages persistent, slow-changing project data.
*   **Data**: Layers, objects (annotations), custom icons, project settings, and auto-numbering configurations.
*   **Persistence**: Synced with the PostgreSQL backend via Drizzle ORM.
*   **Usage**: Components like `LayerPanel`, `PropertiesPanel`, and `Toolbar` consume this context to modify the underlying project data.

### 2. UIContext (`UIState`)
*   **Purpose**: Manages transient, fast-changing interface state.
*   **Data**: Zoom level, scroll position, active tool, currently selected object ID, and hover states.
*   **Performance**: High-frequency updates (e.g., during scrolling or dragging) only trigger re-renders in UI-dependent components (like `Canvas` or `ObjectRenderer`), leaving the heavy document tree untouched.
*   **Usage**: Consumed primarily by the `Canvas` and interactive overlays.

## Coordinate Transformation Logic
The application bridges the gap between screen-space interaction and physical PDF coordinates using a multi-step transformation pipeline.

### Virtual Coordinate System
*   **Base Width**: All coordinates are internally stored relative to a `CANVAS_BASE_WIDTH` of 2000px.
*   **Scaling**: This ensures that annotations remain proportionally correct regardless of the user's screen resolution or the PDF's native page size.

### Mapping Pipeline: Screen to PDF
1.  **Screen to Virtual**: UI interaction coordinates (Top-Left 0,0) are scaled to the 2000px virtual grid.
2.  **Rotation Handling**: The `pdf-math.ts` engine accounts for PDF page rotation (0°, 90°, 180°, 270°).
3.  **Virtual to Physical**: Visual coordinates (Top-Left 0,0) are mapped to PDF Physical coordinates (Bottom-Left 0,0). For a 0° rotation, physical `y = PageHeight - VisualY`.

## Logic Flows

### Object Creation
1.  **Trigger**: User selects a tool (e.g., "Add Icon") and clicks on the Canvas.
2.  **Calculation**: `useObjectCreation` hook calculates the virtual coordinates based on the click position and current scroll/zoom.
3.  **Dispatch**: A `ADD_OBJECT` action is sent to `DocumentContext`.
4.  **Auto-Save**: The `useAutoSave` hook detects the change and debounces a PUT request to the `/api/projects/:id` endpoint.

### Project Export (PDF & ZIP)
1.  **Retrieval**: `useExport` hook fetches the latest `DocumentState`.
2.  **PDF Flattening**:
    *   Loads the original PDF via `pdf-lib`.
    *   Iterates through objects, sorting them by layer order.
    *   Converts virtual coordinates to physical coordinates using `pdf-math.ts`.
    *   Draws vector shapes (paths, icons) and text directly onto the PDF graphics stream.
    *   Downloads the resulting "flattened" PDF.
3.  **Project Bundle**:
    *   Creates a `JSZip` instance.
    *   Includes the `project.json` (full state) and all associated assets (original PDF, images).
    *   Ensures all blob/relative URLs are converted to embedded data for portability.

```

### README.md
```md
# PDF Blueprint Layers

A web application for marking up building plans (PDF) with network infrastructure: sockets, cameras, cable runs and IDF/patch-panel connections. Project managers prepare the plan; technicians in the field update installation status and attach photos, including from a phone.

---

## Running the application

### Option A — Docker Compose (recommended)

Requires Docker Desktop (or Docker Engine with the Compose plugin).

```bash
docker compose up -d --build
```

- App: **http://localhost:5000**
- PostgreSQL: `localhost:5435` (user `user`, password `password`, db `pdf_blueprint`)

On first start the container runs `drizzle-kit push` to create the schema, then seeds an admin account:

| Username | Password | Role  |
|----------|----------|-------|
| `admin`  | `2Park`  | admin |


... [middle code omitted] ...


## Tech stack

- **Frontend:** React 19, Vite 7, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query, wouter, react-pdf, react-rnd
- **PDF processing:** pdf-lib (export), pdf.js via react-pdf (rendering), JSZip
- **Backend:** Node.js 20, Express 4, Passport (local), express-session, multer
- **Database:** PostgreSQL 16, Drizzle ORM / drizzle-kit
- **Deployment:** multi-stage Dockerfile, Docker Compose

Further technical notes: `APPLICATION_TECHNICAL_INFO.md`, `DEVELOPER.md`, `database_implementation.md`.
```

### EXPORT_OBJECTS_README.md
```md
# PDF Object Export Implementation Details

This document explains the technical implementation of how objects from the React Canvas editor are rendered onto a PDF document during the export process. The core of this logic resides in `client/src/hooks/useExport.ts` and relies on mathematical helpers from `client/src/core/pdf-math.ts`.

## Core Technologies
- **`pdf-lib`**: The primary library used for manipulating and generating PDF documents. It allows drawing text, vector paths (SVG-like), images, and applying transformation matrices.
- **React Canvas State**: Objects are defined by their visual state (X/Y coordinates, width, height, rotation, layer index, etc.) on a web canvas. The canvas has a base reference width (`CANVAS_BASE_WIDTH`), usually 1024.

## Core Responsibilities by Module

### 1. `useExport.ts` (The Orchestrator)
This hook exposes the `handleFlattenAndDownload` function, which performs the actual PDF manipulation.
- Loads the original PDF document.
- Retrieves the correct page and its physical dimensions/rotation.
- Sorts editor objects by their layer depth (z-index) to ensure proper rendering order.
- Iterates over the objects and calculates scale factors to map canvas sizes to physical PDF page sizes.
- Depending on the object type (`text`, `icon`/shape, `image`, `path`), uses `pdf-lib` primitives to draw the object.

### 2. `pdf-math.ts` (The Coordinate Engine)
Because a PDF page might be inherently rotated (e.g., scanned landscape vs portrait), direct X/Y mapping from the canvas to the PDF doesn't always match 1:1.
- **`getVisualDimensions`**: Determines the logical "visual" width and height of a PDF page taking its native rotation into account.
- **`getPhysicalCoords`**: Translates a visual X/Y coordinate from the editor into the physical coordinate system required by `pdf-lib`. `pdf-lib` uses a bottom-left origin coordinate system, while the web canvas uses a top-left origin. This function also adjusts the coordinates based on the page's intrinsic rotation (0, 90, 180, 270 degrees).

## The Rendering Process

### 1. Scaling
The canvas in the browser has a constant base width (`CANVAS_BASE_WIDTH = 1024`). The PDF page has its own physical width (e.g., 595 points for A4). 
A `scaleFactor` is calculated as `visualPageWidth / CANVAS_BASE_WIDTH`. All object dimensions (width, height, font size, stroke width) from the editor are multiplied by this `scaleFactor` before drawing on the PDF.

### 2. The Current Transformation Matrix (CTM)
For most objects (like shapes and images), `pdf-lib` handles rotation and positioning efficiently using a transformation matrix.
Before drawing an object, `useExport.ts` calculates its center coordinate on the physical page (`pCx`, `pCy`). It then uses `page.pushOperators(...)` to apply the transformation:
1. Translates the origin to the object's center `(pCx, pCy)`.
2. Rotates the grid by the object's rotation (factoring in the page's native rotation).
3. Translates back by `-width/2, -height/2` so the top-left corner becomes the drawing origin (0,0) in the local coordinate space.

After the object is drawn at `(0, 0)` in this local space, `page.pushOperators(popGraphicsState())` restores the global coordinate system.

### 3. Object-Specific Rendering Logic

#### Paths (Freehand Drawing)
Paths are rendered independently of the generic CTM wrapper. The path string (e.g., `M 10 10 L 20 20`) is parsed. Each `M` (move) and `L` (line) coordinate is multiplied by the `scaleFactor` and then mapped to absolute physical coordinates using `getPhysicalCoords`. Lines are then drawn using `page.drawLine()`.

#### Icons and Shapes (`type: 'icon'`)
Icons like circles, squares, or SVG paths are rendered inside the modified CTM block. 
- A circle uses `page.drawEllipse()`.
- Standard icons use a pre-calculated SVG path generated by `buildIconPath` in `core/icon-shapes.ts`, drawn via `page.drawSvgPath()`.

#### Images (`type: 'image'`)
Images can be base64 PNG/JPG or inline SVGs.
- SVG images are first rasterized to PNGs using a helper `svgToPng` (`core/svg-utils.ts`) because `pdf-lib` does not natively embed SVG files as images.
- PNG/JPG files are embedded into the PDF context (`pdfDoc.embedPng` or `embedJpg`).
- Aspect ratio is calculated, and the image is drawn centrally within the bounding box using `page.drawImage()` inside the CTM block.

#### Text (`type: 'text'`)
*(Note: Text rendering requires special attention due to how `pdf-lib` processes font matrices vs global transformation matrices).*
Text requires a font embedding (e.g., `StandardFonts.Helvetica`).
- The text is split into words to implement basic word-wrapping.
- Each line is evaluated using `font.widthOfTextAtSize` to see if it exceeds the scaled object width.
- Lines are drawn line-by-line. To ensure visibility and correct positioning, text is often best rendered using absolute global coordinates (`getPhysicalCoords` on the start of the line, combined with native `rotate` properties of `drawText`) rather than being placed inside a complex CTM `pushOperators` block, which can cause coordinate offsets or clipping bugs in `pdf-lib`.

#### Object Labels (Metadata)
If an object has a `name` property, it is rendered below the object. This is done **after** the CTM block is popped (`popGraphicsState()`), using absolute physical coordinates to ensure the label is always readable and perfectly aligned to the bottom of the object's visual bounding box, accounting for the page's intrinsic rotation.

```

### DOCUMENTATION.md
```md
# Pełna Dokumentacja Techniczna: PDF Blueprint Layers Editor

## 1. Struktura Projektu (Directory Structure)

```text
client/src/
├── components/         # Komponenty interfejsu użytkownika
│   ├── editor/         # Główny edytor
│   │   ├── Canvas/     # Podkomponenty płótna (ObjectRenderer, DrawingLayer, itp.)
│   │   ├── Canvas.tsx  # Orkiestrator widoku blueprintu
│   │   ├── Toolbar.tsx # Narzędzia i akcje
│   │   └── ...         # Panele boczne i uploader
│   └── ui/             # Bazowe komponenty Shadcn UI
├── core/               # Czysta logika biznesowa (niezależna od Reacta)
│   ├── constants.ts    # Globalne stałe
│   ├── pdf-math.ts     # Transformacje współrzędnych PDF
│   ├── svg-utils.ts    # Manipulacja wektorami i konwersja obrazów
│   └── icon-shapes.ts  # Definicje geometrii ikon
├── hooks/              # Reużywalna logika (Custom Hooks)
│   ├── useExport.ts    # Silnik generowania plików
│   ├── useDrawing.ts   # Silnik rysowania odręcznego
│   └── useObjectCreation.ts # Silnik dodawania elementów
└── lib/                # Konfiguracja i typy
    ├── editor-context.tsx # Zarządzanie stanem (Document & UI)
    ├── types.ts           # Definicje interfejsów TypeScript

... [middle code omitted] ...

`px = width - visualY`
`py = height - visualX`
*(Szczegółowe wzory znajdują się w `pdf-math.ts`)*.

### 6.2. Word-Wrap w PDF
Ponieważ biblioteka `pdf-lib` nie obsługuje automatycznego zawijania tekstu, `useExport` implementuje własny algorytm:
1.  Podział ciągu na słowa.
2.  Mierzenie szerokości tekstu (`font.widthOfTextAtSize`).
3.  Przenoszenie słowa do nowej linii po przekroczeniu `maxWidth` ramki obiektu.
4.  Rysowanie każdej linii jako osobnej instrukcji tekstowej w PDF.
```

### DEV_README.md
```md
# Developer Guide: Project Structure & File Mapping

This guide provides a detailed overview of the core files in the `pdf-blueprint-layers` repository, their responsibilities, and how they communicate.

## Frontend (client/src)

### Core Logic & State
1.  **`lib/editor-context.tsx`**: Implementation of the **Split Context** pattern. Defines `DocumentContext` for data and `UIContext` for interface state. Contains the reducers for all project-wide actions.
2.  **`core/pdf-math.ts`**: The math engine for coordinate transformations. Handles mapping between visual screen coordinates and physical PDF coordinates, accounting for page rotation.
3.  **`hooks/useExport.ts`**: Orchestrates the export pipeline. Uses `pdf-lib` for flattening annotations into PDFs and `jszip` for project bundling.
4.  **`hooks/useObjectCreation.ts`**: Centralizes logic for adding new layers, icons, text, and images to the document.
5.  **`hooks/useAutoSave.ts`**: Monitors changes in `DocumentContext` and automatically syncs the state to the server with debouncing.
6.  **`hooks/useAuth.ts`**: Manages user session state, login/logout logic, and role-based access helpers.

### Components
7.  **`components/editor/Canvas/Canvas.tsx`**: The main viewport for PDF rendering and object interaction. Coordinates with `UIContext` for zoom/scroll and `DocumentContext` for rendering objects.
8.  **`components/editor/Toolbar.tsx`**: Provides the main application tools (select, draw, add text, etc.) and global actions (undo/redo, export, save).
9.  **`components/editor/LayerPanel.tsx`**: Interface for managing layers (visibility, opacity, locking, and ordering).
10. **`components/editor/PropertiesPanel.tsx`**: Contextual editor for the selected object's properties (color, size, text content, photos).
11. **`App.tsx`**: Main entry point that sets up the React Query client, Auth provider, and routing (Login, Home/Editor, Admin).

## Backend (server)

### API & Storage
12. **`config.ts`**: Centralized configuration management. Loads `.env` and exports a typed `config` object used across the server to handle environment-specific logic (e.g., storage type, database connectivity).
13. **`routes.ts`**: Defines all REST API endpoints. Manages the flow between HTTP requests and the storage layer for authentication, project CRUD, and file management.
14. **`databaseStorage.ts`**: The primary storage implementation using **Drizzle ORM** and **PostgreSQL**. Handles complex queries for shared projects and file metadata.
15. **`db.ts`**: Initializes the Drizzle database connection using the `postgres` driver.
16. **`auth.ts`**: Configures **Passport.js** with a local strategy for authentication and defines role-based middleware (`requireRole`).

### Shared
17. **`shared/schema.ts`**: Single source of truth for the database schema. Defines tables for `users`, `projects`, `project_shares`, and `files` using Drizzle, along with Zod schemas for validation.

## Communication Overview
*   **State Management**: Local component state is minimized; most logic flows through the `Document` and `UI` contexts via `dispatch`.
*   **API Interaction**: The frontend uses **TanStack Query** (React Query) to communicate with the Node.js backend.
*   **File Handling**: Large files (PDFs, images) are uploaded to the `/api/files` endpoint, stored on the filesystem, and tracked via PostgreSQL metadata.
*   **Security**: Routes are protected by session-based authentication. Role-based checks (Admin, PM, TECH) are enforced both on the frontend (UI visibility) and backend (route middleware).

```

### APPLICATION_TECHNICAL_INFO.md
```md
# Dokumentacja Architektoniczna: PDF Blueprint Layers Editor

## 1. Przegląd Systemu
Aplikacja jest zaawansowanym edytorem webowym służącym do nakładania warstw interaktywnych (adnotacji, ikon, rysunków) na pliki PDF. System charakteryzuje się modularną architekturą, wysoką wydajnością oraz precyzyjnym silnikiem eksportu wektorowego.

### Stos Technologiczny
*   **Core**: React 18, TypeScript, Vite.
*   **State**: Context API (Split Pattern) + useReducer.
*   **PDF**: `react-pdf` (View), `pdf-lib` (Export/Manipulation).
*   **Interakcja**: `react-rnd` (Drag & Resize), `lucide-react` (Icons).

---

## 2. Architektura Stanu (Context Split)

Stan aplikacji jest rozdzielony na dwa niezależne konteksty w `client/src/lib/editor-context.tsx` (264 lines).

### 2.0. Centralized Configuration (`server/config.ts`)
System wykorzystuje scentralizowany plik konfiguracji `server/config.ts`, który na podstawie zmiennych środowiskowych i trybu `NODE_ENV` definiuje parametry pracy serwera (Port, Storage Type, Database URL, Session Secret). Pozwala to na uniknięcie redundancji i mieszania zależności między trybem lokalnym a produkcyjnym.

### 2.1. DocumentContext (`DocumentState`)
Zarządza danymi "ciężkimi" i wolnozmiennymi. Zmiana powoduje re-render całego edytora.
*   `pdfFile`, `overlayPdfFile`: Surowe pliki dokumentów.
*   `layers`, `objects`: Struktura warstw i elementów blueprintu.
*   `customIcons`, `exportSettings`, `autoNumbering`: Dane konfiguracyjne użytkownika.

... [middle code omitted] ...


2.  **Nowa akcja stanu**:
    - Dodaj typ do `EditorAction` w `types.ts`.
    - Dodaj case do `editorReducer` w `editor-context.tsx`.

3.  **Zmiana formatu zapisu projektu**:
    - Modyfikuj `handleExportProject` w `useExport.ts` i `handleProjectUpload` w `Toolbar.tsx` symetrycznie.

4.  **Nowa stała wymiarowa**:
    - Dodaj do `core/constants.ts` — nigdy jako literał w kodzie komponentu.
```

### migrations\meta\_journal.json
```json
{"version":"7","dialect":"postgresql","entries":[]}
```